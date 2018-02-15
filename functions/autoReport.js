var connection = require('../config');
var endMatch = require('./endMatch');

var autoReport = function() {
	connection.query("SELECT `prematch_time`, `matchID`, `status` FROM `match_history` WHERE `status` != 3", function(error, results, fields){
		if(error){
			console.log(error);
		}

		if(results.length > 0) {
			var matches = results;
			matches.forEach(function(match){
				var now = new Date();
				var startTime = new Date(match.prematch_time);
				if((now.getTime() - startTime.getTime()) >= 7200000) {
					connection.query("UPDATE `match_"+match.matchID+"` SET `report` = 'loss' WHERE `report` = ''", function(error, results, fields){
						if(error){
							console.log(error);
						}
						endMatch(match.matchID);
					});
				} else {
				}
			});
		}
	});
};

module.exports = autoReport;