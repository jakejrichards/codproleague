var express = require("express");
var session = require("express-session");
var cookieParser = require('cookie-parser');
var redis = require("redis");
var ioredis = require('socket.io-ioredis');
var client = redis.createClient(6379, 'localhost');
var redisStore = require("connect-redis")(session);
var app = express();
var store = new redisStore({client : client});

var options = {
    secret: 'Rk/+f+0dWj2?Q=Y(34Q(t;#@i7S(x1MrH7Q~`J,WkBe82Na5#[Wphc3GQbFz.f)',
    store: store,
    resave: false,
    saveUninitialized: false,
    unset: 'destroy'
};

var bcrypt = require("bcrypt");
var _ = require("underscore");
var ejs = require('ejs');
var bodyParser = require('body-parser');
var busboy = require('express-busboy');
var server = require('http').createServer(app);
var request = require('request');
var paypal = require("paypal-rest-sdk");
var uniqid = require('uniqid');
var emitter = require('socket.io-emitter')(client);
var io = require('socket.io')(server);
// var ios = require("socket.io-express-session");
var fs = require('fs');
var mv = require('mv');
var sharedsession = require("express-socket.io-session");
module.exports.client = client;
module.exports.store = store;
module.exports.session = session;
module.exports.io = io;
module.exports.emitter = emitter;

var connection = require('./config');
var auth = require('./routes/auth');

//DEFAULTS
var ranks = require('./default/ranks');
var divisions = require('./default/divisions');

//FUNCTIONS
var assignPlayers = require('./functions/assignPlayers');
var timerPrematch = require('./functions/timerPrematch');
var checkMM = require('./functions/checkMM');
var generateRandomUsers = require('./functions/generateRandomUsers');
var getDivisionFromLDR = require('./functions/getDivisionFromLDR');
var getLDRfromID = require('./functions/getLDRfromID');
var newUserMM = require('./functions/newUserMM');
var setupMatch = require('./functions/setupMatch');
var timerMatch = require('./functions/timerMatch');
var testMM = require('./functions/testMM');
var testLobby = require("./functions/testLobby");
var startMatch = require('./functions/startMatch');
var endMatch = require('./functions/endMatch');
var updateCurrentGames = require("./functions/updateCurrentGames");
var getSockets = require('./functions/getSockets');
var autoReport = require("./functions/autoReport");

var usersOnline = 0;

//PAYPAL
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'CLIENT_ID',
    'client_secret': 'CLIENT_SECRET'
});

//MIDDLEWARE
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
busboy.extend(app, {
    upload: true,
    path: __dirname + '/users/uploads'
});

session = session(options);
app.use(session);
app.set('view engine', 'ejs');

//CUSTOM MIDDLEWARE
app.use(function(req, res, next){

    res.locals.alertMsg = '';

    if(req.session.loggedIn && req.session.user.banned == 1) {
        console.log('test');
        res.render("banned", {
            unbanned: req.session.user.unbanned
        });
        return;
    }

    if(req.session.notifications != undefined) {
        res.locals.notifications = req.session.notifications;
    } else {
        res.locals.notifications = [];
    }

    if(req.session.unread != undefined) {
        res.locals.unread = req.session.unread;
    } else {
        res.locals.unread = 0;
    }

    if(req.session.alertMsg != undefined && req.session.alertMsg != '') {
        res.locals.alertMsg = req.session.alertMsg;
        res.locals.alertType = req.session.alertType;
    }

    req.session.alertMsg = '';
    req.session.alertType = '';

    res.locals.status = req.session.status;

    next();
});

//UPDATE CURRENT GAMES AND USERS ONLINE LOOP
updateCurrentGames();
setInterval(autoReport, 1800000);

//TESTS
/*setInterval(function(){

    var userID = 1000;
    var lobbyID = 400;
    var friendID = 491;

    store.all(function(error, sessions){
        var friendSess = sessions.find(x => x.userID == friendID);
        var update = false;
        if(friendSess != undefined) {
            var friendSessID = friendSess.id;
            var obj = {
                type: 'lobby-invite',
                fromUserID: userID,
                fromUsername: "Krabs",
                from_avatarURL: '/users/avatars/491/avatar.png',
                lobbyID: lobbyID,
                seen: false
            }
            if(friendSess.notifications != undefined) {
                var temp = friendSess.notifications.find(x => x.type == 'lobby-invite' && x.fromUserID == userID && x.lobbyID == lobbyID && x.seen == true);
                if(temp != undefined) {
                    var index = friendSess.notifications.indexOf(temp);
                    console.log(index);
                    console.log(friendSess.notifications[index]);
                    friendSess.notifications[index].seen = false;
                    update = true;
                    
                } else if(friendSess.notifications.find(x => x.type == 'lobby-invite' && x.fromUserID == userID && x.lobbyID == lobbyID) == undefined) {

                    if(friendSess.notifications.length > 5) {
                        friendSess.notifications.pop();
                    }
                    friendSess.notifications.push(obj);
                    update = true;
                    friendSess.unread += 1;
                } else {
                    console.log("Already received an identical invite");
                }
            } else {
                friendSess.notifications = [obj];
                update = true;
                friendSess.unread = 1;
            }
            if(update) {
                store.set(friendSessID, friendSess, function(error){
                    if(error){
                        console.log(error);
                    }
                    store.get(friendSessID, function(error, session){
                        console.log(session.notifications);
                    });
                    console.log("UPDATED USER NOTIFICATIONS");
                });
            }
        } else {
            console.log("This user is not logged in");
        }
    });

    io.to(491).emit('new-invite', {
        from_username: 'Krabs',
        from_avatarURL: '/users/avatars/491/avatar.png',
        from_userID: 1000,
        lobbyID: 400
    });

}, 5000);*/

/*setInterval(function(){
    io.to('lobby_6nlgiw6wxj9hnf39e').emit('player-joined-lobby', {
        userID: 123,
        username: "jakerich123",
        avatarURL: '/users/avatars/491/avatar.png',
        LDR: 499,
        rank: 'Bronze 5',
        bet: 100,
        host: 0
    });
}, 5000);*/

/*setInterval(function(){
    io.sockets.in('matchmaking').emit('message', 'YOU ARE IN MATCHMAKING SOCKET ROOM');
}, 1000);*/

/*setInterval(function(){
    if(getSocket(491) != undefined) {
        var userSocket = getSocket(491);
        io.sockets.connected[userSocket].emit('new-invite', {
            from_userID: 1000,
            lobbyID: 999
        });
    }
}, 5000);*/

/*setInterval(function(){
    if(getSocket(491) != undefined) {
        io.sockets.connected[getSocket(491)].emit('player-joined-lobby', {
            username: "NeverOutslayed",
            LDR: 1900,
            bet: 9999,
            rank: "Diamond 1",
            host: 0
        });
    }
}, 5000);*/

//generateRandomUsers(1000);

/*var test = 0;s
var testLobbyID = 0;
setInterval(function(){
    testLobbyID = uniqid();
}, Math.floor(Math.random() * ((2000-1)+1) + 1));
setInterval(function(){
    testMM("solo");
}, 800);*/

//endMatch(3498);

//DELETE MATCHES
/*for(var i = 1; i < 18029; i++) {
    connection.query("DROP TABLE `match_"+i+"`", function(error, results, fields){
        if(error){
            console.log(error);
        }
        console.log("deleted" + i);
    })
}

connection.query("DELETE FROM `match_history`", function(error, results, fields){
    if(error){
        console.log(error);
    }
});

app.use(function (req, res, next) {
  if (!req.session) {
    return next(new Error('oh no')) // handle error
  }
  next(); // otherwise continue
});
*/

app.get("/", function(req, res) {

    connection.query("SELECT COUNT(`userID`) AS `count` FROM `users`", function(error, results, fields) {
        if(error) {
            console.log(error);
        }

        var usersCount = results[0].count;

        if(req.session.loggedIn == true) {
            connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }

                var user = getDivisionFromLDR(results[0]);

                res.render("index", {
                    user: user,
                    usersCount: usersCount,
                });
            });
        } else {
            res.render("index", {
                usersCount: usersCount
            });
        }
    });
}); 

/*app.post("/", function(req, res){

    var alertMsg = req.body.alert_message;

    connection.query("SELECT COUNT(`userID`) AS `count` FROM `users`", function(error, results, fields) {
        if(error) {
            console.log(error);
        }

        var usersCount = results[0].count;

        if(req.session.loggedIn == true) {
            connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }

                var user = getDivisionFromLDR(results[0]);

                res.render("index", {
                    user: user,
                    usersCount: usersCount,
                    alertMsg: alertMsg
                });
            });
        } else {
            res.render("index", {
                usersCount: usersCount
            });
        }
    });
})*/

app.get("/tournaments", function(req, res){
    res.render("tournaments");
});

app.get('/help', function(req, res){
    if(req.session.loggedIn) {
        connection.query("SELECT * FROM `users` WHERE `userID` = '"+req.session.userID+"'", function(error, results, fields){
            if(error){
                console.log(error);
            }

            var user = results[0];

            res.render('help', {
                user: user
            });

        });
    } else {
        res.render('help');
    }
});

app.get('/dispute', auth, function(req, res){
    var userID = req.session.userID;
    var matchID = parseInt(req.query.matchID) || '';
    console.log(matchID);
    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        var user = results[0];

        if(matchID != '') {
            connection.query("SELECT * FROM `disputes` WHERE `userID` = '"+userID+"' AND `matchID` = '"+matchID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                if(results.length > 0) {
                    var disputeInfo = results[0];
                    console.log(disputeInfo);
                    res.render('dispute',{
                        matchID: matchID,
                        disputeInfo: disputeInfo,
                        user: user
                    });
                } else {
                    res.render('dispute',{
                        matchID: matchID,
                        user: user
                    });
                }
            });
        } else {
            res.render('dispute', {
                user: user
            });
        }
    });
});

