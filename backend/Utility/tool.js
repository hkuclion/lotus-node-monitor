const BigInt = require('big-integer');
const MD5 = require('md5');

let defaultSecret = 'ffd760afdf0d917198c90df8a14a977b';

module.exports = class Utility{
	static formatSize(size, pointLength, units) {
		let unit;
		units = units || ['B', 'K', 'M', 'G', 'TB'];
		while ((unit = units.shift()) && size > 1024) {
			size = size / 1024;
		}
		return (unit === 'B' ? size : size.toFixed(pointLength === undefined ? 2 : pointLength)) + unit;
	}

	static waitTime(time) {
		return new Promise(resolve => {
			setTimeout(resolve, time);
		});
	}
	
	static calcFee(input, decimals=6, precision=18){
		input = input.toString().padStart(precision,"0");
		let intermediate = input.substr(0, input.length - precision+decimals );
		
		return intermediate*Math.pow(10, -decimals).toFixed(decimals);
	}
	
	static calcSpace(input, unit, decimals = 3){
		let size = BigInt(input);
		size = size.multiply(Math.pow(10, decimals));
		
		switch(unit.toUpperCase()){
			case 'TB':
				size = size.divide(1024);
			case 'GB':
				size = size.divide(1024);
			case 'MB':
				size = size.divide(1024);
			case 'KB':
				size = size.divide(1024);
			case 'B':
				break;
			default:
				throw new Error(`unit not supported ${unit}`);
		}
		
		return size.toJSNumber() / Math.pow(10, decimals);
	}
	
	static fire_star_sign(data, secret = defaultSecret) {
		let entries = Object.entries(data).sort((entry1, entry2) => entry1[0].localeCompare(entry2[0]));
		entries.push(['secret', secret]);
		let signString = entries.map(entry => entry[0] + '=' + entry[1]).join('&');
		return MD5(signString);
	}
	
	static fire_star_check_sign(data = {}){
		let sign = data.sign;
		let check_data = Object.assign({},data);
		delete check_data.sign;
		
		let check_sign = Utility.fire_star_sign(check_data);
		return sign === check_sign;
	}
}