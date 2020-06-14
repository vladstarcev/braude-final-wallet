const request = require("request");
require('dotenv').config();

module.exports = getData;

function getData(currentOid, recipientAddress, sendCryptoAmount, external_only_flag, subtract_fees_flag) {

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


  return new Promise((resolve, reject) => {
    request(options, function(error, response) {
      if (error) reject(error);
      const walletData = response.body;
      console.log("Inside function: " + walletData);
      resolve(walletData);
    });
  });

}
