var session = require('../server.js').session;

var auth = function(req, res, next) {
	var path;
	if(req.originalUrl === undefined) {
		path = "/";
	} else {
		path = req.originalUrl;
	}
	req.session.path = path;
	
    if (req.session.loggedIn == true) {
        next();
    } else {
        res.redirect('/login');
    }
};

module.exports = auth;