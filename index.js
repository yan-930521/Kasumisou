const express = require('express');
const Discord = require('discord.js');
const  { NlpManager }  =  require ('node-nlp') ;
const Database = require("@replit/database")
const fs = require('fs');
const me = require('./me.json');
const User = require('./User.js');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('link start!'));

app.listen(port, () => console.log(`連接至http://localhost:${port}`));

const db = new Database();

/*
var manager = new NlpManager({ languages: ['zh-tw'] });
train()
*/

//var manager = new NlpManager();

var manager = new NlpManager({ languages: ['zh'],  nlu : {  useNoneFeature : false  }});

const client = new Discord.Client();
client.login(process.env.key)/*
.then(()=>{
  client.user.setAvatar('');
});*/
var data = {};

client.on('ready', async() => {
  await getmodel();
  data = await getUserData();
  console.log(data);
  console.log(`${client.user.tag}上線囉 !`);
  client.user.setPresence({
    status: "online"
  }).then(()=>{
    client.user.setActivity( "學習中．.．.．", {
        type: "STREAMING"
    });
  })
});

async function getmodel(){
  let model = await db.get("model");
  if(!model) {
    console.log('查無資料 !');
    manager.load();
    return;
  }
  model = JSON.parse(model);
  console.log(model);
  fs.writeFile('./model.nlp', model, async function (err) {
    if (err) 
      console.log(err);
    else {
      manager.load();
    }
  });
}

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

async function getUserData(){
  let d = await db.get("data");
  if(!d) {
    d = {};
  }
  console.log("資料庫已同步");
  return d;
}

async function saveUserData(){
  await db.set("data", data);
    console.log("資料庫已儲存");
}

