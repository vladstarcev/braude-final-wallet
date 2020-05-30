const express = require('express');
const ejs = require('ejs');
const QRCode = require('qrcode');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static("public"));

app.get('/', function(req,res) {
  QRCode.toDataURL(JSON.stringify('3MaC5uA6ru4XA3S1stficMK5zbVTSgyH5o'), {
    errorCorrectionLevel: 'H'
  }, function(err, url) {
    //console.log(url);

    res.render('main', {
      qrcode: url
    });
  });
});

app.get('/send', function(req,res){
  res.render('send');
});

app.listen(3000, function(){
  console.log("Server is running on port 3000");
});
