var connection = require('../config');
var newUserMM  = require('./newUserMM');

var testLobby = function(numPlayers, lobbyID) {
	for(var i = 0; i < numPlayers; i++) {
		connection.query("SELECT * FROM `users` ORDER BY rand() LIMIT 1", function(error, results, fields){
			if(error){
				console.log(error);
			}

			var user = {
		        userID: results[0].userID,
		        LDR: results[0].LDR,
		        username: results[0].username,
		        bet: Math.floor(Math.random() * 1000),
	    	};

			connection.query("INSERT INTO `lobby_"+lobbyID+"`(`userID`, `username`, `host`, `LDR`, `bet`) VALUES ('"+user.userID+"','"+user.username+"', '0','"+user.LDR+"','"+user.bet+"')", function(error, results, fields){
			    if(error){
			        console.log(error);
			    }

			    user.LDR = 2000;
			    newUserMM(user);

			});
		});
	}
};

module.exports = testLobby;

