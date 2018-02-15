var connection =            require('../config');
var setupMatch =            require('./setupMatch');

var checkMM = function(LDRcutoffL, LDRcutoffH, system) {
    connection.query("SELECT * FROM `matchmaking_queue` WHERE `countedLDR` < '" + LDRcutoffH + "' AND `countedLDR` > '" + LDRcutoffL + "' AND `system` = '"+system+"'", function(error, results, fields) {
        if (error) {
            console.log(error);
        }

        if (results.length >= 8) {
            setupMatch(LDRcutoffL, LDRcutoffH, system);
        } else {
            //console.log('not enough players in this division to set up match.');
        }
    });
};

module.exports = checkMM;