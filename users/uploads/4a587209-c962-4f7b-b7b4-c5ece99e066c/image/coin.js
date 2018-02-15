var request = require("ajax-request");
request('https://www.coinexchange.io/api/v1/getmarkets', function(err, res, body) {
	console.log(body);
});