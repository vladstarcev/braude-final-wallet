const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const https = require("https");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", function(req, res){
  res.sendFile(__dirname + "/login.html");
});

app.post("/", function(req, res){
  var account = req.body.account;
  var password = req.body.password;
  console.log(account, password);
});



app.get("/new_account", function(req, res){
  res.sendFile(__dirname + "/new_account.html");

});


app.post("/new_account", function(req, res){
  var account = req.body.account;
  var password = req.body.password;
  var cPassword = req.body.cPassword;
  console.log(account, password, cPassword);

  const data = {
    api_key: "219086bc0faedeb4cb40ca8adfadd9ff",
    name: "My wallet",
    currency: "BTC"
  };
  const jsonData = JSON.stringify(data);

  const url = "https://rahakott.io/api/v1.1/wallets/new";

  const options = {
    method: "POST",
    accept: 'application/json',
    url: 'https://rahakott.io/api/v1.1/wallets/new',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const request = https.request(url, options, function(responce){
    responce.on("data", function(data){
      console.log(JSON.parse(data));
    });
  });

  request.write(jsonData);
  request.end();
  // var options = {
  //   'method': 'POST',
  //   'url': 'https://rahakott.io/api/v1.1/wallets/new',
  //   'headers': {
  //     'Content-Type': 'application/json',
  //     'Cookie': '__cfduid=d7a2c5f29dbb266750c05eebc788f40dd1586433789'
  //   },
  //   body: JSON.stringify({"api_key":"219086bc0faedeb4cb40ca8adfadd9ff","name":"New wallet","currency":"BTC"})
  //
  // };
  // request(options, function (error, response) {
  //   if (error) throw new Error(error);
  //   console.log(response.body);
  // });


  // const url = "https://rahakott.io/api/v1.1/wallets/new?api_key=219086bc0faedeb4cb40ca8adfadd9ff&name=New wallet&currency=BTC";
  // https.get(url, function(response){
  //   console.log(response.statusCode);
  //
  //   response.on("data", function(data){
  //     const walletData = JSON.parse(data);
  //     console.log(walletData);
  //   });
  // });

  // if(password === cPassword){
  //   console.log("Accepted");
  // }else{
  //     res.status(401).end('Incorrect Username and/or Password!');
  // }

});

app.listen(3000, function(){
  console.log("Server is running on port 3000");
});
