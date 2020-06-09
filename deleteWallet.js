const request = require("request");
const mongoose = require("mongoose");

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

const Wallet = mongoose.model("Wallet", userSchema);

module.exports = getData;

function getData() {

  /***************************** LOGIN (Homepage) *****************************/
  // "post request" is getting data back from our web page to server
  app.post("/login", function(req, res) {

    var account = req.body.account;
    var password = req.body.password;
    let arrayElementID;
    console.log(account, password);

    Wallet.findOne({
      account: account,
      password: password
    }, function(err, wallet) {
      if (err) return console.log(err);
      if (wallet) {
        console.log(wallet);

        for (let i = 0; i < wallet.wallet.length; i++) {
          console.log("I'am in FOR LOOP");
          console.log("i is: " + i);

          name = account;
          arrayElementID = wallet.wallet[i]._id;
          console.log("arrayElementID is: " + arrayElementID);

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

          //we need try to do this with try-catch;
          request(options, function(error, response) {
            if (error) throw new Error(error);
            console.log(response.body);
            console.log();
            if (response.body.includes("Incorrect parameter")) {
              /* delete a wallet from a database that does not exist */
              Wallet.findOneAndUpdate({
                account: account
              }, {
                $pull: {
                  "wallet": {
                    _id: arrayElementID
                  }
                }
              }, {
                safe: true,
                new: true
              }, function(err) {
                if (err) return console.log(err);
                console.log("Successful wallet deletion");
                //res.destroy(); // Need to check if this is the correct solution !!!!!!!!!!!!!
              });
              //res.status(500).end('This wallet does not exist in rahakott.');
            } else {
              const newWalletData = JSON.parse(response.body);
              if (JSON.stringify(newWalletData.addresses).includes(publicAddress)) {
                console.log("Rahakott includes the address " + publicAddress);
                console.log("currentOid is: " + currentOid);

                /******************** Get a Wallet balance ********************/

                // var options = {
                //   'method': 'POST',
                //   'url': 'https://rahakott.io/api/v1.1/wallets/balance',
                //   'headers': {
                //     'Accept': 'application/json',
                //     'Content-Type': 'application/json',
                //     'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
                //   },
                //   body: JSON.stringify({
                //     "api_key": process.env.API_KEY_RAHAKOTT,
                //     "oid": currentOid
                //   })
                // };
                // request(options, function(error, response) {
                //   if (error) throw new Error(error);
                //   const walletData = JSON.parse(response.body);
                //   walletBalance = walletData.confirmed / 100000000;
                //   //console.log(walletBalance);
                //   res.redirect('main');
                // });

                res.redirect('main');
              }
            }
          });
        }
        if (wallet.wallet.length == 0) {

          /* delete an account from a database that does not have wallets */
          Wallet.findOneAndDelete({
            account: account
          }, function(err) {
            if (err) console.log(err);
            console.log("Successful account deletion");
          });
          res.status(401).end('This account does not exist.');
        }
        //res.status(401).end('HERE WE GO AGAIN');
      } else res.status(401).end('Incorrect Username and/or Password!');
    });
  });

}
