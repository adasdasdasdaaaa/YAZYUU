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
const TILE_SIZE = 32;

const NUM_NORMAL_AI = 20;
const NUM_MAGE = 4;
const NUM_LEADER = 3;
const NUM_HERETIC = 2;

const GRAVITY = 1;

class AI {
  constructor(id, x, y, type="normal"){
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = type==="giant"?300:type==="heretic"?150:100;
    this.type = type;
    this.isGiant = type==="giant";
    this.inventory = [];
    this.message = "";
    this.target = null;
    this.slave = false;
    this.killedAI = [];
  }

  applyGravity(world){
    if(this.y < WORLD_HEIGHT-1 && world[this.x][this.y+1]==="air"){
      this.y += GRAVITY;
    }
  }

  act(world, ais, castles){
    if(this.hp<=0) return;

    // 目標追従
    if(this.target){
      this.x += Math.sign(this.target.x - this.x);
      this.y += Math.sign(this.target.y - this.y);
      if(this.x === this.target.x && this.y === this.target.y) this.target = null;
    }

    this.applyGravity(world);

    // 魔術師攻撃
    if(this.type==="mage" && Math.random()<0.3){
      let target = ais.find(a=>a.id!==this.id && a.hp>0);
      if(target){
        target.hp -= 30;
        target.attackEffect = {x:target.x, y:target.y, type:"magic", timer:10};
      }
    }

    // リーダー号令・脅し
    if(this.type==="leader" && Math.random()<0.2){
      ais.forEach(other=>{
        if(other.id!==this.id){
          other.slave = true;
          other.target = {x:this.x, y:this.y};
        }
      });
    }

    // 行動
    if(this.type==="normal" && this.slave){
      let castle = castles.find(c=>c.owner===this.target?.id);
      if(castle){
        if(castle.buildQueue.length>0){
          let b = castle.buildQueue.shift();
          if(world[b.x][b.y]==="air") world[b.x][b.y]=b.type;
        }
      }
    } else {
      if(Math.random()<0.3){
        let nx = this.x + (Math.random()<0.5?-1:1);
        if(nx>=0 && nx<WORLD_WIDTH) this.x = nx;
      }
    }

    // 近接攻撃
    let targets = ais.filter(a=>a.id!==this.id && a.hp>0 && Math.abs(a.x-this.x)<=1 && Math.abs(a.y-this.y)<=1);
    if(targets.length>0 && Math.random()<0.2){
      let target = targets[Math.floor(Math.random()*targets.length)];
      let damage = this.type==="mage"?30:this.type==="heretic"?20:this.isGiant?30:10;
      target.hp -= damage;
      target.attackEffect = {x:target.x, y:target.y, type:"hit", timer:5};

      // 異端児処理
      if(this.type==="heretic" && target.hp<=0 && target.type==="normal"){
        target.type="heretic_junior";
        target.hp=50;
        setTimeout(()=>{
          if(target.type==="heretic_junior") {
            target.type="normal";
            target.hp=100;
          }
        },60000);
      }
    }
  }

  respawn(){
    this.hp = this.isGiant ? 300 : 100;
    this.x = Math.floor(Math.random()*WORLD_WIDTH);
    this.y = getGroundY(this.x);
    this.inventory = [];
    this.slave = false;
    this.target = null;
  }
}

// ワールド生成
let world = Array(WORLD_WIDTH).fill(null).map(()=>Array(WORLD_HEIGHT).fill("air"));
for(let x=0;x<WORLD_WIDTH;x++){
  for(let y=WORLD_HEIGHT-20;y<WORLD_HEIGHT;y++){
    world[x][y] = y < WORLD_HEIGHT-5 ? "stone" : "dirt";
  }
}

// 木をランダム配置
for(let i=0;i<50;i++){
  const tx = Math.floor(Math.random()*WORLD_WIDTH);
  const ty = WORLD_HEIGHT-21;
  for(let h=0;h<5;h++) if(ty-h>=0) world[tx][ty-h]="wood";
  world[tx][ty-5]="leaf";
}

function getGroundY(x){
  for(let y=0;y<WORLD_HEIGHT;y++){
    if(world[x][y]!=="air") return y-1;
  }
  return WORLD_HEIGHT-21;
}

// AI初期化
let ais = [];
for(let i=0;i<NUM_NORMAL_AI;i++){
  let x=Math.floor(Math.random()*WORLD_WIDTH);
  ais.push(new AI(i,x,getGroundY(x),"normal"));
}

// Giant
ais.push(new AI(NUM_NORMAL_AI, Math.floor(WORLD_WIDTH/2), getGroundY(Math.floor(WORLD_WIDTH/2)),"giant"));

// Mage
for(let i=0;i<NUM_MAGE;i++){
  let x=Math.floor(Math.random()*WORLD_WIDTH);
  ais.push(new AI(NUM_NORMAL_AI+1+i, x, getGroundY(x),"mage"));
}

// Leader
for(let i=0;i<NUM_LEADER;i++){
  let x=Math.floor(Math.random()*WORLD_WIDTH);
  ais.push(new AI(NUM_NORMAL_AI+NUM_MAGE+1+i, x, getGroundY(x),"leader"));
}

// Heretic
for(let i=0;i<NUM_HERETIC;i++){
  let x=Math.floor(Math.random()*WORLD_WIDTH);
  ais.push(new AI(NUM_NORMAL_AI+NUM_MAGE+NUM_LEADER+1+i, x, getGroundY(x),"heretic"));
}

// 城管理
let castles = [];
ais.forEach(ai=>{
  if(ai.type==="giant" || ai.type==="leader"){
    let cx = ai.x-3;
    let cy = ai.y-3;
    let buildQueue=[];
    for(let dx=0;dx<7;dx++){
      for(let dy=0;dy<7;dy++){
        buildQueue.push({x:cx+dx,y:cy+dy,type:"stone"});
      }
    }
    castles.push({owner:ai.id, buildQueue});
  }
});

// ゲームループ
function gameLoop(){
  ais.forEach(ai=>{
    ai.act(world, ais, castles);
    if(ai.hp<=0) ai.respawn();
  });
  broadcast();
}

function broadcast(){
  const state = {world, ais: ais.map(a=>({
    id:a.id, x:a.x, y:a.y, hp:a.hp, type:a.type, attackEffect:a.attackEffect||null, slave:a.slave
  })), castles};
  wss.clients.forEach(client=>{
    if(client.readyState===WebSocket.OPEN) client.send(JSON.stringify(state));
  });
}

setInterval(gameLoop,500);

wss.on("connection", ws=>{
  ws.send(JSON.stringify({world, ais, castles}));
});

server.listen(process.env.PORT||3000, ()=>console.log("Server running"));
