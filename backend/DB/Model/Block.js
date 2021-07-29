const {Sequelize, DataTypes, Model} = require('sequelize');
const sequelize = require('../db');

class Block extends Model {
}

Block.init({
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
		allowNull:false,
	},
	reward:{
		type:DataTypes.STRING,
		allowNull:false
	},
	penalty:{
		type:DataTypes.STRING,
		allowNull:false
	},
	msg_count:{
		type:DataTypes.INTEGER,
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
	modelName:'Block',
	tableName:'blocks',
});

module.exports = Block;