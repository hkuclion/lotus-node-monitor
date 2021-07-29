const {Sequelize} = require('sequelize');
const config = require('./databse.config');
const sequelize = new Sequelize(config)

module.exports = sequelize;