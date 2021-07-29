const { EPOCH } = require('../Utility/Config')
const websocketProcessor = require('./WebsocketProcessor');
const INTERVAL = 1000 * EPOCH.INTERVAL; //同步间隔

const LOOKBACK = 3;


class Epoch {
	constructor() {
		this.index = 0;
		
		this.data = [];

		this.timeout_handle = undefined;
	}
	
	next(){
		this.index++;
		clearTimeout(this.timeout_handle);
		
		if(this.data.length){
			this.broadcast(this.data[0]);
		}

		this.data.unshift({
			index:this.index,
			state:{},
			synced:{},
			reset:{},
		});

		if (this.data.length >= LOOKBACK) {
			this.data.pop();
		}

		this.timeout_handle = setTimeout(()=>this.next(), INTERVAL);
	}
	
	addState(type,data,reset = false){
		if (!this.data.length) {
			this.next();
		}

		let state_data = this.data[0].state;

		let array_check_field = 'id';
		if (type === 'sectors') {
			array_check_field = 'index';
		}

		if (reset) {
			state_data[type] = data;
		} else {
			if (Array.isArray(data)) {
				if (!Array.isArray(state_data[type])) {
					state_data[type] = data;
				} else {
					for (let datum of data) {
						let index = state_data[type].findIndex(item => item[array_check_field] === datum[array_check_field]);
						if (index === -1) {
							state_data[type].push(datum);
						} else {
							state_data[type][index] = datum;
						}
					}
				}
			} else {
				state_data[type] = data;
			}
		}

		this.data[0].reset[type] = reset;
	}
	
	addSynced(type,data){
		if(!this.data.length){
			this.next();
		}

		let synced_data = this.data[0].synced;
		synced_data[type] = data;
	}
	
	getData(index = this.index){
		if(index - this.index >= LOOKBACK){
			return false;
		}
		return this.data[index - this.index];
	}
	
	broadcast(data){
		if(!data)data = this.data[0];
		let now_time = (new Date()).getTime();
		
		websocketProcessor.broadcastMessage({
			type:'UPDATE',
			data:{
				now:now_time,
				...data,
				epoch:this.index,
			}
		})
	}
}

let epoch_instance = new Epoch();
epoch_instance.next();
module.exports = epoch_instance;