const {Sequelize, DataTypes, Model} = require('sequelize');
const sequelize = require('../db');

class SectorLog extends Model {
}

SectorLog.init({
	sector_id:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	index:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	type:{
		type:DataTypes.STRING,
		allowNull:false,
	},
	message:{
		type:DataTypes.TEXT('medium'),
	},
	timestamp:{
		type:DataTypes.TIME,
	},
}, {
	sequelize,
	modelName:'SectorLog',
	tableName:'sector_logs',
});

module.exports = SectorLog;