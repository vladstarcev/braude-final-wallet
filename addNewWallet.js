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

  // var options = {
  //   'method': 'POST',
  //   'url': 'https://rahakott.io/api/v1.1/wallets/new',
  //   'headers': {
  //     'Accept': 'application/json',
  //     'Content-Type': 'application/json',
  //     'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
  //   },
  //   body: JSON.stringify({
  //     "api_key": "219086bc0faedeb4cb40ca8adfadd9ff", // process.env.API_KEY,
  //     "name": newUsername,
  //     "currency": "BTC"
  //   })
  // };
  //
  // request(options, function(error, response) {
  //   if (error) throw new Error(error);
  //   console.log(response.body);
  //   const newWalletData = JSON.parse(response.body);
  //   //console.log(newWalletData);
  //   const oid = newWalletData.oid;
  //   const currency = newWalletData.currency;
  //   const walletName = newWalletData.name;
  //   const currentAddress = newWalletData.current_address;
  //   const createdDate = newWalletData.created_at;
  //   const updatedDate = newWalletData.updated_at;
  //
  //   name = newUsername;
  //   publicAddress = currentAddress;
  //
  //   console.log(currency, oid, walletName, publicAddress);
  //
  //   /*********************** SET DATA TO DB ****************************/
  //
  //   const newWallet = new Wallet({
  //     account: newUsername,
  //     password: newPassword,
  //     wallet: [{
  //       oid: oid,
  //       currency: currency,
  //       wallet_name: walletName,
  //       current_address: currentAddress,
  //       created_at: createdDate,
  //       updated_at: updatedDate
  //     }]
  //   });
  //   //to save newWallet document into Wallet collection
  //   newWallet.save(function(err) {
  //     if (err) return console.error(err);
  //     console.log("Succesfully saved in userDB");
  //   });
  //
  //   /* redirect to "main screen"
  //   when we redirect we "jump" to get request of route */
  //   res.redirect('main_screen');
  // });

  const oid = "3wertfd"; // newWalletData.oid;
  const currency = "BTC"; // newWalletData.currency;
  const walletName = "test31"; // newWalletData.name;
  const currentAddress = "12weedthhjhgjg"; // newWalletData.current_address;
  const createdDate = "2020-05-06T08:22:40.000Z"; // newWalletData.created_at;
  const updatedDate = "2020-05-06T08:22:40.000Z"; // newWalletData.updated_at;
  const walName = walletName + "-BTC";
  console.log(walName);

  Wallet.findOneAndUpdate({
    account: "test3"
  }, {
    $push: {
      "wallet": {
        oid: oid,
        currency: currency,
        wallet_name: walName,
        current_address: currentAddress,
        created_at: createdDate,
        updated_at: updatedDate
      }
    }
  }, {
    new: true,
    upsert: true
  }, function(err, wallet) {
    if (err) return console.log(err);
    if (wallet) {
      console.log(wallet);
    }
  });
}
