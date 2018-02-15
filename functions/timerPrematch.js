var connection =    require('../config');
var io =            require('../server.js').io;
var startMatch = 	require('./startMatch');
var getSockets = 	require('./getSockets');
var emitter = 		require('../server.js').emitter;

var timerPrematch = function(time, matchID, retries) {

	var playersIn = 0;

	connection.query('SELECT * FROM `match_' + matchID + '`', function(error, results, fields){

		if(error){
			console.log(error);
		}

		for(var i = 0; i < results.length; i++){
			if(results[i].inMatch === 1) {
				playersIn++;
			} else {
				//retry
				io.to(results[i].userID).emit('match-found', {
                    match: matchID
                });
			}
		}

		if(playersIn < 8 && retries < 10) {
			io.sockets.in('prematch_' + matchID).emit("numPlayersUpdate", {playersIn: playersIn, matchID: matchID});
			setTimeout(function(){
				timerPrematch(time+1, matchID, retries+1);
			}, 1000);
		} else {

			connection.query("UPDATE `match_history` SET `status` = 1 WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
				if(error){
					console.log(error);
				}
				var time = new Date();
		        var timestamp = Math.floor(time / 1000);
				io.sockets.in('prematch_' + matchID).emit('prematch_start', {time: timestamp, matchID: matchID});

				//30sec timer
				setTimeout(function(){
					//UPDATE MATCH STATUS
					connection.query("UPDATE `match_history` SET `status` = 2 WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
						if(error){
							console.log(error);
						}
						startMatch(matchID);
					});
				}, 30000);
			});
		}
	});
};

module.exports = timerPrematch;