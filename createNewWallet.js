const request = require("request");
require('dotenv').config();

module.exports = getData;
//console.log(module);

function getData(walletName, walletCurrency) {

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
      "currency": walletCurrency
    })
  };
  return new Promise((resolve, reject) => {
    request(options, function(error, response) {
      if (error) reject(error);
      const walletData = response.body;
      console.log("Inside function: " + walletData);
      resolve(walletData);
    });
  });

}
