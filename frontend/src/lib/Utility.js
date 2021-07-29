export default class Utility{
	static calcFee(feeString,decimals = 3) {
		if (feeString === '') return NaN;
		feeString = feeString.toString()
		let cut_length = Math.max(decimals, feeString.length - 18 + decimals);
		let value = feeString.toString().substring(0, cut_length);
		return Number((value * Math.pow(10, feeString.length - 18 - cut_length)).toPrecision(cut_length));
	}
}