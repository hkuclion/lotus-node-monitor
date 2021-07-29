<template>
	<div class="sectors">
		<div>
			上次更新时间:{{ sector_synced }}
		</div>

		<el-tabs>
			<el-tab-pane v-for="table_data of sector_state_table_data" :key="table_data.name" :label="`${table_data.name}(${table_data.list.length})`">
				<page-table :data="table_data.list" :paging="table_data.list.length>20">
					<el-table-column
						prop="index"
						label="扇区ID"
					/>
					<el-table-column
						prop="worker"
						label="工作者"
						v-if="sealing_state.includes(table_data.name)"
					/>
					<el-table-column
						prop="start"
						label="执行时间"
						v-if="sealing_state.includes(table_data.name) || guess_state.includes(table_data.name)"
					>
						<template slot-scope="scope">
							<time-from :time="scope.row.start"></time-from>
						</template>
					</el-table-column>
					<el-table-column
						v-if="final_state.includes(table_data.name)"
						prop="gas"
						label="Gas费用"
						:formatter="(row, column, cellValue, index)=>isNaN(cellValue)?'未同步':cellValue"
					/>
					<el-table-column
						v-if="final_state.includes(table_data.name)"
						prop="initial_pledge"
						label="质押费用"
						:formatter="(row, column, cellValue, index)=>isNaN(cellValue)?'未同步':cellValue"
					/>
				</page-table>
			</el-tab-pane>
		</el-tabs>
	</div>
</template>

<script>

import moment from "moment";
import TimeFrom from "@/components/TimeFrom";
import PageTable from "@/components/PageTable";
import {mapGetters, mapState} from "vuex";
import timer from "@/lib/timer";

let SECTOR_STATES = [
	"Faulty",
	"AddPieceFailed",
	"SealPreCommit1Failed",
	"SealPreCommit2Failed",
	"ComputeProofFailed",
	"PreCommitFailed",
	"PackingFailed",
	"CommitFinalizeFailed",
	"CommitFailed",
	"FinalizeFailed",
	"RemoveFailed",
	"TerminateFailed",

	"GetTicket",
	"AddPiece",
	"PreCommit1",
	"Packing",
	"PreCommit2",
	"PreCommitWait",
	"SubmitPreCommitBatch",
	"PreCommitBatchWait",
	"PreCommitting",
	"WaitSeed",
	"Committing",
	"SubmitCommit",
	"CommitWait",
	"SubmitCommitAggregate",
	"CommitAggregateWait",
	"CommitFinalize",
	"FinalizeSector",
	"Proving",
	"Removing",
	"Removed",
	"Terminating",
	"TerminateWait",

	"Empty",
	"FailedUnrecoverable",
	"RecoverDealIDs",
	"DealsExpired",
	"FaultReported",
	"TerminateFinality",
	"FaultedFinal",
	"WaitDeals",
]
let SECTOR_STATE_MAP = {};
for (let i = 0; i < SECTOR_STATES.length; i++) {
	SECTOR_STATE_MAP[SECTOR_STATES[i]] = i;
}

export default {
	name:"Sector",
	components:{
		PageTable,
		TimeFrom
	},
	data() {
		return {
			update_now_handle:undefined,
			now:new Date(),
			sealing_state:['PreCommit1', 'PreCommit2', 'Committing', 'FinalizeSector','CommitFinalize'],
			guess_state:['WaitSeed'],
			final_state:['Proving']
		}
	},
	computed:{
		...mapState(['synced']),
		...mapGetters(['jobs','sectors']),
		
		sector_state_table_data() {
			if(!this.sectors)return this.sectors;
			
			let result = [];
			let cache = {};

			for (let sector of this.sectors) {
				let state = sector.state;
				if (!cache[state]) {
					cache[state] = [];

					result.push({
						name:state,
						list:cache[state],
					});
				}
				if (this.sealing_state.includes(sector.state)) {
					let job = this.jobs.find(job => job.sector === sector.index);
					sector.worker = job && `${job.host}-${job.worker}`;
					sector.start = job && job.start;
				}
				if (this.guess_state.includes(sector.state)) {
					let job = this.jobs.find(job => job.sector === sector.index);
					sector.worker = undefined;
					sector.start = sector.updated_at;
				}
				cache[state].push(sector);
			}

			result.sort((table1, table2) => SECTOR_STATE_MAP[table1.name] - SECTOR_STATE_MAP[table2.name])

			return result;
		},

		sector_synced() {
			if (this.synced.sectors)
				return moment(this.synced.sectors).from(this.now);
			else {
				return "无";
			}
		}
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