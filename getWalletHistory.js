const request = require("request");
require('dotenv').config();

module.exports = getData;
//console.log(module);

function getData( walletOid ) {

  var options = {
    'method': 'POST',
    'url': 'https://rahakott.io/api/v1.1/history',
    'headers': {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cookie': 'Cookie_1=value; __cfduid=d1e52c0daff45c29a2f2186fdd35d81e81590309503'
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
      //console.log("inside function: " + walletData);
      resolve(walletData);
    });
  });

}
