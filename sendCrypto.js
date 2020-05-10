const request = require("request");
require('dotenv').config();

module.exports = getData;

function getData() {

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
      "wallet": "17ed43f58e159bff684d8b25e06b0409", // currentOid;
      "recipient": "37M1yDGSykbet657Wz5vcEWxVcPpTPmshF", // recipientAddress
      "amount": 135237, // amount
      "external_only": true,
      "subtract_fees": true
    })

  };
  request(options, function(error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });

}