app.post("/dispute", auth, function(req, res){
    var userID = req.session.userID;
    var matchID = req.body.matchID;
    var score = req.body.score;
    var proof = req.body.proof;
    var moreInfo = req.body.moreInfo;

    if(proof.length < 5) {
        for(var i = 5 - proof.length; i < 5; i++) {
            proof[i] = '';
        }
    }

    for(var i = 0; i < proof.length; i++) {
        if(proof[i] == 'undefined' || proof[i] == null || proof[i].length <= 0) {
            proof[i] = "";
        }
    }

    if(moreInfo == 'undefined' || moreInfo == null || moreInfo.length <= 0) {
        moreInfo = '';
    }

    connection.query("SELECT * FROM `disputes` WHERE `userID` = '"+userID+"' AND `matchID` = '"+matchID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }

        if(results.length > 0) {
            connection.query("UPDATE `disputes` SET `proof1` = '"+proof[0]+"', `proof2` = '"+proof[1]+"', `proof3` = '"+proof[2]+"', `proof4` = '"+proof[3]+"', `proof5` = '"+proof[4]+"', `more_information` = '"+moreInfo+"' WHERE `userID` = '"+userID+"' AND `matchID` = '"+matchID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                req.session.alertType = "success";
                req.session.alertMsg = "Successfully updated dispute proof for match " + matchID + "!";
                res.redirect('/dispute?matchID=' + matchID);
            });
        } else {
            connection.query("INSERT INTO `disputes`(`userID`, `matchID`, `score`, `proof1`, `proof2`, `proof3`, `proof4`, `proof5`, `more_information`) VALUES ('"+userID+"', '"+matchID+"', '"+score+"', '"+proof[0]+"', '"+proof[1]+"', '"+proof[2]+"', '"+proof[3]+"', '"+proof[4]+"', '"+moreInfo+"')", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                req.session.alertType = "success";
                req.session.alertMsg = "Successfully submitted dispute proof for match " + matchID + "!";
                res.redirect('/dispute?matchID=' + matchID);
            });
        }
    });

});

app.get("/terms", function(req, res){
    var userID = req.session.userID;
    if(req.session.loggedIn){
        connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
            if(error){
                console.log(error);
            }
            res.render("terms", {
                user: results[0]
            });
        })
    } else {
        res.render("terms");
    }
});

app.get("/change_priveleges", auth, function(req, res){
    var userID = req.session.userID;
    var otherID = req.query.userID;
    var level = req.query.level;
    var host = false;
    var found = false;

    if(userID == otherID) {
        res.json({
            status: 'error',
            message: 'You cannot change your own priveleges.'
        });
        return;
    }

    connection.query("SELECT `status`, `lobby` FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        var user = results[0];
        var lobbyID;
        if(user.status == 'lobby') {
            lobbyID = user.lobby;
            connection.query("SELECT * FROM `lobby_"+lobbyID+"`", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                for(var i = 0; i < results.length; i++) {
                    if(results[i].userID == userID && results[i].host == 1) {
                        host = true;
                    }
                    if(results[i].userID == otherID) {
                        found = true;
                    }
                    if(results[i].userID == otherID && results[i].host == level) {
                        res.json({
                            status: 'error',
                            message: 'User already has these priveleges.'
                        });
                        return;
                    }
                }

                if(host && found) {
                    if(level == 1) {
                        connection.query("UPDATE `lobby_"+lobbyID+"` SET `host` = '0' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                            if(error) {
                                console.log(error);
                            }
                            connection.query("UPDATE `lobby_"+lobbyID+"` SET `host` = '"+level+"' WHERE `userID` = '"+otherID+"'", function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                //finished
                                io.to('lobby_'+lobbyID).emit('updated-host', {
                                    oldHost: userID,
                                    newHost: otherID
                                });
                                io.to(userID).emit("player", {
                                    message: "You are no longer the host"
                                });
                                io.to(otherID).emit("host", {
                                    message: "You are the host now"
                                });
                                res.json({
                                    status: 'success', 
                                    message: 'Successfully promoted to host!'
                                });
                            });
                        });
                    } else if(level == 2) {
                        connection.query("UPDATE `lobby_"+lobbyID+"` SET `host` = '"+level+"' WHERE `userID` = '"+otherID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                            //finished
                            io.to(otherID).emit("co-host", {
                                message: "You are now a co-host",
                                hostID: userID
                            });
                            io.to('lobby_'+lobbyID).emit('privelege-update', {
                                userID: otherID,
                                level: level
                            });
                            res.json({
                                status: 'success', 
                                message: 'Successfully promoted to co-host!'
                            });
                        });
                    } else {
                        connection.query("UPDATE `lobby_"+lobbyID+"` SET `host` = '"+level+"' WHERE `userID` = '"+otherID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                            //finished
                            io.to(otherID).emit("player", {
                                message: "You are now a player"
                            });
                            io.to('lobby_'+lobbyID).emit('privelege-update', {
                                userID: otherID,
                                level: level
                            });
                            res.json({
                                status: 'success', 
                                message: 'Successfully demoted player!'
                            });
                        });
                    }  
                } else if(!host) {
                    res.json({
                        status: 'error',
                        message: 'You are not the host.'
                    });
                } else if(!found) {
                    res.json({
                        status: 'error',
                        message: 'User does not exist.'
                    });
                } else {
                    res.json({
                        status: 'error',
                        message: 'This action could not be completed.'
                    });
                }

            });
        } else {
            res.json({
                status: "error",
                message: "You are not in a lobby."
            });
        }
    });
});

app.get("/read_notifications", auth, function(req, res){
    if(req.session.notifications != undefined && req.session.notifications.length != 0) {
        req.session.notifications.forEach(function(notification){
            notification.seen = true;
        });
    }
    
    req.session.unread = 0;
    res.json({
        status: 'success',
        message: 'Notifications read!'
    });
});

app.get("/clear_notifications", auth, function(req, res){
    req.session.notifications = [];
    req.session.unread = 0;
    req.session.save();
    res.json({
        status: 'success',
        message: 'Notifications cleared!'
    });
});

app.get("/invites", auth, function(req, res){
    var userID = req.session.userID;

    connection.query("SELECT * FROM `invites` WHERE `to_userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0) {
            var invites = results;
            res.render('invites', {
                invites: invites
            });
        } else {
            res.render('invites', {
                invites: []
            });
        }
    });
});

app.get("/accept_invite", auth, function(req, res){
    var userID = req.session.userID;
    var from_userID = req.query.from_userID;
    var lobbyID = req.query.lobbyID;
    var bet = req.query.bet || 0;

    if(bet < 0) {
        req.session.alertMsg = "Your LP bet must be at least 0!";
        req.session.alertType = 'error';
        res.redirect('/');
        return;
    }

    connection.query("SELECT * FROM `invites` WHERE `to_userID` = '"+userID+"' AND `from_userID` = '"+from_userID+"' AND `lobbyID` = '"+lobbyID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0) {
            //VALID INVITE
            connection.query("DELETE FROM `invites` WHERE `to_userID` = '"+userID+"' AND `from_userID` = '"+from_userID+"' AND `lobbyID` = '"+lobbyID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }
            });
            connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error) {
                    console.log(error);
                }

                if(results.length > 0){
                    if(results[0].status == 'none') {
                        if(bet <= results[0].LP) {
                            var user = getDivisionFromLDR(results[0]);
                            connection.query("SELECT `userID`, `status`, `system` FROM `lobby_"+lobbyID+"`", function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }

                                var system = results[0].system;

                                results.forEach(function(player){
                                    if(player.status == 'matchmaking'){
                                        req.session.alertType = "error";
                                        req.session.alertMsg = "This lobby is currently searching for a match! You may not join!";
                                        res.redirect("/");

                                    }
                                });

                                if(results.length != 4) {
                                    connection.query("INSERT INTO `lobby_"+lobbyID+"`(`userID`, `system`, `system_name`, `username`, `host`, `LDR`, `bet`) VALUES ('"+userID+"','"+system+"','"+user[system]+"','"+user.username+"', '0','"+user.LDR+"','"+bet+"')", function(error, results, fields){
                                        if(error){
                                            console.log(error);
                                        }
                                        connection.query("UPDATE `users` SET `lobby` = '"+lobbyID+"', `status` = 'lobby', `LP` = `LP` - "+bet+" WHERE `userID` = '"+userID+"'", function(error, results, fields){
                                            if(error) {
                                                console.log(error);
                                            }

                                            io.to('lobby_' + lobbyID).emit('player-joined-lobby', {
                                                userID: user.userID,
                                                avatarURL: user.avatarURL,
                                                username: user.username,
                                                LDR: user.LDR,
                                                rank: user.rank,
                                                bet: bet,
                                                host: 0
                                            });

                                            res.redirect("/lobby/" + lobbyID);
                                        });
                                    });
                                } else {
                                    req.session.alertType = 'error';
                                    req.session.alertMsg = "This lobby is full!";
                                    res.redirect('/');
                                }
                            });
                        } else {
                            req.session.alertType = 'error';
                            req.session.alertMsg = "You do not have enough LP!";
                            res.redirect('/');
                        }
                    } else {
                        req.session.alertType = 'error';
                        req.session.alertMsg = "Unable to join lobby!";
                        res.redirect('/');
                    }
                } else {
                    req.session.alertType = 'error';
                    req.session.alertMsg = "Unable to join lobby!";
                    res.redirect('/');
                }
            });
        } else {
            req.session.alertType = 'error';
            req.session.alertMsg = "Unable to join lobby!";
            res.redirect('/');
        }
    });
});

