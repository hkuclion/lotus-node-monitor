<template>
	<el-container class="page-table-ctn">
		<el-table v-bind="$attrs" v-on="$listeners" :data="filterData" ref="pageTable">
			<slot></slot>
		</el-table>
		<el-footer class="footer" v-if="paging">
			<div class="size-info">
				<span v-if="totalSize > 1">显示第 {{ start }} 条到第 {{ end }} 条的数据，</span>
				共{{ totalSize }} 条数据
			</div>
			<el-pagination
				v-bind="$attrs"
				v-on="$listeners"
				:pager-count="5"
				:layout="layout"
				:page-sizes="pageSizes"
				:page-size="currPageSize"
				:current-page="currPage"
				:total="totalSize"
				style="float:right"
				@current-change="handleCurrentChange"
				@size-change="handleSizeChange"
			></el-pagination>
		</el-footer>
	</el-container>
</template>

<script>
//https://blog.csdn.net/qq_31772441/article/details/105899043
export default {
	name:"PageTable",
	props:{
		data:{
			type:Array,
			require:true,
			default:[]
		},
		currentPage:{
			type:Number,
			default:1
		},
		pageSize:{
			type:Number,
			default:20
		},
		pageSizes:{
			type:Array,
			default:() => [10, 20, 40, 60, 80, 100]
		},
		layout:{
			type:String,
			default:"sizes, prev, pager, next, jumper"
		},
		// 是否分页，默认为true，即分页。（不分页时将每页条数设置最大。）
		paging:{
			type:Boolean,
			default:true
		}
	},
	data() {
		return {
			allData:this.data, // 全量表格数据(前端分页)
			filterData:[], // 表格展示数据
			start:1,
			end:1,
			totalSize:this.data.length,
			currPageSize:this.paging ? this.pageSize : Number.MAX_SAFE_INTEGER,
			currPage:this.currentPage
		};
	},
	methods:{
		handleSizeChange(value) {
			this.currPage = 1;
			this.currPageSize = value;
			this.handleChange();
		},
		handleCurrentChange(value) {
			this.currPage = value;
			this.handleChange();
		},
		handleChange(reset) {
			// reset：是否重置页码
			if (reset) {
				this.currPage = 1;
			}
			this.renderTable();
		},
		renderTable() {
			if (this.totalSize > this.currPageSize) {
				// 总行数大于一页
				let startIndex = (this.currPage - 1) * this.currPageSize,
					endIndex = this.currPage * this.currPageSize;
				this.start = startIndex + 1;
				this.end = this.totalSize < endIndex ? this.totalSize : endIndex;
				this.filterData = this.allData.slice(startIndex, endIndex); //[start,end)
			} else if (this.totalSize > 0) {
				// 总行数小于等于一页
				this.currPage = 1;
				this.start = 1;
				this.end = this.totalSize;
				this.filterData = this.allData;
			} else {
				// 无数据
				this.currPage = 1;
				this.start = 0;
				this.end = 0;
				this.filterData = [];
			}
		},
		setData(value) {
			this.allData = value;
			this.totalSize = value.length;
			this.renderTable();
		},

		//<el-table>自带的方法 start
		setCurrentRow(row) {
			this.$refs.pageTable.setCurrentRow(row);
		}
		//...
		//<el-table>自带的方法 end
	},
	watch:{
		data() {
			this.setData(this.data ? this.data : []);
		}
	},
	mounted() {
		this.renderTable();
	}
};
</script>

<style lang="scss" scoped>
.page-table-ctn {
	> .el-table {
		width: auto;
		margin: 14px;
		border: 1px solid #ebeef5;
		border-bottom: unset;
	}

	> .footer {
		height: 40px !important;

		.size-info {
			display: inline;
			font-size: 12px;
			color: #666666;
		}
	}
}
</style>