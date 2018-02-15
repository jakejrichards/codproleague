var connection =            require('../config');

var getLDRfromID = function(userID) {
    connection.query("SELECT `LDR` FROM `users` WHERE `userID` = '" + userID + "'", function(error, results, fields) {
        if (error) {
            console.log(error);
        }
        if (results.length > 0) {
            console.log(results[0].LDR);
            return results[0].LDR;
        }
    });
};

module.exports = getLDRfromID;