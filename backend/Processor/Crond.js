const state = require('./State');
const epoch = require('./Epoch');
const { EPOCH } = require('../Utility/Config')
const INTERVAL = 1000 * EPOCH.INTERVAL; //同步间隔5分钟
const filfox_api = require('../Spider/filfox.info');
const MinerState = require('../DB/Model/MinerState');

function countSectorNumbers(numbers) {
	let count = 0;
	let groups = numbers.split(',');
	for (let group of groups) {
		if (group.indexOf('-') !== -1) {
			let [start, end] = group.split('-');
			count += end - start + 1;
		} else {
			count += 1
		}
	}
	return count;
}

class Crond{
	constructor() {
		this.started = false;
		this.last_run = undefined;
		this.last_state_date = undefined;
		this.timeout_handle = undefined;
	}
	
	async start(){
		if(this.started)return false;
		this.started = true;
		await this.run();
		epoch.broadcast();
	}
	
	stop(){
		this.started = false;
	}
	
	async run(syncOnly = false){
		if(!this.started)return;

		clearTimeout(this.timeout_handle);
		let sync_result = await state.syncAll();
		console.log('Sync Result', sync_result);
		
		this.last_run = new Date();
		if(!syncOnly){
			if (this.last_state_date === undefined) {
				let last_state = await MinerState.findOne({
					'order':[
						['time', 'DESC']
					],
				});

				if (last_state) {
					this.last_state_date = `${last_state.time.getFullYear().toString().padStart(2, "0")}-${(last_state.time.getMonth() + 1).toString().padStart(2, "0")}-${last_state.time.getDate().toString().padStart(2, "0")}`;
				}
			}
			let cur_date = `${this.last_run.getFullYear().toString().padStart(2, "0")}-${(this.last_run.getMonth() + 1).toString().padStart(2, "0")}-${this.last_run.getDate().toString().padStart(2, "0")}`;
			let sync_count;
			
			sync_count = await filfox_api.syncMessages();
			if(sync_count === false){
				console.log('Message sync error');
			}
			else{
				console.log(`Message sync count:${sync_count}`)
			}
			sync_count = await filfox_api.syncBlocks();
			if (sync_count === false) {
				console.log('Block sync error');
			} else {
				console.log(`Block sync count:${sync_count}`)
			}

			sync_count = await state.calcSectorsGas();
			if (sync_count === false) {
				console.log('Calc sector gas error');
			} else {
				console.log(`Calc sector gas count:${sync_count}`)
			}

			if (!this.last_state_date || this.last_state_date !== cur_date) {
				let today_state = await state.syncState(cur_date);
				if (today_state) {
					await state.report_state(today_state, cur_date);

					this.last_state_date = cur_date;
				}
			}
		}

		this.timeout_handle = setTimeout(()=>this.run(),INTERVAL);
	}
}

let crond_instance = new Crond();
crond_instance.start();
module.exports = crond_instance;