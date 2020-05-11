// express is give us options to use "get" and "post" requests
const express = require("express");

/* allow us to pass data to post function
(we can take data entered by  user from one page and pass to another)
allow us to look throw the body of "post request" */
const bodyParser = require("body-parser");
const request = require("request");

/* we need it for API native http method for get
(data from external resource) request from source */
const https = require("https");
const mongoose = require("mongoose");

const QRCode = require('qrcode');


/* Dotenv is a module that loads environment
variables from a .env file into process.env.  */
require('dotenv').config();

const Binance = require('node-binance-api');

const binance = new Binance().options({
  APIKEY: process.env.API_KEY_BINANCE,
  APISECRET: process.env.API_SECRET_BINANCE
});

//const rahakottData = require(__dirname + "/getWalletBalance.js");
//console.log(rahakottData());

//const rahakottData = require(__dirname + "/addNewWallet.js");
//console.log(rahakottData());

// const rahakottData = require(__dirname + "/renameWallet.js");
// console.log(rahakottData());

//const rahakottData = require(__dirname + "/deleteWallet.js");
//console.log(rahakottData());

/* to connect URL and creating "userDB" if it's not exist
(and preserve deprecation warnings)
it is place where mongodb hosted locally */
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  account: String,
  password: String,
  wallet: [{
    oid: String,
    currency: String,
    wallet_name: String,
    current_address: String,
    created_at: Date,
    updated_at: Date
    //confirmed:
    //unconfirmed:
  }]
});

/* create new module - Wallet. Where "wallet" is "collection name" and
"userName" is schemaName */
const Wallet = mongoose.model("Wallet", userSchema);

const app = express();

/* Global variables */
/* "let" is sort of variable
recommended to use "let" instead of "var" */
let name;
let publicAddress;
let currentOid;

let walletBalance;
let priceBTCUSDT;
let priceBTCEUR;
let balanceUSD;
let balanceEUR;
let balanceILS;

// for "EJS" - templates using
app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));


// app.get("/") - what happens whet users enter to my homepage
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

/***************************** LOGIN (Homepage) *****************************/
// "post request" is getting data back from our web page to server
app.post("/login", function(req, res) {

  var account = req.body.account;
  var password = req.body.password;
  console.log(account, password);

  Wallet.findOne({
    account: account,
    password: password
  }, function(err, wallet) {
    if (err) return console.log(err);
    if (wallet) {
      console.log(wallet);

      for (let i = 0; i < wallet.wallet.length; i++) {

        currentOid = wallet.wallet[i].oid;
        publicAddress = wallet.wallet[i].current_address;
        name = account;

        /******************** Get a Wallet addresses list ********************/

        var options = {
          'method': 'POST',
          'url': 'https://rahakott.io/api/v1.1/addresses',
          'headers': {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
          },
          body: JSON.stringify({
            "api_key": process.env.API_KEY_RAHAKOTT,
            "wallet": currentOid,
            "offset": 0,
            "limit": 50
          })
        };

        request(options, function(error, response) {
          if (error) throw new Error(error);
          console.log(response.body);
          const newWalletData = JSON.parse(response.body);
          if (JSON.stringify(newWalletData.addresses).includes(publicAddress)) {
            console.log("Rahakott includes the addres " + publicAddress);
            console.log(currentOid);
            //walletBalance = await getData();
            //console.log(walletBalance);

            /******************** Get a Wallet balance ********************/

            var options = {
              'method': 'POST',
              'url': 'https://rahakott.io/api/v1.1/wallets/balance',
              'headers': {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
              },
              body: JSON.stringify({
                "api_key": process.env.API_KEY_RAHAKOTT,
                "oid": currentOid
              })
            };

            request(options, function(error, response) {
              if (error) throw new Error(error);
              const walletData = JSON.parse(response.body);
              walletBalance = walletData.confirmed / 100000000;
              //console.log(walletBalance);
              res.redirect('main_screen');
            });
          }
        });
      }
    } else res.status(401).end('Incorrect Username and/or Password!');
  });
});

/************************** CREATE WALLET (Homepage) *************************/
// app.get("/new_account", function(req, res) {
//   res.sendFile(__dirname + "/new_account.html");
// });

