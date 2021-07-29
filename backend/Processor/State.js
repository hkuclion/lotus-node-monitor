let SYNC_INTERVAL = 1000*30;//更新间隔 30秒
const filfox_api = require('../Spider/filfox.info');
const lotus_api = require('../Spider/lotus.api');
const Message = require('../DB/Model/Message');
const Sector = require('../DB/Model/Sector');
const MinerState = require('../DB/Model/MinerState');
const {Op} = require("sequelize");
const BigInt = require('big-integer');
const Utility = require('../Utility/tool');
const epoch = require('./Epoch');

let sectorFields = ['index','order_id','state','gas','initial_pledge','active_epoch', 'created_at','updated_at'];

class State {
	constructor() {
		this.data = {
			sectors:undefined,
			workers:undefined,
			jobs:undefined,
		}
		
		this.synced = {
			
		}
		
		this.syncing = {
			
		}
		
		for(let key in this.data){
			this.synced[key] = undefined;
			this.syncing[key] = false;
		}
	}
	
	checkSyncInterval(type){
		if(this.synced[type] === undefined){
			return true;
		}
		if(new Date().getTime() - this.synced[type] > SYNC_INTERVAL){
			return true;
		}
		return false;
	}
	
	async syncSectors(force = false){
		if(!force && !this.checkSyncInterval('sectors'))
			return false;

		if(this.syncing.sectors)return false;
		this.syncing.sectors = true;
		let changed_indices = await lotus_api.syncSectors();
		if(Array.isArray(this.data.sectors)) {
			let changed_sectors = await Sector.findAll({
				attributes:sectorFields,
				where:{
					index:changed_indices,
				},
				order:[
					['index', 'ASC']
				]
			});
			for (let changed_sector of changed_sectors) {
				let exist_index = this.data.sectors.findIndex(sector => sector.index === changed_sector.index);

				if (exist_index !== -1) {
					this.data.sectors[exist_index] = changed_sector;
				} else {
					this.data.sectors.push(changed_sector);
				}
			}
		}
		else{
			this.data.sectors = await Sector.findAll({
				attributes:sectorFields,
				order:[
					['index', 'ASC']
				]
			});
			changed_indices = this.data.sectors.map(sector=>sector.index);
		}
		this.syncing.sectors = false;
		
		this.synced.sectors = new Date().getTime();

		if (changed_indices) {
			epoch.addState('sectors', this.data.sectors.filter(sector => changed_indices.includes(sector.index)));
			epoch.addSynced('sectors', this.synced.sectors)
		}
		
		return changed_indices;
	}
	
	async reloadSectors(){
		this.data.sectors = await Sector.findAll({
			attributes:sectorFields,
			order:[
				['index', 'ASC']
			]
		});

		epoch.addState('sectors', this.data.sectors, true);
		epoch.addSynced('sectors', this.synced.sectors)
	}
	
	async syncWorkers(force = false){
		if (!force && !this.checkSyncInterval('workers'))
			return false;

		if (this.syncing.workers) return false;
		this.syncing.workers = true;
		
		this.data.workers = await lotus_api.getWorkerInfo();
		this.synced.workers = new Date().getTime();

		this.syncing.workers = false;

		epoch.addState('workers', this.data.workers, true);
		epoch.addSynced('workers', this.synced.workers)
		
		return true;
	}
	
	async syncJobs(force = false){
		if (!force && !this.checkSyncInterval('jobs'))
			return false;
		
		if (this.syncing.jobs) return false;
		this.syncing.jobs = true;
		this.data.jobs = await lotus_api.getWorkerJobs();
		this.synced.jobs = new Date().getTime();

		this.syncing.jobs = false;

		epoch.addState('jobs', this.data.jobs,true);
		epoch.addSynced('jobs', this.synced.jobs)
		
		return true;
	}

	async syncAll(force = false){
		let result = {};
		result['sector'] = await this.syncSectors(force);
		result['worker'] = await this.syncWorkers(force);
		result['job'] = await this.syncJobs(force);
		return result;
	}

