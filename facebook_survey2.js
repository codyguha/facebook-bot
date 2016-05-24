const request = require('request');
var _ = require('underscore');
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
    debug: true,
    access_token: process.env.page_token,
    verify_token: process.env.verify_token,
});

var bot = controller.spawn({});

controller.setupWebserver(process.env.port || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
    });
});

controller.on('message_received', function(bot, message) {
    if (message.attachments){
        if (message.attachments[0].type == 'image') {
            if (survey_result.mood == null) {
                survey_result.mood = message.attachments[0].payload.url
                question004Preference(bot, message)
            } else {
                var attachment = {
                    'type': 'image',
                    'payload': {
                        'url': 'https://fbcdn-dragon-a.akamaihd.net/hphotos-ak-xta1/t39.1997-6/p100x100/10173498_272702312904034_659736090_n.png'
                    }

                }
                bot.reply(message, { 
                    attachment: attachment,
                });
            }
        }
    } 
});

/// GET USER INFO !!!
getProfile = function(id, cb) {

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


controller.hears(['hi', 'Hi'], 'message_received', function(bot, message) {
    var found_result = _.findWhere(results, {
        id: message.user
    });
    console.log(message)
    bot.reply(message, `Hello`);
    // getProfile(message.user, function(err, profile) {
    //     if (found_result == undefined) {
    //         bot.reply(message, `Hello ${profile.first_name}`);
    //         doSurvey(bot, message);
    //     } else {
    //         bot.reply(message, `Hello ${profile.first_name}, you have already done the survey`);
    //         redoSurvey(bot, message)
    //     }
    // });
});

// POSTBACK HANLDER
controller.on('facebook_postback', function(bot, message) {
    console.log(survey_result, results, message.payload.substring(12))
    var answered_true_msg = `You've already answered that question.`
    if (message.payload == 'yes(start)' || message.payload == 'Re-do survey') {
        bot.reply(message, `Excellent! Lets get started.`);
        deleteEntry(bot, message);
        startSurvey(bot, message);
        // (message.payload == 'I love it' || message.payload == 'I hate it' || message.payload == 'Guilty pleasure')
    } else if (message.payload.substring(0,11) == 'question001'){
        if (survey_result.relationship == null) {
            survey_result.relationship = message.payload.substring(12)
            question002Detail(bot, message)
        } else {
            bot.reply(message, answered_true_msg);
        }
    } else if (message.payload.substring(0,11) == 'question002') {
        if (survey_result.detail == null) {
            survey_result.detail = message.payload.substring(12)
            question003Mood(bot, message)
        } else {
            bot.reply(message, answered_true_msg);
        }
    } else if (message.payload.substring(0,11) == 'question003') {
        if (survey_result.mood == null) {
            survey_result.mood = message.payload.substring(12)
            question004Preference(bot, message)
        } else {
            bot.reply(message, answered_true_msg);
        }
    } else if (message.payload.substring(0,11) == 'question004') {
        if (survey_result.preference == null) {
            survey_result.preference = message.payload.substring(12)
            question005Hungry(bot, message)
        } else {
            bot.reply(message, answered_true_msg);
        }
    } else if (message.payload.substring(0,11) == 'question005') {
        if (survey_result.hungry == null) {
            survey_result.hungry = message.payload.substring(12)
            endSurvey(bot, message)
        } else if (survey_result == {}) {
            bot.reply(message, answered_true_msg);
        }
    } else if (message.payload == 'no(end)') {
        sayThanks(bot, message)
    } else if (message.payload == 'View results') {
        saveResults(bot, message)
        viewResults(bot, message)
    } else if (message.payload == `I'm done`) {
        saveResults(bot, message)
        sayThanks(bot, message)
    }
});

deleteEntry = function(bot, message) {
    var previous_entry = _.findWhere(results, {
        id: message.user
    });

    if (previous_entry !== undefined) {
        var results_without_previous_entry = results.filter(function(value) {
            return (value !== previous_entry);
        });
        results = results_without_previous_entry
    } else {
        console.log(`ERROR DELETING!!!`)
    }
    
}
    // Save/Delete/View Results
viewResults = function(bot, message) {
    var found_result = _.findWhere(results, {
        id: message.user
    });
    var text = found_result
    bot.reply(message, `NAME: ${text.user}, RELATIONSHIP: ${text.relationship}, DETAIL: ${text.detail}, PREFERENCE: ${text.preference}`);
    bot.reply(message, `hungry ? ${text.hungry}`);
    bot.reply(message, `mood: ${text.mood}`);
}
saveAnswer = function(answer) {

}

// QUESTIONS
doSurvey = function(bot, message) {
    var attachment = {
        'type': 'template',
        'payload': {
            'template_type': 'button',
            'text': 'Do you have a moment to answer some questions about fried chicken ?',
            'buttons': [{
                'type': 'postback',
                'title': `Yes`,
                'payload': `yes(start)`
            }, {
                'type': 'postback',
                'title': `No`,
                'payload': `no(end)`
            }]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });
}

startSurvey = function(bot, message) {
    survey_result = {}
    survey_result.id = message.user
    getProfile(message.user, function(err, profile) {
        survey_result.user = `${profile.first_name} ${profile.last_name}`
        survey_result.gender = `${profile.gender}`
        survey_result.locale = `${profile.locale}`
        survey_result.timezone = `${profile.timezone}`
    });
    question001Relationship(bot, message)
}

question001Relationship = function(bot, message) {
    var attachment = {
        'type': 'template',
        'payload': {
            'template_type': 'generic',
            'elements': [{
                'title': 'I love it',
                'subtitle': 'Swipe right for more answers...',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': 'question001 I love it'
                }]
            }, {
                'title': `It's a guilty pleasure`,
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': `question001 It's a guilty pleasure`
                }]
            }, {
                'title': 'Not really my thing',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': 'question001 Not really my thing'
                }]
            }, {
                'title': `I’ll die before I eat fried chicken`,
                'subtitle': 'Swipe left for more answers...',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': `question001 I’ll die before I eat fried chicken`
                }]
            }]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });
    
    bot.reply(message, 'What would you say your relationship is with fried chicken ?');
}

question002Detail = function(bot, message) {
    if (message.payload.substring(12) == 'I love it') {
            var attachment = {
            'type': 'template',
            'payload': {
                'template_type': 'generic',
                'elements': [{
                    'title': 'I make it myself',
                    'subtitle': 'Swipe right for more answers...',
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': 'question002 I make it myself'
                    }]
                }, {
                    'title': `KFC is my go to`,
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': `question002 KFC is my go to`
                    }]
                }, {
                    'title': 'Any fried chicken is good chicken',
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': 'question002 Any fried chicken is good chicken'
                    }]
                }, {
                    'title': `It's a secret and I’m not telling you`,
                    'subtitle': 'Swipe left for more answers...',
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': `question002 It's a secret and I’m not telling you`
                    }]
                }]
            }
        };

            bot.reply(message, {
                attachment: attachment,
            });
            
            bot.reply(message, `What is your favourite way to eat fried chicken?`);

    
    } else if (message.payload.substring(12) == `It's a guilty pleasure`) {
            var attachment = {
            'type': 'template',
            'payload': {
                'template_type': 'generic',
                'elements': [{
                    'title': 'After a night of hard partying',
                    'subtitle': 'Swipe right for more answers...',
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': 'question002 After a night of hard partying'
                    }]
                }, {
                    'title': `KFC is my go to`,
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': `question002 A treat if I’ve been eating good for while`
                    }]
                }, {
                    'title': `It's a personal matter`,
                    'subtitle': 'Swipe left for more answers...',
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': `question002 It's a personal matter`
                    }]
                }]
            }
        };

            bot.reply(message, {
                attachment: attachment,
            });
            
            bot.reply(message, `Guilty pleasure you say ? tell me more.`);
    
    } else {
            var attachment = {
            'type': 'template',
            'payload': {
                'template_type': 'generic',
                'elements': [{
                    'title': 'Chicken is God’s creature and shouldn’t be eaten',
                    'subtitle': 'Swipe right for more answers...',
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': 'question002 Chicken is God’s creature and shouldn’t be eaten'
                    }]
                }, {
                    'title': `Fried food is gross`,
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': `question002 Fried food is gross`
                    }]
                }, {
                    'title': `I’m not going to get into it.`,
                    'subtitle': 'Swipe left for more answers...',
                    'buttons': [{
                        'type': 'postback',
                        'title': 'Choose',
                        'payload': `question002 I’m not going to get into it.`
                    }]
                }]
            }
        };

            bot.reply(message, {
                attachment: attachment,
            });
        
            bot.reply(message, `So your not a fan eh? Tell me more.`);
    }
}

question003Mood = function(bot, message) {
    bot.reply(message, 'What is your current mood ?');
    bot.reply(message, 'Please use emoticons...');

}

question004Preference = function(bot, message) {
    var attachment = {
        'type': 'template',
        'payload': {
            'template_type': 'generic',
            'elements': [{
                'title': 'Chicken Parmesan',
                'image_url': 'http://fiber-international.com/wp-content/uploads/2015/04/800x600-chicken.jpg',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': 'question004 Chicken Parmesan'
                }]
            }, {
                'title': 'Double Down',
                'image_url': 'http://assets.bwbx.io/images/ieMg5BCeWkWU/v1/-1x-1.jpg',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': 'question004 Double Down'
                }]
            }, {
                'title': 'Fried Drumsticks',
                'image_url': 'https://i.ytimg.com/vi/G8hbFO-r2nQ/maxresdefault.jpg',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': 'question004 Fried Drumsticks'
                }]
            }, {
                'title': 'Chicken Nuggets',
                'image_url': 'http://www.urbanmommies.com/wp-content/uploads/McDonalds-Chicken-Nuggets.jpg',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': 'question004 Chicken Nuggets'
                }]
            }, {
                'title': 'Veggies',
                'image_url': 'http://www.stevensonfitness.com/wp-content/uploads/2014/10/veggies.jpg',
                'buttons': [{
                    'type': 'postback',
                    'title': 'Choose',
                    'payload': 'question004 Veggies'
                }]
            }]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });

    bot.reply(message, 'Which of these meals would you like to be eating right now ?');
}

question005Hungry = function(bot, message) {
        var attachment = {
            'type': 'template',
            'payload': {
                'template_type': 'button',
                'text': 'Have I made you hungry ?',
                'buttons': [{
                    'type': 'postback',
                    'title': `yes`,
                    'payload': `question005 yes`
                }, {
                    'type': 'postback',
                    'title': `no`,
                    'payload': `question005 no`
                }]
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
    //saving
saveResults = function(bot, message) {
    results.push(survey_result)
    console.log(results)
}

endSurvey = function(bot, message) {
    var attachment = {
        'type': 'template',
        'payload': {
            'template_type': 'button',
            'text': 'OK! thanks for your time',
            'buttons': [{
                'type': 'postback',
                'title': `View results`,
                'payload': `View results`
            }, {
                'type': 'postback',
                'title': `Re-do survey`,
                'payload': `Re-do survey`
            }, {
                'type': 'postback',
                'title': `I'm done`,
                'payload': `I'm done`
            }]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });

}

redoSurvey = function(bot, message) {
    var attachment = {
        'type': 'template',
        'payload': {
            'template_type': 'button',
            'text': 'How can I help ?',
            'buttons': [{
                'type': 'postback',
                'title': `View results`,
                'payload': `View results`
            }, {
                'type': 'postback',
                'title': `Re-do survey`,
                'payload': `Re-do survey`
            }, {
                'type': 'postback',
                'title': `I'm done`,
                'payload': `I'm done`
            }]
        }
    };

    bot.reply(message, {
        attachment: attachment,
    });

}