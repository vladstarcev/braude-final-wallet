// express - give us options to use "get" and "post" requests
const express = require("express");
const expressSession = require("express-session");

/* bodyParser - allow us to pass data to post function
(we can take data entered by  user from one page and pass to another)
allow us to look throw the body of "post request" */
const bodyParser = require("body-parser");
const request = require("request");

/* https - for API native http method for get
(data from external resource) request from source */
const https = require("https");

/* Mongoose is allows you to define schemas.
 Immediately after defining a schema,
 Mongoose gives you the opportunity to create
 a Model based on a specific schema.
Then the model is synchronized with the
MongoDB document by defining the model schema.*/
const mongoose = require("mongoose");

/* bcrypt - to hash user password
and save the hash in the database,
but not the password itself */
const bcrypt = require("bcrypt");
// saltRounds - number of hash
const saltRounds = 10;

// QRCode - qrcode creation
const QRCode = require('qrcode');

/* Dotenv is a module that loads environment
variables from a .env file into process.env.  */
require('dotenv').config();

/* Binance for binance api to get
cryptocurrency rate */
const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: process.env.API_KEY_BINANCE,
  APISECRET: process.env.API_SECRET_BINANCE
});

const app = express();

// for "EJS" - templates using
app.set('view engine', 'ejs');

app.use(express.static("public"));

/* Session - to verify user login
and to save variables in cookies */
app.use(expressSession({
  secret: process.env.SESSION_SECRET,
  cookie: {
    maxAge: 1000 * 60 * 20
  }
}));

/* body-parser - extracts the entire body part of the
 incoming request stream and provides it to req.body */
app.use(bodyParser.urlencoded({
  extended: true
}));

// External functions to get data
const getWalletBalance = require(__dirname + "/getWalletBalance.js");
const checkIfWalletExist = require(__dirname + "/checkIfWalletExist.js");
const getWalletHistory = require(__dirname + "/getWalletHistory.js");
const createNewWallet = require(__dirname + "/createNewWallet.js");
const sendCrypto = require(__dirname + "/sendCrypto.js");

/* to connect URL and creating "userDB" if it's not exist
(and preserve deprecation warnings)
it is place where mongodb hosted locally */
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

// Schema of each user in our DB
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

/* create new module - Wallet. Where "wallet" is "collection name" and
"userName" is schemaName */
const Wallet = mongoose.model("Wallet", userSchema);

// app.get("/") - what happens whet users enter to title page
app.get("/", function(req, res) {
  req.session.destroy();
  //req.session.walletBalance = 0;
  console.log("Hey, I'am in GET func. of /");
  //res.sendFile(__dirname + "/index.html");
  res.render("index", {
    loginError: null
  });
});

app.get("/username/:username/check", (req, res) => {
  const account = req.params.username;
  Wallet.findOne({
    account
  }, (err, wallet) => {
    if (err || !wallet) res.send(404);
    else res.send(200);
  });
});

