var connection =            require('../config');
var io =                    require('../server.js').io;
var assignPlayers =         require('./assignPlayers');
var timerPrematch =         require('./timerPrematch');
var getSockets =            require("./getSockets");
var isValidMatch =          require("./isValidMatch");
var store =                 require('../server.js').store;
var emitter =               require('../server.js').emitter;

var setupMatch = function(LDRcutoffL, LDRcutoffH, system) {
    var t1 = Math.floor(Date.now());

    //GET PLAYERS FROM MATCHMAKING QUEUE
    connection.query("SELECT * FROM `matchmaking_queue` WHERE `countedLDR` < '" + LDRcutoffH + "' AND `countedLDR` > '" + LDRcutoffL + "' AND `system` = '"+system+"' ORDER BY `matchmaking_queue`.`join_time` ASC", function(error, results, fields) {
        var players = [];
        var totalBet = 0;
        var count = 0;
        var matchmaking = results;


        var checkObj = isValidMatch(matchmaking);
        var success = checkObj.success;
        var team1 = checkObj.team1;
        var team2 = checkObj.team2;

        if(success) {

        connection.query("SELECT `current_match` FROM `cplinfo`", function(error, results, fields) {
            if (error) {
                console.log(error);
            }
            var matchNum = results[0].current_match;
            var players = team1.concat(team2);
            //UPDATE CURRENT MATCH
            connection.query("UPDATE `cplinfo` SET `current_match` = '" + (matchNum + 1) + "'", function(error, results, fields) {
                if (error) {
                    console.log(error);
                }
            });

            var lobbiesDeleted = {};
            //FIND ALL LOBBY IDs
            for(var i = 0; i < players.length; i++) {
                if(Object.keys(lobbiesDeleted).indexOf(players[i].lobbyID) < 0) {
                    lobbiesDeleted[players[i].lobbyID] = 0;
                }
            }

            for(var i = 0; i < 8; i++) {
                //REMOVE PLAYERS FROM QUEUE
                connection.query("DELETE FROM `matchmaking_queue` WHERE `userID` = '" + players[i].userID + "'", function(error, results, fields) {
                    if (error) {
                        console.log(error);
                    }
                });

                //IF PLAYER IN LOBBY DISBAND LOBBY

                if(lobbiesDeleted[players[i].lobbyID] === 0) {
                    lobbiesDeleted[players[i].lobbyID] = 1;
                    if(players[i].lobbyID != 'solo') {
                        //CHECK IF LOBBY TABLE EXISTS
                        connection.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'codproleague' AND table_name = 'lobby_"+players[i].lobbyID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            } else {
                                if(results.length > 0) {
                                    var lobby = results[0].table_name;
                                    connection.query("DROP TABLE `"+lobby+"`", function(error, results, fields){
                                        if(error){
                                            console.log(error);
                                        }
                                    });
                                }
                            }
                        });
                    }
                }

                connection.query("SELECT * FROM `users` WHERE `userID` = '"+players[i].userID+"'",function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                    var matches;
                    if(results[0].matches.length !== 0) {
                        matches = JSON.parse(results[0].matches);
                    } else {
                        matches = [];
                    }

                    var matchObj = {
                        matchID: matchNum,
                        winner: null,
                        LP: matchmaking[count].bet, 
                        LDR: 0
                    };

                    matches.push(matchObj);
                    matches = JSON.stringify(matches);

                    connection.query("UPDATE `users` SET `status` = 'prematch', `matches` = '"+matches+"', `last_match` = '"+matchNum+"' WHERE `userID` = '"+ results[0].userID+"'", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }
                    });
                    count++;
                });

                totalBet += players[i].bet;
            }

            //CREATE NEW MATCH TABLE
            connection.query("CREATE TABLE `match_" + matchNum + "` (`userID` int(100) NOT NULL, `system_name` varchar(16) NOT NULL, `username` varchar(100) NOT NULL, `LDR` int(100) NOT NULL,`bet` int(100) NOT NULL,`team` varchar(100) NOT NULL,`gamemode_vote` varchar(100) NOT NULL, `inMatch` BOOLEAN NOT NULL, `report` varchar(100) NOT NULL, `host` BOOLEAN NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=latin1", function(error, results, fields) {
                if (error) {
                    console.log(error);
                }

                //ADD USERS TO THE MATCH TABLE
                var hostSelected = players[Math.floor(Math.random() * players.length)].userID;
                for (var i = 0; i < players.length; i++) {
                    var randomHostNum = 0;
                    if(players[i].userID == hostSelected) {
                        randomHostNum = 1;
                    }
                    connection.query("INSERT INTO `match_" + matchNum + "`(`userID`, `system_name`, `username`, `LDR`, `bet`, `team`, `gamemode_vote`, `host`) VALUES ('" + players[i].userID + "','"+players[i].system_name+"','"+players[i].username+"', '" + players[i].LDR + "', '" + players[i].bet + "', '" + players[i].team + "', 'random', '"+randomHostNum+"')", function(error, results, fields) {
                        if (error) {
                            console.log(error);
                        }
                    });
                }

                //UPDATE CLIENT FOR NEW MATCH CREATION
                var time = new Date().getTime() / 1000;
                var timestamp = Math.floor(time);
                timerPrematch(timestamp, matchNum, 0);
                
                //CREATE NEW MATCH WITH NEXT MATCH ID
            	connection.query("INSERT INTO `match_history`(`matchID`,`system`,`total_bet`,`status`) VALUES ('" + matchNum + "','"+system+"','" + totalBet + "', '0')", function(error, results, fields) {
	                if (error) {
	                    console.log(error);
	                }
	                io.to('matchmaking_'+system).emit('exit', players);
                    players.forEach(function(player){
                        io.to(player.userID).emit('match-found', {
                            match: matchNum
                        });
                        io.to(player.userID).emit('notify', {
                            status: "success",
                            message: "You have successfully found a match! <a href='/prematch/"+matchNum+"'>Click to join!</a>"
                        });
                    });
                    var t2 = Math.floor(Date.now());
                    console.log("Match setup executed in " + (t2 - t1) + " milliseconds.");
            	});
            });
        });
        } else {
            console.log("NO MATCH CREATED");
        }
    });  
};

module.exports = setupMatch;