// express is give us options to use "get" and "post" requests
const express = require("express");
const expressSession = require("express-session");

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

const getWalletBalance = require(__dirname + "/getWalletBalance.js");
//console.log(getWalletBalance());

const checkIfWalletExist = require(__dirname + "/checkIfWalletExist.js");

// const rahakottData = require(__dirname + "/addNewWallet.js");
// console.log(rahakottData());

// const rahakottData = require(__dirname + "/renameWallet.js");
// console.log(rahakottData());

//const rahakottData = require(__dirname + "/deleteWallet.js");
//console.log(rahakottData());

/* to connect URL and creating "userDB" if it's not exist
(and preserve deprecation warnings)
it is place where mongodb hosted locally */
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
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
let currentCurrency;
let walletBalance;
let transactionHistory;
let fromCrypto;
let toCrypto;
let balanceBTC;
let balanceLTC;
let oidBTC;
let oidLTC;
let addessBTC;
let addressLTC;
const minSendingSum = 0.0001;

// let balanceUSD = 0;
// let balanceEUR = 0;
// let balanceILS;

// for "EJS" - templates using
app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(expressSession({
  secret: "qwerty"
}));
app.use(bodyParser.urlencoded({
  extended: true
}));


// app.get("/") - what happens whet users enter to my homepage
app.get("/", function(req, res) {
  walletBalance = 0;
  console.log("Hey, I'am in GET func. of /");
  res.sendFile(__dirname + "/index.html");
});

/***************************** LOGIN (Homepage) *****************************/
// "post request" is getting data back from our web page to server
app.post("/login", function(req, res) {

  //console.log(res);
  var account = req.body.account;
  var password = req.body.password;
  let arrayElementID;
  var i = 0;
  console.log(account, password);
  Wallet.findOne({
    account: account,
    password: password
  }, async function(err, wallet) {
    if (err) return console.log(err);
    if (wallet) {
      req.session.userName = account;
      //console.log("req.session.userName is: " + req.session.userName);
      req.session.password = password;
      for (var ind = 0; ind < wallet.wallet.length; ind++) {
        if (wallet.wallet[ind].currency === "BTC") {
          req.session.oidBTC = wallet.wallet[ind].oid;
          req.session.addressBTC = wallet.wallet[ind].current_address;
          console.log("req.session.oidBTC: " + req.session.oidBTC);
          console.log("req.session.addessBTC: " + req.session.addressBTC);
          var fromFunc = await getWalletBalance( req.session.oidBTC );
          console.log("fromFunc: " ,fromFunc);
        }
        if (wallet.wallet[ind].currency === "LTC") {
          req.session.oidLTC = wallet.wallet[ind].oid;
          req.session.addressLTC = wallet.wallet[ind].current_address;
          console.log("req.session.oidLTC: " + req.session.oidLTC);
          console.log("req.session.addessLTC: " + req.session.addressLTC);
        }
      }
      if (req.session.oidBTC) {
        let temp;
        temp = await checkIfWalletExist(req.session.oidBTC);
        console.log("temp: " + temp);
      }

      if (req.session.oidLTC) {
        let temp;
        temp = await checkIfWalletExist(req.session.oidLTC);
        console.log("temp: " + temp);
      }

      name = account;
      // arrayElementID = wallet.wallet[i]._id;
      // console.log("arrayElementID is: " + arrayElementID);
      currentOid = wallet.wallet[i].oid;
      console.log(currentOid);
      publicAddress = wallet.wallet[i].current_address;
      currentCurrency = wallet.wallet[i].currency;
      console.log("currentCurrency is: " + currentCurrency);

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
        console.log();
        if (response.body.includes("Incorrect parameter")) {
          console.log("The wallet is does not exist in Rahakott");
        } else {
          const newWalletData = JSON.parse(response.body);
          if (JSON.stringify(newWalletData.addresses).includes(publicAddress)) {
            console.log("Rahakott includes the address: " + publicAddress);
            console.log("currentOid is: " + currentOid);
            res.redirect('main');
          }
        }
      });
    } else res.status(401).end('Incorrect Username and/or Password!');
  });
});

