var http = require('http');
var fs = require('fs');
var request = require("request");
const TelegramBot = require('node-telegram-bot-api');

// Telegram settings
const token = '';
const chatId = "-284111032";
const bot = new TelegramBot(token, {polling: true});

// Plotter stuff
const numberOfSeconds = 60*5; // 5 min
const timerExpiration = 60; // 1 min

var chartLabel = [0];
var chartData = [];
var values = [];
var timer = []

var currentLabel = 0;

// Binance stuff
const interval = 1000; //ms
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

        var result =  JSON.parse(body);

        if (values.length == 0) {

            for (var i=0; i < result.length; i++) {

                values.push({symbol: result[i].symbol,
                             price: [result[i].price]});
                
                timer.push(0);

                //console.log(Values[i].symbol);
            }

            return;
        }

        for (var i=0; i < result.length; i++) {
            
            //assert(Values[i].symbol == result[i].symbol, "What");

            if (values[i].price.length > numberOfSeconds) {

                values[i].price.shift();
            }

            values[i].price.push(result[i].price);

            timer[i]--;
        }

        if (chartLabel.length > numberOfSeconds) {

            chartLabel.shift();
        }

        chartLabel.push(++currentLabel); // Replace with dates
        chartData = values[0].price;

        for (var i=0; i < result.length; i++) {
            
            var diff = 100*(values[i].price[0] - values[i].price[values[i].price.length-1])/values[i].price[0];
            //console.log(100*diff);

            if ( Math.abs(diff) > 5 && timer[i] <= 0) {

                console.log(Date());
                bot.sendMessage(chatId, values[i].symbol + " just varied " + diff + " %");
                timer[i] = timerExpiration;
            }
        }
    });
    },
interval);

http.createServer(function (req, response) {
    fs.readFile('index.html', 'utf-8', function (err, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
  
        var htmlResult1 = data.replace('[__x__]', JSON.stringify(chartLabel));
        var result = htmlResult1.replace('[__y__]', JSON.stringify(chartData));
        
        response.write(result);
        response.end();
    });
}).listen(1337, '127.0.0.1');

console.log('Server running at http://127.0.0.1:1337/');