	async syncState(cur_date){
		if(!cur_date) cur_date = new Date();
		let cur_date_time = Date.parse(cur_date) + (new Date().getTimezoneOffset() * 60 * 1000);
		let today_state = await MinerState.findOne({
			'order':[
				['time', 'DESC']
			],
			where:{
				time:{
					[Op.gt]:new Date(cur_date_time)
				}
			}
		});
		if (!today_state) {
			let result = await filfox_api.syncState();
			if (result) {
				today_state = await MinerState.findOne({
					where:{
						created_at:{
							[Op.gte]:new Date(cur_date_time),
							[Op.lt]:new Date(cur_date_time + 86400 * 1000)
						},
						reported_at:{
							[Op.is]:null,
						}
					}
				})
			}
		}
		return today_state;
	}

	async calcSectorsGas() {
		let toCalcSectors = await Sector.findAll({
			where:{
				gas:'',
				state:'Proving',
				pc_msg_id:{
					[Op.not]:''
				},
				c_msg_id:{
					[Op.not]:''
				},
			}
		});

		let updatedSectorCount = 0;

		let messageCache = {};
		let changed_sectors = [];

		for (let sector of toCalcSectors) {
			let gas = await this.calcSectorGas(sector, messageCache);

			if (gas !== false) {
				sector.gas = gas.toString();
				await sector.save();
				updatedSectorCount++;
				
				let data_sector = this.data.sectors.find(search_sector => search_sector.index === sector.index);
				if(data_sector) {
					data_sector.gas = sector.gas;
					changed_sectors.push(data_sector);
				}
			}
		}

		if (changed_sectors.length) {
			epoch.addState('sectors', changed_sectors);
			epoch.addSynced('sectors', this.synced.sectors)
		}

		return changed_sectors.length;
	}

	async calcSectorGas(sector, messageCache = {}) {
		let precommit_message;
		if (!messageCache[sector.pc_msg_id]) {
			precommit_message = await Message.findOne({
				where:{
					cid:sector.pc_msg_id,
				}
			});
			if (!precommit_message) {
				await filfox_api.syncMessage(sector.pc_msg_id);
				precommit_message = await Message.findOne({
					where:{
						cid:sector.pc_msg_id,
					}
				});
			}

			if (precommit_message) {
				if (precommit_message.method === 25) {
					//PreCommitSectorBatch
					let params = JSON.parse(precommit_message.params);
					let count = params.Sectors.length;

					messageCache[sector.pc_msg_id] = {
						message:precommit_message,
						count,
					}
				} else {
					messageCache[sector.pc_msg_id] = {
						message:precommit_message,
						count:1,
					}
				}
			}
		} else {
			precommit_message = messageCache[sector.pc_msg_id].message
		}

		let commit_message;
		if (!messageCache[sector.c_msg_id]) {
			commit_message = await Message.findOne({
				where:{
					cid:sector.c_msg_id,
				}
			});
			if (!commit_message) {
				await filfox_api.syncMessage(sector.c_msg_id);
				commit_message = await Message.findOne({
					where:{
						cid:sector.c_msg_id,
					}
				});
			}
			if (commit_message) {
				if (commit_message.method === 26) {
					// ProveCommitAggregate
					let params = JSON.parse(commit_message.params);
					let count = countSectorNumbers(params.SectorNumbers);

					messageCache[sector.c_msg_id] = {
						message:commit_message,
						count,
					}
				} else {
					messageCache[sector.c_msg_id] = {
						message:commit_message,
						count:1,
					}
				}
			}
		} else {
			commit_message = messageCache[sector.c_msg_id].message
		}

		if (precommit_message && commit_message) {
			let gas = BigInt(0);
			let precommit_gas = BigInt(0);
			let commit_gas = BigInt(0);

			precommit_gas = precommit_gas.add(precommit_message.fee_burn);
			precommit_gas = precommit_gas.add(precommit_message.fee_over_estimation);
			precommit_gas = precommit_gas.add(precommit_message.fee_tip);
			commit_gas = commit_gas.add(commit_message.fee_burn);
			commit_gas = commit_gas.add(commit_message.fee_over_estimation);
			commit_gas = commit_gas.add(commit_message.fee_tip);
			commit_gas = commit_gas.add(commit_message.value_burn);

			gas = gas.add(
				precommit_gas.divide(messageCache[precommit_message.cid].count)
			).add(
				commit_gas.divide(messageCache[commit_message.cid].count)
			)
			return gas;
		}
		return false
	}
}

module.exports = new State();