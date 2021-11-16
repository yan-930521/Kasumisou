const express = require('express');
const Discord = require('discord.js');
const  { NlpManager }  =  require ('node-nlp') ;
const Database = require("@replit/database")
const fs = require('fs');
const me = require('./me.json');

const app = express();
const port = 3030;

app.get('/', (req, res) => res.send('link start!'));

app.listen(port, () => console.log(`連接至http://localhost:${port}`));

const db = new Database();

var manager = new NlpManager({ languages: ['zh'] });
//var manager = new NlpManager({ languages: ['zh'],  nlu : {  useNoneFeature : false  }});
manager.load();
async function train(){
  await manager.train();
  manager.save();
  fs.readFile('./model.nlp', 'utf8' , async (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    await db.set("model", JSON.stringify(data));
    let model = await db.get("model");
    console.log(model);
  })
}
train()