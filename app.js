/*eslint-env node*/

var request = require('request');

var express = require('express');

var credentials = require('./credentials.json');

var Twitter = require('twitter');
var client = new Twitter(credentials.twitter);

var marvel = require('./marvel');
marvel.setCredentials(credentials.marvel.private_key, credentials.marvel.api_key);

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var app = express();

app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {

	// print a message when the server starts listening
	console.log("server starting on " + appEnv.url);
});

var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function tweetRandomCover() {
	console.log('First, we get a random cover.');

	marvel.getCover(function(res) {
		console.log('back from mavel');
		console.dir(res);
		var tweet = res.title + ' published '+(MONTHS[res.date.getMonth()])+' '+res.date.getFullYear() +'\n'+res.link;
		
		console.log('Now going to fetch the image link.');

		request.get({url:res.url,encoding:null}, function(err, response, body) {
			if(!err && response.statusCode === 200) {
				console.log('Image copied to RAM');

				client.post('media/upload', {media: body}, function(error, media, response) {

					if(error) {
						console.error('Error from media/upload: '+error);
						return;	
					}
					
					// If successful, a media object will be returned.
					console.log('Image uploaded to Twitter');

					var status = {
						status: tweet,
						media_ids: media.media_id_string 
					}

					client.post('statuses/update', status, function(error, tweet, response){
						if (!error) {
							console.log('Tweeted ok');
						}
					});

				});
						
			}
		});
	});	
}

app.get('/forceTweet', function(req, res) {
	tweetRandomCover();
	res.end('Done (not really)');
});

var cron = require('cron');
var cronJob = cron.job('0 6,12,18 * * *', function() {
	console.log('do the cover');
	tweetRandomCover();	
	console.log('cron job complete');
});
cronJob.start();