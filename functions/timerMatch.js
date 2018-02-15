var connection = require('../config');
var io = require('../server.js').io;

var timerMatch = function(time, matchID) {
	setTimeout(function(){
		//UPDATE MATCH STATUS
		connection.query("UPDATE `match_history` SET `status` = 3 WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
			if(error){
				console.log(error);
			}
			console.log("Match Started.");
			io.sockets.in('prematch_' + matchID).emit('match_start', {matchID: matchID});
		});
	}, 15000);
};

module.exports = timerMatch;