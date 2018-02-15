var connection = require('../config');

var distributePool = function(matchID, winner) {

	var LDRWin = 20;
	var LDRLoss = 25;

	connection.query("SELECT `prizepool`, `total_bet` FROM `match_history` WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}
		var totalBet = results[0].total_bet;
		connection.query("SELECT * FROM `match_"+matchID+"`", function(error, results, fields){
			if(error){
				console.log(error);
			}
			var players = results;

			var winningTeamTotalBet = 0;
			var totalWinnings = 0;

			for(var i = 0; i < players.length; i++) {
				if(players[i].team == winner){
					winningTeamTotalBet += players[i].bet;
				}
			}

			var prizepool = totalBet - winningTeamTotalBet;
			var profit = Math.floor(prizepool * .1);
			prizepool -= profit;

			var save = [];

			for(var i = 0; i < players.length; i++) {
				var LPresult = players[i].bet;

				if(players[i].team == winner) { 
					//if a winner, then set LPresult to positive percent of prize pool & subtract amount from prizepool
					var percentOfPool = players[i].bet / winningTeamTotalBet;

					//console.log("Percent of Pool: " + percentOfPool*100 + "%");

					var win = Math.floor(percentOfPool * prizepool);
					LPresult += win;
					totalWinnings += win;

					save.push({
						userID: players[i].userID,
						LPresult: win
					});

					//console.log(LPresult);

					connection.query("UPDATE `users` SET `LP` = `LP` + "+LPresult+" + 10, `LP_earnings` = `LP_earnings` + "+LPresult+" + 10, `LDR` = `LDR` + "+LDRWin+" WHERE `userID` = '"+players[i].userID+"'", function(error, results, fields){
						if(error) {
							console.log(error);
						}
					});

					connection.query("SELECT * FROM `users` WHERE `userID` = '"+players[i].userID+"'", function(error, results, fields){
						if(error){
							console.log(error);
						}

						var LPwin;

						if(results[0].LDR > results[0].highestLDR) {
							connection.query("UPDATE `users` SET `highestLDR` = '"+results[0].LDR+"' WHERE `userID` = '"+results[0].userID+"'", function(error, results, fields){
								if(error){
									console.log(error);
								}
							});
						}

						for(var i = 0; i < save.length; i++) {
							if(parseInt(save[i].userID) == parseInt(results[0].userID)) {
								LPwin = save[i].LPresult;
							}
						}

						var matches = JSON.parse(results[0].matches);
						for(var i = 0; i < matches.length; i++) {
                            var mID = parseInt(matches[i].matchID);
                            
                            if(mID == matchID) {
                                matches[i].winner = true;
                                matches[i].LP = LPwin;
                                matches[i].LDR = LDRWin;
                                console.log(matches[i].LP);
                            }
                        }

                        matches = JSON.stringify(matches);
                        connection.query("UPDATE `users` SET `matches` = '"+matches+"' WHERE `userID` = '"+results[0].userID+"'", function(error, results, fields){
                        	if(error){
                        		console.log(error);
                        	}
                        });

					});

				} else {

					connection.query("UPDATE `users` SET `LDR` = `LDR` - "+LDRLoss+" WHERE `userID` = '"+players[i].userID+"'", function(error, results, fields){
						if(error){
							console.log(error);
						}
					});

					connection.query("SELECT * FROM `users` WHERE `userID` = '"+players[i].userID+"'", function(error, results, fields){
						if(error){
							console.log(error);
						}

						var matches = JSON.parse(results[0].matches);
						for(var i = 0; i < matches.length; i++) {
                            var mID = parseInt(matches[i].matchID);
                            
                            if(mID == matchID) {
                                matches[i].winner = false;
                                matches[i].LDR = LDRLoss;
                            }
                        }

                        matches = JSON.stringify(matches);
                        connection.query("UPDATE `users` SET `matches` = '"+matches+"' WHERE `userID` = '"+results[0].userID+"'", function(error, results, fields){
                        	if(error){
                        		console.log(error);
                        	}
                        });

					});
				}
			}

			prizepool -= totalWinnings;

			console.log("UNDISTRIBUTED EARNINGS: " + prizepool);

			connection.query("UPDATE `match_history` SET `prizepool` = '0', `profit` = `profit` + "+ (profit + prizepool) +" WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
				if(error){
					console.log(error);
				}

				connection.query("SELECT `profit` FROM `match_history` WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
					if(error){
						console.log(error);
					}
					var newProfit = results[0].profit;
					connection.query("UPDATE `cplinfo` SET `total_profit` = `total_profit` + "+newProfit+"", function(error, results, fields){
						if(error){
							console.log(error);
						}
					});
				});
			});
		});
	});
};

module.exports = distributePool;