/***************************** LOGIN (Home) *****************************/
// "post request" is getting data back from our web page to our server
app.post("/login", function(req, res) {
  var account = req.body.account;
  var password = req.body.password;
  var walletLength;
  let existBTCflag = false;
  let existLTCflag = false;
  // console.log("existBTCflag: ", existBTCflag);
  // console.log("existLTCflag: ", existLTCflag);
  console.log(account, password);
  Wallet.findOne({
    account: account
  }, function(err, wallet) {
    if (err) {
      res.status(404).end(err);
      //return console.log(err);
    }
    if (wallet) {
      bcrypt.compare(req.body.password, wallet.password, async function(err, result) {
        if (result) {
          req.session.userName = account;
          //console.log("req.session.userName is: " + req.session.userName);

          // checking, which wallets a user have
          for (var ind = 0; ind < wallet.wallet.length; ind++) {
            if (wallet.wallet[ind].currency === "BTC") {
              req.session.oidBTC = wallet.wallet[ind].oid;
              req.session.addressBTC = wallet.wallet[ind].current_address;
              existBTCflag = true;
              console.log("existBTCflag: ", existBTCflag);
              //console.log("req.session.oidBTC: " + req.session.oidBTC);
              //console.log("req.session.addessBTC: " + req.session.addressBTC);
            }
            if (wallet.wallet[ind].currency === "LTC") {
              req.session.oidLTC = wallet.wallet[ind].oid;
              req.session.addressLTC = wallet.wallet[ind].current_address;
              existLTCflag = true;
              console.log("existLTCflag: ", existLTCflag);
              // console.log("req.session.oidLTC: " + req.session.oidLTC);
              // console.log("req.session.addessLTC: " + req.session.addressLTC);
            }
          }

          /* check if each wallet is less than 14 days old.
            If true, we delete it */
          if (req.session.oidBTC && existBTCflag) {
            let wallet;
            wallet = await checkIfWalletExist(req.session.oidBTC);
            console.log("wallet: " + wallet);
            if (!wallet) {
              let walletLength = await deleteWalletfromDB(req.session.userName, req.session.oidBTC);
              req.session.oidBTC = false;
              req.session.addressBTC = false;
              //console.log("walletLength", walletLength);
              if (!walletLength)
                res.render("index", {
                  loginError: "Incorrect username / password"
                });
            }
          }

          if (req.session.oidLTC && existLTCflag) {
            let wallet;
            wallet = await checkIfWalletExist(req.session.oidLTC);
            console.log("wallet: " + wallet);
            if (!wallet) {
              let walletLength = await deleteWalletfromDB(req.session.userName, req.session.oidLTC);
              req.session.oidLTC = false;
              req.session.addressLTC = false;
              //console.log("walletLength", walletLength);
              if (!walletLength)
                res.render("index", {
                  loginError: "Incorrect username / password"
                });
            }
          }
          // initialize variables (data) of existing wallets
          if (req.session.oidBTC && existBTCflag) {
            req.session.currentCurrency = "BTC";
            req.session.currentOid = req.session.oidBTC;
            req.session.publicAddress = req.session.addressBTC;
            res.redirect('main');
          } else if (req.session.oidLTC && existLTCflag) {
            req.session.currentCurrency = "LTC";
            req.session.currentOid = req.session.oidLTC;
            req.session.publicAddress = req.session.addressLTC;
            res.redirect('main');
          } else
            console.log("The acoount doesn't exist.");
        } else res.render("index", {
          loginError: "Incorrect username / password"
        });
      })
    } else res.render("index", {
      loginError: "Incorrect username / password"
    });
  });
});

/************************ CREATE WALLET (Home screen) *************************/

