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
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");

const QRCode = require('qrcode');


/* Dotenv is a module that loads environment
variables from a .env file into process.env.  */
require('dotenv').config();

const Binance = require('node-binance-api');

const binance = new Binance().options({
  APIKEY: process.env.API_KEY_BINANCE,
  APISECRET: process.env.API_SECRET_BINANCE
});

const app = express();

// for "EJS" - templates using
app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(expressSession({
  secret: process.env.SESSION_SECRET
}));
app.use(bodyParser.urlencoded({
  extended: true
}));

const getWalletBalance = require(__dirname + "/getWalletBalance.js");
const checkIfWalletExist = require(__dirname + "/checkIfWalletExist.js");
const getWalletHistory = require(__dirname + "/getWalletHistory.js");
const createNewWallet = require(__dirname + "/createNewWallet.js");
const sendCrypto = require(__dirname + "/sendCrypto.js");

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
  }]
});

//userSchema.plugin(encrypt, {secret: process.env.MONGOOSE_SECRET, encryptedFields: ["password"]});

/* create new module - Wallet. Where "wallet" is "collection name" and
"userName" is schemaName */
const Wallet = mongoose.model("Wallet", userSchema);

const adminOidBTC = 1;
const adminOidLTC = 2;
const adminAddressBTC = 3;
const adminAddressLTC = 4;
const minSendingSum = 0.0001;

// app.get("/") - what happens whet users enter to my homepage
app.get("/", function(req, res) {
  req.session.destroy();
  //req.session.walletBalance = 0;
  console.log("Hey, I'am in GET func. of /");
  res.sendFile(__dirname + "/index.html");
});

/***************************** LOGIN (Homepage) *****************************/
// "post request" is getting data back from our web page to server
app.post("/login", function(req, res) {

  var account = req.body.account;
  var password = req.body.password;
  var walletLength;
  var i = 0;
  console.log(account, password);
  Wallet.findOne({
    account: account
  }, async function(err, wallet) {
    if (err) return console.log(err);
    if (wallet.password === password) {
      req.session.userName = account;
      //console.log("req.session.userName is: " + req.session.userName);
      req.session.userPassword = wallet.password;

      for (var ind = 0; ind < wallet.wallet.length; ind++) {
        if (wallet.wallet[ind].currency === "BTC") {
          req.session.oidBTC = wallet.wallet[ind].oid;
          req.session.addressBTC = wallet.wallet[ind].current_address;
          //console.log("req.session.oidBTC: " + req.session.oidBTC);
          //console.log("req.session.addessBTC: " + req.session.addressBTC);
        }
        if (wallet.wallet[ind].currency === "LTC") {
          req.session.oidLTC = wallet.wallet[ind].oid;
          req.session.addressLTC = wallet.wallet[ind].current_address;
          //console.log("req.session.oidLTC: " + req.session.oidLTC);
          //console.log("req.session.addessLTC: " + req.session.addressLTC);
        }
      }

      if (req.session.oidBTC) {
        let wallet;
        wallet = await checkIfWalletExist(req.session.oidBTC);
        console.log("wallet: " + wallet);
        if (!wallet) {
          req.session.oidBTC = false;
          req.session.addressBTC = false;
          let walletLength = await deleteWalletfromDB(req.session.userName, req.session.oidBTC);
          //console.log("walletLength", walletLength);
        }
      }

      if (req.session.oidLTC) {
        let wallet;
        wallet = await checkIfWalletExist(req.session.oidLTC);
        console.log("wallet: " + wallet);
        if (!wallet) {
          req.session.oidLTC = false;
          req.session.addressLTC = false;
          let walletLength = await deleteWalletfromDB(req.session.userName, req.session.oidLTC);
          //console.log("walletLength", walletLength);
        }
      }

      if (req.session.oidBTC) {
        req.session.currentCurrency = "BTC";
        req.session.currentOid = req.session.oidBTC;
        req.session.publicAddress = req.session.addressBTC;
        res.redirect('main');
      } else if (req.session.oidLTC) {
        req.session.currentCurrency = "LTC";
        req.session.currentOid = req.session.oidLTC;
        req.session.publicAddress = req.session.addressLTC;
        res.redirect('main');
      } else
        console.log("The acoount doesn't exist.");
    } else res.status(401).end('Incorrect Username and/or Password!');
  });
});

