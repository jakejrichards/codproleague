var bcrypt = require("bcrypt");
var moment = require("moment");
var request = require("request");
var express = require("express");
var session = require("express-session");
var cookieParser = require('cookie-parser');
var connection = require('./config');
var app = express();
var server = require('http').createServer(app);
var redis = require("redis");
var client = redis.createClient(6379, 'localhost');
var redisStore = require("connect-redis")(session);
var store = new redisStore({client : client});
var emitter = require('socket.io-emitter')(client);
var options = {
    secret: 'iA=nIBw&M5}gD&x$&XmWQg]OsE)!^x@ox({L`@sGz|L2[,}xOb2b=dDh`33sR',
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    maxAge: 1800000
};
var _ = require("underscore");
var ejs = require('ejs');
var bodyParser = require('body-parser');
var uniqid = require('uniqid');
var getDivisionFromLDR = require("./functions/getDivisionFromLDR");

var securePass = "|.A4>s0jao{la{Mf,T(e5vNZB~|=3fjNWM1r+;RvWb83az?5z^|N83C@+@ZCzst";

var endMatch = require('./functions/endMatch');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(cookieParser());

session = session(options);

app.use(session);
app.set('view engine', 'ejs');

app.get("/", function(req, res){

	if(req.session.admin){

		connection.query("SELECT * FROM `cplinfo`", function(error, results, fields){
			if(error){
				console.log(error);
			}

			var matchCount = results[0].current_match - 1;
			var profit = results[0].profit;
			connection.query("SELECT * FROM `match_history` WHERE `winner` = 'dispute'", function(error, results, fields){
				if(error){
					console.log(error);
				}

				var disputeCount = results.length;
				connection.query("SELECT * FROM `reports`", function(error, results, fields){
					if(error){
						console.log(error);
					}

					var reportsCount = results.length;
					connection.query("SELECT * FROM `users`", function(error, results, fields){
						if(error){
							console.log(error);
						}

						var userCount = results.length;
						connection.query("SELECT * FROM `stats`", function(error, results, fields){
							if(error){
								console.log(error);
							}

							var pageviews = results[0].page_views;
							var newUsers = results[0].joined_users;

							res.render("admin/index", {
								userCount: userCount,
								matchCount: matchCount,
								disputeCount: disputeCount,
								reportsCount: reportsCount,
								profit: profit,
								newUsers: newUsers,
								pageviews: pageviews
							});
						});
					});
				});
			});
		});

	} else {
		res.redirect("/login");
	}
});

app.post("/update_winner", isAdmin, function(req, res){
	var matchID = req.body.matchID;
	var winner = req.body.winner;

	connection.query("SELECT `winner` FROM `match_history` WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}

		if(results[0].winner == 'dispute') {
			connection.query("UPDATE `match_"+matchID+"` SET `report` = 'win' WHERE `team` = '"+winner+"'", function(error, results, fields){
				if(error){
					console.log(error);
				}

				connection.query("UPDATE `match_history` SET `winner` = '"+winner+"' WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
					if(error){
						console.log(error);
					}
				});

				connection.query("UPDATE `match_"+matchID+"` SET `report` = 'loss' WHERE `team` != '"+winner+"'", function(error, results, fields){
					if(error){
						console.log(error);
					}

					endMatch(matchID);
				});
			});
		}
	});
});

app.post('/dispute_info', isAdmin, function(req, res){
	var matchID = req.body.matchID;
	connection.query("SELECT * FROM `match_history` WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}
		var match = results[0];
		connection.query("SELECT * FROM `match_"+matchID+"`", function(error, results, fields){
			if(error){
				console.log(error);
			}
			var players = results;
			connection.query("SELECT * FROM `disputes` WHERE `matchID` = '"+matchID+"'", function(error, results, fields){
				if(error){
					console.log(error);
				}

				res.json({
					info: match,
					players: players,
					proof: results
				});

			});
		});
	});
});

app.get("/disputes", isAdmin, function(req, res){
	connection.query("SELECT * FROM `match_history` WHERE `winner` = 'dispute' ORDER BY `matchID` DESC LIMIT 100", function(error, results, fields){
		if(error){
			console.log(error);
		}

		if(results.length > 0) {
			var disputes = results;

			res.render("admin/disputes", {
				disputes: disputes
			});

		}

	});
});

app.post("/unban_user", isAdmin, function(req, res){
	var userID = req.body.userID;

	store.all(function(error, sessions){
		sessions.forEach(function(session){
			if(session.userID == userID){
				if(error){
					console.log(error);
				}
				session.user.banned = 0;
				store.set(session.id, session, function(err){
					if(err){
						console.log(err);
					}
					console.log("updated session");
				});
			}
		});
	});

	connection.query("UPDATE `users` SET `banned` = 0 WHERE `userID` = '"+userID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}
		res.send("USER UNBANNED");
	});
});

app.post('/ban_user', isAdmin, function(req, res){
	var userID = req.body.userID;
	var banTime = req.body.banTime;
	var interval = banTime.toUpperCase();

	store.all(function(error, sessions){
		sessions.forEach(function(session){
			if(session.userID == userID){
				if(error){
					console.log(error);
				}
				session.user.banned = 1;
				session.user.unbanned = interval;
				store.set(session.id, session, function(err){
					if(err){
						console.log(err);
					}
					console.log("updated session");
				});
			}
		});
	});

	if(banTime == 'indefinite') {
		connection.query("UPDATE `users` SET `banned` = 1, `times_banned` = `times_banned` + 1, `unbanned` = '9999-12-31 00:00:00' WHERE `userID` = '"+userID+"'", function(error, results, fields){
			if(error){
				console.log(error);
			}
			res.send("USER BANNED FOREVER");
		});
	} else {
		connection.query('UPDATE `users` SET `banned` = 1, `unbanned` = NOW() + INTERVAL 1 '+interval+', `times_banned` = `times_banned` + 1 WHERE `userID` = "'+userID+'"', function(error, results, fields){
			if(error){
				console.log(error);
			}
			res.send("User banned for 1 " + banTime);
		});
	}
});

