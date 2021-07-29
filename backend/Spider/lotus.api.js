const fs = require('fs');
const path = require('path')
const fetch = require('node-fetch');
const {JSONRPCClient} = require("json-rpc-2.0");
const childProcess = require('child_process');
const Sector = require('../DB/Model/Sector');
const SectorLog = require('../DB/Model/SectorLog');
const {LOTUS} = require('../Utility/Config');

const finalStates = [
	'Terminated',
	'Removed',
	'Proving',
];

const ENDPOINTS = {
	SECTOR_LIST:'miner/Filecoin.SectorsList',
	SECTOR_STATUS:'miner/Filecoin.SectorsStatus',
	WORKER_STATUS:'miner/Filecoin.WorkerStats',
	WORKER_JOBS:'miner/Filecoin.WorkerJobs',
	MINER_SESSION:'miner/Filecoin.Session',
	MINER_ADDRESS:'miner/Filecoin.ActorAddress',
}

const PATH = {}

PATH.DAEMON = process.env.LOTUS_PATH;
if(PATH.DAEMON === undefined){
	PATH.DAEMON = LOTUS.DAEMON_PATH;
}
if(PATH.DAEMON === undefined){
	PATH.DAEMON = '/root/.lotus';
}

PATH.MINER = process.env.LOTUS_MINER_PATH;
if (PATH.MINER === undefined) {
	PATH.MINER = LOTUS.MINER_PATH;
}
if (PATH.MINER === undefined) {
	PATH.MINER = '/root/.lotus-miner';
}

let lotusApiCache = {};

function getLotusApi(type) {
	let [main_type, sub_type] = type.split('/');
	main_type=main_type.toUpperCase();
	
	if (!lotusApiCache[main_type]) {
		if (PATH[main_type]) {
			let api_protocol = fs.readFileSync(path.resolve(PATH[main_type], 'api'), {encoding:'utf-8'});
			let api_secret = fs.readFileSync(path.resolve(PATH[main_type], 'token'), {encoding:'utf-8'});
			let api_part = api_protocol.match(/^\/ip4\/(\d+\.\d+\.\d+\.\d+)\/tcp\/(\d+)/);

			lotusApiCache[type] = {
				URL:`http://${api_part[1]}:${api_part[2]}/rpc/v0`,
				TOKEN:api_secret,
			}
		}
	}
	
	return lotusApiCache[type];
}

const client = new JSONRPCClient((jsonRPCRequest, {URL, TOKEN}) =>
	fetch(URL, {
		method:"POST",
		headers:{
			"content-type":"application/json",
			authorization:`Bearer ${TOKEN}`, // Use the passed token
		},
		body:JSON.stringify(jsonRPCRequest),
	}).then((response) => {
		if (response.status === 200) {
			// Use client.receive when you received a JSON-RPC response.
			return response
				.json()
				.then((jsonRPCResponse) => client.receive(jsonRPCResponse));
		} else if (jsonRPCRequest.id !== undefined) {
			return Promise.reject(new Error(response.statusText));
		}
	})
);


function api_request_json(endpoint, ...data) {
	let [path_pattern, method] = endpoint.split('/');

	return client.request(method, data, getLotusApi(path_pattern));
}

function api_run_cmd(command){
	return new Promise((resolve, reject) => {
		childProcess.exec(command, function (error, stdout, stderr) {
			if (error) {
				reject({
					error,
					stdout,
					stderr,
				});
			} else {
				resolve({
					error,
					stdout,
					stderr,
				})
			}
		});
	})
}

async function syncSectors(skipFinal=true, onlineInfo=false){
	let sectorIndices = await api_request_json(ENDPOINTS.SECTOR_LIST);
	
	if(skipFinal){
		let finalSectorIndices = (await Sector.findAll({
			where:{
				state:finalStates
			}
		})).map(sector=>sector.index);
		sectorIndices = sectorIndices.filter(sectorIndex=> !finalSectorIndices.includes(sectorIndex));
	}
	
	for(let sectorIndex of sectorIndices){
		let exist_sector = await Sector.findOne({
			where:{
				index:sectorIndex
			}
		});
		// if (exist_sector) {
		// 	if (skipFinal && finalStates.includes(exist_sector.state)) {
		// 		console.info(`SKIP SECTOR SYNC[${sectorIndex}]:${exist_sector.state}`);
		// 		continue;
		// 	}
		// }

		let sectorDetail = await getSectorDetail(sectorIndex, true);
		await syncSector(sectorIndex, sectorDetail, exist_sector);
	}
	
	return sectorIndices;
}