app.get("/send_invite", auth, function(req, res){
    var userID = req.session.userID;
    var friendID = req.query.to_userID;
    var lobbyID = req.query.lobbyID;
    var inLobby = false;

    if(userID == friendID) {
        res.json({
            status: 'error',
            message: 'You cannot invite yourself!'
        });
        return;
    }

    connection.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'codproleague' AND table_name = 'lobby_"+lobbyID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        var count = results[0]['COUNT(*)'];
        if(count > 0) {
            connection.query("SELECT * FROM `lobby_"+lobbyID+"`", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                for(var i = 0; i < results.length; i++) {
                    if(userID == results[i].userID) {
                        inLobby = true;
                    }
                    if(friendID == results[i].userID) {
                        res.json({
                            status: "error",
                            message: "User is already in the lobby!"
                        });
                        return;
                    }
                }

                if(inLobby) {

                    connection.query("SELECT * FROM `invites` WHERE `from_userID` = '"+userID+"' AND `to_userID` = '"+friendID+"' AND `lobbyID` = '"+lobbyID+"'", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }
                        if(results.length == 0) {
                            //ADD A NEW INVITE
                            connection.query("INSERT INTO `invites`(`from_userID`, `to_userID`, `lobbyID`) VALUES ('"+userID+"','"+friendID+"','"+lobbyID+"')", function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                            });
                        }

                        connection.query("SELECT `username`, `avatarURL` FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                            store.all(function(error, sessions){
                                var friendSess = sessions.find(x => x.userID == friendID);
                                var update = false;
                                if(friendSess != undefined) {
                                    var friendSessID = friendSess.id;
                                    var obj = {
                                        type: 'lobby-invite',
                                        fromUserID: userID,
                                        fromUsername: results[0].username,
                                        from_avatarURL: results[0].avatarURL,
                                        lobbyID: lobbyID,
                                        seen: false
                                    };
                                    if(friendSess.notifications != undefined) {
                                        var temp = friendSess.notifications.find(x => x.type == 'lobby-invite' && x.fromUserID == userID && x.lobbyID == lobbyID && x.seen == true);

                                        if(temp != undefined) {
                                            var index = friendSess.notifications.indexOf(temp);
                                            friendSess.notifications[index].seen = false;
                                            update = true;
                                            
                                        } else if(friendSess.notifications.find(x => x.type == 'lobby-invite' && x.fromUserID == userID && x.lobbyID == lobbyID) == undefined) {
                                            if(friendSess.notifications.length > 5) {
                                                friendSess.notifications.pop();
                                            }
                                            friendSess.notifications.push(obj);
                                            update = true;
                                            friendSess.unread += 1;
                                        } else {
                                            console.log("Already received an identical invite");
                                        }
                                    } else {
                                        friendSess.notifications = [obj];
                                        update = true;
                                        friendSess.unread = 1;
                                    }
                                    if(update) {
                                        store.set(friendSessID, friendSess, function(error){
                                            if(error){
                                                console.log(error);
                                            }
                                            store.get(friendSessID, function(error, session){
                                            });
                                        });
                                    }
                                }
                            });
                        
                            if(error){
                                console.log(error);
                            }
                            io.to(friendID).emit('new-invite', {
                                from_username: results[0].username,
                                from_avatarURL: results[0].avatarURL,
                                from_userID: userID,
                                lobbyID: lobbyID
                            });
                            res.json({
                                status: "success",
                                message: "Successfully sent the invite!"
                            });
                        });
                    });

                } else {
                    res.json({
                        status: "error",
                        message: "You are not in the lobby!"
                    });
                }
            });
        } else {
            res.json({
                status: "error",
                message: "Lobby does not exist!"
            });
        }
    });
});

app.post("/lobby_chat", auth, function(req, res){
    var lobbyID = req.body.lobbyID;
    var message = req.body.message;
    var userID = req.session.userID;
    var username = req.body.username;
    var avatarURL = req.body.avatarURL;

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"' AND `status` = 'lobby' AND `lobby` = '"+lobbyID+"' AND `username` = '"+username+"' AND `avatarURL` = '"+avatarURL+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0) {
            io.to('lobby_' + lobbyID).emit('chat-msg', {
                message: _.escape(message),
                userID: userID,
                username: username,
                avatarURL: avatarURL
            });
            res.json({
                status: "success",
                message: "Message sent!"
            });
        } else {
            res.json({
                status: "error",
                message: "You are not in the lobby!"
            });
        }
    });

});

app.get("/lobby_cancel_find_match", auth, function(req, res){
    var userID = req.session.userID;

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"' AND `status` = 'lobby'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0){
            var user = results[0];
            var lobbyID = user.lobby;

            connection.query("SELECT * FROM `lobby_"+lobbyID+"`", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                var players = results;

                for(var i = 0; i < players.length; i++) {
                    if(players[i].host == 0 && players[i].userID == userID) {
                        res.json({
                            status: "error",
                            message: "You do not have permission to do this!"
                        })
                    }
                }

                var count = 0;
                players.forEach(function(player){
                    connection.query("DELETE FROM `matchmaking_queue` WHERE `userID` = '"+player.userID+"'", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }
                        count++;
                        if(count >= players.length) {
                            connection.query("UPDATE `lobby_"+lobbyID+"` SET `status` = ''", function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                io.to('lobby_' + lobbyID).emit('cancel-find-match');
                                res.json({
                                    status: "success",
                                    message: "Succesfully cancelled finding match!"
                                });
                            });
                        }
                    });
                });

            });

        } else {
            res.json({
                status: "error",
                message: "You are not in a lobby!"
            });
        }
        
    });
});

app.get('/lobby_find_match', auth, function(req, res){
    var userID = req.session.userID;

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"' AND `status` = 'lobby'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0) {
            var user = results[0];
            var lobbyID = user.lobby;

            connection.query("SELECT * FROM `lobby_"+lobbyID+"`", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                var system = results[0].system;
                var players = results;
                var highestLDR = 0;

                //Check if all players in lobby have correct system name set

                for(var i = 0; i < players.length; i++) {
                    console.log(players[i].system_name);
                    if(players[i].system_name == '') {
                        io.to('lobby_'+lobbyID).emit("name-not-set", "Unable to find a match, " + players[i].username + " does not have their " + system + " name set!");
                        res.json({
                            status: 'error',
                            message: "Unable to find a match, " + players[i].username + " does not have their " + system + " name set!"
                        });
                        return;
                    }
                    if(players[i].host == 0 && players[i].userID == userID) {
                        res.json({
                            status: "error",
                            message: "You do not have permission to do this!"
                        });
                        return;
                    }

                    if(players[i].LDR > highestLDR) {
                        highestLDR = players[i].LDR;
                    }
                }

                var count = 0;
                for(var i = 0; i < players.length; i++) {

                    connection.query("INSERT INTO `matchmaking_queue`(`userID`, `system`, `system_name`, `username`, `LDR`, `bet`, `lobbyID`, `countedLDR`) VALUES ('"+players[i].userID+"','"+system+"','"+players[i].system_name+"', '"+players[i].username+"', '"+players[i].LDR+"', '"+players[i].bet+"', '"+lobbyID+"','"+highestLDR+"')", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }
                    });

                    count++;
                    if(count >= players.length) {
                        connection.query("UPDATE `lobby_"+lobbyID+"` SET `status` = 'matchmaking'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                            newUserMM(user);
                            io.to('lobby_' + lobbyID).emit('finding-match');
                            res.json({
                                status: "success",
                                message: "Finding a match!"
                            });
                        });
                    }
                }
            });

        } else {
            res.json({
                status: "error",
                message: "You are not in a lobby!"
            })
        }
    });
});

app.get('/kick_player', auth, function(req, res){
    var userID = req.session.userID;
    var kickedUserID = req.query.kickedUserID;
    var lobbyID = req.query.lobbyID;
    var host = false;
    var found = false;
    var bet = 0;

    if(userID == kickedUserID) {
        res.send("YOU CANNOT KICK YOURSELF");
        return;
    }

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"' AND `status` = 'lobby' AND `lobby` = '"+lobbyID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0) {
            var user = results[0];
            connection.query("SELECT * FROM `lobby_"+lobbyID+"`", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                var users = results;
                for(var i = 0; i < users.length; i++) {
                    if(users[i].userID == kickedUserID && users[i].host == 1) {
                        res.send("YOU CANNOT KICK THE HOST");
                        return;
                    }
                    if(users[i].userID == userID && users[i].host == 1 || users[i].host == 2) {
                        host = true;
                    }
                    if(users[i].userID == kickedUserID) {
                        found = true;
                        bet = users[i].bet;
                    }
                }

                if(host && found) {
                    connection.query("DELETE FROM `lobby_"+lobbyID+"` WHERE `userID` = '"+kickedUserID+"'", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }

                        connection.query("UPDATE `users` SET `status` = 'none', `lobby` = '0', `LP` = `LP` + "+bet+" WHERE `userID` = '"+kickedUserID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }

                            io.to(kickedUserID).emit('kicked');
                            io.to('lobby_'+lobbyID).emit('kicked-player', {
                                user: kickedUserID
                            });

                            res.json({
                                status: "success",
                                message: "Successfully kicked player!"
                            });
                        });
                    });
                } else {
                    res.json({
                        status: "error",
                        message: "Unable to kick player!"
                    });
                }

            });
        } else {
            res.json({
                status: "error",
                message: "You are not in the lobby!"
            });
        }
    });
});

app.get("/disband_lobby", auth, function(req, res){
    var userID = req.session.userID;
    var host = false;
    var bet = 0;
    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        var user = results[0];
        if(user.status == 'lobby') {
            connection.query("SELECT * FROM `lobby_"+user.lobby+"`", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                var users = results;
                for(var i = 0; i < results.length; i++) {
                    if(results[i].userID == userID && results[i].host == 1) {
                        host = true;
                        bet = results[i].bet;
                    } 
                }

                if(host) {
                    connection.query("DELETE FROM `matchmaking_queue` WHERE `lobbyID` = '"+user.lobby+"'", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }
                    });
                    connection.query("DROP TABLE `lobby_"+user.lobby+"`", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }
                        var count = 0;
                        for(var i = 0; i < users.length; i++) {
                            connection.query("UPDATE `users` SET `status` = 'none', `lobby` = '0', `LP` = `LP` + "+bet+" WHERE `userID` = '"+users[i].userID+"'", function(error, results, fields){
                                if(error){
                                    console.log(error);
                                }
                                count++;

                                if(count >= users.length) {
                                    io.to('lobby_' + user.lobby).emit('disband');
                                    req.session.alertMsg = "Successfully disbanded lobby!";
                                    req.session.alertType = 'success';
                                    res.json({
                                        status: "success",
                                        message: "Disbanded lobby"
                                    });
                                }
                            });
                        }
                    });
                } else {
                    res.json({
                        status: "error",
                        message: 'You are not the host!'
                    });
                }
            });
        } else {
            res.json({
                status: "error",
                message: 'You are not in the lobby!'
            });
        }
    });
});

app.get("/leave_lobby", auth, function(req, res){
    var userID = req.session.userID;
    var bet = 0;
    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        var user = results[0];
        //IF USER IN 
        if(user.status == 'lobby') {
            connection.query("SELECT * FROM `lobby_"+user.lobby+"` WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                if(results[0].host == 0 || results[0].host == 2) {
                    bet = results[0].bet;
                    connection.query("DELETE FROM `lobby_"+user.lobby+"` WHERE `userID` = '"+userID+"'", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }

                        connection.query("DELETE FROM `matchmaking_queue` WHERE `lobbyID` = '"+user.lobby+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                        });

                        connection.query("UPDATE `lobby_"+user.lobby+"` SET `status` = ''", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                        });

                        connection.query("UPDATE `users` SET `status` = 'none', `lobby` = '0', `LP` = `LP` + "+bet+" WHERE `userID` = '"+userID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                            io.to('lobby_' + user.lobby).emit('cancel-find-match');
                            io.to("lobby_" + user.lobby).emit('player-left', {
                                userID: userID
                            });
                            req.session.rooms = [];
                            req.session.alertMsg = "Successfully left the lobby!";
                            req.session.alertType = 'success';
                            res.redirect("/")
                        });
                    });
                } else {
                    req.session.alertMsg = "Successfully disbanded the lobby!";
                    req.session.alertType = 'success';
                    res.redirect('/disband_lobby');
                }
            });
        } else {
            req.session.alertMsg = "You are not in the lobby!";
            req.session.alertType = 'error';
            res.redirect("/");
        }
    });
});

