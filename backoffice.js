var http = require('http');
var fs = require('fs');
var request = require("request");
const TelegramBot = require('node-telegram-bot-api');

// Telegram settings
const token = '';
const chatId = "-284111032";
const bot = new TelegramBot(token, {polling: true});

// Plotter stuff
const numberOfSeconds = 60*60*24*2; // 2 days
const timerExpiration = 60*5; // 5 min
const thresholdAlarm = 5 // %

var values = [];
var timer = []

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

        try { var result =  JSON.parse(body); }
        catch (e) { console.log("deu pau");}

        var now = new Date();

        if (values.length == 0) {

            for (var i=0; i < result.length; i++) {

                values.push({symbol: result[i].symbol,
                             price: [result[i].price],
                             dates: [now.toISOString()]});
                
                timer.push(0);
            }

            return;
        }

        for (var i=0; i < result.length; i++) {

            var pair = result[i].symbol;
            var index;

            for (var j=0; j < values.length; j++) {

                if (values[j].symbol == pair) {
                    
                    index = j;
                }
            }

            if (values[index].price.length > numberOfSeconds) {

                values[index].price.shift();
                values[index].dates.shift();
            }

            values[index].price.push(result[i].price);
            values[index].dates.push(now);

            timer[index]--;
        }

        if (values.length != result.length) {

            console.log("New pairs seem to have been added. Please restart server!");
        }

        for (var i=0; i < values.length; i++) {
            
            var diff = 100*(values[i].price[0] - values[i].price[values[i].price.length-1])/values[i].price[0];

            if ( Math.abs(diff) > thresholdAlarm && timer[i] <= 0) {

                var msg = values[i].symbol + " just varied " + diff + " %" + " -- https://bot.cellcrypt.com/" + values[i].symbol;
                
                console.log(msg);
                bot.sendMessage(chatId, msg);
                timer[i] = timerExpiration;
            }
        }

        // Feed data to browsers listening 
        for (var i=0; i < cli.length; i++) {

            if (cli[i].pair != "") {

                for (var j=0; j < values.length; j++) {

                    if (cli[i].pair == "\""+values[j].symbol+"\"") {
                        
                        var lastItem = values[j].price.length - 1;                        
                        sendData(cli[i].connection, values[j].price[lastItem], values[j].dates[lastItem]);
                    }
                }
            }
        }
    });
    },
interval);


http.createServer(function (req, response) {
    fs.readFile('index.html', 'utf-8', function (err, data) {

        inputURL = req.url.slice(1);

        if (inputURL == "") {

            inputURL = "BTCUSDT";
        }

        response.writeHead(200, { 'Content-Type': 'text/html' });
        var result = data.replace('[symbol]', inputURL);
        response.write(result);
        response.end();
    });
}).listen(1337, '127.0.0.1');



var WebSocket = require('ws');

var cli = [];
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', function connection(ws,req) {

    wss.clients.forEach(function each(client) {

        var index = -1; 

        for (var i=0; i < cli.length; i++) {
    
            if (cli[i].connection == client) {
                
                index = i;
            }
        }

        if (cli.length == 0 || index < 0) {

            cli.push({connection: client, pair: ""});
            console.log("connected clients: "+ cli.length);
        }
    });

    ws.on('message', function incoming(data) {

        for (var i=0; i < cli.length; i++) {

            if (cli[i].connection == ws) {

                cli[i].pair = data;

                // send bulk data
                for (var j=0; j < values.length; j++) {

                    if (cli[i].pair == "\""+values[j].symbol+"\"") {
                        
                        sendBulkData(cli[i].connection, values[j].price, values[j].dates);
                    }
                }                
            }

            console.log(cli[i].pair);
        }
    });

    ws.on('close', function close() {

        for (var i=0; i < cli.length; i++) {

            if (cli[i].connection.readyState != WebSocket.OPEN) {

                cli.splice(i, 1);
            }
        }
    });
});


function sendData(client, val, date) {
    
    data = [{ "date": date, "value": val }];
    client.send(JSON.stringify(data));
}

function sendBulkData(client, values, dates) {
    
    var data = [];
    for (var i=0; i < dates.length; i++) {

        data.push({ "date": dates[i], "value": values[i] });
    }
    client.send(JSON.stringify(data));
}
