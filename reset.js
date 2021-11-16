const Database = require("@replit/database");
const db = new Database();
db.set("data", {}).then(()=>{
  console.log("資料庫已儲存");
});