app.get("/lobby/:lobbyID", auth, function(req, res){
    var userID = req.session.userID;
    var lobbyID = req.params.lobbyID;
    var hostBool = false;
    var cohostBool = false;
    var status = '';

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"' AND `status` = 'lobby' AND `lobby` = '"+lobbyID+"'", function(error, results, fields){
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {
            var user = results[0];
            var friendsInfo = [];
            connection.query("SELECT * FROM `lobby_"+lobbyID+"`", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                var system = results[0].system;
                var host = "";
                var lobby = [];

                for(var i = 0; i < results.length; i++) {

                    status = results[i].status;

                    lobby.push(getDivisionFromLDR(results[i]));

                    if(results[i].host == 1) {
                        host = results[i].username;
                    }

                    if(results[i].host == 1 && results[i].userID == userID) {
                        hostBool = true;
                    } else if(results[i].host == 2 && results[i].userID == userID) {
                        cohostBool = true;
                    }
                }

                var friends = [];
                if(user.friends != '' && user.friends != '[]') {
                    friends = JSON.parse(user.friends);
                }

                var friendCount = 0;
                if(friends.length > 0) {
                    for(var i = 0; i < friends.length; i++) {
                        connection.query("SELECT `userID`, `username`, `avatarURL`, `status`, `LDR` FROM `users` WHERE `userID` = '"+friends[i]+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }

                            friendsInfo.push(results[0]);
                            friendCount++;
                            if(friendCount >= friends.length) {
                                var count = 0;
                                var lobbyAvatars = {};
                                lobby.forEach(function(player){
                                    connection.query("SELECT `userID`, `avatarURL` FROM `users` WHERE `userID` = '"+player.userID+"'", function(error, results, fields){
                                        if(error){
                                            console.log(error);
                                        }

                                        lobbyAvatars[results[0].userID] = results[0].avatarURL;
                                        
                                        count++;
                                        if(count >= lobby.length){
                                            req.session.rooms = ['lobby_' + lobbyID];
                                            req.session.save();

                                            res.render('lobby', {
                                                host: host,
                                                hostBool: hostBool,
                                                cohostBool: cohostBool,
                                                lobby: lobby,
                                                lobbyAvatars: lobbyAvatars,
                                                user: user,
                                                lobbyID: lobbyID,
                                                friends: friendsInfo,
                                                status: status,
                                                system: system
                                            });
                                        }
                                    });
                                }); 
                            }
                        });
                    }
                } else {
                    var count = 0;
                    var lobbyAvatars = {};
                    lobby.forEach(function(player){
                        connection.query("SELECT `userID`, `avatarURL` FROM `users` WHERE `userID` = '"+player.userID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }

                            lobbyAvatars[results[0].userID] = results[0].avatarURL;
                            
                            count++;
                            if(count >= lobby.length){

                                req.session.rooms = ['lobby_' + lobbyID];
                                req.session.save();

                                res.render('lobby', {
                                    host: host,
                                    hostBool: hostBool,
                                    cohostBool: cohostBool,
                                    lobby: lobby,
                                    lobbyAvatars: lobbyAvatars,
                                    user: user,
                                    lobbyID: lobbyID,
                                    friends: friendsInfo,
                                    status: status,
                                    system: system
                                });
                            }
                        });
                    });
                }
            });
        } else {
            req.session.alertMsg = 'You are not in the lobby!';
            req.session.alertType = 'error';
            res.redirect("/");
        }
    });
});

app.post("/create_lobby", auth, function(req, res){
    var userID = req.session.userID;
    var bet = parseInt(req.body.bet);
    var system = req.body.system;

    if(bet < 0) {
        req.session.alertMsg = "Your LP bet must be at least 0!";
        req.session.alertType = 'error';
        res.redirect('/enter_matchmaking');
        return;
    }

    if(system != 'xbox' && system != 'psn') {
        req.session.alertMsg = "Invalid system type";
        req.session.alertType = 'error';
        res.redirect('/enter_matchmaking');
        return;
    }

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0) {
            var user = results[0];
            var lobbyID = uniqid();
            if(user.LP >= bet) {
                connection.query("CREATE TABLE `codproleague`.`lobby_"+lobbyID+"` ( `userID` INT NOT NULL , `system` VARCHAR(4) NOT NULL, `system_name` VARCHAR(16) NOT NULL, `username` VARCHAR(100) NOT NULL , `host` TINYINT(1) NOT NULL DEFAULT '0', `LDR` INT NOT NULL , `bet` INT NOT NULL, `status` VARCHAR(20) NOT NULL DEFAULT '' ) ENGINE = InnoDB;", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                    connection.query("UPDATE `users` SET `status` = 'lobby', `lobby` = '"+lobbyID+"', `LP` = `LP` - "+bet+" WHERE `userID` = '"+userID+"'", function(error, results, fields){
                        if(error){
                            console.log(error);
                        }
                        connection.query("INSERT INTO `lobby_"+lobbyID+"`(`userID`, `system`, `system_name`, `username`, `host`, `LDR`, `bet`) VALUES ('"+userID+"','"+system+"','"+user[system]+"','"+user.username+"', '1','"+user.LDR+"','"+bet+"')", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                            res.redirect("/lobby/" + lobbyID + "");
                        });
                    });
                });
            } else {
                req.session.alertMsg = "You do not have enough LP!";
                req.session.alertType = 'error';
                res.redirect("/");
            }
            
        } else {
            req.session.alertMsg = "An error occurred";
            req.session.alertType = 'error';
            res.redirect("/");
        }
    });
});

app.post("/report_user", auth, function(req, res){
    var reporting = req.session.userID;
    var reported = req.body.userID;
    var type = req.body.type;
    var message = req.body.message;

    connection.query("SELECT * FROM `reports` WHERE `reporting_userID`='"+reporting+"' AND `reported_userID`='"+reported+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }
        if(results.length > 0) {
            res.json({
                status: 'error',
                message: "You have already reported this user!"
            });
        } else {
            connection.query("INSERT INTO `reports`(`reporting_userID`, `reported_userID`, `type`, `message`) VALUES ('"+reporting+"','"+reported+"','"+type+"','"+message+"')", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                res.json({
                    status: 'success',
                    message: "User successfully reported!"
                });
            });
        }
    });
});

app.get("/remove_friend", auth, function(req, res){
    var userID = req.session.userID;
    var friendID = parseInt(req.query.userID);

    var found = false;

    connection.query("SELECT `friends` FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error) {
            console.log(error);
        }

        var friends = [];
        if(results[0].friends != '' && results[0].friends != '[]') {
            friends = JSON.parse(results[0].friends);
        }

        for(var i = 0; i < friends.length; i++) {
            if(friends[i] == friendID) {
                friends.splice(i, 1);
                found = true;
            }
        }

        if(found) {
            connection.query("SELECT `friends` FROM `users` WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                var friends = [];
                if(results[0].friends != '' && results[0].friends != '[]') {
                    friends = JSON.parse(results[0].friends);
                }

                for(var i = 0; i < friends.length; i++) {
                    if(friends[i] == userID) {
                        friends.splice(i, 1);
                    }
                }

                connection.query("UPDATE `users` SET `friends` = '"+JSON.stringify(friends)+"' WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                })

            });
            connection.query("UPDATE `users` SET `friends` = '"+JSON.stringify(friends)+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                req.session.alertMsg = "Succesfully removed friend!";
                req.session.alertType = 'success';
                res.redirect("/friends");
            });
        } else {
            req.session.alertMsg = "Cannot remove this friend!";
            req.session.alertType = 'error';
            res.redirect("/friends");
        }
    });
});

app.get("/decline_friend_request", auth, function(req, res){
    var userID = req.session.userID;
    var friendID = parseInt(req.query.userID);

    var found = false;

    connection.query("SELECT `receivedRequests` FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }

        var receivedRequests = [];
        if(results[0].receivedRequests != '' && results[0].receivedRequests != '[]') {
            receivedRequests = JSON.parse(results[0].receivedRequests);
        }

        for(var i = 0; i < receivedRequests.length; i++) {
            if(receivedRequests[i] == friendID) {
                receivedRequests.splice(i, 1);
                found = true;
            }
        }

        if(found) {
            connection.query("SELECT `sentRequests` FROM `users` WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                var sentRequests = [];
                if(results[0].sentRequests != '' && results[0].sentRequests != '[]') {
                    sentRequests = JSON.parse(results[0].sentRequests);
                }

                for(var i = 0; i < sentRequests.length; i++) {
                    if(sentRequests[i] == userID) {
                        sentRequests.splice(i, 1);
                    }
                }

                connection.query("UPDATE `users` SET `sentRequests` = '"+JSON.stringify(sentRequests)+"' WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                });

            });
            connection.query("UPDATE `users` SET `receivedRequests` = '"+JSON.stringify(receivedRequests)+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                req.session.alertMsg = "Friend request declined!";
                req.session.alertType = 'success';
                res.redirect("/friends");
            })
        } else {
            req.session.alertMsg = "Friend request could not be declined!";
            req.session.alertType = 'error';
            res.redirect("/friends");
        }
    });
});

app.get("/cancel_friend_request", auth, function(req, res){
    var userID = req.session.userID;
    var friendID = parseInt(req.query.userID);

    var found = false;

    connection.query("SELECT `sentRequests` FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }

        var sentRequests = [];
        if(results[0].sentRequests != '' && results[0].sentRequests != '[]') {
            sentRequests = JSON.parse(results[0].sentRequests);
        }

        for(var i = 0; i < sentRequests.length; i++) {
            if(sentRequests[i] == friendID) {
                sentRequests.splice(i, 1);
                found = true;
            }
        }

        if(found) {
            connection.query("SELECT `receivedRequests` FROM `users` WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                var receivedRequests = [];
                if(results[0].receivedRequests != '' && results[0].receivedRequests != '[]') {
                    receivedRequests = JSON.parse(results[0].receivedRequests);
                }

                for(var i = 0; i < receivedRequests.length; i++) {
                    if(receivedRequests[i] == userID) {
                        receivedRequests.splice(i, 1);
                    }
                }

                connection.query("UPDATE `users` SET `receivedRequests` = '"+JSON.stringify(receivedRequests)+"' WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                });
            });
            connection.query("UPDATE `users` SET `sentRequests` = '"+JSON.stringify(sentRequests)+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }
                //FRIEND REQUEST CANCELLED
                req.session.alertMsg = "Friend request cancelled!";
                req.session.alertType = 'success';
                res.redirect('/friends');
            });
        } else {
            req.session.alertMsg = "Friend request could not be cancelled!";
            req.session.alertType = 'error';
            res.redirect('/friends');
        }
    });
});

