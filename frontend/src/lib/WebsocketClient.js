import EventEmitter from 'events';

const autoReConnectMaxTimes = 6;
const autoReConnectInterval = 1000;

let WEBSOCKET_BASE_URL;
let a = document.createElement('A');
a.setAttribute('href', 'websocket/');
WEBSOCKET_BASE_URL = a.href.replace(/^http/, 'ws');

class WebsocketClient {
	constructor() {
		this.connected = false;
		this.events = new EventEmitter();
		this.connect_retry_times = 0;
		this.nextAutoConnectTime = null;
		this.autoConnectTimeout = null;
		
		setTimeout(()=> this.initWebsocket());
	}

	initWebsocket() {
		this.websocket = new WebSocket(WEBSOCKET_BASE_URL + (this.id === undefined ? "" : this.id));
		this.websocket.onopen = (evt) => {
			this.connect_retry_times = 0;
			this.nextAutoConnectTime = null;
			this.connected = true;
			this.events.emit('connected');
		}
		this.websocket.onmessage = (message) => {
			message = JSON.parse(message.data);
			this.events.emit('message', message);
		};
		this.websocket.onclose = () => {
			this.connected = false;
			this.events.emit('close');

			if (this.connect_retry_times < autoReConnectMaxTimes) {
				let interval = Math.pow(2, this.connect_retry_times) * autoReConnectInterval;
				this.autoConnectTimeout = setTimeout(() => {
					this.reConnect()
				}, interval);
				this.nextAutoConnectTime = new Date().getTime() + interval;
				this.events.emit('auto-reconnect',this.nextAutoConnectTime);
			} else {
				this.nextAutoConnectTime = null;
			}
		}
	}

	reConnect(force = false) {
		if (force && this.websocket) {
			this.websocket.close();
			return;
		}
		if (this.websocket.readyState === WebSocket.OPEN || this.websocket.readyState === WebSocket.CONNECTING) return;
		this.events.emit('reconnect');
		if (!force) {
			this.connect_retry_times++;
			this.nextAutoConnectTime = 0;
		} else {
			clearTimeout(this.autoConnectTimeout);
			this.connect_retry_times = autoReConnectMaxTimes;
			this.nextAutoConnectTime = null;
		}

		this.initWebsocket();
	}

	send(message) {
		if (!this.connected) return false;
		if(typeof message !=='string'){
			message = JSON.stringify(message);
		}
		this.websocket.send(message);
		return true;
	}

	close() {
		this.websocket.close();
		this.events.removeAllListeners();
	}

	on(event, handler) {
		this.events.on(event, handler);
	}

	off(event, handler) {
		this.events.off(event, handler)
	}
}

let ws_client = new WebsocketClient();

export default ws_client;