async function syncSector(sectorIndex, sectorDetail, sector_instance){
	if(!sectorDetail){
		sectorDetail = await getSectorDetail(sectorIndex, true);
	}

	let data = {
		index:sectorIndex,
		state:sectorDetail.State,
		pc_msg_id:sectorDetail.PreCommitMsg && sectorDetail.PreCommitMsg['/'],
		c_msg_id:sectorDetail.CommitMsg && sectorDetail.CommitMsg['/'],
		retries:sectorDetail.Retries,
		active_epoch:sectorDetail.Activation,
		expire_epoch:sectorDetail.Expiration,
		on_epoch:sectorDetail.OnTime,
		initial_pledge:sectorDetail.InitialPledge,
		gas:'',
	};
	if(sector_instance){
		for(let key in data){
			sector_instance[key] = data[key];
		}
	}
	else{
		sector_instance = Sector.build(data);
	}
	
	await sector_instance.save();

	let sector_id = sector_instance.id;

	let exist_log_index = 0;
	let sector_log_index = await SectorLog.max('index', {
		where:{
			sector_id
		}
	});
	exist_log_index = isNaN(sector_log_index) ? 0 : sector_log_index + 1;
	let insertLogs = sectorDetail.Log.slice(exist_log_index);

	let changed_indices = [];
	
	for (let i = 0; i < insertLogs.length; i++) {
		let sector_log = SectorLog.build({
			sector_id,
			index:exist_log_index + i,
			type:insertLogs[i].Kind,
			message:insertLogs[i].Message,
			timestamp:new Date(insertLogs[i].Timestamp * 1000)
		});

		await sector_log.save();
		changed_indices.push(sector_id)
	}
	
	return changed_indices;
}

async function getSectorDetail(sectorIndex,onlineInfo=false,){
	let sectorDetail = await api_request_json(ENDPOINTS.SECTOR_STATUS, sectorIndex, onlineInfo);
	
	return sectorDetail;
}

let worker_info = undefined;

async function getWorkerInfo(force = false) {
	if(!worker_info || force) {
		if(!worker_info){
			worker_info = {};
		}
		
		let workers = await api_request_json(ENDPOINTS.WORKER_STATUS);

		for (let session_id in workers) {
			let parts = workers[session_id].Info.Hostname.split('-');
			let host = parts.shift();
			let worker_name = parts.join('-');
			if(host && LOTUS && LOTUS.HOST_NAME_MATCH !== undefined && LOTUS.HOST_NAME_REPLACE !== undefined){
				let host_reg = new RegExp(LOTUS.HOST_NAME_MATCH,'g');

				host = host.replace(host_reg, LOTUS.HOST_NAME_REPLACE);
			}
			if (worker_name && LOTUS && LOTUS.WORKER_NAME_MATCH !== undefined && LOTUS.WORKER_NAME_REPLACE !== undefined) {
				let worker_reg = new RegExp(LOTUS.WORKER_NAME_MATCH, 'g');

				worker_name = worker_name.replace(worker_reg, LOTUS.WORKER_NAME_REPLACE);
			}

			worker_info[session_id] = {
				host,
				name:worker_name,
				enabled:workers[session_id].Enabled,
				cpu:workers[session_id].CpuUse,
				gpu:workers[session_id].GpuUsed,
			}
		}
	}

	return worker_info;
}

async function getWorkerJobs(){
	let workerJobs = await api_request_json(ENDPOINTS.WORKER_JOBS);
	let workerInfo = await getWorkerInfo(true);
	
	let jobs = [];
	
	for(let worker_id in workerJobs){
		if(!worker_info[worker_id]){
			await getWorkerInfo(true);
		}
		
		for(let job of workerJobs[worker_id]){
			jobs.push({
				id: typeof(job.ID) === "string" ? job.ID: job.ID.ID,
				sector: job.Sector.Number,
				task: job.Task,
				queue: job.RunWait,
				start: new Date(job.Start),
				host:workerInfo[worker_id] ? workerInfo[worker_id].host : "unknown",
				worker:workerInfo[worker_id] ? workerInfo[worker_id].name : worker_id,
			});
		}
	}
	
	return jobs;
}

async function getMinerAddress(){
	
}

let API = {
	syncSectors,
	syncSector,
	getSectorDetail,
	getWorkerJobs,
	getWorkerInfo,
	api_request_json,
	getMinerAddress
}

module.exports = API;