app.get("/accept_friend_request", auth, function(req, res){
    var userID = req.session.userID;
    var friendID = parseInt(req.query.userID);

    var found = false;

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }

        var receivedRequests = [];
        if(results[0].receivedRequests != '' && results[0].receivedRequests != '[]') {
            receivedRequests = JSON.parse(results[0].receivedRequests);
        }

        for(var i = 0; i < receivedRequests.length; i++) {
            if(receivedRequests[i] == friendID) {
                found = true;
                receivedRequests.splice(i, 1);
            } 
        }

        if(found) {
            connection.query("SELECT `sentRequests`, `friends` FROM `users` WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                var sentRequests = [];
                if(results[0].sentRequests != '' && results[0].sentRequests != '[]') {
                    sentRequests = JSON.parse(results[0].sentRequests);
                }

                for(var i = 0; i < sentRequests.length; i++) {
                    if(sentRequests[i] == userID) {
                        sentRequests.splice(i, 1);
                    }
                }

                var friends = [];
                if(results[0].friends != '' && results[0].friends != '[]') {
                    friends = JSON.parse(results[0].friends);
                }

                friends.push(userID);

                connection.query("UPDATE `users` SET `friends` = '"+JSON.stringify(friends)+"', `sentRequests` = '"+JSON.stringify(sentRequests)+"' WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                });
            });
            connection.query("SELECT `friends` FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error) {
                    console.log(error);
                }

                var friends = [];
                if(results[0].friends != '' && results[0].friends != '[]') {
                    friends = JSON.parse(results[0].friends);
                }

                friends.push(friendID);
                connection.query("UPDATE `users` SET `friends` = '"+JSON.stringify(friends)+"', `receivedRequests` = '"+JSON.stringify(receivedRequests)+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                    req.session.alertMsg = "Friend request accepted!";
                    req.session.alertType = 'success';
                    res.redirect('/friends');
                });
            });
        } else {
            req.session.alertMsg = "Friend request could not be accepted!";
            req.session.alertType = 'error';
            res.redirect("/friends");
        }
    });
});

app.post('/search', auth, function(req, res){
    var userID = req.session.userID;
    var searchName = req.body.searchName;

    connection.query("SELECT * FROM `users` WHERE `username` LIKE '%"+searchName+"%'", function(error, results, fields){
        if(error){
            console.log(error);
        }

        if(results.length > 0) {
            res.json({
                status: "success",
                results: results
            });
        } else {
            res.json({
                status: "error",
            });
        }
    });
});

app.get('/friends', auth, function(req, res){
    var userID = req.session.userID;
    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error) {
            console.log(error);
        }

        var currentUser = results[0];
        var usersInfo = {};

        var friends = [];
        var friendsInfo = {};

        var sentRequests = [];
        var sentRequestsInfo = {};

        var receivedRequests = [];
        var receivedRequestsInfo = {};

        if(results[0].friends != '' && results[0].friends != '[]') {
            friends = JSON.parse(results[0].friends);
        }
        
        if(results[0].sentRequests != '' && results[0].sentRequests != '[]') {
            sentRequests = JSON.parse(results[0].sentRequests);
        }

        if(results[0].receivedRequests != '' && results[0].receivedRequests != '[]') {
            receivedRequests = JSON.parse(results[0].receivedRequests);
        }

        var allUsers = friends.concat(sentRequests).concat(receivedRequests);

        if(allUsers.length === 0) {
            res.render('friends', {
                user: currentUser,
                friends: friendsInfo,
                sentRequests: sentRequestsInfo,
                receivedRequests: receivedRequestsInfo
            });
            return;
        }

        var count = 0;
        for(var i = 0; i < allUsers.length; i++) {
            connection.query("SELECT * FROM `users` WHERE `userID` = '"+allUsers[i]+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }

                var user = results[0];

                usersInfo[user.userID] = {
                    userID: user.userID,
                    username: user.username,
                    avatarURL: user.avatarURL
                };

                count++;
                if(count >= allUsers.length) {
                    for(var j = 0; j < allUsers.length; j++) {
                        if(friends.indexOf(allUsers[j]) >= 0) {
                            friendsInfo[allUsers[j]] = usersInfo[allUsers[j]];
                        } else if(sentRequests.indexOf(allUsers[j]) >= 0) {
                            sentRequestsInfo[allUsers[j]] = usersInfo[allUsers[j]];
                        } else {
                            receivedRequestsInfo[allUsers[j]] = usersInfo[allUsers[j]];
                        }
                    }

                    res.render('friends', {
                        user: currentUser,
                        friends: friendsInfo,
                        sentRequests: sentRequestsInfo,
                        receivedRequests: receivedRequestsInfo
                    });
                }
            });
        }
    });
});

app.get("/add_friend", auth, function(req, res){
    var userID = parseInt(req.session.userID);
    var friendID = parseInt(req.query.userID);

    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }

        var username = results[0].username;

        var friends = [];
        if(results[0].friends != '') {
            friends = JSON.parse(results[0].friends);
        }

        var sentRequests = [];
        if(results[0].sentRequests != '') {
            sentRequests = JSON.parse(results[0].sentRequests);
        }

        var receivedRequests = [];
        if(results[0].receivedRequests != '') {
            receivedRequests = JSON.parse(results[0].receivedRequests);
        }


        //CHECK TO SEE IF FRIENDS ALREADY
        if(friends.indexOf(friendID) >= 0) {
            req.session.alertType = "error";
            req.session.alertMsg = "Already friends with this user!";
            res.redirect('/friends');

        } else if(sentRequests.indexOf(friendID) >= 0) {
            req.session.alertType = "error";
            req.session.alertMsg = "Already sent this user a friend request!";
            res.redirect('/friends');

        } else if(receivedRequests.indexOf(friendID) >= 0) {
            console.log(friendID);
            res.redirect('/accept_friend_request?userID=' + friendID);

        } else {
            sentRequests.push(friendID);
            connection.query("UPDATE `users` SET `sentRequests` = '"+JSON.stringify(sentRequests)+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error) {
                    console.log(error);
                }
                connection.query("SELECT * FROM `users` WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                    if(error) {
                        console.log(error);
                    }

                    var friendReceivedRequests = [];
                    if(results[0].receivedRequests != '') {
                        friendReceivedRequests = JSON.parse(results[0].receivedRequests);
                    }

                    friendReceivedRequests.push(userID);
                    connection.query("UPDATE `users` SET `receivedRequests` = '"+JSON.stringify(friendReceivedRequests)+"' WHERE `userID` = '"+friendID+"'", function(error, results, fields){
                        if(error) {
                            console.log(error);
                        }

                        io.to(friendID).emit('friend-request', {
                            from_userID: userID,
                            from_username: username
                        });

                        req.session.alertMsg = "Friend request sent!";
                        req.session.alertType = 'success';
                        res.redirect('/friends');
                    });
                });
            });
        }
    });
});

/*app.get("/user_match_history", auth, function(req, res){
    var userID = req.session.userID;
    connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
        if(error){
            console.log(error);
        }

        var matches = {};

        if(results[0].matches != null && results[0].matches != '') {
            matches = JSON.parse(results[0].matches);
        }

        res.json({matches: matches});
    });
});*/

/*app.get("/balance", auth, function(req, res) {
    if(req.session.loggedIn == true) {
        connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
            if(error) {
                console.log(error);
            }
            res.render("balance", {
                user: results[0]
            });
        });
    } else {
        res.render("balance");
    }
});*/

app.get("/rules", function(req, res) {
    if(req.session.loggedIn == true) {
        connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
            if(error) {
                console.log(error);
            }
            res.render("rules", {
                user: results[0]
            });
        });
    } else {
        res.render("rules");
    }
});

app.get('/leaderboard', function(req, res) {
    var sort = req.query.sort || 'LDR';
    var order = req.query.order || 'DESC';
    var page = req.query.page || 1;
    var numRows = req.query.numRows || 25;
    var leaderboard = [];

    if(page < 1) {
        page = 1;
    }

    connection.query("SELECT COUNT(*) AS `count` FROM `users`", function(error, results, fields) {
        if(error) {
            console.log(error);
        }

        var count = results[0].count;
        var max = Math.floor(count / numRows) + 1;
        var limit = numRows * page;

        if(page >= max) {
            page = max;

        }

        connection.query("SELECT * FROM `users` ORDER BY `" + sort + "` " + order + " LIMIT " + limit + "", function(error, results, fields) {
            if(error) {
                console.log(error);
            }

            var end = results.length - numRows;
            if(page >= max) {
                end = results.length - (count % numRows);
            }

            if(results.length > 0) {
                for(var i = results.length - 1; i >= end; i--) {
                    var user = getDivisionFromLDR(results[i]);
                    leaderboard.push(user);
                }

                leaderboard.sort(function(a, b) {
                    return b.LDR - a.LDR;
                });

                for(var i = 0; i < leaderboard.length; i++) {
                    leaderboard[i].num = (i + 1) + ((page - 1) * numRows);
                }

                if(req.session.loggedIn == true) {
                    connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                        if(error) {
                            console.log(error);
                        }
                        var user = results[0];
                        user = getDivisionFromLDR(user);
                        res.render("leaderboard", {
                            user: user,
                            leaderboard: leaderboard,
                            page: page
                        });
                    });
                } else {
                    res.render("leaderboard", {
                        leaderboard: leaderboard,
                        page: page
                    });
                }
            }
        });
    });
});

