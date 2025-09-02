const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let ws = new WebSocket(`wss://${location.host}`);
let world = [];
let ais = [];
let castles = [];

let cameraX = 0;
let cameraY = 0;
const TILE_SIZE = 32;
const NORMAL_AI_SIZE = 48;
const GIANT_SIZE = 64;

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

document.addEventListener("keydown", e=>{
  const speed = 32;
  if(e.key==="ArrowLeft") cameraX = Math.max(0, cameraX - speed);
  if(e.key==="ArrowRight") cameraX = Math.min(world.length*TILE_SIZE - canvas.width, cameraX + speed);
  if(e.key==="ArrowUp") cameraY = Math.max(0, cameraY - speed);
  if(e.key==="ArrowDown") cameraY = Math.min(world[0].length*TILE_SIZE - canvas.height, cameraY + speed);
});

ws.onmessage = e=>{
  const data = JSON.parse(e.data);
  world = data.world;
  ais = data.ais;
  castles = data.castles;
  draw();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ワールド描画
  for(let x=0;x<world.length;x++){
    for(let y=0;y<world[0].length;y++){
      let color="#073";
      if(world[x][y]==="dirt") color="#964B00";
      if(world[x][y]==="stone") color="#888";
      if(world[x][y]==="wood") color="#654321";
      if(world[x][y]==="leaf") color="#0a0";
      ctx.fillStyle=color;
      ctx.fillRect(x*TILE_SIZE - cameraX, y*TILE_SIZE - cameraY, TILE_SIZE, TILE_SIZE);
    }
  }

  // 城描画
  castles.forEach(c=>{
    c.buildQueue.forEach(b=>{
      ctx.fillStyle="gray";
      ctx.fillRect(b.x*TILE_SIZE - cameraX, b.y*TILE_SIZE - cameraY, TILE_SIZE, TILE_SIZE);
    });
  });

  // AI描画
  ais.forEach(ai=>{
    const size = ai.type==="giant"?GIANT_SIZE:NORMAL_AI_SIZE;
    let emoji="👦";
    let color="white";
    switch(ai.type){
      case "giant": emoji="👨‍🍳"; color="red"; break;
      case "mage": emoji="🧙"; color="blue"; break;
      case "leader": emoji="👑"; color="gold"; break;
      case "heretic": emoji="😈"; color="purple"; break;
      case "heretic_junior": emoji="👿"; color="plum"; break;
      case "normal": emoji="👦"; if(ai.slave) color="yellow"; break;
    }
    ctx.font=`${size}px sans-serif`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillStyle=color;
    ctx.fillText(emoji, ai.x*TILE_SIZE - cameraX + size/2, ai.y*TILE_SIZE - cameraY + size/2);

    // 攻撃エフェクト
    if(ai.attackEffect){
      ctx.fillStyle = ai.attackEffect.type==="hit"?"red":"blue";
      ctx.beginPath();
      ctx.arc(ai.attackEffect.x*TILE_SIZE - cameraX + 16, ai.attackEffect.y*TILE_SIZE - cameraY +16, 16, 0, Math.PI*2);
      ctx.fill();
      ai.attackEffect.timer--;
      if(ai.attackEffect.timer<=0) ai.attackEffect=null;
    }
  });
}
