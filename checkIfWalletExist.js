const request = require("request");
require('dotenv').config();

module.exports = getData;

function getData( walletOid ) {

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
      "wallet": walletOid,
      "offset": 0,
      "limit": 50
    })
  };

  return new Promise((resolve, reject) => {
    request(options, function(error, response) {
      if (error) reject(error);
      const walletData = response.body;
      console.log("inside function: " + walletData);
      resolve(walletData);
    });
  });
}