app.post("/new_account", function(req, res) {

  var newUsername = req.body.newUsername;
  var newPassword = req.body.newPassword;
  var confirmNewPassword = req.body.confirmNewPassword;
  console.log(newUsername, newPassword, confirmNewPassword);
  var walletName = newUsername + "-BTC";

  Wallet.findOne({
    account: newUsername
  }, function(err, wallet) {
    if (err) return console.log(err);
    if (wallet) {
      console.log(wallet);
      console.log("Error. Account with this name already exist.")
      res.status(401).end('Incorrect Username and/or Password!');
    } else {
      if (newPassword === confirmNewPassword) {

        var options = {
          'method': 'POST',
          'url': 'https://rahakott.io/api/v1.1/wallets/new',
          'headers': {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
          },
          body: JSON.stringify({
            "api_key": process.env.API_KEY_RAHAKOTT,
            "name": walletName,
            "currency": "BTC"
          })
        };

        request(options, function(error, response) {
          if (error) throw new Error(error);
          console.log(response.body);
          const newWalletData = JSON.parse(response.body);
          //console.log(newWalletData);
          const oid = newWalletData.oid;
          const currency = newWalletData.currency;
          const walletName = newWalletData.name;
          const currentAddress = newWalletData.current_address;
          const createdDate = newWalletData.created_at;
          const updatedDate = newWalletData.updated_at;

          name = newUsername; // walletName
          publicAddress = currentAddress;

          console.log(currency, oid, walletName, publicAddress);

          /*********************** SET DATA TO DB ****************************/

          const newWallet = new Wallet({
            account: newUsername,
            password: newPassword,
            wallet: [{
              oid: oid,
              currency: currency,
              wallet_name: walletName,
              current_address: currentAddress,
              created_at: createdDate,
              updated_at: updatedDate
            }]
          });
          //to save newWallet document into Wallet collection
          newWallet.save(function(err) {
            if (err) return console.error(err);
            console.log("Succesfully saved in userDB");
          });

          /* redirect to "main screen"
          when we redirect we "jump" to get request of route */
          res.redirect('main_screen');
        });
      } else res.status(401).end('Incorrect Username and/or Password!');
    }
  });
});

/**************************** MAIN SCREEN ************************************/
app.get("/main_screen", function(req, res) {

  QRCode.toDataURL(JSON.stringify(publicAddress), {
    errorCorrectionLevel: 'H'
  }, function(err, url) {
    //console.log(url);

    res.render('main_screen', {
      accountName: name,
      walletBalance: walletBalance,
      qrcode: url,
      publicAddress: publicAddress
    });
  });

});

//mongoose.connection.close();

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});


// async function getData() {
//
//   // let walletBalance;
//   // let priceBTCUSDT;
//   // let priceBTCEUR;
//   // let balanceUSD;
//   // let balanceEUR;
//   // let balanceILS;
//
//   let ticker = await binance.prices();
//   console.log(`Price of BTC: ${priceBTCEUR = ticker.BTCEUR}`);
//   console.log(`Price of BTC: ${priceBTCUSDT = ticker.BTCUSDT}`);
//
//   var options = {
//     'method': 'GET',
//     'url': 'https://api.exchangeratesapi.io/latest?base=USD',
//     'headers': {
//       'Cookie': '__cfduid=df57a5f09aab3bdf123c640e0d3a64fdf1589196784'
//     }
//   };
//
//   request(options, function(error, response) {
//     if (error) throw new Error(error);
//     let exchangesRatesData = JSON.parse(response.body);
//     console.log(balanceILS = exchangesRatesData.rates.ILS);
//   });
//
//   var options = {
//     'method': 'POST',
//     'url': 'https://rahakott.io/api/v1.1/wallets/balance',
//     'headers': {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//       'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
//     },
//     body: JSON.stringify({
//       "api_key": process.env.API_KEY_RAHAKOTT,
//       "oid": currentOid
//     })
//   };
//
//   request(options, function(error, response) {
//     if (error) throw new Error(error);
//     //console.log(response.body);
//     const walletData = JSON.parse(response.body);
//     //console.log(walletData.confirmed);
//     //walletBalance = walletData.confirmed;
//     //console.log(walletData.confirmed);
//     walletBalance = walletData.confirmed / 100000000;
//     console.log(walletBalance);
//     balanceUSD = walletBalance * priceBTCUSDT;
//     balanceEUR = walletBalance * priceBTCEUR;
//     //console.log(balanceUSD.toFixed(2));
//     //console.log(balanceEUR.toFixed(2));
//     balanceILS = balanceILS * balanceUSD;
//     //console.log(balanceILS.toFixed(2));
//
//   });
//
//
//
//   var options = {
//     'method': 'GET',
//     'url': 'https://rest.coinapi.io/v1/exchangerate/BTC/NIS',
//     'headers': {
//       'X-CoinAPI-Key': process.env.API_KEY_COINAPI
//     }
//   };
//   request(options, function(error, response) {
//     if (error) throw new Error(error);
//     let data = JSON.parse(response.body);
//     //console.log((data.rate * walletBalance).toFixed(2));
//   });
//
//   return walletBalance;
// }
