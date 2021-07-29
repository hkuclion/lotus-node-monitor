const { EPOCH } = require('../Utility/Config')
const INTERVAL = 1000 * EPOCH.INTERVAL; //同步间隔5分钟

class WebsocketProcessor{
	constructor() {
		this.socketMap = new Map();
		this.sockets = [];
	}
	
	handle(websocket){
		this.registerSocket(websocket);
		
		websocket.on('close', () => this.unregisterSocket());
		websocket.on('error', () => this.unregisterSocket());
		let socket_map= this.socketMap.get(websocket);
		websocket.on('message', socket_map && socket_map.onMessage);
	}
	
	registerSocket(websocket){
		let onMessage = (message) => {
			this.processIncomingMessage(websocket, message);
		}

		this.sockets.push(websocket);
		this.socketMap.set(websocket, {
			websocket,
			onMessage,
		});
	}

	unregisterSocket(websocket){
		this.sockets = this.sockets.filter(socket => socket !== websocket);
		this.socketMap.delete(websocket);
	}
	
	processIncomingMessage(websocket, message){
		try {
			message = JSON.parse(message);
		} catch (e) {
			console.warn(`SKIP non JSON Message:${message} for error:${e.message}`);
		}
		
		if(message && message.type) {
			switch (message.type) {
				case "HELLO":
					this.sendHelloMessage(websocket);

					break;
				case "EPOCH":
					const epoch = require('../Processor/Epoch');
					let epoch_index = message.epoch;
					let epoch_data = epoch.getData(epoch_index);

					if (epoch_data) {
						this.sendEpochMessage(websocket,epoch_data);
					} else {
						this.sendHelloMessage(websocket);
					}
					break;
			}
		}
	}
	
	sendHelloMessage(websocket){
		const state = require('./State');
		const epoch = require('./Epoch');
		let nowTime = new Date().getTime();
		this.sendMessage(websocket, {
			type:'HELLO',
			code:0,
			data:{
				state:state.data,
				synced:state.synced,
				interval:INTERVAL,
				epoch:epoch.index,
				now:nowTime,
			}
		});
	}

	sendEpochMessage(websocket, epoch_data){
		const epoch = require('./Epoch');
		let nowTime = new Date().getTime();
		this.sendMessage(websocket, {
			type:'EPOCH',
			code:0,
			data:{
				...epoch_data,
				now:nowTime,
				epoch:epoch.index,
			}
		});
	}
	
	sendMessage(websocket, message){
		if(!websocket)return;
		if(typeof message !== 'string'){
			message = JSON.stringify(message);
		}
		websocket.send(message)
	}
	
	broadcastMessage(message){
		if (typeof message !== 'string') {
			message = JSON.stringify(message);
		}
		for(let socket of this.sockets) {
			this.sendMessage(socket, message);
		}
	}
}

module.exports = new WebsocketProcessor();