app.post("/new_account", function(req, res) {
  bcrypt.hash(req.body.newPassword, saltRounds, async function(err, hash) {
    if (err) {
      console.log(err);
    } else {
      var newUsername = req.body.newUsername;
      var newPassword = req.body.newPassword;
      var confirmNewPassword = req.body.confirmNewPassword;
      console.log(newUsername, newPassword, confirmNewPassword);
      var walletName = newUsername + "-BTC";

      const filter = {
        account: newUsername
      };
      // check if user with this account exists
      let wallet = await Wallet.findOne(filter);
      if (wallet) {
        console.log(wallet);
        console.log("Error. Account with this name already exist.")
        res.status(401).end('Incorrect Username and/or Password!');
      } else {
        /* new User: we create a new account in the DB
         only BTC wallet to start */
        if (newPassword === confirmNewPassword) {
          console.log("I'am new here.");
          //console.log("walletName is: " ,walletName);
          // create new BTC wallet
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
          req.session.oidBTC = oid;
          req.session.currentCurrency = currency;
          //console.log(currency, oid, walletName, publicAddress);

          // SAVE new user (with one BTC wallet) IN DB
          const newWallet = new Wallet({
            account: newUsername,
            password: hash,
            wallet: [{
              oid: oid,
              currency: currency,
              wallet_name: walletName,
              current_address: currentAddress,
              created_at: createdDate,
              updated_at: updatedDate
            }]
          });

          // Save newWallet document into Wallet collection
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
    }
  })
});


/************************* User's MAIN screen *********************************/

app.get("/main", async function(req, res) {

  if (req.session.userName) {
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
    //let balanceILS;

    console.log("I'am in GET func. of MAIN");
    const filter = {
      account: req.session.userName
    };
    let doc = await Wallet.findOne(filter);
    walletLength = doc.wallet.length;
    //console.log("walletLength: ",walletLength);

    /* switch to checking the current currency for sending
    current currency data (name, balance and currency prices) to the "main" screen */
    switch (currentCurrency) {
      case "BTC":
        fullCurrCurrencyName = "Bitcoin";
        //console.log(fullCurrCurrencyName);
        wallet = await getWalletBalance(req.session.oidBTC);
        wallet = JSON.parse(wallet);
        walletBalance = wallet.confirmed / 100000000;
        console.log("walletBalance: ", walletBalance);
        if (walletBalance) {
          req.session.walletBalance = walletBalance;
          // get the exchange rate from Binance
          let ticker = await binance.prices();
          console.log(`Price of BTCUSDT: ${currCurrencyUSDprice = ticker.BTCUSDT}`);
          console.log(`Price of BTCEUR: ${currCurrencyEURprice = ticker.BTCEUR}`);
          balanceUSD = (walletBalance * currCurrencyUSDprice).toFixed(2);
          balanceEUR = (walletBalance * currCurrencyEURprice).toFixed(2);
          //console.log(balanceUSD.toFixed(2));
          //console.log(balanceEUR.toFixed(2));
        } else {
          walletBalance = 0;
          req.session.walletBalance = walletBalance;
        }
        break;

      case "LTC":
        fullCurrCurrencyName = "Litecoin";
        wallet = await getWalletBalance(req.session.oidLTC);
        wallet = JSON.parse(wallet);
        walletBalance = wallet.confirmed / 100000000;
        console.log("walletBalance: ", walletBalance);

        /* API for getting exchange rate of EUR for LTC EUR balance
        (binance do not support LTCEUR exchange rate)*/
        if (walletBalance) {
          req.session.walletBalance = walletBalance;
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

          /* Getting LTCUSD exchange rate from Binance */
          let ticker = await binance.prices();
          console.log(`Price of LTCUSDT: ${currCurrencyUSDprice = ticker.LTCUSDT}`);
          balanceUSD = (walletBalance * currCurrencyUSDprice).toFixed(2);

          /* Getting LTCEUR exchange by multiply LTCUSD exchange rate from binance
          and exchange rate of EUR */
          balanceEUR = (balanceUSD * balanceEUR).toFixed(2);
          console.log(balanceEUR);
        } else {
          walletBalance = 0;
          req.session.walletBalance = walletBalance;
        }
        break;
      default:
        fullCurrCurrencyName = "Oops"
        console.log(fullCurrCurrencyName);
        console.log("Error! Currency is not equal to any of the supported currencies.(MAIN)");
        res.status(404).end("Error! Currency is not equal to any of the supported currencies.(MAIN)");
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
          transactionHistory: transactionHistory,
          num_of_wallets: walletLength
        });
      });
  } else
    res.redirect("/");
});


/*********************** ADD WALLET (User's main screen) *********************/

app.post("/add-wallet", async function(req, res) {
  console.log("I'am in POST func. of ADD-WALLET");
  var walletName;
  let flag = false;
  var account = req.session.userName;
  let choosenWallet = req.body.walletCurrency;

  /* check which wallet already exists and
  which one the user can create */
  if (choosenWallet === "BTC" && !req.session.oidBTC) {
    walletName = req.session.userName + "-BTC";
    //create new wallet
    var newWalletData = await createNewWallet(walletName, "BTC");
    newWalletData = JSON.parse(newWalletData);
    console.log(newWalletData);
    req.session.oidBTC = newWalletData.oid;
    req.session.addessBTC = newWalletData.current_address;
    flag = true;
  } else
  if (choosenWallet === "BTC" && req.session.oidBTC)
    console.log("You already have a BTC wallet");
  if (choosenWallet === "LTC" && !req.session.oidLTC) {
    walletName = req.session.userName + "-LTC";
    //create new wallet
    var newWalletData = await createNewWallet(walletName, "LTC");
    newWalletData = JSON.parse(newWalletData);
    console.log(newWalletData);
    req.session.oidBTC = newWalletData.oid;
    req.session.addessBTC = newWalletData.current_address;
    flag = true;
  } else
  if (choosenWallet === "LTC" && req.session.oidLTC)
    console.log("You already have a LTC wallet");
  if (flag) {
    //newWalletData = JSON.parse(newWalletData);
    //console.log(newWalletData);
    const oid = newWalletData.oid;
    const currency = newWalletData.currency;
    walletName = newWalletData.name;
    const currentAddress = newWalletData.current_address;
    const createdDate = newWalletData.created_at;
    const updatedDate = newWalletData.updated_at;

    req.session.publicAddress = currentAddress;
    req.session.currentOid = oid;
    req.session.currentCurrency = currency;

    // add wallet to user account
    let wallet = await addWalletToAccount(account, oid, currency, walletName, currentAddress, createdDate, updatedDate);
    console.log("wallet: ", wallet);
    flag = false;
    res.redirect('main');
  }
});