/************************** CREATE WALLET (Homepage) *************************/

app.post("/new_account", function(req, res) {

  walletBalance = 0;
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
          currentOid = oid;
          currentCurrency = currency;

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
          res.redirect('main');
        });
      } else res.status(401).end('Incorrect Username and/or Password!');
    }
  });
});

/**************************** MAIN SCREEN ************************************/
app.get("/main", async function(req, res) {

  let fullCurrCurrencyName;
  let currCurrencyUSDprice;
  let currCurrencyEURprice;
  let balanceUSD = 0;
  let balanceEUR = 0;
  //walletBalance = 10; // variable for testing
  //let balanceILS;
  console.log("Main session: " + req.session.userName);

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
  await request(options, async function(error, response) {
    if (error) throw new Error(error);
    const walletData = JSON.parse(response.body);
    walletBalance = walletData.confirmed / 100000000;
    console.log("I'am in GET func. of MAIN. walletBalance is: " + walletBalance);

    var options = {
      'method': 'POST',
      'url': 'https://rahakott.io/api/v1.1/history',
      'headers': {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': 'Cookie_1=value; __cfduid=d1e52c0daff45c29a2f2186fdd35d81e81590309503'
      },
      body: JSON.stringify({
        "api_key": process.env.API_KEY_RAHAKOTT,
        "wallet": currentOid,
        "offset": 0,
        "limit": 50
      })

    };
    await request(options, async function(error, response) {
      if (error) throw new Error(error);
      const walletData = JSON.parse(response.body);
      transactionHistory = walletData.history;
      console.log(transactionHistory);

      /* switch to checking the current currency for sending
      current currency data (name, balance and currency prices) on the "main" screen */
      switch (currentCurrency) {
        case "BTC":
          fullCurrCurrencyName = "Bitcoin";
          //console.log(fullCurrCurrencyName);
          if (walletBalance) {
            let ticker = await binance.prices();
            console.log(`Price of BTCUSDT: ${currCurrencyUSDprice = ticker.BTCUSDT}`);
            console.log(`Price of BTCEUR: ${currCurrencyEURprice = ticker.BTCEUR}`);
            balanceUSD = (walletBalance * currCurrencyUSDprice).toFixed(2);
            balanceEUR = (walletBalance * currCurrencyEURprice).toFixed(2);
            //console.log(balanceUSD.toFixed(2));
            //console.log(balanceEUR.toFixed(2));
          }
          break;
        case "LTC":
          fullCurrCurrencyName = "Litecoin";

          /* API for getting exchange rate of EUR for LTC EUR balance
          (binance do not support LTCEUR exchange rate)*/
          if (walletBalance) {
            var options = {
              'method': 'GET',
              'url': 'https://api.exchangeratesapi.io/latest?base=USD',
              'headers': {
                'Cookie': '__cfduid=df57a5f09aab3bdf123c640e0d3a64fdf1589196784'
              }
            };
            request(options, await
              function(error, response) {
                if (error) throw new Error(error);
                let exchangesRatesData = JSON.parse(response.body);
                console.log(balanceEUR = exchangesRatesData.rates.EUR);
              });

            /* Getting LTCUSD exchange rate from binance */
            let ticker = await binance.prices();
            console.log(`Price of LTCUSDT: ${currCurrencyUSDprice = ticker.LTCUSDT}`);
            balanceUSD = (walletBalance * currCurrencyUSDprice).toFixed(2);

            /* Getting LTCEUR exchange by multiply LTCUSD exchange rate from binance
            and exchange rate of EUR */
            balanceEUR = (balanceUSD * balanceEUR).toFixed(2);
            console.log(balanceEUR);
          }
          break;
        default:
          fullCurrCurrencyName = "Oops"
          console.log(fullCurrCurrencyName);
          console.log("Error! Currency is not equal to any of the supported currencies.(MAIN)");
      }

      QRCode.toDataURL(JSON.stringify(publicAddress), {
        errorCorrectionLevel: 'H'
      }, function(err, url) {
        //console.log(url);
        res.render('main', {
          accountName: name,
          fullCurrCurrencyName: fullCurrCurrencyName,
          walletBalance: walletBalance,
          currentCurrency: currentCurrency,
          balanceUSD: balanceUSD,
          balanceEUR: balanceEUR,
          qrcode: url,
          publicAddress: publicAddress,
          transactionHistory: transactionHistory
        });
      });
    });
  });
});

