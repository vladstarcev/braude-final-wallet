const request = require("request");
require('dotenv').config();

const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: process.env.API_KEY_BINANCE,
  APISECRET: process.env.API_SECRET_BINANCE
});


module.exports = getData;

let walletBalance;
let priceBTCUSDT;
let priceBTCEUR;
let balanceUSD;
let balanceEUR;

async function getData() {

  /****************************** Get a Wallet Address List ******************************/
  // var options = {
  //   'method': 'POST',
  //   'url': 'https://rahakott.io/api/v1.1/addresses',
  //   'headers': {
  //     'Accept': 'application/json',
  //     'Content-Type': 'application/json',
  //     'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
  //   },
  //   body: JSON.stringify({
  //     "api_key": process.env.API_KEY_RAHAKOTT,
  //     "wallet": "f87d09a199d2f6e0fd351f6227969d9c", // wallet.wallet[0].oid == currentOid
  //     "offset": 0,
  //     "limit": 50
  //   })
  //
  // };
  //
  // request(options, function(error, response) {
  //   if (error) throw new Error(error);
  //   console.log(response.body);
  //   const newWalletData = JSON.parse(response.body);
  //   console.log(newWalletData.addresses[0].address);
  //   console.log(newWalletData.addresses[0].current);
  //   if (newWalletData.addresses[0].current === true) {

  let ticker = await binance.prices();
  console.log(`Price of BTC: ${priceBTCEUR = ticker.BTCEUR}`);
  console.log(`Price of BTC: ${priceBTCUSDT = ticker.BTCUSDT}`);

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
      "oid": "e7ca9dd2a58eba550e13e748afa74ed6" // wallet.wallet[0].oid == currentOid
    })
  };

  request(options, function(error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    const walletData = JSON.parse(response.body);
    //console.log(walletData.confirmed);
    walletBalance = walletData.confirmed;
    //console.log(walletData.confirmed);
    console.log(walletBalance = walletData.confirmed / 100000000);
    balanceUSD = walletBalance * priceBTCUSDT;
    balanceEUR = walletBalance * priceBTCEUR;
    console.log(balanceUSD.toFixed(2));
    console.log(balanceEUR.toFixed(2));

  });

  // binance.prices('BTCUSDT', (error, ticker) => {
  //   console.log("Price of BTC: ", ticker.BTCUSDT);
  // });

  //}
  //return JSON.stringify(newWalletData);
  //});

  /************************************************************************/
  return balanceUSD;
}
