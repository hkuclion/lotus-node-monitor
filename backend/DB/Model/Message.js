const {Sequelize, DataTypes, Model} = require('sequelize');
const sequelize = require('../db');

class Message extends Model {
}

Message.init({
	cid:{
		type:DataTypes.STRING,
		allowNull:false
	},
	epoch:{
		type:DataTypes.INTEGER,
		allowNull:false,
	},
	timestamp:{
		type:DataTypes.TIME,
	},
	from_id:{
		type:DataTypes.STRING,
		allowNull:false
	},
	from_address:{
		type:DataTypes.STRING,
		allowNull:false
	},
	to_id:{
		type:DataTypes.STRING,
		allowNull:false
	},
	to_address:{
		type:DataTypes.STRING,
		allowNull:false
	},
	value:{
		type:DataTypes.STRING,
		allowNull:false
	},
	method:{
		type:DataTypes.STRING,
		allowNull:false
	},
	params:{
		type:DataTypes.TEXT('medium'),
	},
	fee_burn:{
		type:DataTypes.STRING,
		allowNull:false
	},
	fee_over_estimation:{
		type:DataTypes.STRING,
		allowNull:false
	},
	fee_penalty:{
		type:DataTypes.STRING,
		allowNull:false
	},
	fee_tip:{
		type:DataTypes.STRING,
		allowNull:false
	},
	fee_refund:{
		type:DataTypes.STRING,
		allowNull:false
	},
	value_burn:{
		type:DataTypes.STRING,
		allowNull:false
	},
}, {
	sequelize,
	modelName:'Message',
	tableName:'messages',
});

module.exports = Message;