/************************** SEND SCREEN *************************/

app.get("/send", function(req, res) {
  let sendUSDamount = null;
  let sendCryptoAmount = null;
  let recipientAddress = null;
  console.log("I'am in GET func. of SEND");
  res.render('send', {
    recipientAddress: recipientAddress,
    sendUSDamount: sendUSDamount,
    sendCryptoAmount: sendCryptoAmount,
    walletBalance: walletBalance,
    currentCurrency: currentCurrency
  });
});


app.post("/send", async function(req, res) {

  /********************* "Calculate" button was pressed ***********************/
  if (req.body.Calculate == "Clicked") {

    let currCurrencyUSDprice;
    let sendCryptoAmount = req.body.sendCryptoAmount;
    let recipientAddress = req.body.recipientAddress;
    //console.log(recipientAddress);
    let sendUSDamount = req.body.sendUSDamount;
    //console.log(sendUSDamount);

    switch (currentCurrency) {
      case "BTC":
        if (sendUSDamount) {
          let ticker = await binance.prices();
          console.log(`Price of BTCUSDT: ${currCurrencyUSDprice = ticker.BTCUSDT}`);
          sendCryptoAmount = (sendUSDamount / currCurrencyUSDprice).toFixed(8);
          console.log(sendCryptoAmount);
        }
        break;
      case "LTC":
        if (sendUSDamount) {
          let ticker = await binance.prices();
          console.log(`Price of LTCUSDT: ${currCurrencyUSDprice = ticker.LTCUSDT}`);
          sendCryptoAmount = (sendUSDamount / currCurrencyUSDprice).toFixed(8);
          console.log(sendCryptoAmount);
        }
        break;
      default:
        // code block
        console.log("Error! Currency is not equal to any of the supported currencies.(SEND)");
    }

    res.render('send', {
      recipientAddress: recipientAddress,
      sendUSDamount: sendUSDamount,
      sendCryptoAmount: sendCryptoAmount,
      walletBalance: walletBalance,
      currentCurrency: currentCurrency
    });
  }

  /*********************** "Maximume" button was pressed ************************/
  if (req.body.Maximum == "Clicked") {

    let sendUSDamount = null;
    let sendCryptoAmount = walletBalance;
    let recipientAddress = req.body.recipientAddress;

    res.render('send', {
      recipientAddress: recipientAddress,
      sendUSDamount: sendUSDamount,
      sendCryptoAmount: sendCryptoAmount,
      walletBalance: walletBalance,
      currentCurrency: currentCurrency
    });
  }

  /************************** "Send" button was pressed *************************/

  if (req.body.Send == "Clicked") {

    let sendUSDamount = req.body.sendUSDamount;
    let recipientAddress = req.body.recipientAddress;
    //console.log(recipientAddress);
    let sendCryptoAmount = req.body.sendCryptoAmount;
    //console.log(sendCryptoAmount);
    let dontUseInternal = req.body.dontUseInternal;
    let feeFromAmount = req.body.feeFromAmount;
    let external_only_flag;
    let subtract_fees_flag;
    console.log("I'am in Post func. of SEND");

    if ((sendCryptoAmount >= minSendingSum && sendCryptoAmount <= walletBalance) && recipientAddress) {
      sendCryptoAmount = sendCryptoAmount * 100000000;
      console.log(sendCryptoAmount);
      console.log(sendCryptoAmount, recipientAddress);
      console.log("Wallet of sender is: " + currentOid);

      if (feeFromAmount) {
        subtract_fees_flag = true;
      } else
        subtract_fees_flag = false;

      if (dontUseInternal) {
        external_only_flag = true;
      } else
        external_only_flag = false;

      var options = {
        'method': 'POST',
        'url': 'https://rahakott.io/api/v1.1/send',
        'headers': {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': 'Cookie_1=value; __cfduid=d1e52c0daff45c29a2f2186fdd35d81e81590309503'
        },
        body: JSON.stringify({
          "api_key": process.env.API_KEY_RAHAKOTT,
          "wallet": currentOid,
          "recipient": recipientAddress,
          "amount": sendCryptoAmount,
          "external_only": external_only_flag,
          "subtract_fees": subtract_fees_flag
        })
      };

      request(options, function(error, response) {
        if (error) throw new Error(error);
        console.log(response.body);
        const sendingData = JSON.parse(response.body);
        const requestNumber = sendingData.request;
        console.log(requestNumber);
        res.redirect('main');
      });

      // await sendCrypto(subtract_fees_flag, external_only_flag, recipientAddress, sendCryptoAmount);
      // res.redirect('main');
    } else {
      console.log("Error! Recipient address or/and sending amount not correct.");
      sendCryptoAmount = null;
      res.render('send', {
        recipientAddress: recipientAddress,
        sendUSDamount: sendUSDamount,
        sendCryptoAmount: sendCryptoAmount,
        walletBalance: walletBalance,
        currentCurrency: currentCurrency
      });
    }
  }
});

