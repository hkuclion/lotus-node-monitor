const {Sequelize, DataTypes, Model} = require('sequelize');
const sequelize = require('../db');
const SectorLog = require('./SectorLog');
const Message = require('./Message');

class Sector extends Model {
}

Sector.init({
	index:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	state:{
		type:DataTypes.STRING,
		allowNull:false,
	},
	order_id:{
		type:DataTypes.INTEGER,
	},
	pc_msg_id:{
		type:DataTypes.STRING,
	},
	c_msg_id:{
		type:DataTypes.STRING,
	},
	retries:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	active_epoch:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	expire_epoch:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	on_epoch:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	initial_pledge:{
		type:DataTypes.STRING,
		allowNull:false,
	},
	gas:{
		type:DataTypes.STRING,
		allowNull:false,
	},
}, {
	sequelize,
	modelName:'Sector',
	tableName:'sectors',
});

Sector.hasMany(SectorLog,{
	foreignKey:'sector_id'
});

module.exports = Sector;