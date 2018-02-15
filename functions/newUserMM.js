var checkMM = require('./checkMM');

var newUserMM = function(newUser, system) {

    if (newUser.LDR < 500) {
        //B5 -> B1
        //console.log('B5 -> B1');
        checkMM(-1, 500, system);
    } else if (newUser.LDR < 1200) {
        //S5 -> G4
        //console.log('S5 -> G4');
        checkMM(499, 1200, system);
    } else if (newUser.LDR < 2000) {
        //G3 -> P1
        //console.log('G3 -> P1');
        checkMM(1199, 2000, system);
    } else {
        //D5 & Higher
        //console.log('D5 & Higher');
        checkMM(1999, 10000000, system);
    }
};

module.exports = newUserMM;