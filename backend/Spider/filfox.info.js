const api_fetch = require('../Utility/fetch');
const Message = require('../DB/Model/Message');
const Block = require('../DB/Model/Block');
const MinerState = require('../DB/Model/MinerState');
const {LOTUS} = require('../Utility/Config')

const BASEURL = "https://filfox.info/api/v1/";

const ENDPOINTS = {
	MESSAGES:'address/{address}/messages',
	MESSAGE_DETAIL:'message/{cid}',
	INFO:'address/{address}',
	BLOCKS:'address/{address}/blocks',
	BLOCK_DETAIL:'block/{cid}',
}

const ENDPOINT_CACHES = {
	MESSAGES:false,
	MESSAGE_DETAIL:false,
	INFO:false,
	BLOCKS:false,
	BLOCK_DETAIL:false,
}

async function api_request(endpoint, endpoint_data = {}, data=undefined){
	let endpoint_url = ENDPOINTS[endpoint];
	for(let key in endpoint_data){
		endpoint_url = endpoint_url.replace(`{${key}}`,endpoint_data[key]);
	}
	
	let missing_params = endpoint_url.match(/\{(\w+)\}/g);
	if(missing_params){
		throw new Error(`filfox::api_request PARAMS NOT SET(${missing_params.join(',')})`);
	}
	
	let text_result = await api_fetch('HTTP_GET', BASEURL+endpoint_url,data, ENDPOINT_CACHES[endpoint]);
	let result = text_result;
	try {
		result = JSON.parse(text_result);
	}
	catch (e){
		
	}

	return result;
}

async function syncMessages(minerAddress = LOTUS.MINER_ID, startTime, endTime) {
	try {
		let result_messages = [];
		let finished = false;
		let page = 0;
		let pageSize = 20;
		let lastTotal = undefined;

		if (!startTime) {
			let latest_message = await Message.findOne({
				order:[
					['timestamp', 'DESC']
				]
			});

			if (latest_message) {
				startTime = Date.parse(latest_message.timestamp);
			}
		}

		let cid_cache = {};

		while (!finished || (lastTotal && page * pageSize >= lastTotal)) {
			let result = await api_request('MESSAGES', {
				address:minerAddress,
			}, {pageSize, page});

			if (lastTotal === undefined) {
				lastTotal = result.totalCount;
			} else if (lastTotal !== result.totalCount) {
				page -= Math.ceil((result.totalCount - lastTotal) / pageSize);
				lastTotal = result.totalCount;
				continue;
			}

			if (result.messages && result.messages.length) {
				for (let message of result.messages) {
					let message_time = message.timestamp * 1000;

					if (cid_cache[message.cid]) {
						continue;
					}
					cid_cache[message.cid] = true;

					if (startTime && message_time < startTime) {
						finished = true;
						break;
					} else if (endTime && message_time > endTime) {
						continue;
					} else {
						result_messages.unshift(message);
					}
				}
			} else {
				finished = true;
			}
			if (finished) break;
			page += 1;
		}

		let syncCount = 0;
		for (let result_message of result_messages) {
			let exists_message = await Message.findOne({
				where:{
					cid:result_message.cid
				}
			});
			if (exists_message) continue;
			
			await syncMessage(result_message.cid)
			syncCount++;
		}

		return syncCount;
	}
	catch (e) {
		return false;
	}
}

async function syncMessage(cid){
	let message_detail = await getMessageDetail(cid);
	let burn_transfer = message_detail.transfers ? (message_detail.transfers.find(transfer => transfer.type === 'burn')) : undefined;

	let new_message = Message.build({
		cid:message_detail.cid,
		epoch:message_detail.height,
		timestamp:new Date(message_detail.timestamp * 1000),
		from_id:message_detail.fromId,
		from_address:message_detail.from,
		to_id:message_detail.toId,
		to_address:message_detail.to,
		value:message_detail.value,
		method:message_detail.methodNumber,
		params:JSON.stringify(message_detail.decodedParams),
		fee_burn:message_detail.fee.baseFeeBurn,
		fee_over_estimation:message_detail.fee.overEstimationBurn,
		fee_penalty:message_detail.fee.minerPenalty,
		fee_tip:message_detail.fee.minerTip,
		fee_refund:message_detail.fee.refund,
		value_burn:burn_transfer ? burn_transfer.value : '0',
	})
	await new_message.save();
}

