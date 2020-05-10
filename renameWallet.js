const request = require("request");
const mongoose = require("mongoose");
require('dotenv').config();

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

  var options = {
    'method': 'POST',
    'url': 'https://rahakott.io/api/v1.1/wallets/update',
    'headers': {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
    },
    body: JSON.stringify({
      "api_key": process.env.API_KEY_RAHAKOTT,
      "oid": "a765e6289b7490657bae997dbcb0fc76", // currentOid
      "name": "kk" // newWalletName
    })

  };
  request(options, function(error, response) {
    if (error) throw new Error(error);

    const statusCode = response.statusCode;
    //console.log(response); //response.statusCode

    const updateWalletData = JSON.parse(response.body);

    if (statusCode == 200 && updateWalletData.name == null)
      console.log("A wallet with this name already exists");
    else {
      console.log(updateWalletData.name);
      console.log(updateWalletData.updated_at);

      Wallet.findOneAndUpdate({
        "wallet.oid": "123" // currentOid
      }, {
        'wallet.$.wallet_name': updateWalletData.name, // newWalletName
        'wallet.$.updated_at': updateWalletData.updated_at
      }, {
        //new: true,
        upsert: true
        //multi: false
      }, function(err, wallet) {
        if (err) return console.log(err);
        if (wallet) {
          console.log(wallet);
        }
      });
    }
  });

}