// /************************** Send Crypto Function *************************/
// function getWallets(userName, password, fromCrypto) {
//
//   Wallet.findOne({
//     account: userName,
//     password: password
//   }, function(err, wallet) {
//     if (err) return console.log(err);
//     if (wallet) {
//       console.log("Func. Wallet: " + wallet);
//       for (var i = 0; i < wallet.wallet.length; i++) {
//         if (wallet.wallet[i].currency === fromCrypto) {
//           thisWalletBalance = wallet.wallet[i].currency;
//           break;
//         }
//       }
//     }
//   });
//   // req.session.userName = account;
//   // console.log("req.session.userName is: " + req.session.userName);
//   // req.session.password = password;
//   // name = account;
//   // arrayElementID = wallet.wallet[i]._id;
//   // console.log("arrayElementID is: " + arrayElementID);
//   // currentOid = wallet.wallet[i].oid;
//   // console.log(currentOid);
//   // publicAddress = wallet.wallet[i].current_address;
//   // currentCurrency = wallet.wallet[i].currency;
//   // console.log("currentCurrency is: " + currentCurrency);
// }

/************************** EXCHANGE SCREEN *************************/

app.get("/exchange", function(req, res) {
  console.log("I'am in GET func. of EXCHANGE");
  res.render('exchange');
});

