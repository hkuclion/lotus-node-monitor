const fetch = require('node-fetch');
const qs = require('querystring');
const FetchHistory = require('../DB/Model/FetchHistory');
const Utility = require('../Utility/tool');
const {URLSearchParams} = require('url');
const {REQUEST_WAIT}=require('./Config');

let drivers = {
	"HTTP_GET":null,
	"TEXT_RPC":null,
	"COMMAND_LINE":null,
	"FIRE_STAR":null,
}

drivers['HTTP_GET'] = function(url, data){
	console.log(`REQUEST URL ${url}`,JSON.stringify(data));
	return Utility.waitTime(REQUEST_WAIT.HTTP * 1000).then(()=>{
		let querystring = qs.stringify(data);

		if (querystring.length) {
			url += '?' + querystring;
		}

		return fetch(url, {
			method:"GET",
			headers:{
				"content-type":"application/json",
				"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
			},
		}).then((response) => {
			if (response.status === 200) {
				return response.text();
			} else {
				return Promise.reject(response.statusText);
			}
		});
	});
}

drivers['TEXT_RPC'] = function (url, data) {
	console.log(`REQUEST URL ${url}`, JSON.stringify(data));
	return Utility.waitTime(REQUEST_WAIT.LOTUS * 1000).then(() => {
		return fetch(url, {
			method:"POST",
			headers:{
				"content-type":"application/json",
			},
			body:JSON.stringify(data),
		}).then((response) => {
			if (response.status === 200) {
				return response.text();
			} else {
				throw new Error(response.statusText);
			}
		});
	});
}

drivers['FIRE_STAR'] = function (url, data) {
	console.log(`REQUEST FIRESTAR URL ${url}`);
	const params = new URLSearchParams();
	//console.log(data);
	for(let key in data) {
		params.append(key, data[key]);
	}
	params.append("sign", Utility.fire_star_sign(data));
	//console.log(params);
	return fetch(url, {
		method:"POST",
		body:params,
	}).then((response) => {
		if (response.status === 200) {
			return response.json();
		} else {
			throw new Error(response.statusText);
		}
	});
}


async function api_request(driver, source, data, cache = false){
	if(drivers[driver]){
		let identifier = `${source} ${JSON.stringify(data)}`;
		
		if(cache){
			let exist_history = await FetchHistory.findOne({
				where:{
					'source':identifier
				}
			});
			
			if(exist_history){
				return exist_history.result;
			}
		}
		
		try {
			let result = await drivers[driver](source, data);
			if (cache) {
				let new_history = FetchHistory.build({
					'source':identifier,
					result,
				});
				await new_history.save();
			}

			return result;
		}
		catch (e){
			throw e;
		}
	}
	else{
		throw new Error(`fetch::api_request Driver not implemented[${driver}]`);
	}
}

module.exports = api_request;