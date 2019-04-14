var request = require("request");
const TelegramBot = require('node-telegram-bot-api');

// Telegram settings
const token = '615920500:AAE4V_v1EYVBHsUFO3gZ87vcLI4ob_7zSlg';
const chatId = "-284111032";
const bot = new TelegramBot(token, {polling: true});

var values = [];
var dates = [];

const thresholdAlarm = 5 // %
const timeSpan = 5 // in minutes

// Binance stuff
const interval = 1000; //in ms
const options_ticker = {

    url: 'https://api.binance.com/api/v3/ticker/price',
    method: 'GET'
   // qs: {'symbol':'BTCUSDT' }
};

setInterval (function() {

    request.get(options_ticker, (error, response, body) => {
        
        if(error) {

            return console.dir(error);
        }

        try { var result =  JSON.parse(body); }
        catch (e) { console.log("Could not fetch data from remote server");}

        var now = new Date();

        if (values.length == 0) {

            for (var i=0; i < result.length; i++) {

                values.push({symbol: result[i].symbol,
                             price: [result[i].price] });
            }

            dates.push(now.toISOString());

            return;
        }

        if (values.length != result.length) { 

            var msg = "New pairs were been added. Please restart server!";
            console.log(msg);
            bot.sendMessage(chatId, msg);
        }

        dates.push(now);

        for (var i=0; i < result.length; i++) {

            var pair = result[i].symbol;
            var index;

            for (var j=0; j < values.length; j++) {

                if (values[j].symbol == pair) {
                    
                    index = j;
                }
            }

            values[index].price.push(result[i].price);
        }
        

        for (var i=0; i < values.length; i++) {
            
            // run some metric
            var numberSamples = values[i].price.length;
            var lastPrice = values[i].price[numberSamples - 1];
            var refPrice = values[i].price[numberSamples - timeSpan*60*60];

            var diff = 100*(refPrice - lastPrice)/refPrice;

            if ( Math.abs(diff) > thresholdAlarm) {

                var msg = values[i].symbol + " just varied " + diff + " %" + " -- https://bot.scytech.com.br/" + values[i].symbol;
                
                console.log(msg);
                bot.sendMessage(chatId, msg);
            }
        }
    });
    },
interval);