app.get('/user/:username', function(req, res) {
    var username = req.params.username;
    var isFriend = false;
    if(req.session.loggedIn == true) {
        connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
            if(error) {
                console.log(error);
            }
            var user = results[0];
            var friends = results[0].friends;
            if(friends.length > 0) {
                friends = JSON.parse(results[0].friends);
            } else {
                friends = [];
            }
            user = getDivisionFromLDR(user);
            connection.query("SELECT * FROM `users` WHERE username = '" + username + "'", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }
                if(results.length > 0) {
                    var newID = results[0].userID;
                    var profile = getDivisionFromLDR(results[0]);
                    for(var i = 0; i < divisions.length; i++){
                        if(profile.highestLDR <= divisions[i]) {
                            profile.highestRank = ranks[i];
                            break;
                        }
                    }
                    if(friends.includes(newID)) {
                        isFriend = true;
                    }
                    res.render('user-profile', {
                        user: user,
                        profile: profile,
                        isFriend: isFriend
                    });
                } else {
                    //USER DOES NOT EXIST
                    req.session.alertMsg = "This user does not exist!";
                    req.session.alertType = 'error';
                    res.redirect('/');
                }
            });
        });
    } else {
        connection.query("SELECT * FROM `users` WHERE username = '" + username + "'", function(error, results, fields) {
            if(error) {
                console.log(error);
            }
            if(results.length > 0) {
                var profile = getDivisionFromLDR(results[0]);
                for(var i = 0; i < divisions.length; i++){
                    if(profile.highestLDR <= divisions[i]) {
                        profile.highestRank = ranks[i];
                        break;
                    }
                }
                res.render('user-profile', {
                    isFriend: isFriend,
                    profile: profile
                });
            } else {
                //USER DOES NOT EXIST
                req.session.alertMsg = "This user does not exist!";
                req.session.alertType = 'error';
                res.redirect('/');
            }
        });
    }
});

app.get('/user_update/:name/:data', auth, function(req, res){
    var userID = req.session.userID;
    var name = req.params.name;
    var data = decodeURIComponent(req.params.data);

    if(name != 'is_sounds' && name != 'is_notifications' && name != 'xbox' && name != 'psn' && name != 'snapchat' && name != 'discord' && data.substring(0,1) != "/"){
        res.json({
            status: "error",
            message: "Invalid input, must start with \"\/\""
        });
        return;
    }

    if(data.trim() == '') {
        data = '';
    }

    if(name == 'is_sounds' || name == 'is_notifications') {
        data = parseInt(data);
        if(data != 1 && data != 0) {
            res.json({
                status: "error",
                message: "Your profile could not be updated!"
            });
            return;
        } else {
            connection.query("UPDATE `users` SET `"+name+"` = '"+data+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                if(error){
                    console.log(error);
                }
            });
            return;
        }
    }

    if(name == 'psn' || name == 'xbox'){
        connection.query("SELECT `status`, `lobby` FROM `users` WHERE `userID`= '"+userID+"'", function(error, results, fields){
            if(error){
                console.log(error);
            }
            var user = results[0];
            if(user.status == 'lobby') {
                connection.query("SELECT `system` FROM `lobby_"+user.lobby+"`", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                    if(results[0].system == name){
                        //UPDATE USER SYSTEM NAME IN LOBBY
                        connection.query("UPDATE `lobby_"+user.lobby+"` SET `system_name` = '"+data+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }
                        });
                    }
                });
            }
        });
    }

    if(name == 'psn' || name == 'xbox' || name == 'youtube' || name == 'twitter' || name == 'discord' || name == 'snapchat' || name == 'instagram' || name == 'facebook' || name == 'twitch') {
        connection.query("UPDATE `users` SET `"+name+"` = '"+data+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
            if(error){
                console.log(error);
            }
            res.json({
                status: "success",
                message: "You have successfully updated your "+name+"!"
            });
        });
    } else {
        res.json({
            status: "error",
            message: "Your profile could not be updated!"
        });
    }
    
});

app.post("/profile", auth, function(req, res) {
    var userID = req.session.userID;
    var path = req.files.image.file;
    //mv(path, __dirname + "/users/avatars/" + );
    var fileType = req.files.image.mimetype.split("/");
    fileType = fileType[fileType.length - 1];

    if(fileType == 'jpg' || fileType == 'png' || fileType == 'jpeg') {
        fs.readdir(__dirname + "/public/users/avatars/" + userID + "/", (err, files) => {
            if(err) {
                console.log(err);
            }
            for(var file of files) {
                fs.unlink(__dirname + "/public/users/avatars/" + userID + "/" + file), err => {
                    if(err) {
                        console.log(err);
                    }
                    console.log("DELETED");
            }
        }

            fs.rename(path, __dirname + "/public/users/avatars/" + userID + "/avatar." + fileType, function(err) {
                if(err) console.log('ERROR: ' + err);
                connection.query("UPDATE `users` SET `avatarURL` = '/users/avatars/" + userID + "/avatar." + fileType + "' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                    if(error) {
                        console.log(error);
                    }

                });
                //req.session.alertMsg = "Profile updated!";
                res.json({
                    status: "success",
                    newImageSrc: "/users/avatars/" + userID + "/avatar." + fileType,
                    message: "Profile picture updated!"
                });
            });
    })
    } else {
        //TYPE OF FILE NOT ALLOWED
        req.session.alertMsg = "Profile picture must be a PNG, JPG, JPEG!";
        req.session.alertType = 'error';
        res.json({
            status: "error",
            message: "That type of file is not allowed: must be JPG, JPEG, or PNG!"
        });
    }
});

app.get("/profile", auth, function(req, res) {
    var userID = req.session.userID;
    connection.query("SELECT * FROM `users` WHERE userID = '" + userID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {
            var user = results[0];
            user = getDivisionFromLDR(user);
            res.render("profile", {
                user: user
            });
        }
    });
});

app.post("/report", function(req, res) {
    var userID = req.session.userID;
    var matchID = req.body.matchID;
    var result = req.body.result;

    connection.query("SELECT * FROM `match_history` WHERE `matchID` = '" + matchID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        var now = new Date();
        var startTime = new Date(results[0].prematch_time);
        if((now.getTime() - startTime.getTime()) >= 600000) {
            connection.query("SELECT * FROM `match_" + matchID + "` WHERE `userID` = '" + userID + "' AND `report` = ''", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }
                if(results.length > 0) {
                    connection.query("UPDATE `match_" + matchID + "` SET `report` = '" + result + "' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                        if(error) {
                            console.log(error);
                        }
                        connection.query("UPDATE `users` SET `status` = 'none' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                            if(error) {
                                console.log(error);
                            }
                            endMatch(matchID);
                            res.json({
                                status: 'success',
                                message: 'You have successfully reported the match'
                            });
                        });
                    });
                } else {
                    res.json({
                        status: 'error',
                        message: "You are not authorized to report this match"
                    });
                }
            });
        } else {
            res.json({
                status: 'error',
                message: "You must wait 10 minutes after the match start time to report"
            });
        }
    });
});

app.get('/match/:matchID', function(req, res) {
    var matchID = req.params.matchID;
    var authorized = false;
    var reported = false;
    var bet;
    var host;
    connection.query("SELECT * FROM `match_history` WHERE `matchID` = '" + matchID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {
            var system = results[0].system;
            if(results[0].status === 2 || results[0].status === 3) {
                var gamemode = results[0].gamemode;
                var map = results[0].map;
                var prizePool = results[0].prizepool;
                var timestamp = results[0].prematch_time;
                var finished = false;
                var winner = "";
                if(results[0].status === 3) {
                    finished = true;
                }
                winner = results[0].winner;
                var pm = false;
                timestamp = new Date(timestamp);
                var timeStr = (timestamp.getMonth() + 1) + "/" + timestamp.getDate() + "/" + timestamp.getFullYear();
                var hours = timestamp.getHours();
                if(hours > 12) {
                    hours -= 12;
                    pm = true;
                }
                timeStr += " " + hours + ":" + timestamp.getMinutes();
                if(pm) {
                    timeStr += " PM";
                } else {
                    timeStr += " AM";
                }
                timestamp = Math.floor(timestamp.getTime() / 1000);
                var players = [];
                var greenBet = 0,
                    blackBet = 0,
                    totalBet = 0;
                var team = '';

                connection.query("SELECT * FROM `match_" + matchID + "`", function(error, results, fields) {
                    if(error) {
                        console.log(error);
                    }
                    if(results.length > 0) {

                        for(var i = 0; i < results.length; i++) {

                            player = results[i];

                            if(player.host == 1) {
                                host = player.system_name;
                            }

                            totalBet += player.bet;

                            if(player.team === 'green') {
                                greenBet += player.bet;
                            } else {
                                blackBet += player.bet;
                            }

                            if(req.session.userID === player.userID) {
                                if(player.team === 'green') {
                                    team = "green";
                                } else {
                                    team = "black";
                                }
                                authorized = true;
                                currentUser = player;
                                report = player.report;
                                if(player.report != '') {
                                    reported = true;
                                }
                                bet = player.bet;
                            }

                            player = getDivisionFromLDR(player);
                            players.push(player);

                        }

                        connection.query("SELECT `avatarURL`, `status` FROM `users` WHERE `userID` = '" + players[0].userID + "' OR `userID` = '" + players[1].userID + "' OR `userID` = '" + players[2].userID + "' OR `userID` = '" + players[3].userID + "' OR `userID` = '" + players[4].userID + "' OR `userID` = '" + players[5].userID + "' OR `userID` = '" + players[6].userID + "' OR `userID` = '" + players[7].userID + "' ORDER BY `userID` DESC", function(error, results, fields) {
                            players.sort(function(a, b) {
                                return b.userID - a.userID;
                            });

                            for(var i = 0; i < results.length; i++) {
                                players[i].avatarURL = results[i].avatarURL;
                                players[i].status = results[i].status;
                            }

                            if(!authorized) {
                                res.redirect('/');
                            } else {
                                players.sort(function(a, b) {
                                    return b.LDR - a.LDR;
                                });
                                connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                                    if(error) {
                                        console.log(error);
                                    }
                                    currentUser = results[0];
                                    var friends = [];
                                    if(results[0].friends != '' && results[0].friends != '[]') {
                                        friends = JSON.parse(results[0].friends);
                                    }

                                    currentUser.bet = bet;

                                    res.render('match', {
                                        winner: winner,
                                        finished: finished,
                                        matchID: matchID,
                                        team: team,
                                        players: players,
                                        gamemode: gamemode,
                                        map: map,
                                        prizePool: prizePool,
                                        startTime: timestamp,
                                        timeStr: timeStr,
                                        user: currentUser,
                                        friends: friends,
                                        greenBet: greenBet,
                                        blackBet: blackBet,
                                        system: system,
                                        reported: reported,
                                        report: report,
                                        host: host
                                    });
                                });
                            }
                        });
                    }
                });
            } else {
                res.redirect('/');
            }
        }
    });
});



