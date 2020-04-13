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

/* to connect URL and creating "userDB" if it's not exist
(and preserve deprecation warnings) */
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


// schema of our data
const userSchema = new mongoose.Schema({
  account: String,
  password: String,
  oid: String,
  currency: String,
  wallet_name: String,
  current_address: String,
  created_at: String,
  updated_at: String
});

// const userSchema = new mongoose.Schema({
//   account: String,
//   password: String,
//   wallet: [{
//     oid: String,
//     currency: String,
//     wallet_name: String
//   }]
// });

// create new collection - Wallet
const Wallet = mongoose.model("Wallet", userSchema);

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

/****************************** LOGIN SCREEN ******************************/
// app.get("/")-what happens whet users enter to my homepage
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/login.html");
});

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
      // redirect to "main screen"
      res.redirect('/main_screen');
    } else res.status(401).end('Incorrect Username and/or Password!');
  });
});

/*************************** MAIN SCREEN **********************************/
app.get("/main_screen", function(req, res) {
  res.sendFile(__dirname + "/main_screen.html");
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
          name: account,
          currency: "BTC"
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
            console.log(currency, walletName, oid);

            /***********************SET DATA TO DB*********************************/
            // setting data to database
            const newWallet = new Wallet({
              account: account,
              password: password,
              oid: oid,
              currency: currency,
              wallet_name: walletName,
              current_address: currentAddress,
              created_at: createdDate,
              updated_at: updatedDate
            });

            // to save newWallet document into Wallet collection inside (every time)
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
        res.redirect('/main_screen');
      } else res.status(401).end('Incorrect Username and/or Password!');
    }
  });
});

//mongoose.connection.close();

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
