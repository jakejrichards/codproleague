var connection =            require('../config');
var distributePool =        require('./distributePool');

var endMatch = function(matchID) {
    connection.query("SELECT * FROM `match_"+matchID+"`", function(error, results, fields){
    	if(error){
    		console.log(error);
    	}
    	if(results.length > 0) {
    		var reportCount = 0;
    		var green = [];
    		var black = [];
    		var greenVote = 0;
    		var blackVote = 0;
    		for(var i = 0; i < results.length; i++) {
    			if(results[i].report == "win" || results[i].report == "loss") {
    				reportCount++;
    			}
    			if(results[i].team == "green") {
    				green.push(results[i]);
    			} else {
    				black.push(results[i]);
    			}
    		}

    		if(reportCount >= 8) {
    			for(var i = 0; i < green.length; i++) {
    				if(green[i].report == "win") {
    					greenVote++;
    				} else {
    					blackVote++;
    				}

    				if(black[i].report == "win") {
    					blackVote++;
    				} else {
    					greenVote++;
    				}
    			}

    			if(greenVote >= 5) {
    				//GREEN TEAM WON
    				connection.query("UPDATE `match_history` SET `winner` = 'green', `status` = '3' wHERE `matchID` = '"+matchID+"'", function(error, results, fields){
    					if(error){
    						console.log(error);
    					}
                        for(var i = 0; i < green.length; i++) {

                            connection.query("SELECT * FROM `users` WHERE `userID` = '"+green[i].userID+"'",function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                var matches = JSON.parse(results[0].matches);
                                
                                for(var i = 0; i < matches.length; i++) {
                                    var mID = parseInt(matches[i].matchID);
                                    
                                    if(mID == matchID) {
                                        
                                        matches[i].winner = true;
                                    }
                                }
                                
                                var userID = results[0].userID;      
                                matches = JSON.stringify(matches);
                                connection.query("UPDATE `users` SET `status` = 'none', `matches` = '"+matches+"', `winstreak` = `winstreak` + 1, `wins` = `wins` + 1 WHERE `userID` = '"+ userID +"'", function(error, results, fields){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            });

                            connection.query("SELECT * FROM `users` WHERE `userID` = '"+black[i].userID+"'",function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                var matches = JSON.parse(results[0].matches);
                                
                                for(var i = 0; i < matches.length; i++) {
                                    var mID = parseInt(matches[i].matchID);
                                    
                                    if(mID == matchID) {
                                        
                                        matches[i].winner = false;
                                    }
                                }
                                
                                var userID = results[0].userID;      
                                matches = JSON.stringify(matches);
                                connection.query("UPDATE `users` SET `status` = 'none', `matches` = '"+matches+"', winstreak = 0, `losses` = `losses` + 1 WHERE `userID` = '"+ userID +"'", function(error, results, fields){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            });
                        }
    				});

                    distributePool(matchID, 'green');

    			} else if(blackVote >= 5) {
    				//BLACK TEAM WON
    				connection.query("UPDATE `match_history` SET `winner` = 'black', `status` = '3' wHERE `matchID` = '"+matchID+"'", function(error, results, fields){
    					if(error){
    						console.log(error);
    					}
                        for(var i = 0; i < green.length; i++) {

                            connection.query("SELECT * FROM `users` WHERE `userID` = '"+green[i].userID+"'",function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                var matches = JSON.parse(results[0].matches);
                                
                                for(var i = 0; i < matches.length; i++) {
                                    var mID = parseInt(matches[i].matchID);
                                    
                                    if(mID == matchID) {
                                        
                                        matches[i].winner = false;
                                    }
                                }
                                
                                var userID = results[0].userID;      
                                matches = JSON.stringify(matches);
                                connection.query("UPDATE `users` SET `status` = 'none', `matches` = '"+matches+"', `winstreak` = 0, `losses` = `losses` + 1 WHERE `userID` = '"+ userID +"'", function(error, results, fields){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            });

                            connection.query("SELECT * FROM `users` WHERE `userID` = '"+black[i].userID+"'",function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                var matches = JSON.parse(results[0].matches);
                                
                                for(var i = 0; i < matches.length; i++) {
                                    var mID = parseInt(matches[i].matchID);
                                    
                                    if(mID == matchID) {
                                        
                                        matches[i].winner = true;
                                    }
                                }
                                var userID = results[0].userID;      
                                matches = JSON.stringify(matches);
                                connection.query("UPDATE `users` SET `status` = 'none', `matches` = '"+matches+"', `winstreak` = `winstreak` + 1, `wins` = `wins` + 1 WHERE `userID` = '"+ userID +"'", function(error, results, fields){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            });
                        }
    				});
                    distributePool(matchID, 'black');
    			} else {
    				//DISPUTE
    				connection.query("UPDATE `match_history` SET `winner` = 'dispute', `status` = '3' wHERE `matchID` = '"+matchID+"'", function(error, results, fields){
    					if(error){
    						console.log(error);
    					}
                        for(var i = 0; i < green.length; i++) {

                            connection.query("SELECT * FROM `users` WHERE `userID` = '"+green[i].userID+"'",function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                var matches = JSON.parse(results[0].matches);

                                for(var i = 0; i < matches.length; i++) {
                                    var mID = parseInt(matches[i].matchID);
                                    if(mID == matchID) {
                                        matches[i].winner = 'dispute'
                                    }
                                }
                                var userID = results[0].userID;      
                                matches = JSON.stringify(matches);
                                connection.query("UPDATE `users` SET `status` = 'none', `matches` = '"+matches+"' WHERE `userID` = '"+ userID +"'", function(error, results, fields){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            });

                            connection.query("SELECT * FROM `users` WHERE `userID` = '"+black[i].userID+"'",function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                var matches = JSON.parse(results[0].matches);
                                for(var i = 0; i < matches.length; i++) {
                                    var mID = parseInt(matches[i].matchID);
                                    if(mID == matchID) {
                                        matches[i].winner = 'dispute'
                                    }
                                }

                                var userID = results[0].userID;      
                                matches = JSON.stringify(matches);
                                connection.query("UPDATE `users` SET `status` = 'none', `matches` = '"+matches+"' WHERE `userID` = '"+ userID +"'", function(error, results, fields){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            });
                        }
    				});
    			}

    		}
    	}
    });
};

module.exports = endMatch;