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
      //console.log(wallet.wallet[0].oid);
      publicAddress = wallet.wallet[0].current_address;
      //console.log(wallet.wallet.length);
      name = account;

      res.redirect('main_screen');
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
            "name": walletName ,
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
      qrcode: url,
      publicAddress: publicAddress
    });
  });

});

//mongoose.connection.close();

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
