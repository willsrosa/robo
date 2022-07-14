const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors')
const { Buttons, List } = require('whatsapp-web.js');
const axios = require('axios').default;

const socketIO = require('socket.io');
const qrcode = require('qrcode');
const https = require('https');
const http = require('http');

const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const port = 2096;
const urlbase = "https://api.itdev.com.br:2083";

  var privateKey = fs.readFileSync('private.key', 'utf8');
  var certificate = fs.readFileSync('private.crt', 'utf8');
  var credentials = { key: privateKey, cert: certificate };

const app = express();
const server = https.createServer(credentials, app);
//const server = http.createServer(app);

const io = socketIO(server);
io.set('origins', '*:*');

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors())
app.options('*', cors());
app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

client.initialize();

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  qrcode.toDataURL(qr, (err, url) => {
    io.emit('qr', { src: url });
    io.emit('message', { text: 'QR Code received, scan please!' });
  });
});

client.on('authenticated', () => {
  console.log("autenticado")
  io.emit('authenticated');
  io.emit('message', { ext: 'Whatsapp is authenticated!' });
});

client.on('disconnected', (reason) => {
  console.log("disconectado")

  client.initialize() // this what i was need
});

client.on('auth_failure', msg => {
  console.error('BOT-ZDG Falha na autenticação', msg);
  client.initialize() // this what i was need
  io.emit('message', { text: 'Auth failure, restarting...' });
  console.log("autenticado")

});

client.on('ready', () => {
  io.emit('ready');
  io.emit('message', { text: 'Whatsapp is ready!' });
});





client.on('message', async msg => {
  if (!msg.from.toUpperCase().includes("g.us")) {

    if (msg.type == "list_response") {
      if (msg.body == "Sim") {
        msg.reply('Certo estou aguardando você em sua consulta, muito obrigado!😃');
       var data = JSON.stringify({
          "id": msg.selectedRowId,
          "tipo": "aceitou"
        });
        
        var config = {
          method: 'post',
          url: urlbase +'/confirmaragendamento',
          headers: { 
            'Content-Type': 'application/json'
          },
          data : data
        };
        axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log(error);
        });
      }
      else if (msg.body == "Não") {
    

        var data = JSON.stringify({
          "id": msg.selectedRowId,
          "tipo": "aceitou"
        });
        
        var config = {
          method: 'post',
          url: urlbase +'/confirmaragendamento',
          headers: { 
            'Content-Type': 'application/json'
          },
          data : data
        };
        axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log(error);
        });

        msg.reply('Ok, agradeço pelo retorno, em breve uma de nossas secretárias entrará em contato para remarcar sua consulta!😃');

      }
    } else {
      // msg.reply('Sou uma inteligência artificial, não entendi sua mensagem por favor selecione o botão enviado pelo operador!😃')
    }
  }
});
app.post('/send-message', (req, res) => {
  const sender = req.body.sender;
  const number = phoneNumberFormatter("55" + req.body.number);
  const message = req.body.message;
  // console.log(message)
  // const client = sessions.find(sess => sess.id == sender).client;

  client.sendMessage(number, message).then(response => {

    var data = JSON.stringify({
      "id": req.body.id,
     });
    var config = {
      method: 'post',
      url: urlbase +'/enviaragendamento',
      headers: { 
        'Content-Type': 'application/json'
      },
      data : data
    };
    axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });


    console.log(response)
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

app.post('/send-button', (req, res) => {
  console.log("entrou")
   const number = phoneNumberFormatter("55" + req.body.number);
   const id = req.body.id;
   let novoid = id.toString();
  //  let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
  let sections = [{title:'Selecione a Ação',rows:[{title:'Sim',id: novoid},{id: novoid, title:'Não'}]}];
  let list = new List('Clique no botão abaixo para confirmar a consulta','Confirmar Consulta',sections,'Confirmar Consulta','footer');
   client.sendMessage(number,list).then(response => {
     res.status(200).json({
       status: true,
       response: response
     });
   }).catch(err => {
    console.log(err)
     res.status(500).json({
       status: false,
       response: err
     });
   });
});


server.listen(port, function () {
  console.log('App running on *: ' + port);
});


 

client.on('change_state', state => {
  console.log('BOT-ZDG Status de conexão: ', state);
});

client.on('disconnected', (reason) => {
  io.emit('message', { text: 'Whatsapp is disconnected!' });
});