app.get("/search", isAdmin, function(req, res){
	var searchName = req.query.username || "";
	var searchID = req.query.userID || "";
	var searchEmail = req.query.email || "";

	if(searchID == "" && searchEmail == "") {
		connection.query("SELECT `userID`, `username`, `email`, `xbox`, `psn` FROM `users` WHERE `username` LIKE '%"+searchName+"%'  ORDER BY `userID` DESC LIMIT 250", function(error, results, fields){
			if(error){
				console.log(error);
			}
			var users = results;
			res.render("admin/users", {
				users: users
			});
		});
	} else if(searchName == "" && searchEmail == "") {
		connection.query("SELECT `userID`, `username`, `email`, `xbox`, `psn` FROM `users` WHERE `userID` = '"+searchID+"'  ORDER BY `userID` DESC LIMIT 250", function(error, results, fields){
			if(error){
				console.log(error);
			}
			var users = results;
			res.render("admin/users", {
				users: users
			});
		});
	} else {
		connection.query("SELECT `userID`, `username`, `email`, `xbox`, `psn` FROM `users` WHERE `email` LIKE '%"+searchEmail+"%'  ORDER BY `userID` DESC LIMIT 250", function(error, results, fields){
			if(error){
				console.log(error);
			}
			var users = results;
			res.render("admin/users", {
				users: users
			});
		});
	}
	
});

app.post("/update_user", isAdmin, function(req, res){
	var column = req.body.column;
	var data = req.body.data;
	var userID = req.body.userID;

	console.log("test");

	connection.query("UPDATE `users` SET `"+column+"` = '"+data+"' WHERE `userID` = '"+userID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}

		console.log("updated user info");

	});
});

app.post('/user_info', isAdmin, function(req, res){
	var userID = req.body.userID;
	connection.query("SELECT * FROM `users` WHERE `userID` = '"+userID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}
		if(results.length > 0) {
			res.json({
				status: 'success',
				user: getDivisionFromLDR(results[0])
			});
		} else {
			res.json({
				status: 'error',
				message: 'User could not be found.'
			});
		}
	});
});

app.get("/users", isAdmin, function(req, res){
	connection.query("SELECT `userID`, `username`, `email`, `xbox`, `psn` FROM `users` ORDER BY `userID` DESC LIMIT 100", function(error, results, fields){
		if(error){
			console.log(error);
			
		}
		var users = results;
		res.render("admin/users", {
			users: users
		});
	});
});

app.post("/delete_report", isAdmin, function(req, res){

	var reporting_userID = req.body.reporting_userID;
	var reported_userID = req.body.reported_userID;

	connection.query("DELETE FROM `reports` WHERE `reporting_userID` = '"+reporting_userID+"' AND `reported_userID` = '"+reported_userID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}
		res.json({
			status: "success",
			reported: reported_userID,
			reporting: reporting_userID
		});
	});
});

app.post("/report_info", isAdmin, function(req, res){
	var reporting_userID = req.body.reporting;
	var reported_userID = req.body.reported;
	var reporting_user;
	var reported_user;

	connection.query("SELECT * FROM `reports` WHERE `reported_userID` = '"+reported_userID+"' AND `reporting_userID` = '"+reporting_userID+"'", function(error, results, fields){
		if(error){
			console.log(error);
		}

		var report_info = results[0];

		connection.query("SELECT * FROM `users` WHERE `userID` = '"+reporting_userID+"' OR `userID` = '"+reported_userID+"'", function(error, results, fields){
			if(error){
				console.log(error);
			}

			var users = results;
			if(users[0].userID == reported_userID) {
				reported_user = users[0];
				reporting_user = users[1];
			} else {
				reported_user = users[1];
				reporting_user = users[0];
			}

			res.json({
				reported_user: reported_user,
				reporting_user: reporting_user,
				info: report_info
			});
		});
	});
});

app.get("/reports", isAdmin, function(req, res){
	connection.query("SELECT * FROM `reports` ORDER BY `reported_userID`", function(error, results, fields){
		if(error){
			console.log(error);
		}
		if(results.length > 0) {
			var reports = results;
			res.render('admin/reports', {
				reports: reports
			});
		} else {
			res.render('admin/reports', {
				reports: []
			});
		}
	});
});

app.post("/login", function(req, res){
	connection.query("SELECT `hash` FROM `cplinfo`", function(error, results, fields){
		if(error){
			console.log(error);
		}
		var hash = results[0].hash;
		var pass = req.body.password;

		bcrypt.compare(pass, hash, function(err, auth){
			if(auth){
				req.session.admin = true;
				res.redirect("/");
			} else {
				res.redirect("/login");
			}
		});
	});
});

app.get("/login", function(req, res){
	if(req.session.admin == undefined || !req.session.admin) {
		res.render("admin-login");
	} else {
		res.redirect('/');
	}
});

app.get("/logout", function(req, res){
	req.session.destroy();
	res.redirect("/login");
});

server.listen(3031, function(){
	console.log("ADMIN PANEL IS UP");
});

function isAdmin(req, res, next) {
	if(req.session.admin){
		next();
	} else {
		res.redirect('/login');
	}
}
