const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();
app.use(express.static("public"));
app.get('/healthz', (req,res)=>res.send("OK"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const WORLD_WIDTH = 200;
const WORLD_HEIGHT = 100;
const NUM_NORMAL_AI = 20;
const AI_ACTIONS = ["move","dig","build","chat","rest","attack"];
const GRAVITY = 1;

class AI {
  constructor(id, x, y, isGiant=false){
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = isGiant ? 300 : 100;
    this.isGiant = isGiant;
    this.inventory = [];
    this.message = "";
    this.target = null;
    this.slave = false;
  }

  applyGravity(world){
    if(this.y < WORLD_HEIGHT-1 && world[this.x][this.y+1]==="air"){
      this.y += GRAVITY;
    }
  }

  act(world, ais){
    if(this.hp<=0) return;

    // 目標追従
    if(this.target){
      this.x += Math.sign(this.target.x - this.x);
      this.y += Math.sign(this.target.y - this.y);
      if(this.x === this.target.x && this.y === this.target.y) this.target = null;
    }

    this.applyGravity(world);

    let action = AI_ACTIONS[Math.floor(Math.random()*AI_ACTIONS.length)];

    if(action==="move" && !this.target){
      let nx = this.x + (Math.random()<0.5?-1:1);
      let ny = this.y;
      if(nx>=0 && nx<WORLD_WIDTH && world[nx][ny+1]!=="air") this.x = nx;
      this.message = this.isGiant ? "我こそがこの地の王だ" : "";
    }

    if(action==="dig" && world[this.x][this.y]!=="air"){
      this.inventory.push(world[this.x][this.y]);
      world[this.x][this.y] = "air";
      this.message = `AI${this.id}はブロックを採取`;
    }

    if(action==="build" && this.inventory.length>0){
      world[this.x][this.y] = this.inventory.pop();
      this.message = `AI${this.id}はブロックを置いた`;
    }

    if(action==="attack"){
      let targets = ais.filter(a=>a.id!==this.id && a.hp>0 && Math.abs(a.x-this.x)<=1 && Math.abs(a.y-this.y)<=1);
      if(targets.length>0){
        this.target = targets[Math.floor(Math.random()*targets.length)];
        this.target.hp -= this.isGiant ? 30 : 10;
        this.message = this.isGiant ? `GiantがAI${this.target.id}を攻撃` : `AI${this.id}がAI${this.target.id}を攻撃`;
      }
    }

    if(action==="chat"){
      if(this.isGiant){
        this.message = "服従せよ！";
        // 脅しで奴隷化
        ais.forEach(other=>{
          if(!other.isGiant && Math.abs(other.x-this.x)<5){
            other.slave = true;
            other.target = {x:this.x, y:this.y};
            other.message = "服従中…";
          }
        });
      } else {
        this.message = "集まれ！";
        ais.forEach(other=>{
          if(other.id!==this.id && Math.random()<0.5){ 
            other.target = {x:this.x, y:this.y};
          }
        });
      }
    }

    if(action==="rest") this.message="";
  }

  respawn(){
    this.hp = this.isGiant ? 300 : 100;
    this.x = Math.floor(Math.random()*WORLD_WIDTH);
    this.y = getGroundY(this.x);
    this.inventory = [];
    this.message = this.isGiant ? "我こそがこの地の王だ" : "";
    this.slave = false;
    this.target = null;
  }
}

// ワールド生成
let world = Array(WORLD_WIDTH).fill(null).map(()=>Array(WORLD_HEIGHT).fill("air"));

// 地面・地下生成
for(let x=0;x<WORLD_WIDTH;x++){
  for(let y=WORLD_HEIGHT-20;y<WORLD_HEIGHT;y++){
    world[x][y] = y < WORLD_HEIGHT-5 ? "stone" : "dirt";
  }
}

// 木をランダム配置
for(let i=0;i<50;i++){
  const tx = Math.floor(Math.random()*WORLD_WIDTH);
  const ty = WORLD_HEIGHT-21;
  for(let h=0;h<5;h++){
    if(ty-h>=0) world[tx][ty-h] = "wood";
  }
  world[tx][ty-5] = "leaf";
}

// AI初期化
function getGroundY(x){
  for(let y=0;y<WORLD_HEIGHT;y++){
    if(world[x][y]!=="air") return y-1;
  }
  return WORLD_HEIGHT-21;
}

let ais = [];
for(let i=0;i<NUM_NORMAL_AI;i++){
  let x = Math.floor(Math.random()*WORLD_WIDTH);
  ais.push(new AI(i, x, getGroundY(x)));
}
ais.push(new AI(NUM_NORMAL_AI, Math.floor(WORLD_WIDTH/2), getGroundY(Math.floor(WORLD_WIDTH/2)), true));

// ゲームループ
function gameLoop(){
  ais.forEach(ai=>{
    ai.act(world, ais);
    if(ai.hp<=0) ai.respawn();
  });
  broadcast();
}

function broadcast(){
  const state = {world, ais: ais.map(a=>({
    id:a.id, x:a.x, y:a.y, hp:a.hp, message:a.message, isGiant:a.isGiant
  }))};
  wss.clients.forEach(client=>{
    if(client.readyState===WebSocket.OPEN) client.send(JSON.stringify(state));
  });
}

setInterval(gameLoop, 500);

wss.on("connection", ws=>{
  ws.send(JSON.stringify({world, ais}));
});

server.listen(process.env.PORT||3000, ()=>console.log("Server running"));
