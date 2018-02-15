var io = require('../server.js').io;
var session = require('../server.js').session;

var getSockets = function(userID) {
	var sockets = [];
	for(var key in io.sockets.connected) {
		if(io.sockets.connected[key].handshake.session.userID == userID) {
			sockets.push(key);
		}
	}
	return sockets;
};

module.exports = getSockets;