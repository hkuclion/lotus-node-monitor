<template>
	<div class="home">
		<div>
			连接状态:
			<span v-if="socket.connected">已连接</span>
			<span v-else>未连接</span>
			<button v-if="socket.connected" @click="sync">立即同步</button>

			<el-progress :text-inside="true" :stroke-width="26" :format="formatSyncPercentage" :percentage="(1-nextSyncRatio)*100"></el-progress>
		</div>
		<div v-if="socket.nextAutoConnectTime !== null">
			重连时间: 
			<span v-if="socket.nextAutoConnectTime === true">重连中</span>
			<span v-else>{{ socket.nextAutoConnectTime }}</span>
		</div>

		<el-menu router :default-active="$route.path" mode="horizontal">
			<el-menu-item v-for="menu of menus" :index="$router.resolve(menu.route).resolved.path" :route="menu.route">
				{{ menu.label }}
			</el-menu-item>
		</el-menu>

		<router-view></router-view>
	</div>
</template>

<script>

import {mapState} from 'vuex';
import {API} from "@/lib/API";
import moment from "moment";
import timer from "@/lib/timer";

export default {
	name:'Home',
	data(){
		return {
			now:new Date(),
			menus:[
				{
					label:'扇区',
					route:{name:'Sector'},
				},
				{
					label:'任务',
					route:{name:'Job'},
				}
			]
		}
	},
	computed:{
		...mapState(['socket','nextSync','timeOffset','syncInterval']),
		nextSyncTime(){
			return moment(new Date(this.nextSync));
		},
		nextSyncRatio(){
			return Math.min(1,Math.max(0,(this.nextSync - this.now.getTime() + this.timeOffset)/this.syncInterval)) || 0;
		}
	},
	methods:{
		async sync(){
			let result = API.request(API.ENDPOINTS.SYNC);
		},
		formatSyncPercentage(percentage){
			let mSeconds = Math.floor(this.nextSyncRatio * this.syncInterval / 1000);
			return moment.duration(mSeconds * 1000).humanize(true)
		}
	},
	mounted(){
		if(this.$route.name==='Home') {
			this.$router.replace({name:'Sector'});
		}
		timer.$on('now', (now) => {
			this.now = now;
		})
	}
}
</script>
