
const request = require("request");

module.exports = getData;

//let publicAddress;

function getData(){

  /****************************** Get a Wallet Address List ******************************/
  var options = {
    'method': 'POST',
    'url': 'https://rahakott.io/api/v1.1/addresses',
    'headers': {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cookie': 'Cookie_1=value; __cfduid=d69943c7cc2f94227303f9be331eece141586525180'
    },
    body: JSON.stringify({
      "api_key": "219086bc0faedeb4cb40ca8adfadd9ff",
      "wallet": "8b9f64594efd07d80f4f0a40dc69b7af",//wallet.wallet[0].oid,
      "offset": 0,
      "limit": 50
    })

  };

  request(options, function(error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    const newWalletData = JSON.parse(response.body);
    console.log(newWalletData.addresses[0].address);
    let publicAddress = newWalletData.addresses[0].address;
    console.log(publicAddress);
    return publicAddress;
  });

  /************************************************************************/

  //return publicAddress;
}
