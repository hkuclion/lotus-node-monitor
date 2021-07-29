<template>
	<table class="json-data-table" v-if="typeof value==='object' && value && options">
		<tr v-for="key of Object.keys(value)">
			<th>{{ options[key] && options[key].label? options[key].label : key }}</th>
			<td>
				<json-data
					v-if="options[key] && options[key].deep && typeof value[key]==='object' && value[key]"
					:value="value[key]" :options="options[key].options"
				></json-data>
				<template v-else>
					{{ options[key] && options[key].formatter ? options[key].formatter(value[key]) : value[key] }}
				</template>
			</td>
		</tr>
	</table>
	<span v-else>{{ JSON.stringify(value) }}</span>
</template>

<script>
export default {
	props:["value","options"],
	name:"JsonData"
}
</script>

<style scoped lang="scss">
.json-data-table{
	width: 100%;
	th, td {
		padding: 0 0.5em;
		white-space: nowrap;
	}
	th{
		width: 0;
		text-align: left;
		padding-left: 0;
	}
}
</style>