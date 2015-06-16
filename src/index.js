'use strict';

var bodyParser = require('body-parser'),
	express = require('express'),
	lti = require('ims-lti');

// MemoryStore probably shouldn't be used in production
var nonceStore = new lti.Stores.MemoryStore();

var secrets = Object.create(null);
secrets.key = 'secret';

function getSecret (consumerKey, cb) {
	var secret = secrets[consumerKey];
	if (secret) {
		cb(null, secret);
		return;
	}

	var err = new Error('Unknown consumer "' + consumerKey + '"');
	err.status = 403;

	cb(err);
}

function handleLaunch (req, res, next) {
	if (!req.body) {
		var err = new Error('Expected a body');
		err.status = 400;

		return next(err);
	}

	var consumerKey = req.body.oauth_consumer_key;
	if (!consumerKey) {
		var err = new Error('Expected a consumer');
		err.status = 422;

		return next(err);
	}

	getSecret(consumerKey, function (err, consumerSecret) {
		if (err) {
			return next(err);
		}

		var provider = new lti.Provider(consumerKey, consumerSecret, nonceStore);

		provider.valid_request(req, function (err, isValid) {
			if (err || !isValid) {
				return next(err || new Error('invalid lti'));
			}

			var body = {};
			[
				'roles', 'admin', 'alumni', 'content_developer', 'guest', 'instructor',
				'manager', 'member', 'mentor', 'none', 'observer', 'other', 'prospective_student',
				'student', 'ta', 'launch_request', 'username', 'userId', 'mentor_user_ids',
				'context_id', 'context_label', 'context_title', 'body'
			].forEach(function (key) {
				body[key] = provider[key];
			});

			
			res
				.status(200)
				.json(body);
		});
	});
}

var app = express();

app.set('json spaces', 2);

// If using reverse proxy to terminate SSL
// Such as an Elastic-Load-Balence, ElasticBeanstalk, Heroku
// Uncomment the following line
// app.enable('trust proxy');

app.post('/launch_lti', bodyParser.urlencoded({ extended: false }), handleLaunch);

var server = require('http')
	.createServer(app)
	.listen(3001, function () {
		var address = server.address();
		console.log('Listening on %s:%s', address.address, address.port);
	});
