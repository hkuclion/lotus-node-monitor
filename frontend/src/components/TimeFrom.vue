<template>
	<span>{{ display_time }}</span>
</template>

<script>
import moment from "moment";
import timer from "@/lib/timer";
import 'moment/src/locale/zh-cn';
moment.locale('zh-cn');

export default {
	data(){
		return {
			now:new Date(),
		}	
	},
	props:["time","fromTime"],
	name:"TimeFrom",
	computed:{
		moment_time(){
			if(this.time instanceof moment)return this.time;
			return moment(this.time);
		},
		display_time(){
			if(!this.time) return '无';
			let from = this.fromTime||this.now;
			let duration = moment.duration(-this.moment_time.diff(from));
			return `${duration.get('hours').toString().padStart(2,"0")}:${duration.get('minutes').toString().padStart(2, "0")}:${duration.get('seconds').toString().padStart(2, "0")}`;
		}
	},
	mounted() {
		if(!this.fromTime){
			timer.$on('now',(now)=>{
				this.now = now;
			})
		}
	}
}
</script>

<style scoped>

</style>