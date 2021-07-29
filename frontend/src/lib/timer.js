import Vue from 'vue'

const EventBus = new Vue();

let timerFunction = function(){
	EventBus.$emit('now', new Date());
	setTimeout(timerFunction,1000);
}
timerFunction();

export default EventBus;