app.post("/exchange", async function(req, res) {
  console.log("I'am in POST func. of EXCHANGE");
  let exchangeCryptoAmount = null;
  let exchangeRate;
  let thisWalletBalance = 0;
  //let userName = req.session.userName;
  //let password = req.session.password;
  fromCrypto = req.body.from;
  toCrypto = req.body.to;
  //console.log(fromCrypto);
  //console.log(toCrypto);
  //console.log(fromCrypto + toCrypto);

  // await getWallets(userName, password, fromCrypto);
  // console.log(wallets.wallet[0].currency);
  // while (wallets.wallet[i].currency != fromCrypto) {
  //   i++;
  // }
  // for (var i = 0; i < wallets.length; i++) {
  //   if (wallets.wallet[i].currency === fromCrypto) {
  //     thisWalletBalance = wallets.wallet[i].currency;
  //     //break;
  //   }
  // }

  //console.log("thisWalletBalance: " + thisWalletBalance);

  let ticker = await binance.prices();
  switch (fromCrypto + toCrypto) {
    case "BTCLTC":
      //let ticker = await binance.prices();
      console.log(`Price of BTCLTC: ${exchangeRate = ticker.LTCBTC}`);
      console.log(exchangeRate = (1 / exchangeRate).toFixed(2));
      var temp = await getWalletBalance(req.session.oidBTC);
      console.log("i am HERE",JSON.parse(temp));
      thisWalletBalance = JSON.parse(temp);
      console.log("temp.confirmed: ",thisWalletBalance.confirmed);
      thisWalletBalance = thisWalletBalance.confirmed / 100000000;
      break;
    case "LTCBTC":
      //let ticker = await binance.prices();
      console.log(`Price of LTCBTC: ${exchangeRate = ticker.LTCBTC}`);
      break;
    default:
      // code block
      console.log("Error! Currency is not equal to any of the supported currencies.(EXCHANGE)");
  }

  res.render('confirm_exchange', {
    fromCrypto: fromCrypto,
    toCrypto: toCrypto,
    exchangeRate: exchangeRate,
    exchangeCryptoAmount: exchangeCryptoAmount,
    thisWalletBalance: thisWalletBalance
  });
});


/************************** CONFIRM_EXCHANGE SCREEN *************************/

app.get("/confirm_exchange", function(req, res) {
  console.log("I'am in GET func. of CONFIRM_EXCHANGE");
  //res.render('confirm_exchange');
});

app.post("/confirm_exchange", async function(req, res) {
  console.log("I'am in POST func. of CONFIRM_EXCHANGE");

  /*********************** "Maximume" button was pressed ************************/
  if (req.body.Maximum == "Clicked") {
    // let fromCrypto = req.body.from;
    // let toCrypto = req.body.to;
    console.log(fromCrypto + toCrypto);
    let ticker = await binance.prices();
    switch (fromCrypto + toCrypto) {
      case "BTCLTC":
        //let ticker = await binance.prices();
        console.log(`Price of BTCLTC: ${exchangeRate = ticker.LTCBTC}`);
        console.log(exchangeRate = (1 / exchangeRate).toFixed(2));
        break;
      case "LTCBTC":
        //let ticker = await binance.prices();
        console.log(`Price of LTCBTC: ${exchangeRate = ticker.LTCBTC}`);
        break;
      default:
        // code block
        console.log("Error! Currency is not equal to any of the supported currencies.(CONFIRM_EXCHANGE)");
    }

    let exchangeCryptoAmount = walletBalance;

    res.render('confirm_exchange', {
      fromCrypto: fromCrypto,
      toCrypto: toCrypto,
      exchangeRate: exchangeRate,
      exchangeCryptoAmount: exchangeCryptoAmount
    });
  }

  /************************** "Send" button was pressed *************************/

  if (req.body.Exchange == "Clicked") {
    let exchangeCryptoAmount = req.body.exchangeCryptoAmount;

    if (exchangeCryptoAmount) {
      console.log(exchangeCryptoAmount);
    }
  }

});

function deleteWallet(account, walletOid) {
  Wallet.findOneAndUpdate({
    account: account
  }, {
    $pull: {
      "wallet": {
        oid: walletOid
      }
    }
  }, {
    safe: true,
    new: true
  }, function(err) {
    if (err) return console.log(err);
    console.log("Successful wallet deletion");
  });
}


// function checkIfWalletExist(publicAddress, walletOid) {
//   var options = {
//     'method': 'POST',
//     'url': 'https://rahakott.io/api/v1.1/addresses',
//     'headers': {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//       'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
//     },
//     body: JSON.stringify({
//       "api_key": process.env.API_KEY_RAHAKOTT,
//       "wallet": walletOid,
//       "offset": 0,
//       "limit": 50
//     })
//   };
//   try{
//     var resp = request(options);
//   }
//   catch(err){
//     throw new Error(error);
//   }
//   console.log("resp: " + resp);
//   return resp;
// }
//mongoose.connection.close();

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