function getMessageDetail(messageId) {
	return api_request('MESSAGE_DETAIL', {
		cid:messageId,
	});
}

async function syncBlocks(minerAddress = LOTUS.MINER_ID, startTime, endTime) {
	try {
		let result_blocks = [];
		let finished = false;
		let page = 0;
		let pageSize = 20;
		let lastTotal = undefined;

		if (!startTime) {
			let latest_block = await Block.findOne({
				order:[
					['timestamp', 'DESC']
				]
			});

			if (latest_block) {
				startTime = latest_block.timestamp;
			}
		}

		let cid_cache = {};

		while (!finished || (lastTotal && offset >= lastTotal)) {
			let result = await api_request('BLOCKS', {
				address:minerAddress,
			}, {pageSize, page});

			if (lastTotal === undefined) {
				lastTotal = result.totalCount;
			} else if (lastTotal !== result.totalCount) {
				page -= Math.ceil((result.totalCount - lastTotal) / pageSize);
				lastTotal = result.totalCount;
				continue;
			}

			if (result.blocks && result.blocks.length) {
				for (let block of result.blocks) {
					let block_time = block.timestamp * 1000;

					if (cid_cache[block.cid]) {
						continue;
					}
					cid_cache[block.cid] = true;

					if (startTime && block_time < startTime) {
						finished = true;
						break;
					} else if (endTime && block_time > endTime) {
						continue;
					} else {
						result_blocks.push(block);
					}
				}
			} else {
				finished = true;
			}
			if (finished) break;
			page += 1;
		}
		
		let syncCount = 0;
		for (let result_block of result_blocks) {
			let exists_block = await Block.findOne({
				where:{
					cid:result_block.cid
				}
			});
			if (exists_block) continue;

			await syncBlock(result_block.cid)
			syncCount++;
		}

		return syncCount;
	}
	catch (e) {
		return false;
	}
}

async function syncBlock(cid){
	let block_detail = await getBlockDetail(cid);
	let new_block = Block.build({
		cid:block_detail.cid,
		epoch:block_detail.height,
		timestamp:new Date(block_detail.timestamp * 1000),
		reward:block_detail.reward,
		penalty:block_detail.penalty,
		msg_count:block_detail.messageCount,
	})
	await new_block.save();
}

function getBlockDetail(blockId){
	return api_request('BLOCK_DETAIL', {
		cid:blockId,
	});
}

async function syncState(minerAddress = LOTUS.MINER_ID){
	try {
		let state_result = await api_request('INFO', {address:minerAddress});

		let new_miner_state = MinerState.build({
			time:new Date(state_result.timestamp * 1000),
			owner_address:state_result.miner.owner.address,
			owner_balance:state_result.miner.owner.balance,
			worker_address:state_result.miner.worker.address,
			worker_balance:state_result.miner.worker.balance,
			raw_power:state_result.miner.rawBytePower,
			adj_power:state_result.miner.qualityAdjPower,
			total_raw_power:state_result.miner.networkRawBytePower,
			total_adj_power:state_result.miner.networkQualityAdjPower,
			block_count:state_result.miner.blocksMined,
			total_rewards:state_result.miner.totalRewards,
			sector_active:state_result.miner.sectors.active,
			sector_live:state_result.miner.sectors.live,
			sector_faulty:state_result.miner.sectors.faulty,
			sector_recovering:state_result.miner.sectors.recovering,
			sector_pledge_balance:state_result.miner.sectorPledgeBalance,
			available_balance:state_result.miner.availableBalance,
			vesting:state_result.miner.vestingFunds,
		})

		await new_miner_state.save();

		return new_miner_state;
	}catch (e){
		throw e;
		return false;
	}
}

async function sync(minerAddress = LOTUS.MINER_ID, skipModules = {}){	
	let results = {
		state:false,
		messages:false,
		blocks:false,
	}
	
	try {
		if (!skipModules.state) {
			results.state = await syncState(minerAddress);
		}
		if (!skipModules.messages) {
			results.messages = await syncMessages(minerAddress);
		}
		if (!skipModules.blocks) {
			results.blocks = await syncBlocks(minerAddress);
		}
	}
	catch (e){}
	return results;
}

let API = {
	syncMessages,
	syncMessage,
	syncBlocks,
	syncBlock,
	syncState,
	sync,
	getMessageDetail,
	getBlockDetail,
}

module.exports = API;