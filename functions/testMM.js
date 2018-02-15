var connection =            require('../config');
var io =                    require('../server.js').io;
var newUserMM =             require('./newUserMM');
var getDivisionFromLDR= 	require('./getDivisionFromLDR');

var testMM = function(lobbyID) {

	connection.query("SELECT * FROM `users` ORDER BY rand() LIMIT 1", function(error, results, fields){
		if(error){
			console.log(error);
		}

		if(results[0].userID == 1 || results[0].userID == 2) {
			return;
		}

		var LDR = Math.floor(Math.random() * 2500);

		var user = {
	        userID: results[0].userID,
	        LDR: LDR,
	        username: results[0].username,
	        bet: Math.floor(Math.random() * 1000),
    	};

    	user = getDivisionFromLDR(user);

    	connection.query("INSERT INTO `matchmaking_queue`(`userID`, `system`, `system_name`, `username`, `LDR`, `bet`, `lobbyID`, `countedLDR`) VALUES ('" + user.userID + "', 'psn', 'psn name', '"+user.username+"', '" + user.LDR + "', '" + user.bet + "', '"+lobbyID+"', '"+user.LDR+"')", function(error, results, fields) {
	        if (error) {
	            console.log(error);
	        }

	        connection.query("SELECT `join_time` FROM `matchmaking_queue` WHERE `userID` = '"+user.userID+"'", function(error, results, fields){
	        	if(error){
	        		console.log(error);
	        	}
	        	user.join_time = new Date(results[0].join_time);
	        	io.to('matchmaking_psn').emit('enter', user);
	        	newUserMM(user, 'psn');
	        });
    	});
	});
};

module.exports = testMM;