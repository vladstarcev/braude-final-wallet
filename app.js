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

//const rahakottData = require(__dirname + "/data.js");
//console.log(rahakottData());

/* to connect URL and creating "userDB" if it's not exist
(and preserve deprecation warnings) */
// it is place where mongodb hosted locally
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// schema of our data
// const userSchema = new mongoose.Schema({
//   account: String,
//   password: String,
//   oid: String,
//   currency: String,
//   wallet_name: String,
//   current_address: String,
//   created_at: Date,
//   updated_at: Date
// });

// const walletSchema = new mongoose.Schema({
//   oid: String,
//   currency: String
// });

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

const app = express();

/* Global variables */
// let is sort of variable
// recommended to use "let" instead of "var"
let name;
let publicAddress;

// for "EJS" - templates using
app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

/****************************** LOGIN SCREEN ******************************/
// app.get("/")-what happens whet users enter to my homepage
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/login.html");
});

// "post request" is get data back from our web page to server
app.post("/", function(req, res) {
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

      /****************************** Get a Wallet Address List ******************************/
      var options = {
        'method': 'POST',
        'url': 'https://rahakott.io/api/v1.1/addresses',
        'headers': {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
        },
        body: JSON.stringify({
          "api_key": "219086bc0faedeb4cb40ca8adfadd9ff",
          "wallet": wallet.wallet[0].oid,
          "offset": 0,
          "limit": 50
        })

      };

      request(options, function(error, response) {
        if (error) throw new Error(error);
        console.log(response.body);
        const newWalletData = JSON.parse(response.body);
        console.log(newWalletData.addresses[0].address);
        publicAddress = newWalletData.addresses[0].address;
        console.log(publicAddress);
      });

      /************************************************************************/

      //publicAddress  = rahakottData();
      name = account;

      //publicAddress = newWalletData.addresses[0].address;

      // redirect to "main screen"
      res.redirect('main_screen');
    } else res.status(401).end('Incorrect Username and/or Password!');
  });
});

/*************************** MAIN SCREEN **********************************/
app.get("/main_screen", function(req, res) {
  res.render('main_screen', {
    accountName: name,
    publicAddress: publicAddress
  });
  //res.redirect(req.originalUrl);
});

/************************** NEW USER SCREEN *****************************/
app.get("/new_account", function(req, res) {
  res.sendFile(__dirname + "/new_account.html");
});

app.post("/new_account", function(req, res) {
  var account = req.body.account;
  var password = req.body.password;
  var cPassword = req.body.cPassword;
  console.log(account, password, cPassword);

  Wallet.findOne({
    account: account
  }, function(err, wallet) {
    if (err) return console.log(err);
    if (wallet) {
      console.log(wallet);
      console.log("Error. Account with this name already exist.")
      res.status(401).end('Incorrect Username and/or Password!');
    } else {
      if (password === cPassword) {
        /*********************** CREATE NEW WALLET **************************/
        const data = {
          api_key: "219086bc0faedeb4cb40ca8adfadd9ff",
          name: account, // "+ currency +"- it is need to be changed (when we add another currency)
          currency: "LTC"
        };
        const jsonData = JSON.stringify(data);

        const url = "https://rahakott.io/api/v1.1/wallets/new";

        const options = {
          method: 'POST',
          url: url,
          json: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        };

        const request = https.request(url, options, function(response, err) {
          if (err) return console.error(err);

          // getting data from Rahakott
          response.on("data", function(data) {

            // can be error type also
            //console.log(JSON.parse(data));

            const newWalletData = JSON.parse(data);

            const oid = newWalletData.oid;
            const currency = newWalletData.currency;
            const walletName = newWalletData.name;
            const currentAddress = newWalletData.current_address;
            const createdDate = newWalletData.created_at;
            const updatedDate = newWalletData.updated_at;


            name = account;
            publicAddress = currentAddress;

            console.log(currency, oid, walletName);

            /***********************SET DATA TO DB*********************************/
            // setting data to database
            const newWallet = new Wallet({
              account: account,
              password: password,
              wallet: [{
                oid: oid,
                currency: currency,
                wallet_name: walletName,
                current_address: currentAddress,
                created_at: createdDate,
                updated_at: updatedDate
              }]
            });

            // to save newWallet document into Wallet collection inside
            newWallet.save(function(err) {
              if (err) return console.error(err);
              console.log("Succesfully saved in userDB");
            });
          });
        });

        // sending data to Rahakott
        request.write(jsonData);
        request.end();

        // redirect to "main screen"
        //when we redirect we "jump" to get request of route
        res.redirect('main_screen');
      } else res.status(401).end('Incorrect Username and/or Password!');
    }
  });
});

//mongoose.connection.close();

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
