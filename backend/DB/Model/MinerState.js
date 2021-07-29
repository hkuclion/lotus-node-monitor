const {Sequelize, DataTypes, Model} = require('sequelize');
const sequelize = require('../db');

class MinerState extends Model {
}

MinerState.init({
	time:{
		type:DataTypes.TIME,
	},
	owner_address:{
		type:DataTypes.STRING,
		allowNull:false
	},
	owner_balance:{
		type:DataTypes.STRING,
		allowNull:false
	},
	worker_address:{
		type:DataTypes.STRING,
		allowNull:false
	},
	worker_balance:{
		type:DataTypes.STRING,
		allowNull:false
	},
	raw_power:{
		type:DataTypes.STRING,
		allowNull:false
	},
	adj_power:{
		type:DataTypes.STRING,
		allowNull:false
	},
	total_raw_power:{
		type:DataTypes.STRING,
		allowNull:false
	},
	total_adj_power:{
		type:DataTypes.STRING,
		allowNull:false
	},
	block_count:{
		type:DataTypes.INTEGER,
		allowNull:false
	},
	total_rewards:{
		type:DataTypes.STRING,
		allowNull:false
	},
	sector_active:{
		type:DataTypes.INTEGER,
		allowNull:false
	},
	sector_live:{
		type:DataTypes.INTEGER,
		allowNull:false
	},
	sector_faulty:{
		type:DataTypes.INTEGER,
		allowNull:false
	},
	sector_recovering:{
		type:DataTypes.INTEGER,
		allowNull:false
	},
	sector_pledge_balance:{
		type:DataTypes.INTEGER,
		allowNull:false
	},
	available_balance:{
		type:DataTypes.STRING,
		allowNull:false
	}, 
	vesting:{
		type:DataTypes.STRING,
		allowNull:false
	},
	report_id:{
		type:DataTypes.INTEGER,
	},
	reported_at:{
		type:DataTypes.TIME,
		allowNull:true
	},
}, {
	sequelize,
	modelName:'MinerState',
	tableName:'miner_states',
});

module.exports = MinerState;