/************************** CHANGE WALLET (User's main screen) *************************/

app.post("/change-wallet", async function(req, res) {
  console.log("I'am in POST func. of СHANGE-WALLET");

  let currentCurrency = req.session.currentCurrency;
  let chooseWallet = req.body.walletCurrency;
  let account = req.session.userName;
  let flag = false;
  // console.log("account: ", account);
  // console.log("currentCurrency: ",currentCurrency);
  // console.log("chooseWallet: ", chooseWallet);
  // console.log("req.session.oidBTC", req.session.oidBTC);
  if (chooseWallet === "BTC" && currentCurrency === "BTC")
    console.log("You already in a BTC wallet");
  else
  if (chooseWallet === "LTC" && currentCurrency === "LTC")
    console.log("You already in a LTC wallet");
  else
  if (chooseWallet === "LTC" && currentCurrency === "BTC") {

    const filter = {
      account: account
    };

    // check user wallets in the database
    let wallet = await Wallet.findOne(filter);
    for (var ind = 0; ind < wallet.wallet.length; ind++) {
      if (wallet.wallet[ind].currency === "LTC") {
        req.session.oidLTC = wallet.wallet[ind].oid;
        req.session.addressLTC = wallet.wallet[ind].current_address;
        flag = true;
        console.log("req.session.oidLTC: " + req.session.oidLTC);
        console.log("req.session.addessLTC: " + req.session.addressLTC);
      }
    }

    if (flag) {
      req.session.currentCurrency = "LTC";
      req.session.currentOid = req.session.oidLTC;
      req.session.publicAddress = req.session.addressLTC;
      res.redirect('main');
    }

  } else
  if (chooseWallet === "LTC" && currentCurrency === "BTC")
    console.log("You don't have an LTC wallet");
  else
  if (chooseWallet === "BTC" && currentCurrency === "LTC") {
    const filter = {
      account: account
    };
    let wallet = await Wallet.findOne(filter);

    for (var ind = 0; ind < wallet.wallet.length; ind++) {
      if (wallet.wallet[ind].currency === "BTC") {
        req.session.oidBTC = wallet.wallet[ind].oid;
        req.session.addressBTC = wallet.wallet[ind].current_address;
        flag = true;
        console.log("req.session.oidBTC: " + req.session.oidBTC);
        console.log("req.session.addessBTC: " + req.session.addressBTC);
      }
    }

    if (flag) {
      req.session.currentCurrency = "BTC";
      req.session.currentOid = req.session.oidBTC;
      req.session.publicAddress = req.session.addressBTC;
      res.redirect('main');
    }

  } else
  if (chooseWallet === "LTC" && currentCurrency === "BTC")
    console.log("You don't have an BTC wallet");
});

/************************** SEND (Send Screen) *************************/

app.get("/send", function(req, res) {
  if (req.session.userName) {
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
  } else
    res.redirect("/");
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
        console.log("Error! Currency is not equal to any of the supported currencies.(SEND)");
        res.status(404).end("Error! Currency is not equal to any of the supported currencies.(SEND)");
    }

    res.render('send', {
      recipientAddress: recipientAddress,
      sendUSDamount: sendUSDamount,
      sendCryptoAmount: sendCryptoAmount,
      walletBalance: walletBalance,
      currentCurrency: currentCurrency
    });
  }

  /*********************** "Maximume" button was pressed **********************/
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

    if ((sendCryptoAmount >= process.env.MIN_SENDING_SUM && sendCryptoAmount <= walletBalance) && recipientAddress) {
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
  if (req.session.userName) {
    console.log("I'am in GET func. of EXCHANGE");
    res.render('exchange');
  } else res.redirect("/");

});

app.post("/exchange", async function(req, res) {
  console.log("I'am in POST func. of EXCHANGE");
  let exchangeCryptoAmount = null;
  let exchangeRate;
  let thisWalletBalance = 0;
  let fromCrypto = req.body.from;
  let toCrypto = req.body.to;
  let insufficient = false;
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
        console.log(exchangeRate = (1 / exchangeRate).toFixed(2));
        thisWalletBalance = 0;
        req.session.thisWalletBalance = thisWalletBalance;
        console.log("req.session.thisWalletBalance: ", req.session.thisWalletBalance);
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
        req.session.thisWalletBalance = thisWalletBalance;
        console.log("req.session.thisWalletBalance: ", req.session.thisWalletBalance);
        console.log("First you need to create an LTC wallet");
      }
      break;
    default:
      console.log("Error! Currency is not equal to any of the supported currencies.(EXCHANGE)");
      res.status(404).end("Error! Currency is not equal to any of the supported currencies.(EXCHANGE)");
  }

  res.render('confirm_exchange', {
    fromCrypto: fromCrypto,
    toCrypto: toCrypto,
    exchangeRate: exchangeRate,
    exchangeCryptoAmount: exchangeCryptoAmount,
    youWillGet: 0,
    thisWalletBalance: thisWalletBalance,
    insufficient: insufficient
  });
});


