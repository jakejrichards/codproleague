var assignPlayers = function(players) {
    //SORT PLAYERS BY LDR
    var sortPlayers = players;

    //SORT PLAYERS
    sortPlayers.sort(function(a, b) {
        return a.LDR - b.LDR;
    });

    for (var i = 0; i < sortPlayers.length; i++) {
        if (i === 0 || i === 2 || i === 5 || i === 7) {
            sortPlayers[i].team = 'green';
        } else {
            sortPlayers[i].team = 'black';
        }
    }

    return sortPlayers;
};

module.exports = assignPlayers;