/************************** CREATE WALLET (Homepage) *************************/

app.post("/new_account", async function(req, res) {

  var newUsername = req.body.newUsername;
  var newPassword = req.body.newPassword;
  var confirmNewPassword = req.body.confirmNewPassword;
  console.log(newUsername, newPassword, confirmNewPassword);
  var walletName = newUsername + "-BTC";

  const filter = {
    account: newUsername
  };

  let wallet = await Wallet.findOne(filter);

  if (wallet) {
    console.log(wallet);
    console.log("Error. Account with this name already exist.")
    res.status(401).end('Incorrect Username and/or Password!');
  } else {
    if (newPassword === confirmNewPassword) {
      console.log("I'am new here.");
      //console.log("walletName is: " ,walletName);
      var newWalletData = await createNewWallet(walletName, "BTC");
      newWalletData = JSON.parse(newWalletData);
      console.log(newWalletData);
      const oid = newWalletData.oid;
      const currency = newWalletData.currency;
      walletName = newWalletData.name;
      const currentAddress = newWalletData.current_address;
      const createdDate = newWalletData.created_at;
      const updatedDate = newWalletData.updated_at;

      req.session.userName = newUsername;
      req.session.publicAddress = currentAddress;
      req.session.currentOid = oid;
      req.session.currentCurrency = currency;
      //console.log(currency, oid, walletName, publicAddress);

      /*********************** SAVE DATA IN DB ****************************/
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
      newWallet.save(await
        function(err) {
          if (err) return console.error(err);
          console.log("Succesfully saved in userDB");
          /* redirect to "main screen"
          when we redirect we "jump" to get request of route */
          res.redirect('main');
        });
    } else res.status(401).end('Incorrect Username and/or Password!');
  }
});

/************************** ADD WALLET (MAIN) *************************/

app.post("/add-wallet", async function(req, res) {
  console.log("I'am in POST func. of ADD-WALLET");
  var walletName;
  let flag = false;
  var account = req.session.userName;
  let choosenWallet = req.body.walletCurrency;
  if (choosenWallet === "BTC" && !req.session.oidBTC) {
    walletName = req.session.userName + "-BTC";
    var newWalletData = await createNewWallet(walletName, "BTC");
    flag = true;
  } else
  if (choosenWallet === "BTC" && req.session.oidBTC)
    console.log("You already have a BTC wallet");
  if (choosenWallet === "LTC" && !req.session.oidLTC) {
    walletName = req.session.userName + "-LTC";
    var newWalletData = await createNewWallet(walletName, "LTC");
    flag = true;
  } else
  if (choosenWallet === "LTC" && req.session.oidLTC)
    console.log("You already have a LTC wallet");
  if (flag) {
    newWalletData = JSON.parse(newWalletData);
    console.log(newWalletData);
    const oid = newWalletData.oid;
    const currency = newWalletData.currency;
    walletName = newWalletData.name;
    const currentAddress = newWalletData.current_address;
    const createdDate = newWalletData.created_at;
    const updatedDate = newWalletData.updated_at;

    req.session.publicAddress = currentAddress;
    req.session.currentOid = oid;
    req.session.currentCurrency = currency;
    let wallet = await addWalletToAccount(account, oid, currency, walletName, currentAddress, createdDate, updatedDate);
    console.log("wallet: ", wallet);
    flag = false;
    res.redirect('main');
  }
});


/************************** CHANGE WALLET (MAIN) *************************/

