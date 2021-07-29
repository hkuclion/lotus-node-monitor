import Vue from 'vue'
import Vuex from 'vuex'
import ws_client from '@/lib/WebsocketClient';
import moment from "moment";
import Utility from "@/lib/Utility";

Vue.use(Vuex);

let store = new Vuex.Store({
	state:{
		socket:{
			connected:false,
			nextAutoConnectTime:null,
		},
		data:{
			sectors:undefined,
			workers:undefined,
			jobs:undefined,
		},
		synced:{
			sectors:undefined,
			workers:undefined,
			jobs:undefined,
		},
		timeOffset:0,
		nextSync:undefined,
		syncInterval:undefined,
		epoch:undefined,
	},
	mutations:{
		socketConnected(state,{ connected }){
			state.socket.connected = connected;
		},
		socketAutoConnectTime(state, { time }){
			state.socket.nextAutoConnectTime = time;
		},
		syncSectors(state, { list, synced, reset = false }){
			if(Array.isArray(list)){
				if(!state.data.sectors || reset){
					state.data.sectors = list;
				}
				else {
					for (let sector of list) {
						let index = state.data.sectors.findIndex(exist_sector=>exist_sector.index === sector.index);
						if (index === -1) {
							state.data.sectors.push(sector);
						} else {
							Vue.set(state.data.sectors, index, sector);
						}
					}
				}
			}
			if(synced) {
				state.synced.sectors = synced
			}
		},
		syncWorkers(state, { list, synced }){
			state.data.workers = list;

			if (synced) {
				state.synced.workers = synced
			}
		},
		syncJobs(state, {list, synced}) {
			state.data.jobs = list;

			if (synced) {
				state.synced.jobs = synced
			}
		},
		syncEpoch(state, {now, interval, epoch}){
			if(epoch !== undefined){
				state.epoch = epoch;
			}
			if (interval !== undefined) {
				state.syncInterval = interval;
			}
			if(now !== undefined){
				state.timeOffset = now - new Date().getTime();
				state.nextSync = now - state.timeOffset + state.syncInterval;
			}
		},
	},
	getters:{
		jobs(state,getters){
			let result = [];
			if(Array.isArray(state.data.jobs)) {
				let jobMap = {
					"seal/v0/precommit/1":"PreCommit1",
					"seal/v0/precommit/2":"PreCommit2",
					"seal/v0/commit/2":"Commit2",
					"seal/v0/fetch":"Fetch",
				}

				for (let {id, sector, start, task, host,worker} of state.data.jobs) {
					result.push({
						id:id.split('-').pop(),
						sector,
						start:moment(start),
						task:jobMap[task] || task,
						host,
						worker:worker.match(/^\w+\-\w+\-\w+\-\w+\-\w+$/) ? 'unknown' : worker,
					});
				}
			}
			return result;
		},
		
		sectors(state,getters){
			let result = [];
			if (Array.isArray(state.data.sectors)) {
				for (let {index, state, order_id, active_epoch, updated_at, gas, initial_pledge, created_at} of state.data.sectors) {
					result.push({
						index,
						state,
						order_id,
						//active_epoch,
						updated_at,
						gas:Utility.calcFee(gas,3),
						initial_pledge:Utility.calcFee(initial_pledge),
						created_at:moment(created_at),
					});
				}
			}
			return result.reverse();
		},
	},
	actions:{
		syncEpoch({state,commit},{data,reset = false}){
			if(reset){
				store.commit('syncEpoch',{
					now:data.now,
					interval:data.interval,
					epoch:data.index,
				});
			}
			else{
				if(data.index !== state.epoch + 1 ){
					if(state.epoch) {
						ws_client.send({
							type:"EPOCH",
							epoch:state.epoch + 1
						})
					}
					else{
						ws_client.send({
							type:"HELLO",
						})
					}
				}
				else{
					store.commit('syncEpoch', {
						now:data.now,
						interval:data.interval,
						epoch:data.index,
					});
					if(data.epoch !== data.index){
						ws_client.send({
							type:"EPOCH",
							epoch:data.index + 1
						})
					}
				}
			}
		}
	},
	modules:{}
})

ws_client.on('connected',()=>{
	store.commit('socketConnected',{ connected:true });
	store.commit('socketAutoConnectTime',{ time:null });
	ws_client.send({
		'type':"HELLO"
	});
})
ws_client.on('close', ()=>{
	store.commit('socketConnected', { connected:false });
})
ws_client.on('auto-reconnect',(time)=>{
	store.commit('socketAutoConnectTime', { time });
})
ws_client.on('reconnect',()=>{
	store.commit('socketAutoConnectTime', { time:true });
})
ws_client.on('message',(message)=>{
	switch (message.type){
		case "HELLO":
		case "UPDATE":
			if(message.data && message.data.state){
				for(let component of ['sectors','workers','jobs','reports','orders']){
					if(message.data.state[component]){
						store.commit(`sync${component[0].toUpperCase() + component.substring(1)}`, {
							list:message.data.state[component],
							synced:message.data.synced[component],
							reset:message.type === 'HELLO' || message.data.reset[component],
						});
					}
				}
				
				store.dispatch('syncEpoch',{
					data:message.data,
					reset:message.type === 'HELLO'
				})
			}
			break;
	}
})




export default store;