client.on('message', async msg => {

  console.log(msg.content);
  //if(msg.author.id == "906166994414485585") return;
  
  if(!data[msg.author.id]) {
    data[msg.author.id] = new User();
    await saveUserData();
  }
  if(msg.content.startsWith("$") || data[msg.author.id].autoreply) {
    
    console.log(data[msg.author.id]);

    let noAnswered = 0;
    let sen = msg.content.replace('$','').split("，");
    // let sen = msg.content.replace('$','').split("，");
    for(let s in sen) {
      let str = await manager.process('zh', sen[s]);
      console.log(str);
      console.log(str.classifications[0]);
      
      if(str.answers.length == 0) {
        noAnswered++
        break;
      }

      /* 處理資訊 */
      let news = false;
      if(sen[s].includes('#{') && sen[s].includes('}') ) {
        news = sen[s].split("#{")[1].split("}")[0].trim();
        console.log(news);
      }

      let ans = str.answer
        .replace(/#name/g, me.name[Math.floor(Math.random()*me.name.length)])
        .replace(/#birthday/g, me.birthday[Math.floor(Math.random()*me.birthday.length)])
        .replace(/#age/g, me.age[Math.floor(Math.random()*me.age.length)])
        .replace(/#location/g, me.location[Math.floor(Math.random()*me.location.length)])
        .replace(/#favorite/g, me.favorite[Math.floor(Math.random()*me.favorite.length)])
        .replace(/#gender/g, me.gender[Math.floor(Math.random()*me.gender.length)])
        .replace(/#role/g, me.role[Math.floor(Math.random()*me.role.length)])
        .replace(/#doing/g, me.doing[Math.floor(Math.random()*me.doing.length)])
        .replace(/#help/g, me.help)
        .replace(/#user_Data/g, news);
      switch(str.classifications[0].intent) {
        case "詢問-自己-名字":
          ans = editAns(data[msg.author.id].name, ans);
          break;
        case "詢問-自己-性別":
          ans = editAns(data[msg.author.id].gender, ans);
          break;
        case "詢問-自己-年齡":
          ans = editAns2(data[msg.author.id].age, ans);
          break;
        case "詢問-自己-位置":
          ans = editAns2(data[msg.author.id].location, ans);
          break;
        case "詢問-自己-生日":
          ans = editAns(data[msg.author.id].birthday, ans);
          break;
        case "詢問-自己-身分":
          ans = editAns2(data[msg.author.id].role, ans);
          break;
        case "詢問-自己-愛好":
          ans = editAns(data[msg.author.id].favorite, ans);
          break;
        case "詢問-自己-事情":
          ans = editAns2(data[msg.author.id].doing, ans);
          break;
      }
      function editAns(data, ans) {
        if(data.length) {
          return ans.replace(/#Reply_User_Data/g, data[Math.floor(Math.random()*data.length)]);
        } else {
          return ans.replace(/#Reply_User_Data/g, ". . .");
        }
      }
      function editAns2(data, ans) {
        if(data.length) {
          return ans.replace(/#Reply_User_Data/g, data[data.length-1]);
        } else {
          return ans.replace(/#Reply_User_Data/g, ". . .");
        }
      }
      if(!ans.includes('hummm  false')) {
        msg.channel.send(ans).then((m)=>{
          if(news){
            m.edit(ans+`意圖 ${str.intent}\n如果有正確讀取，請在30秒內反應下面的 胡蘿啵 以儲存資料`);
            m.react('🥕');
            const filter = async (reaction, user) => {
              if(user.id == msg.author.id && reaction.emoji.name == "🥕") {
                switch(str.classifications[0].intent) {
                  case "告訴-自己-名字":
                    data[msg.author.id].name.push(news);
                    break;
                  case "告訴-自己-性別":
                    data[msg.author.id].gender.push(news);
                    break;
                  case "告訴-自己-年齡":
                    data[msg.author.id].age.push(news);
                    break;
                  case "告訴-自己-位置":
                    data[msg.author.id].location.push(news);
                    break;
                  case "告訴-自己-生日":
                    data[msg.author.id].birthday.push(news);
                    break;
                  case "告訴-自己-身分":
                    data[msg.author.id].role.push(news);
                    break;
                  case "告訴-自己-愛好":
                    data[msg.author.id].favorite.push(news);
                    break;
                  case "告訴-自己-事情":
                    data[msg.author.id].doing.push(news);
                    break;
                }
                await saveUserData();
                m.edit("儲存成功！");
                return true;
              }
            }
            m.awaitReactions(filter, {max: 1, time: 30000});
          }
        });
      }
      

      if(str.classifications[0].intent == "使用說明書"){
        break;
      }
      
    }
    if(noAnswered>0 && msg.content.startsWith("$")) {
      msg.channel.send(`${me.name[Math.floor(Math.random()*me.name.length)]}看不懂這句啦...QAQ`);
      return;
    }
  }

  if(msg.content.startsWith("intent&")) {
    //intent&[ intent | answer ]<|>[.....]
    if(!me.master.includes(msg.author.id)){
      msg.channel.send('警告 權限錯誤 !');
      return
    }
    await msg.channel.send('正在取得檔案．.．.．.');
    await getmodel();
    await msg.channel.send('編譯中 請耐心等待．.．.．.');
    let str = msg.content.replace('intent&','').split('<|>');
    console.log(str);
    for(let s in str) {
      let a = str[s].split('|');
      console.log(a);
      if(a.length != 2) return msg.channel.send('警告 格式錯誤 !\n位置 '+s);
      manager.addAnswer('zh', a[0].replace('[','').trim().replace('[',''), a[1].replace(']','').trim());
    }
    await train();
    msg.channel.send('新增成功 !');
  }

  if(msg.content.startsWith("msg&")) {
    //msg&[ msg | intent ]<|>[.....]
    if(!me.master.includes(msg.author.id)){
      msg.channel.send('警告 權限錯誤 !');
      return
    }
    await msg.channel.send('編譯中 請耐心等待．.．.．.');
    let str = msg.content.replace('msg&','').split('<|>');
    console.log(str)
    for(let s in str) {
      let a = str[s].split('|');
      console.log(a);
      if(a.length != 2) return msg.channel.send('警告 格式錯誤 !\n位置 '+s);
      manager.addDocument('zh', a[0].replace('[','').trim(), a[1].replace(']','').trim());
    }
    await train();
    msg.channel.send('新增成功 !');
  }

  if(msg.content.startsWith("備份&")) {
    //intent&[ intent | answer ]<|>[.....]
    if(!me.master.includes(msg.author.id)){
      msg.channel.send('警告 權限錯誤 !');
      return
    }
    await msg.channel.send('備份中 請耐心等待．.．.．.');
    await train();
    msg.channel.send('備份成功 !');
  }

  if(msg.content.startsWith("建議&")) {
    await client.channels.cache.get('907614223650127893').send(msg.author.tag + " "+msg.content.replace('建議&',""));
    msg.channel.send('發送成功 !');
  }

  if(msg.content.startsWith("autoreply&")) {
    if(data[msg.author.id].autoreply) {
      data[msg.author.id].autoreply = false;
      await saveUserData();
      msg.channel.send('更改成功 ! 自動回覆已關閉');
    } else {
      data[msg.author.id].autoreply = true;
      await saveUserData();
      msg.channel.send('更改成功 ! 自動回覆已開啟');
    }
    
  }

  if(msg.content.startsWith("?setStatus")) {
    if(!me.master.includes(msg.author.id)){
      msg.channel.send('警告 權限錯誤 !');
      return
    }
    let arguments = msg.content.split(" ");
    arguments.shift();
    let activity = msg.content
    .replace(`?setStatus`,'')
    .replace(arguments[0],'')
    .replace(arguments[1],'')
    client.user.setPresence({
      status: arguments[0]
    }).then(()=>{
      client.user.setActivity( activity , {
        type: arguments[1]
      });
    }).then(()=>{
      msg.channel.send('更改成功 !');
    })
    
  }

  if(msg.content.startsWith("?setAvatar")) {
    if(!me.master.includes(msg.author.id)){
      msg.channel.send('警告 權限錯誤 !');
      return
    }
    let url = "";
    switch(msg.content.replace('?setAvatar','').trim()) {
      case "少女":
        url = "https://media.discordapp.net/attachments/875401062515900436/906539942849699880/648_e8gICsbY.png?width=586&height=586";
        break;
      case "鴨鴨":
        url = "https://media.discordapp.net/attachments/875401062515900436/906541181163413524/1155986_I5ygSK28.png?width=586&height=586";
        break;
      case "麻雀":
        url = "https://media.discordapp.net/attachments/875401062515900436/906535722410983474/998431_22C3IF7h.png?width=586&height=586";
        break;
      case "貓貓":
        url = "https://media.discordapp.net/attachments/875401062515900436/906532693372715039/47882_v7cqBNJQ.png?width=586&height=586";
        break;
      default:
        url = "https://media.discordapp.net/attachments/875401062515900436/906539942849699880/648_e8gICsbY.png?width=586&height=586";
    }
    client.user.setAvatar(url);
    msg.channel.send('設置成功 !');
  }
});