const {Sequelize, DataTypes, Model} = require('sequelize');
const sequelize = require('../db');

class FetchHistory extends Model {
}

FetchHistory.init({
	// Model attributes are defined here
	source:{
		type:DataTypes.STRING,
		allowNull:false
	},
	result:{
		type:DataTypes.TEXT('medium'),
	}
}, {
	// Other model options go here
	sequelize, // We need to pass the connection instance
	modelName:'FetchHistory', // We need to choose the model name
	tableName:'fetch_histories',
});

module.exports = FetchHistory;