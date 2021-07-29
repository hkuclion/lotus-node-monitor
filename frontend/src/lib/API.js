let BASE_URL;
let a = document.createElement('A');
a.setAttribute('href', 'api/');
BASE_URL = a.href;

import axios from "axios";

const ENDPOINTS = {
	SYNC:'sync',
}

export class API{
	static request(endpoint, data) {
		if (!endpoint) throw new Error(`ENDPOINT[${endpoint}] not found`);

		return axios.request({
			method:'post',
			baseURL:BASE_URL,
			url:endpoint,
			//headers:{'X-Requested-With':'XMLHttpRequest'},
			data,
		});
	}
}

API.ENDPOINTS= ENDPOINTS;