var connection = require('../config');
var io = require('../server.js').io;
var client = require('../server.js').client;

var updateCurrentGames = function() {
    connection.query("SELECT COUNT(*) AS `count` FROM `match_history` WHERE `status` != 3", function(error, results, fields){
        if(error){
            console.log(error);
        }

        var currentGamesCount = results[0].count;
        //UPDATE USERS ONLINE
        io.emit("current-games", {
            currentGames: currentGamesCount
        })
    });
    setTimeout(updateCurrentGames, 5000);
};

module.exports = updateCurrentGames;