app.post("/change-wallet", async function(req, res) {
  console.log("I'am in POST func. of СHANGE-WALLET");

  let currentCurrency = req.session.currentCurrency;
  let chooseWallet = req.body.walletCurrency;
  let account = req.session.userName;
  //console.log("account: ", account);
  if (chooseWallet === "BTC" && currentCurrency === "BTC")
    console.log("You already in a BTC wallet");
  else
  if (chooseWallet === "LTC" && currentCurrency === "LTC")
    console.log("You already in a LTC wallet");
  else
  if (chooseWallet === "LTC" && currentCurrency === "BTC" && req.session.oidLTC) {

    const filter = {
      account: account
    };
    let wallet = await Wallet.findOne(filter);

    for (var ind = 0; ind < wallet.wallet.length; ind++) {
      if (wallet.wallet[ind].currency === "LTC") {
        req.session.oidLTC = wallet.wallet[ind].oid;
        req.session.addressLTC = wallet.wallet[ind].current_address;
        //console.log("req.session.oidLTC: " + req.session.oidLTC);
        //console.log("req.session.addessLTC: " + req.session.addressLTC);
      }
    }

    req.session.currentCurrency = "LTC";
    req.session.currentOid = req.session.oidLTC;
    req.session.publicAddress = req.session.addressLTC;
    res.redirect('main');

  } else
  if (chooseWallet === "LTC" && currentCurrency === "BTC" && !req.session.oidLTC)
    console.log("You don't have an LTC wallet");
  else
  if (chooseWallet === "BTC" && currentCurrency === "LTC" && req.session.oidBTC) {

    const filter = {
      account: account
    };
    let wallet = await Wallet.findOne(filter);

    for (var ind = 0; ind < wallet.wallet.length; ind++) {
      if (wallet.wallet[ind].currency === "BTC") {
        req.session.oidLTC = wallet.wallet[ind].oid;
        req.session.addressLTC = wallet.wallet[ind].current_address;
        //console.log("req.session.oidLTC: " + req.session.oidLTC);
        //console.log("req.session.addessLTC: " + req.session.addressLTC);
      }
    }

    req.session.currentCurrency = "BTC";
    req.session.currentOid = req.session.oidLTC;
    req.session.publicAddress = req.session.addressLTC;
    res.redirect('main');

  } else
  if (chooseWallet === "LTC" && currentCurrency === "BTC" && !req.session.oidLTC)
    console.log("You don't have an BTC wallet");
});