app.post("/updatedGMvote", function(req, res) {
    var userID = req.session.userID;
    var newgmvote = req.body.newgmvote;
    var oldgmvote = req.body.oldgmvote;
    var matchID = req.body.matchID;
    if(!(newgmvote === 'random' || newgmvote === 'snd' || newgmvote === 'hp' || newgmvote === 'ctf')) {

    } else if(!(oldgmvote === 'random' || oldgmvote === 'snd' || oldgmvote === 'hp' || oldgmvote === 'ctf')) {

    } else if(oldgmvote === newgmvote) {

    } else {
        connection.query("UPDATE `match_" + matchID + "` SET `gamemode_vote` = '" + newgmvote + "' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
            if(error) {
                console.log(error);
            }
            io.to('prematch_' + matchID).emit('updatedGMvote', {
                userID: userID,
                newgmvote: newgmvote,
                oldgmvote: oldgmvote
            });
            res.send(newgmvote);
        });
    }
});

app.post("/changeBet", function(req, res) {
    var userID = req.session.userID;
    var bet = parseInt(req.body.bet);
    var matchID = req.body.matchID;
    var team = req.body.team;
    if(bet < 1 || !Number.isInteger(bet)) {
        res.json({
            status: 'error',
            message: "Your bet must be greater than 0"
        });
        return;
    }

    connection.query("SELECT `LP` FROM `users` WHERE `userID` = '" + userID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {
            var totalLP = results[0].LP;
            var oldLP = results[0].LP;

            connection.query("SELECT `bet` FROM `matchmaking_queue` WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }
                totalLP += results[0].bet;
                if(bet <= totalLP) {
                    var newLP = totalLP - bet;
                    //update the user's bet
                    connection.query("UPDATE `matchmaking_queue` SET `bet` = '" + bet + "' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                        if(error) {
                            console.log(error);
                        }
                        connection.query("UPDATE `users` SET `LP` = '" + newLP + "' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                            if(error) {
                                console.log(error);
                            }
                            res.json({
                                userID: userID,
                                bet: bet,
                                LP: newLP
                            });
                        });
                    })
                } else {
                    res.send("invalid bet");
                }
            });
        }
    });
});

app.post("/updateBet", function(req, res) {
    var userID = req.session.userID;
    var bet = parseInt(req.body.newBet);
    var matchID = req.body.matchID;
    var team = req.body.team;
    if(bet < 1 || !Number.isInteger(bet)) {
        res.json({
            status: 'error',
            message: "Your bet must be greater than 0"
        });
        return;
    }

    connection.query("SELECT `LP` FROM `users` WHERE `userID` = '" + userID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {
            if(results[0].LP >= bet) {
                //update the user's bet
                connection.query("SELECT `status` FROM `match_history` WHERE `matchID` = '" + matchID + "'", function(error, results, fields) {
                    if(error) {
                        console.log(error);
                    }
                    if(results.length > 0) {
                        if(results[0].status === 1) {
                            connection.query("UPDATE `users` SET `LP` = `LP` - '" + bet + "' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                                if(error) {
                                    console.log(error);
                                }
                                connection.query("UPDATE `match_history` SET `total_bet` = `total_bet` + " + bet + " WHERE `matchID` = '" + matchID + "'", function(error, results, fields) {
                                    if(error) {
                                        console.log(error);
                                    }
                                });
                                connection.query("UPDATE `match_" + matchID + "` SET `bet` = `bet` + " + bet + " WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                                    if(error) {
                                        console.log(error);
                                    }
                                    io.to('prematch_' + matchID + "_" + team).emit('updatedBet', {
                                        userID: userID,
                                        bet: bet,
                                        team: team
                                    });
                                    res.json({
                                        status: 'success',
                                        message: bet + " LP added to your current bet."
                                    });
                                });
                            })

                        } else if(results[0].status === 0) {
                            res.json({
                                status: 'error',
                                message: "Waiting for players to connect."
                            });
                        } else {
                            res.send("Error updating bet.");
                        }
                    } else {
                        res.json({
                            status: 'error',
                            message: "Waiting for players to connect."
                        });
                    }
                });
            } else {
                res.json({
                    status: 'error',
                    message: "You do not have enough LP to bet this amount."
                });
            }
        }
    });
});

/*app.post("/paypal/execute-payment", function(req, res) {
    console.log(req.body);
    console.log(req.session);
    if(req.body.paymentID === req.session.payment.paymentID) {
        connection.query("UPDATE `users` SET `LP` = `LP` + '" + req.session.payment.LPamount + "' WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
            if(error) {
                console.log(error);
            }
            res.send(req.session.payment.LPamount);
        })
    }
});

app.post("/paypal/create-payment/:amount", function(req, res) {
    var LPamount = req.params.amount;
    console.log(LPamount);
    var USD = LPamount / 100;
    var obj = {
        "intent": "sale",
        "redirect_urls": {
            "return_url": "http://www.google.com",
            "cancel_url": "http://www.google.com"
        },
        "payer": {
            "payment_method": "paypal"
        },
        "transactions": [{
            "amount": {
                "total": USD,
                "currency": "USD"
            },
            "description": "The payment transaction description.",
        }]
    }
    paypal.payment.create(obj, function(error, payment) {
        if(error) {
            console.log(error);
        } else {
            res.send(payment);
            req.session.payment = {
                LPamount: LPamount,
                paymentID: payment.id
            }
            req.session.save();
            console.log(req.session.payment);
        }
    });
});*/

app.get("/prematch/:matchID", auth, function(req, res) {

    var matchID = req.params.matchID;
    var team = '';
    var greenBet = 0;
    var blackBet = 0;
    var totalBet = 0;

    //CHECK TO SEE IF MATCH EXISTS
    connection.query("SELECT * FROM `match_history` WHERE `matchID` = '" + matchID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {

            var authorized = false;
            var players = [];
            var currentUser = {};
            var system = results[0].system;

            if(results[0].status === 1) {

                var timestamp = results[0].prematch_time;
                timestamp = new Date(timestamp);
                timestamp = Math.floor(timestamp.getTime() / 1000);

                connection.query("SELECT * FROM `match_" + matchID + "`", function(error, results, fields) {
                    if(error) {
                        console.log(error);
                    }

                    players = results.slice();
                    var count = 0;

                    players.forEach(function(player){
                        connection.query("SELECT `avatarURL`, `status` FROM `users` WHERE `userID` = '"+player.userID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }

                            player = getDivisionFromLDR(player);


                            player.avatarURL = results[0].avatarURL;
                            player.status = results[0].status;

                            totalBet += player.bet;

                            if(player.team === 'green') {
                                greenBet += player.bet;
                            } else {
                                blackBet += player.bet;
                            }

                            if(req.session.userID === player.userID) {
                                authorized = true;
                                currentUser = player;
                                team = player.team;
                            }

                            count++;
                            if(count >= players.length) {
                                if(!authorized) {
                                    res.redirect("/");
                                } else {

                                    players.sort(function(a, b) {
                                        return b.LDR - a.LDR;
                                    });
                                    connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                                        if(error) {
                                            console.log(error);
                                        }

                                        req.session.rooms = ['prematch_' + matchID, 'prematch_' + matchID + '_' + team];
                                        req.session.save();

                                        currentUser.LP = results[0].LP;
                                        currentUser.LDR = results[0].LDR;
                                        currentUser.last_match = results[0].last_match;
                                        res.render("prematch", {
                                            players: players,
                                            team: team,
                                            matchID: matchID,
                                            time: timestamp,
                                            user: currentUser,
                                            greenBet: greenBet,
                                            blackBet: blackBet,
                                            totalBet: totalBet,
                                            playersIn: 8,
                                            system: system
                                        });
                                    })
                                }
                            }

                        });
                    });
                });

            } else if(results[0].status === 0) {

                var playersIn = 0;
                connection.query("SELECT * FROM `match_" + matchID + "`", function(error, results, fields) {
                    if(error) {
                        console.log(error);
                    }

                    players = results.slice();
                    var count = 0;

                    players.forEach(function(player){
                        connection.query("SELECT `avatarURL`, `status` FROM `users` WHERE `userID` = '"+player.userID+"'", function(error, results, fields){
                            if(error){
                                console.log(error);
                            }

                            player = getDivisionFromLDR(player);

                            if(player.inMatch == 1) {
                                playersIn++;
                            }


                            player.avatarURL = results[0].avatarURL;
                            player.status = results[0].status;

                            totalBet += player.bet;

                            if(player.team === 'green') {
                                greenBet += player.bet;
                            } else {
                                blackBet += player.bet;
                            }

                            if(req.session.userID === player.userID) {
                                authorized = true;
                                currentUser = player;
                                team = player.team;
                                connection.query("UPDATE `match_" + matchID + "` SET `inMatch` = 1 WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            }

                            count++;
                            if(count >= players.length) {
                                if(!authorized) {
                                    res.redirect("/");
                                } else {

                                    players.sort(function(a, b) {
                                        return b.LDR - a.LDR;
                                    });
                                    connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                                        if(error) {
                                            console.log(error);
                                        }

                                        req.session.rooms = ['prematch_' + matchID, 'prematch_' + matchID + '_' + team];
                                        req.session.save();

                                        currentUser.LP = results[0].LP;
                                        currentUser.LDR = results[0].LDR;
                                        currentUser.last_match = results[0].last_match;
                                        res.render("prematch", {
                                            players: players,
                                            team: team,
                                            matchID: matchID,
                                            time: timestamp,
                                            user: currentUser,
                                            greenBet: greenBet,
                                            blackBet: blackBet,
                                            totalBet: totalBet,
                                            playersIn: playersIn,
                                            system: system
                                        });
                                    })
                                }
                            }

                        });
                    });
                });

            } else {
                res.send("Match does not exist");
                console.log("Match does not exist");
            }
        } else {
            res.send("Match does not exist");
            console.log("Match does not exist");
        }
    })
});

app.get("/enter_matchmaking", auth, function(req, res) {
    connection.query("SELECT `status` FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results[0].status === 'none') {
            connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }
                var user = results[0];
                if(user.status === 'matchmaking') {
                    res.redirect('/matchmaking');
                } else {
                    res.render("enter", {
                        user: user
                    });
                }
            });
        } else if(results[0].status == 'match' || results[0].status == 'prematch') {
            req.session.alertMsg = "You must finish and report your current match before entering matchmaking!";
            req.session.alertType = 'error';
            res.redirect('/');
        } else if(results[0].status == 'lobby') {
            req.session.alertMsg = "You are not allowed to enter matchmaking while in a lobby!";
            req.session.alertType = 'error';
            res.redirect('/');
        } else {
            req.session.alertMsg = "You are already in matchmaking!";
            req.session.alertType = 'error';
            res.redirect('/');
        }
    });
});

app.get('/matchmaking_queue', function(req, res) {
    connection.query("SELECT * FROM `matchmaking_queue`", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {
            res.json(results);
        }
    });
});

