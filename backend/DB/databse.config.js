const { DB } = require('../Utility/Config')

module.exports = {
	// 打开哪个数据库
	database:DB.NAME,
	// 用户名
	username:DB.USERNAME,
	// 密码
	password:DB.PASSWORD,
	// 使用哪个数据库程序
	dialect:'mysql',
	// 地址
	host:DB.HOST,
	// 端口
	port:DB.PORT,
	// 连接池
	pool:{
		max:5,
		min:0,
		acquire:30000,
		idle:10000
	},
	// 数据表相关的全局配置
	define:{
		// 是否冻结表名
		// 默认情况下，表名会转换为复数形式
		//freezeTableName:true,
		// 是否为表添加 createdAt 和 updatedAt 字段
		// createdAt 记录表的创建时间
		// updatedAt 记录字段更新时间
		timestamps:true,
		// 是否为表添加 deletedAt 字段
		// 默认情况下, destroy() 方法会删除数据，
		// 设置 paranoid 为 true 时，将会更新 deletedAt 字段，并不会真实删除数据。
		paranoid:false,
		createdAt:'created_at',
		updatedAt:'updated_at',
	},
	timezone:'+08:00'
}