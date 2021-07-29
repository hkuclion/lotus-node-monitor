const path = require('path')
const Koa = require('koa')
const Router = require('koa-router')
const koa_websocket = require('koa-websocket')
const koa_bodyParser = require('koa-bodyparser')
const koa_static = require('koa-static')

const router = new Router()
const wsRouter = new Router()
const app = koa_websocket(new Koa());

const websocketProcessor = require('./Processor/WebsocketProcessor');
const epoch = require('./Processor/Epoch');
const crond = require('./Processor/Crond');
const state = require('./Processor/State');
const Utility = require('./Utility/tool');

app.use(koa_bodyParser());
app.use(koa_static(
	path.join(__dirname, 'dist')
))

router.post('/api/sync', async(ctx) => {
	let result = await crond.run(true);

	ctx.body = JSON.stringify({
		result,
	})
});

wsRouter.get('/websocket/', async (ctx) => {
	websocketProcessor.handle(ctx.websocket);
});

app.ws
	.use(wsRouter.routes())
	.use(wsRouter.allowedMethods());

app
	.use(router.routes())
	.use(router.allowedMethods());

app.listen(process.env.PORT || 9243);
console.log(`APP start on port ${process.env.PORT || 9243}`)