app.post("/leave_matchmaking", auth, function(req, res) {
    connection.query("SELECT `status` FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results[0].status === 'matchmaking') {
            connection.query("SELECT `bet`,`system` FROM `matchmaking_queue` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }
                if(results.length > 0) {
                    var system = results[0].system;
                    var bet = results[0].bet;
                    //leave matchmaking
                    connection.query("DELETE FROM `matchmaking_queue` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                        if(error) {
                            console.log(error);
                        }
                        connection.query("UPDATE `users` SET `status` = 'none', `LP` = `LP` + '" + bet + "' WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                            if(error) {
                                console.log(error);
                            }

                            req.session.rooms = [];
                            req.session.save();

                            io.to('matchmaking_'+system).emit('leave', {
                                userID: req.session.userID
                            });
                            req.session.alertMsg = "Successfully left matchmaking!";
                            req.session.alertType = 'success';
                            res.redirect('/');
                        });
                    });
                }
            });
        } else {
            req.session.alertMsg = "You are not in "+system+" matchmaking!";
            req.session.alertType = 'error';
            res.redirect('/');
        }
    });
});

app.get("/matchmaking", auth, function(req, res) {
    connection.query("SELECT * FROM `matchmaking_queue` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results.length > 0) {
            var bet = results[0].bet;
            var system = results[0].system;
            connection.query("SELECT * FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
                if(error) {
                    console.log(error);
                }
                var user = getDivisionFromLDR(results[0]);
                user.bet = bet;
                connection.query("SELECT * FROM `matchmaking_queue` WHERE `system` = '"+system+"' ORDER BY `join_time` DESC", function(error, results, fields) {
                    if(error) {
                        console.log(error);
                    }
                    if(results.length > 0) {
                        for(var i = 0; i < results.length; i++) {
                            results[i] = getDivisionFromLDR(results[i]);
                        }
                        res.render('matchmaking', {
                            queue: results,
                            user: user, 
                            system: system
                        });
                    }
                });
            });
        } else {
            req.session.alertMsg = "You are not in "+system+" matchmaking!";
            req.session.alertType = 'error';
            res.redirect('/enter_matchmaking');
        }
    });
});

app.post("/matchmaking", auth, function(req, res) {
    var system = req.body.system;

    if(system != 'psn' && system != 'xbox') {
        req.session.alertMsg = "Invalid system type!";
        req.session.alertType = 'error';
        res.redirect('/');
        return;
    }
    connection.query("SELECT `status` FROM `users` WHERE `userID` = '" + req.session.userID + "'", function(error, results, fields) {
        if(error) {
            console.log(error);
        }
        if(results[0].status === 'none') {
            var LDR;
            var userID = req.session.userID;
            var bet = parseInt(req.body.bet);
            var user = {
                userID: userID,
                bet: bet,
            };

            if(bet < 0) {
                req.session.alertMsg = "Your LP bet must be at least 0!";
                req.session.alertType = 'error';
                res.redirect('/enter_matchmaking');
                return;
            }

            connection.query("SELECT * FROM `matchmaking_queue` WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                if(results.length > 0) {
                    console.log('user is already in queue');
                    res.send('user is already in queue');
                } else {
                    connection.query("SELECT * FROM `users` WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                        if(error) {
                            console.log(error);
                        }
                        if(results.length > 0) {
                            //CHECK IF USER HAS THAT SYSTEM NAME SET
                            console.log(system);
                            if(results[0][system] == '') {
                                req.session.alertMsg = "Your "+system+" name is not set!";
                                req.session.alertType = 'error';
                                res.redirect('/enter_matchmaking');
                                return;
                            }
                            user.systemName = results[0][system];
                            user.LP = results[0].LP;
                            user.LDR = results[0].LDR;
                            user = getDivisionFromLDR(user);
                            user.username = results[0].username;
                            user.avatarURL = results[0].avatarURL;

                            if(user.LP >= bet) {
                                user.LP -= bet;
                                //user enter matchmaking
                                connection.query("UPDATE `users` SET `status` = 'matchmaking' WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                                    if(error) {
                                        console.log(error);
                                    }
                                    user.status = 'matchmaking';
                                    connection.query("UPDATE `users` SET `LP` = `LP` - " + bet + " WHERE `userID` = '" + userID + "'", function(error, results, fields) {
                                        if(error) {
                                            console.log(error);
                                        }

                                        connection.query("INSERT INTO `matchmaking_queue`(`userID`,`system`,`system_name`,`username`,`LDR`, `bet`, `countedLDR`) VALUES ('" + userID + "','"+system+"','"+user.systemName+"', '" + user.username + "', '" + user.LDR + "', '" + bet + "', '"+user.LDR+"')", function(error, results, fields) {
                                            if(error) {
                                                console.log(error);
                                            }

                                            connection.query("SELECT * FROM `matchmaking_queue` WHERE `system` = '"+system+"' ORDER BY `join_time` DESC", function(error, results, fields) {
                                                if(error) {
                                                    console.log(error);
                                                }

                                                if(results.length > 0) {
                                                    for(var i = 0; i < results.length; i++) {
                                                        results[i] = getDivisionFromLDR(results[i]);
                                                        if(results[i].userID === userID) {
                                                            user.join_time = new Date(results[i].join_time);
                                                        }
                                                    }

                                                    io.to('matchmaking_'+system).emit('enter', user);

                                                    req.session.rooms = ['matchmaking_'+system];
                                                    req.session.save();
                                                   
                                                    res.render('matchmaking', {
                                                        queue: results,
                                                        user: user,
                                                        system: system
                                                    });
                                                }
                                            });
                                        });
                                    });
                                });
                            } else {
                                //not enough LP
                                req.session.alertMsg = "You do not have enough LP!";
                                req.session.alertType = "error";
                                res.redirect('/enter_matchmaking');
                            }
                        }
                    });
                }
            });
        } else {
            req.session.alertMsg = "You are already in a match!";
            req.session.alertType = "error";
            res.redirect('/');
        }
    });
});

app.get('/register', function(req, res) {
    res.render('signup');
});

app.get("/login", function(req, res) {
    res.render('login');
});

app.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});

app.post('/register', function(req, res) {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if(username.length <= 15 && password.length >= 8) {
        connection.query("SELECT * FROM `users` WHERE `username` = '"+username+"'", function(error, results, fields){
            if(error){
                console.log(error);
            }
            if(results.length == 0) {
                connection.query("SELECT * FROM `users` WHERE `email` = '"+email+"'", function(error, results, fields){
                    if(error){
                        console.log(error);
                    }
                    if(results.length == 0) {
                        bcrypt.hash(password, 10, function(err, hash) {
                            connection.query("INSERT INTO `users`(`username`, `email`, `password`, `join_date`) VALUES ('" + username + "', '" + email + "', '" + hash + "', '" + date + "')", function(error, results, fields) {
                                if(error) {
                                    console.log("error");
                                }
                                connection.query("UPDATE `stats` SET `joined_users` = `joined_users` + 1", function(error, results, fields){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                                connection.query("SELECT * FROM `users` WHERE `username` = '" + username + "'", function(error, results, fields) {
                                    if(error) {
                                        console.log(error);
                                    }
                                    console.log(results);
                                    fs.mkdirSync(__dirname + "/public/users/avatars/" + results[0].userID);
                                    req.session.userID = results[0].userID;
                                    req.session.user = results[0];
                                    req.session.user.password = undefined;
                                    req.session.loggedIn = true;
                                    req.session.save();
                                    req.session.alertMsg = "Welcome to The COD Pro League! Thanks for joining us in our mission to bring back competitive Call of Duty!";
                                    req.session.alertType = 'success';
                                    res.json({
                                        status: 'success',
                                        message: 'Successfully Registered!'
                                    });
                                });
                            });
                        });
                    } else {
                        res.json({
                            status: 'error',
                            message: "Sorry, this email address is already in use. Please use a different email address."
                        });
                    }
                });
                
            } else {
                res.json({
                    status: 'error',
                    message: "Sorry, this username is already taken."
                });
            }
        });
    } else {
        res.json({
            status: 'error',
            message: "Registration information invalid"
        });
    }
});

app.post('/login', function(req, res) {

    var username = req.body.username;
    var password = req.body.password;

    if(!req.body.username || !req.body.password) {

        req.session.alertMsg = "All fields must be set!";
        req.session.alertType = 'error';
        res.redirect('/login');

    } else {

        connection.query("SELECT * FROM users WHERE `username` = '" + username + "'", function(error, results, fields) {
            if(error) {
                res.redirect('/login');
            } else {
                if(results.length > 0) {
                    var hash = results[0].password;

                    bcrypt.compare(password, hash, function(err, bool) {
                        if(bool) {
                            console.log("successfully logged in");
                            req.session.userID = results[0].userID;
                            req.session.user = results[0];
                            req.session.user.password = undefined;
                            req.session.loggedIn = true;
                            req.session.save();
                            res.redirect(req.session.path || '/');
                        } else {
                            req.session.alertMsg = "Incorrect username or password!";
                            req.session.alertType = 'error';
                            res.redirect('/login');
                        }
                    });
                } else {
                    req.session.alertMsg = "Incorrect username or password!";
                    req.session.alertType = 'error';
                    res.redirect('/login');
                }
            }
        });
    }
});

io.use(sharedsession(session, {
    autoSave: true
})); 

io.adapter(ioredis({ host: 'localhost', port: 6379 }));

io.on('connection', function(socket) {

    usersOnline++;
    io.emit('users-online', {
        usersOnline: usersOnline
    });

    connection.query("UPDATE `stats` SET `page_views` = `page_views` + 1", function(error, results, fields){
        if(error){
            console.log(error);
        }
    });

    //UPDATE CURRENT GAMES
    connection.query("SELECT COUNT(*) AS `count` FROM `match_history` WHERE `status` != 3", function(error, results, fields){
        if(error){
            console.log(error);
        }

        var currentGamesCount = results[0].count;
        io.emit("current-games", {
            currentGames: currentGamesCount
        })
    });

    //USERID ROOM
    if(socket.handshake.session.userID != undefined) {
        var userID = socket.handshake.session.userID;
        socket.join(userID);
    }

    //OTHER ROOMS
    if(socket.handshake.session.rooms != undefined && socket.handshake.session.rooms.length > 0) {
        var rooms = socket.handshake.session.rooms;
        rooms.forEach(function(room){
            socket.join(room);
        });
    }

    socket.on('disconnect', function() {
        usersOnline--;
        io.emit('users-online', {
            usersOnline: usersOnline
        });
    })

});

server.listen(3000, function() {
    console.log("Server is running...");
});