/************************** CONFIRM_EXCHANGE SCREEN *************************/

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
  let insufficient = false;

  console.log(fromCrypto + toCrypto);
  let ticker = await binance.prices();
  switch (fromCrypto + toCrypto) {
    case "BTCLTC":
      //let ticker = await binance.prices();
      fromUserOid = req.session.oidBTC;
      toUserAddress = req.session.addressLTC;

      fromAdminOid = process.env.ADMIN_OID_LTC;
      toAdminAddress = process.env.ADMIN_ADRESS_BTC;

      console.log(`Price of BTCLTC: ${exchangeRate = ticker.LTCBTC}`);
      console.log(exchangeRate = (1 / exchangeRate).toFixed(2));
      break;
    case "LTCBTC":
      //let ticker = await binance.prices();
      fromUserOid = req.session.oidLTC;
      toUserAddress = req.session.addressBTC;

      fromAdminOid = process.env.ADMIN_OID_BTC;
      toAdminAddress = process.env.ADMIN_ADRESS_LTC;

      console.log(`Price of LTCBTC: ${exchangeRate = ticker.LTCBTC}`);
      break;
    default:
      console.log("Error! Currency is not equal to any of the supported currencies.(CONFIRM_EXCHANGE)");
      res.status(404).end("Error! Currency is not equal to any of the supported currencies.(CONFIRM_EXCHANGE)");
  }

  /*********************** "Maximume" button was pressed ************************/
  if (req.body.Maximum == "Clicked") {

    exchangeCryptoAmount = req.session.thisWalletBalance;
    youWillGet = 0;

    res.render('confirm_exchange', {
      fromCrypto: fromCrypto,
      toCrypto: toCrypto,
      exchangeRate: exchangeRate,
      exchangeCryptoAmount: exchangeCryptoAmount,
      youWillGet: youWillGet,
      thisWalletBalance: thisWalletBalance,
      insufficient: insufficient
    });
  }


  /*********************** "Calculate" button was pressed ************************/
  if (req.body.Calculate == "Clicked") {

    exchangeCryptoAmount = req.body.exchangeCryptoAmount;
    youWillGet = (exchangeRate * exchangeCryptoAmount);

    console.log("youWillGet: ", youWillGet);
    //youWillGet = youWillGet * 100000000;
    console.log("youWillGet before fee: ", youWillGet);
    let temp = youWillGet;
    let userWillGet = (youWillGet - (temp * process.env.EXCHANGE_FEE)).toFixed(6);
    console.log("userWillGet: ", userWillGet);
    youWillGet = (youWillGet - (temp * process.env.EXCHANGE_FEE));
    console.log("youWillGet after fee: ", youWillGet);
    res.render('confirm_exchange', {
      fromCrypto: fromCrypto,
      toCrypto: toCrypto,
      exchangeRate: exchangeRate,
      youWillGet: userWillGet,
      exchangeCryptoAmount: exchangeCryptoAmount,
      thisWalletBalance: thisWalletBalance,
      insufficient: insufficient
    });
  }

  /************************** "Exchange" button was pressed *************************/
  if (req.body.Exchange == "Clicked") {
    let walletExist = false;
    let walletName;
    let account = req.session.userName;
    //let insufficient = false;
    // walletName = req.session.userName + "-" + req.session.toCrypto
    // console.log("walletName: ", walletName);
    exchangeCryptoAmount = req.body.exchangeCryptoAmount;
    if (exchangeCryptoAmount <= thisWalletBalance && exchangeCryptoAmount >= process.env.MIN_SENDING_SUM && req.session.currentCurrency === req.session.fromCrypto) {
      console.log(exchangeCryptoAmount);
      youWillGet = exchangeCryptoAmount * exchangeRate;

      if (youWillGet < process.env.MIN_SENDING_SUM) {
        insufficient = true;
        res.render('confirm_exchange', {
          fromCrypto: fromCrypto,
          toCrypto: toCrypto,
          exchangeRate: exchangeRate,
          exchangeCryptoAmount: exchangeCryptoAmount,
          youWillGet: youWillGet,
          thisWalletBalance: thisWalletBalance,
          insufficient: insufficient
        });
      }

      //console.log("youWillGet: ", youWillGet);
      youWillGet = youWillGet * 100000000;
      //youWillGet = youWillGet.toFixed(0)
      console.log("youWillGet before fee: ", youWillGet.toFixed(0));
      let temp = youWillGet;
      youWillGet = youWillGet - (temp * process.env.EXCHANGE_FEE);
      console.log("youWillGet after fee: ", youWillGet);
      exchangeCryptoAmount = exchangeCryptoAmount * 100000000;

      const filter = {
        account: account
      };
      let wallet = await Wallet.findOne(filter);
      console.log("wallet before changes: ", wallet);

      for (let ind = 0; ind < wallet.wallet.length; ind++) {
        if (wallet.wallet[ind].currency == req.session.toCrypto) {
          walletExist = true;
          console.log("wallet.wallet[ind].currency: " + wallet.wallet[ind].currency);
        }
      }
      if (!walletExist) {
        walletName = req.session.userName + "-" + req.session.toCrypto;
        console.log("walletExist : " + walletExist);
        console.log("walletName: ", walletName);
        var newWalletData = await createNewWallet(walletName, req.session.toCrypto);

        newWalletData = JSON.parse(newWalletData);
        console.log("newWalletData: ", newWalletData);
        if (req.session.toCrypto === "BTC") {
          req.session.oidBTC = newWalletData.oid;
          req.session.addessBTC = newWalletData.current_address;
          toUserAddress = newWalletData.current_address;
        }
        if (req.session.toCrypto === "LTC") {
          req.session.oidLTC = newWalletData.oid;
          req.session.addessLTC = newWalletData.current_address;
          toUserAddress = newWalletData.current_address;
        }
        const oid = newWalletData.oid;
        const currency = newWalletData.currency;
        walletName = newWalletData.name;
        const currentAddress = newWalletData.current_address;
        const createdDate = newWalletData.created_at;
        const updatedDate = newWalletData.updated_at;
        // req.session.publicAddress = currentAddress;
        // req.session.currentOid = oid;
        // req.session.currentCurrency = currency;
        let wallet = await addWalletToAccount(account, oid, currency, walletName, currentAddress, createdDate, updatedDate);
        console.log("wallet after changes: ", wallet);
      }
      console.log("fromUserOid: ", fromUserOid);
      console.log("toAdminAddress: ", toAdminAddress);
      console.log("exchangeCryptoAmount: ", exchangeCryptoAmount);
      console.log("fromAdminOid: ", fromAdminOid);
      console.log("toUserAddress: ", toUserAddress);
      console.log("youWillGet: ", youWillGet);

      let sendCryptoToAdmin = await sendCrypto(fromUserOid, toAdminAddress, exchangeCryptoAmount, false, false);
      console.log("sendCryptoToAdmin1: ", sendCryptoToAdmin);
      let sendCryptoToUser = await sendCrypto(fromAdminOid, toUserAddress, youWillGet, false, false);
      console.log("sendCryptoToAdmin2: ", sendCryptoToAdmin);
      res.redirect("main");
    } else {
      youWillGet = 0;
      insufficient = true;
      exchangeCryptoAmount = null;
      console.log("You do not have this currency amount");
      res.render('confirm_exchange', {
        fromCrypto: fromCrypto,
        toCrypto: toCrypto,
        exchangeRate: exchangeRate,
        exchangeCryptoAmount: exchangeCryptoAmount,
        youWillGet: youWillGet,
        thisWalletBalance: thisWalletBalance,
        insufficient: insufficient
      });
    }
  }
});

/************************** "Delete Wallet from DB" function *************************/
async function deleteWalletfromDB(account, walletOid) {

  let doc;

  console.log("walletOid: ", walletOid);
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
  doc = await Wallet.findOneAndUpdate(filter, update, {
    safe: true,
    new: true
  });

  let walletLength = doc.wallet.length;

  if (walletLength === 0) {
    doc = await Wallet.findOneAndDelete(filter);
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

app.get('*', function(req, res) {
  res.send('what???', 404);
});

//mongoose.connection.close();

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
