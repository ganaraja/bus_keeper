
var express = require('express');
var request = require('request');

var app = express();

var GA_TRACKING_ID = 'UA-80568005-1';

function trackEvent(category, action, label, value, cb) {
  var data = {
    v: '1', // API Version.
    tid: GA_TRACKING_ID, // Tracking ID / Property ID.
    // Anonymous Client Identifier. Ideally, this should be a UUID that
    // is associated with particular user, device, or browser instance.
    cid: '555',
    t: 'event', // Event hit type.
    ec: category, // Event category.
    ea: action, // Event action.
    el: label, // Event label.
    ev: value, // Event value.
  };

  request.post(
    'http://www.google-analytics.com/collect', {
      form: data
    },
    function(err, response) {
      if (err) { return cb(err); }
      if (response.statusCode !== 200) {
        return cb(new Error('Tracking failed'));
      }
      cb();
    }
  );
}

"AMAZON.NoIntent": function (intent, session, response) {
    trackEvent(
      'Intent',
      'AMAZON.NoIntent',
      'na',
      '100', // Event value must be numeric.
      function(err) {
        if (err) {
            return next(err);
        }
        var speechOutput = "Okay.";
        response.tell(speechOutput);
      });
}

var http       = require('http')
  , AlexaSkill = require('./AlexaSkill')
  , APP_ID     = 'amzn1.echo-sdk-ams.app.260bfab1-5fc4-42b7-b706-e220d826ced5'
  , MTA_KEY    = '6ceac258-6183-478b-9fb4-33ed37ff32f7';

var url = function(stopId){
  return 'http://bustime.mta.info/api/siri/stop-monitoring.json?key=' + MTA_KEY + '&OperatorRef=MTA&MaximumStopVisits=1&MonitoringRef=' + stopId;
};

var getJsonFromMta = function(stopId, callback){
  http.get(url(stopId), function(res){
    var body = '';

    res.on('data', function(data){
      body += data;
    });

    res.on('end', function(){
      var result = JSON.parse(body);
      callback(result);
    });

  }).on('error', function(e){
    console.log('Error: ' + e);
  });
};

var handleNextBusRequest = function(intent, session, response){
  getJsonFromMta(intent.slots.bus.value, function(data){
    if(data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit){
      var text = data
                  .Siri
                  .ServiceDelivery
                  .StopMonitoringDelivery[0]
                  .MonitoredStopVisit[0]
                  .MonitoredVehicleJourney
                  .MonitoredCall
                  .Extensions
                  .Distances
                  .PresentableDistance;
      var cardText = 'The next bus is: ' + text;
    } else {
      var text = 'That bus stop does not exist.'
      var cardText = text;
    }

    var heading = 'Next bus for stop: ' + intent.slots.bus.value;
    response.tellWithCard(text, heading, cardText);
  });
};

var BusSchedule = function(){
  AlexaSkill.call(this, APP_ID);
};

BusSchedule.prototype = Object.create(AlexaSkill.prototype);
BusSchedule.prototype.constructor = BusSchedule;

BusSchedule.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session){
  // What happens when the session starts? Optional
  console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
      + ", sessionId: " + session.sessionId);
};

BusSchedule.prototype.eventHandlers.onLaunch = function(launchRequest, session, response){
  // This is when they launch the skill but don't specify what they want. Prompt
  // them for their bus stop
  var output = 'Welcome to Bus Schedule. ' +
    'Say the number of a bus stop to get how far the next bus is away.';

  var reprompt = 'Which bus stop do you want to find more about?';

  response.ask(output, reprompt);

  console.log("onLaunch requestId: " + launchRequest.requestId
      + ", sessionId: " + session.sessionId);
};

BusSchedule.prototype.intentHandlers = {
  GetNextBusIntent: function(intent, session, response){
    handleNextBusRequest(intent, session, response);
  },

  HelpIntent: function(intent, session, response){
    var speechOutput = 'Get the distance from arrival for any NYC bus stop ID. ' +
      'Which bus stop would you like?';
    response.ask(speechOutput);
  }
};

exports.handler = function(event, context) {
    var skill = new BusSchedule();
    skill.execute(event, context);
};
