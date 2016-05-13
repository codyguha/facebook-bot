const request = require('request');
var _ = require( 'underscore' );
var results = []
var survey_result = {}

if (!process.env.page_token) {
    console.log('Error: Specify page_token in environment');
    process.exit(1);
}

if (!process.env.verify_token) {
    console.log('Error: Specify verify_token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var controller = Botkit.facebookbot({
    debug: false,
    access_token: process.env.page_token,
    verify_token: process.env.verify_token,
});

var bot = controller.spawn({
});

controller.setupWebserver(process.env.port || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
    });
});

controller.hears(['hi','Hi'], 'message_received', function(bot, message) {
    getProfile(message.user, function(err, profile) {        
        var found_result = _.findWhere(results, {id: message.user});
        if (found_result == undefined){
            bot.reply(message, `Hello ${profile.first_name}`);
            askSurvey(bot, message);
        } else {
            bot.reply(message, `Hello ${profile.first_name}, you have already done the survey`);
            redoSurvey(bot, message)
        }
    });
    
});

// POSTBACK HANLDER
controller.on('facebook_postback', function(bot, message) {
    if (message.payload == 'yes(start)') {
        bot.reply(message, `Excellent! Lets get started.`);
        survey_result = {}
        getProfile(message.user, function(err, profile) {
            survey_result.id = message.user
            survey_result.user = `${profile.first_name} ${profile.last_name}`
            survey_result.gender = `${profile.gender}`
            survey_result.locale = `${profile.locale}`
            survey_result.timezone = `${profile.timezone}`
        });
        askRelationship(bot, message)
    } else if (message.payload == 'I love it' || message.payload == 'I hate it' || message.payload == 'Guilty pleasure') {
        
            if (survey_result.relationship == null) {
                survey_result.relationship = message.payload
                askDetail(bot, message)
            } else {
                bot.reply(message, `You've already answered that question.`);     
            }
        
    } else if (message.payload == 'I make it myself' || message.payload == 'KFC is my go to' || message.payload == 'Any way is good' || message.payload == 'Fried food is gross' || message.payload == `I don't eat animals` || message.payload == `It's a secret` || message.payload == `reward` ||message.payload == `cures hangover`) {
        
            if (survey_result.detail == null) {
                survey_result.detail = message.payload
                askMood(bot, message)
            } else {
                bot.reply(message, `You've already answered that question.`);     
            }
        
    } else if (message.payload == '(•‿•)' || message.payload == '(•︵•)' || message.payload == '(•_•)') {
        
            if (survey_result.mood == null) {
                survey_result.mood = message.payload
                askPreference(bot, message)
            } else {
                bot.reply(message, `You've already answered that question.`);     
            }
        
    } else if (message.payload == 'Chicken Parmesan' || message.payload == 'Double Down' || message.payload == 'Fried Drumsticks' || message.payload == 'Chicken Nuggets' || message.payload == 'Veggies') {
        
            if (survey_result.preference == null) {
                survey_result.preference = message.payload
                askHungry(bot, message)
            } else {
                bot.reply(message, `You've already answered that question.`);     
            }

    } else if (message.payload == 'yes' || message.payload == 'no' ) {
        
            if (survey_result.hungry == null) {
                survey_result.hungry = message.payload
                saveResults(bot, message)
            } else if (survey_result == {}){
            bot.reply(message, `You've already answered that question.`); 
            }
    } else if (message.payload == 'no(survey)') {
        sayThanks(bot, message)
    } else if (message.payload == 'View results') {
        viewResults(bot, message)
    } else if (message.payload == 'Re-do survey') {
        var found_result = _.findWhere(results, {id: message.user});
        bot.reply(message, `Excellent! Lets get started.`);
        found_result = {}
        survey_result = {}
        getProfile(message.user, function(err, profile) {
            survey_result.id = message.user
            survey_result.user = `${profile.first_name} ${profile.last_name}`
            survey_result.gender = `${profile.gender}`
            survey_result.locale = `${profile.locale}`
            survey_result.timezone = `${profile.timezone}`
        });
        askRelationship(bot, message)
    }
});
// QUESTIONS
viewResults = function(bot, message) {
    var found_result = _.findWhere(results, {id: message.user});
    var text = JSON.stringify(found_result)
    bot.reply(message, `${text}`);
    
}

askSurvey = function(bot, message) {
    var attachment = {
        'type':'template',
        'payload':{
            'template_type':'button',
            'text': 'Do you have a moment to answer some questions about fried chicken ?',
            'buttons':[
                {
                'type':'postback',
                'title':`Yes`,
                'payload':`yes(start)`
                },
                {
                'type':'postback',
                'title':`No`,
                'payload':`no(survey)`
                }
            ]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });
}

askRelationship = function(bot, message) {
    var attachment = {
        'type':'template',
        'payload':{
            'template_type':'button',
            'text':  'What would you say your relationship is with fried chicken ?',
            'buttons':[
                {
                'type':'postback',
                'title':'I love it',
                'payload':'I love it'
                },
                {
                'type':'postback',
                'title':'I hate it',
                'payload':'I hate it'
                },
                {
                'type':'postback',
                'title':'Guilty pleasure',
                'payload':'Guilty pleasure'
                }
            ]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });
}

