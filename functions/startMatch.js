var connection = 			require('../config');
var io =         			require('../server.js').io;
var getSockets =            require("./getSockets");
var store =                 require('../server.js').store;
var emitter =               require('../server.js').emitter;

var startMatch = function(matchID) {
	var gamemode = "";
	var map = "";
	var gms = ['hp', 'ctf', 'snd'];
	var counts = [
		{name: 'hp', count: 0},
		{name: 'snd', count: 0},
		{name: 'ctf', count: 0},
		{name: 'random', count: 0}
	];

	var sndMaps = ["Aachen", "Ardennes Forest", "Gibraltar", "Sainte Marie du Mont", "Flak Tower"];
	var hpMaps = ["Ardennes Forest", "Gibraltar", "Sainte Marie du Mont", "Pointe du Hoc"];
	var ctfMaps = ["Ardennes Forest", "Gibraltar", "Sainte Marie du Mont", "Pointe du Hoc"];

	var ties = [];
	//GET GAMEMODE VOTES
	connection.query("SELECT * FROM `match_"+matchID+"`", function(error, results, fields){
		if(error){
			console.log(error);
		}

		var matchInfo = results;

		for(var i = 0; i < results.length; i++) {
			gm = results[i].gamemode_vote;
			if(gm === 'hp'){
				counts[0].count++;
			} else if(gm === 'snd'){
				counts[1].count++;
			} else if(gm === 'ctf'){
				counts[2].count++;
			} else {
				counts[3].count++;
			}
		}

		var max = counts[0];
		ties.push(max);

		for(var i = 1; i < counts.length; i++) {
			if(counts[i].count > max.count) {
				max = counts[i];
				ties.splice(0, ties.length);
				ties.push(max);
			} else if(counts[i].count === max.count) {
				ties.push(counts[i]);
			}
		}

		//CHECK FOR TIES
		if(ties.length === 4) {
			gamemode = gms[Math.floor(Math.random() * gms.length)];
		} else if(ties.length === 2) {
			var random = -1;
			for(var i = 0; i < 2; i++) {
				if(ties[i].name === "random") {
					random = i;
				}
			}
			if(random !== -1) {
				ties.splice(random, 1);
				gamemode = ties[0].name;
			} else {
				gamemode = ties[Math.floor(Math.random() * ties.length)].name;
			}
		} else if(ties.length === 1) {
			if(ties[0].name === "random") {
				var random = Math.floor(Math.random() * gms.length);
				gamemode = gms[random];
			} else {
				gamemode = ties[0].name;
			}
		}

		if(gamemode === 'snd') {
			map = sndMaps[Math.floor(Math.random() * sndMaps.length)];
		} else if(gamemode === "hp") {
			map = hpMaps[Math.floor(Math.random() * hpMaps.length)];
		} else {
			map = ctfMaps[Math.floor(Math.random() * ctfMaps.length)];
		}

		connection.query("SELECT `userID`, `bet`, `LDR` FROM `match_"+matchID+"`", function(error, results, fields){
			if(error){
				console.log(error);
			}
			if(results.length > 0) {
				var count = 0;
				var players = results.slice();
				for(var i = 0; i < results.length; i++) {

					connection.query("SELECT * FROM `users` WHERE `userID` = '"+results[i].userID+"'",function(error, results, fields){
	                    if(error){
	                        console.log(error);
	                    }

	                    var matches = JSON.parse(results[0].matches);

	                    for(var i = 0; i < matches.length; i++) {
                            var mID = parseInt(matches[i].matchID);
                            if(mID == matchID) {
                                matches[i].LP = players[count].bet;
                                matches[i].LDR = players[count].LDR;
                            }
                        }
	                    matches = JSON.stringify(matches);

	                    connection.query("UPDATE `users` SET `status` = 'match', `matches` = '"+matches+"' WHERE `userID` = '"+ results[0].userID+"'", function(error, results, fields){
	                        if(error){
	                            console.log(error);
	                        }
	                    });
	                    count++;
	                });
				}

				connection.query("SELECT `total_bet` FROM `match_history` WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
					if(error){
						console.log(error);
					}
					if(results.length > 0) {
						var totalBet = results[0].total_bet;
						var prizePool = Math.floor(totalBet*.9);
						var profits = totalBet - prizePool;

						connection.query("UPDATE `match_history` SET `gamemode` = '"+gamemode+"', `map` = '"+map+"',`prizepool` = '"+prizePool+"', `profit` = '"+profits+"' WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
							if(error){
								console.log(error);
							}

							io.to('prematch_' + matchID).emit('start', {
								matchID: matchID
							});

						});
					}
				});
			}
		});
	});
};

module.exports = startMatch;