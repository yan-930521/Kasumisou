const Database = require("@replit/database");
const User = require('./User.js');
const db = new Database();
db.get("data").then((d)=>{
  d["823885929830940682"] = new User();
  db.set("data", d);
})
