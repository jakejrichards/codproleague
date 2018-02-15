var connection = require('../config');

var isValidMatch = function(playersArr) {
	var players = playersArr.slice();
	var team1 = [];
	var team2 = [];
	var lobbies = {};

	players.sort(function(a, b){
		return a.lobbyID - b.lobbyID;
	});

	for(var i = 0; i < players.length; i++) {
		lobbies[players[i].lobbyID] = {
			count: 0,
			players: []
		}
	}

	for(var i = 0; i < players.length; i++) {
		lobbies[players[i].lobbyID].count += 1;
		lobbies[players[i].lobbyID].players.push(players[i]);
	}

	players.sort(function(a, b) {
		return a.join_time - b.join_time;
	});


	var i = 0;

	while(i < players.length) {

		if(team1.length == 4 && team2.length == 4) {
			break;
		}

		var lobbyID = players[i].lobbyID;

		if(lobbyID == 'solo') {

			if(team1.length < 4) {
				team1.push(players[i]);
			} else if(team2.length < 4) {
				team2.push(players[i]);
			}

			i++;

		} else {

			if(lobbies[lobbyID].count <= (4 - team1.length)) {
				for(var j = 0; j < lobbies[lobbyID].count; j++) {
					team1.push(lobbies[lobbyID].players[j]);
					i++;
				}
			} else if(lobbies[lobbyID].count <= (4 - team2.length)) {
				for(var j = 0; j < lobbies[lobbyID].count; j++) {
					team2.push(lobbies[lobbyID].players[j]);
					i++;
				}
			} else {
				i++;
			}
		}
	}

	if(team1.length == 4 && team2.length == 4) {

		team1.forEach(function(player1){
			player1.team = 'green';
		});

		team2.forEach(function(player2){
			player2.team = 'black';
		});

		return {
			success: true,
			team1: team1,
			team2: team2
		};
	} else {
		return {
			success: false,
			team1: [],
			team2: []
		};
	}
};

module.exports = isValidMatch;