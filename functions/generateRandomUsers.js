var connection =            require('../config');

var generateRandomUsers = function(numUsers) {

    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < numUsers; i++) {
        var username = '';
        for (var j = 0; j < 8; j++) {
            username += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        var LDR = Math.floor(Math.random() * 500);
        console.log(username);

        connection.query("INSERT INTO `users`(`username`, `LDR`) VALUES ('" + username + "', '" + LDR + "') ", function(error, results, fields) {
            if (error) {
                console.log(error);
            }

        });
    }
};

module.exports = generateRandomUsers;