askDetail = function(bot, message) {
    if (message.payload == 'I love it') {
        var attachment = {
            'type':'template',
            'payload':{
                'template_type':'button',
                'text': 'What is your favourite way to eat fried chicken ?',
                'buttons':[
                    {
                    'type':'postback',
                    'title':'I make it myself',
                    'payload':'I make it myself'
                    },
                    {
                    'type':'postback',
                    'title':'KFC is my go to',
                    'payload':'KFC is my go to'
                    },
                    {
                    'type':'postback',
                    'title':'Any way is good',
                    'payload':'Any way is good'
                    }
                ]
            }
        };

        bot.reply(message, {
            attachment: attachment,
        });
        
    } else if (message.payload == 'I hate it') {
        var attachment = {
            'type':'template',
            'payload':{
                'template_type':'button',
                'text': 'Not a fan ? tell me more.',
                'buttons':[
                    {
                    'type':'postback',
                    'title':'Fried food is gross',
                    'payload':'Fried food is gross'
                    },
                    {
                    'type':'postback',
                    'title':`I don't eat animals`,
                    'payload':`I don't eat animals`
                    },
                    {
                    'type':'postback',
                    'title':`It's a secret`,
                    'payload':`It's a secret`
                    }
                ]
            }
        };

        bot.reply(message, {
            attachment: attachment,
        });

    } else if (message.payload == 'Guilty pleasure') {
        var attachment = {
            'type':'template',
            'payload':{
                'template_type':'button',
                'text':  'Guilty pleasure you say, tell me more.',
                'buttons':[
                    {
                    'type':'postback',
                    'title':'When Hungover',
                    'payload':'cures hangover'
                    },
                    {
                    'type':'postback',
                    'title':'Reward for myself',
                    'payload':'reward'
                    },
                    {
                    'type':'postback',
                    'title':`It's a secret`,
                    'payload':`It's a secret`
                    }
                ]
            }
        };

        bot.reply(message, {
            attachment: attachment,
        });

    } else  {
        bot.reply(message, 'oops')
    }

}

askMood = function(bot, message) {
    var attachment = {
        'type':'template',
        'payload':{
            'template_type':'button',
            'text': 'What is your current mood ?',
            'buttons':[
                {
                'type':'postback',
                'title':`(•‿•)`,
                'payload':`(•‿•)`
                },
                {
                'type':'postback',
                'title':`(•︵•)`,
                'payload':`(•︵•)`
                },
                {
                'type':'postback',
                'title':`(•_•)`,
                'payload':`(•_•)`
                }
            ]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });

}

askPreference = function(bot, message) {
    var attachment = {
        'type':'template',
        'payload': {
                'template_type': 'generic',
                'elements': [
                    {
                        'title': 'Chicken Parmesan',
                        'image_url': 'http://fiber-international.com/wp-content/uploads/2015/04/800x600-chicken.jpg',
                        'buttons': [
                            {
                                'type': 'postback',
                                'title': 'Choose',
                                'payload': 'Chicken Parmesan'
                            }
                        ]
                    },
                    {
                        'title': 'Double Down',
                        'image_url': 'http://assets.bwbx.io/images/ieMg5BCeWkWU/v1/-1x-1.jpg',
                        'buttons': [
                            {
                                'type': 'postback',
                                'title': 'Choose',
                                'payload': 'Double Down'
                            }
                        ]
                    },
                    {
                        'title': 'Fried Drumsticks',
                        'image_url': 'https://i.ytimg.com/vi/G8hbFO-r2nQ/maxresdefault.jpg',
                        'buttons': [
                            {
                                'type': 'postback',
                                'title': 'Choose',
                                'payload': 'Fried Drumsticks'
                            }
                        ]
                    },
                    {
                        'title': 'Chicken Nuggets',
                        'image_url': 'http://www.urbanmommies.com/wp-content/uploads/McDonalds-Chicken-Nuggets.jpg',
                        'buttons': [
                            {
                                'type': 'postback',
                                'title': 'Choose',
                                'payload': 'Chicken Nuggets'
                            }
                        ]
                    },
                    {
                        'title': 'Veggies',
                        'image_url': 'http://www.stevensonfitness.com/wp-content/uploads/2014/10/veggies.jpg',
                        'buttons': [
                            {
                                'type': 'postback',
                                'title': 'Choose',
                                'payload': 'Veggies'
                            }
                        ]
                    }
                ]
            }
    };

    bot.reply(message, {
        attachment: attachment,
    });

    bot.reply(message, 'Which of these meals your you like to be eating right now ?');
}

askHungry = function(bot, message) {
    var attachment = {
        'type':'template',
        'payload':{
            'template_type':'button',
            'text': 'Have I made you hungry ?',
            'buttons':[
                {
                'type':'postback',
                'title':`yes`,
                'payload':`yes`
                },
                {
                'type':'postback',
                'title':`no`,
                'payload':`no`
                }
            ]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });

}
// OTHER RESPONSES
sayThanks = function(bot, message) {
  bot.reply(message, 'OK! thanks for your time');
}

saveResults = function(bot, message) {
    results.push(survey_result)
    console.log(results)
    redoSurvey(bot, message)
}

redoSurvey = function(bot, message) {
    var attachment = {
        'type':'template',
        'payload':{
            'template_type':'button',
            'text': 'OK! thanks for your time',
            'buttons':[
                {
                'type':'postback',
                'title':`view results`,
                'payload':`View results`
                },
                {
                'type':'postback',
                'title':`re-do survey`,
                'payload':`Re-do survey`
                }
            ]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });

}
// GET USER INFO !!!
getProfile = function (id, cb) {
    if (!cb) cb = Function.prototype

    request({
      method: 'GET',
      uri: `https://graph.facebook.com/v2.6/${id}`,
      qs: {
        fields: 'first_name,last_name,profile_pic,gender,locale,timezone',
        access_token: process.env.page_token
      },
      json: true
    }, function(err, res, body) {
      if (err) return cb(err)
      if (body.error) return cb(body.error)

      cb(null, body)
    })
}
