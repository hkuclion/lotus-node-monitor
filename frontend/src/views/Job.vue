<template>
	<div class="jobs">
		<div>
			上次更新时间:{{ job_synced }}
		</div>
		<el-tabs>
			<el-tab-pane v-for="table_data of job_server_table_data" :key="table_data.name" :label="`${table_data.name}(${table_data.list.length})`">
				<page-table :data="table_data.list" :paging="table_data.list.length>20">
					<el-table-column
						prop="sector"
						label="扇区ID"
					/>
					<el-table-column
						prop="task"
						label="任务类型"
					/>
					<el-table-column
						prop="worker"
						label="执行者"
					/>
					<el-table-column
						prop="start"
						label="执行时间"
					>
						<template slot-scope="scope">
							<time-from :time="scope.row.start"></time-from>
						</template>

					</el-table-column>
				</page-table>
			</el-tab-pane>
		</el-tabs>
	</div>
</template>

<script>

import moment from "moment";
import TimeFrom from "@/components/TimeFrom";
import PageTable from "@/components/PageTable";
import {mapState, mapGetters} from "vuex";
import timer from "@/lib/timer";

export default {
	name:"Job",
	components:{
		PageTable,
		TimeFrom
	},
	data(){
		return {
			update_now_handle:undefined,
			now:new Date(),
			sealing_state:['PreCommit1', 'PreCommit2', 'Committing', 'FinalizeSector'],
			final_state:['Proving']
		}
	},
	computed:{
		...mapState(['synced']),
		...mapGetters(['jobs']),

		job_server_table_data() {
			let result = [];
			let cache = {};

			for (let job of this.jobs) {
				let server = job.host;
				if (!cache[server]) {
					cache[server] = [];

					result.push({
						name:server,
						list:cache[server],
					})
				}
				cache[server].push(Object.assign({}, job, {worker:job.worker}));
			}

			result.sort((item1,item2)=>item1.name.localeCompare(item2.name))
			
			return result;
		},

		job_synced() {
			if (this.synced.jobs)
				return moment(this.synced.jobs).from(this.now);
			else {
				return "无";
			}
		},
	},
	mounted() {
		timer.$on('now', (now) => {
			this.now = now;
		})
	},
	destroyed() {
		clearTimeout(this.update_now_handle);
	}
}
</script>

<style scoped>

</style>