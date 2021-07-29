const path = require('path')
const fs = require('fs')
const Koa = require('koa')
const koa_static = require('koa-static')
const {
	REMOTE_SERVER_URL,
	LOCAL_LISTEN_IP,
	LOCAL_LISTEN_PORT,
	STATIC_PATH
} = JSON.parse(fs.readFileSync(path.resolve(__dirname,'config.json'),{ encoding:"utf8" }));


const app = new Koa();
app.use(koa_static(path.resolve(__dirname, STATIC_PATH)))

//https://blog.csdn.net/csu_passer/article/details/105966421
const koaConnect = require('koa2-connect');
const httpProxyMiddleware = require('http-proxy-middleware');
const httpProxy = httpProxyMiddleware.createProxyMiddleware;

function proxy(context, options) {
	let proxy;

	if (typeof options === 'string') {
		options = {target:options};
	}

	proxy = httpProxy(context, options);

	return async function (ctx, next) {
		await koaConnect(proxy)(ctx, next);
	};
}

app.use(proxy('/websocket', {
	target:`ws://${REMOTE_SERVER_URL}/websocket`,
	changeOrigin:true,
	pathRewrite:{
		'^/websocket':''
	},
	ws:true,
	secure:false
}));

if(LOCAL_LISTEN_IP !== null) {
	app.listen(LOCAL_LISTEN_PORT || process.env.PORT, LOCAL_LISTEN_IP);
	console.log(`Proxy started on ${LOCAL_LISTEN_IP}:${LOCAL_LISTEN_PORT || process.env.PORT}`)
}
else{
	app.listen(LOCAL_LISTEN_PORT || process.env.PORT);
	console.log(`Proxy started on Port:${LOCAL_LISTEN_PORT || process.env.PORT}`)

}