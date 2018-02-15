var ranks = require('../default/ranks');
var divisions = require('../default/divisions');

var getDivisionFromLDR = function(player){
	for(var i = 0; i < divisions.length; i++){
		var LDR = parseInt(player.LDR);
		if(LDR <= divisions[i]) {
			player.rank = ranks[i];
			break;
		} else {
			player.rank = ranks[i];
		}
	}
	return player;
};

module.exports = getDivisionFromLDR;