/**************************** MAIN SCREEN ************************************/
app.get("/main", async function(req, res) {

  let fullCurrCurrencyName;
  let currCurrencyUSDprice;
  let currCurrencyEURprice;
  let balanceUSD = 0;
  let balanceEUR = 0;
  let walletBalance;
  let wallet;
  let publicAddress = req.session.publicAddress;
  let currentOid = req.session.currentOid;
  let name = req.session.userName;
  let currentCurrency = req.session.currentCurrency;
  //walletBalance = 10; // variable for testing
  //let balanceILS;

  console.log("I'am in GET func. of MAIN");

  /* switch to checking the current currency for sending
  current currency data (name, balance and currency prices) on the "main" screen */
  switch (currentCurrency) {
    case "BTC":
      fullCurrCurrencyName = "Bitcoin";
      //console.log(fullCurrCurrencyName);
      wallet = await getWalletBalance(req.session.oidBTC);
      wallet = JSON.parse(wallet);
      walletBalance = wallet.confirmed / 100000000;
      console.log("walletBalance: ", walletBalance);
      req.session.walletBalance = walletBalance;
      if (walletBalance) {
        let ticker = await binance.prices();
        console.log(`Price of BTCUSDT: ${currCurrencyUSDprice = ticker.BTCUSDT}`);
        console.log(`Price of BTCEUR: ${currCurrencyEURprice = ticker.BTCEUR}`);
        balanceUSD = (walletBalance * currCurrencyUSDprice).toFixed(2);
        balanceEUR = (walletBalance * currCurrencyEURprice).toFixed(2);
        //console.log(balanceUSD.toFixed(2));
        //console.log(balanceEUR.toFixed(2));
      } else
        walletBalance = 0;
      break;

    case "LTC":
      fullCurrCurrencyName = "Litecoin";
      wallet = await getWalletBalance(req.session.oidLTC);
      wallet = JSON.parse(wallet);
      walletBalance = wallet.confirmed / 100000000;
      console.log("walletBalance: ", walletBalance);
      req.session.walletBalance = walletBalance;
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
      } else
        walletBalance = 0;
      break;
    default:
      fullCurrCurrencyName = "Oops"
      console.log(fullCurrCurrencyName);
      console.log("Error! Currency is not equal to any of the supported currencies.(MAIN)");
  }

  let walletData = await getWalletHistory(currentOid);
  walletData = JSON.parse(walletData);
  transactionHistory = walletData.history;

  QRCode.toDataURL(JSON.stringify(publicAddress), {
      errorCorrectionLevel: 'H'
    }, await
    function(err, url) {
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

/************************** SEND SCREEN *************************/

app.get("/send", function(req, res) {
  let sendUSDamount = null;
  let sendCryptoAmount = null;
  let recipientAddress = null;
  let walletBalance = req.session.walletBalance;
  let currentCurrency = req.session.currentCurrency;
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
    let currentCurrency = req.session.currentCurrency;
    let walletBalance = req.session.walletBalance;
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
    let walletBalance = req.session.walletBalance;
    let sendCryptoAmount = walletBalance;
    let currentCurrency = req.session.currentCurrency;
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

    let walletBalance = req.session.walletBalance;
    let currentCurrency = req.session.currentCurrency;
    let currentOid = req.session.currentOid;
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
      //console.log(sendCryptoAmount);
      //console.log(sendCryptoAmount, recipientAddress);
      //console.log("Wallet of sender is: " + currentOid);

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
  let fromCrypto = req.body.from;
  let toCrypto = req.body.to;
  req.session.fromCrypto = fromCrypto;
  req.session.toCrypto = toCrypto;
  //console.log(fromCrypto + toCrypto);
  let ticker = await binance.prices();
  switch (fromCrypto + toCrypto) {
    case "BTCLTC":
      if (req.session.oidBTC) {
        //let ticker = await binance.prices();
        console.log(`Price of BTCLTC: ${exchangeRate = ticker.LTCBTC}`);
        console.log(exchangeRate = (1 / exchangeRate).toFixed(2));
        var temp = await getWalletBalance(req.session.oidBTC);
        console.log("I am HERE", JSON.parse(temp));
        thisWalletBalance = JSON.parse(temp);
        console.log("temp.confirmed: ", thisWalletBalance.confirmed);
        thisWalletBalance = thisWalletBalance.confirmed / 100000000;
        req.session.thisWalletBalance = thisWalletBalance;
      } else {
        console.log(`Price of LTCBTC: ${exchangeRate = ticker.LTCBTC}`);
        thisWalletBalance = 0;
        console.log("First you need to create an LTC wallet");
      }
      break;
    case "LTCBTC":
      if (req.session.oidLTC) {
        //let ticker = await binance.prices();
        console.log(`Price of LTCBTC: ${exchangeRate = ticker.LTCBTC}`);
        var temp = await getWalletBalance(req.session.oidLTC);
        console.log("I am HERE", JSON.parse(temp));
        thisWalletBalance = JSON.parse(temp);
        console.log("temp.confirmed: ", thisWalletBalance.confirmed);
        thisWalletBalance = thisWalletBalance.confirmed / 100000000;
        req.session.thisWalletBalance = thisWalletBalance;
      } else {
        console.log(`Price of LTCBTC: ${exchangeRate = ticker.LTCBTC}`);
        thisWalletBalance = 0;
        console.log("First you need to create an LTC wallet");
      }
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

  let thisWalletBalance = req.session.thisWalletBalance;
  let fromCrypto = req.session.fromCrypto;
  let toCrypto = req.session.toCrypto;
  let exchangeCryptoAmount = null;
  let exchangeRate;
  let fromUserOid;
  let fromAdminOid;
  let toUserAddress;
  let toAdminAddress;
  let youWillGet;

  console.log(fromCrypto + toCrypto);
  let ticker = await binance.prices();
  switch (fromCrypto + toCrypto) {
    case "BTCLTC":
      //let ticker = await binance.prices();
      fromUserOid = req.session.oidBTC;
      toUserAddress = req.session.addessLTC;
      fromAdminOid = adminOidLTC;
      toAdminAddress = adminAddressBTC;
      console.log(`Price of BTCLTC: ${exchangeRate = ticker.LTCBTC}`);
      console.log(exchangeRate = (1 / exchangeRate).toFixed(2));
      break;
    case "LTCBTC":
      //let ticker = await binance.prices();
      fromOid = req.session.oidLTC;
      toUserAddress = req.session.addessBTC;
      fromAdminOid = adminOidBTC;
      toAdminAddress = adminAddressLTC;
      console.log(`Price of LTCBTC: ${exchangeRate = ticker.LTCBTC}`);
      break;
    default:
      // code block
      console.log("Error! Currency is not equal to any of the supported currencies.(CONFIRM_EXCHANGE)");
  }

  /*********************** "Maximume" button was pressed ************************/

  if (req.body.Maximum == "Clicked") {

    exchangeCryptoAmount = req.session.walletBalance;

    res.render('confirm_exchange', {
      fromCrypto: fromCrypto,
      toCrypto: toCrypto,
      exchangeRate: exchangeRate,
      exchangeCryptoAmount: exchangeCryptoAmount,
      thisWalletBalance: thisWalletBalance
    });
  }

  /************************** "Exchange" button was pressed *************************/

  if (req.body.Exchange == "Clicked") {

    exchangeCryptoAmount = req.body.exchangeCryptoAmount;


    if (exchangeCryptoAmount <= thisWalletBalance) {
      console.log(exchangeCryptoAmount);
      youWillGet = exchangeCryptoAmount * exchangeRate;
      console.log("youWillGet: ", youWillGet);
      youWillGet = youWillGet * 100000000;
      console.log("youWillGet: ", youWillGet.toFixed(0));
      exchangeCryptoAmount = exchangeCryptoAmount * 100000000;
      //let sendCryptoToAdmin = await sendCrypto(fromUserOid, toAdminAddress, exchangeCryptoAmount, false, false);
      //let sendCryptoToUser = await sendCrypto(fromAdminOid, toUserAddress, youWillGet, false, false);
    } else {
      exchangeCryptoAmount = null;
      console.log("You do not have this currency amount");
      res.render('confirm_exchange', {
        fromCrypto: fromCrypto,
        toCrypto: toCrypto,
        exchangeRate: exchangeRate,
        exchangeCryptoAmount: exchangeCryptoAmount,
        thisWalletBalance: thisWalletBalance
      });
    }
  }

});

/************************** "Delete Wallet from DB" function *************************/

async function deleteWalletfromDB(account, walletOid) {

  const filter = {
    account: account
  };
  const update = {
    $pull: {
      "wallet": {
        oid: walletOid
      }
    }
  };
  let doc = await Wallet.findOneAndUpdate(filter, update, {
    new: true
  });

  if (doc.wallet.length == 0) {
    let doc = await Wallet.findOneAndDelete(filter);
    console.log("ACCOUNT was successfully deleted from DB");
    return false;
  }
  console.log("WALLET was successfully deleted from DB");
  return doc.wallet.length;
}

/************************** "Add Wallet to Account in DB" function *************************/

async function addWalletToAccount(account, walletOid, currency, walName, currentAddress, createdDate, updatedDate) {

  const filter = {
    account: account
  };
  const update = {
    $push: {
      "wallet": {
        oid: walletOid,
        currency: currency,
        wallet_name: walName,
        current_address: currentAddress,
        created_at: createdDate,
        updated_at: updatedDate
      }
    }
  };

  let wallet = await Wallet.findOneAndUpdate(filter, update, {
    new: true
  });

  return wallet;
}

//mongoose.connection.close();

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
