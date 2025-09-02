const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const logDiv = document.getElementById("log");

let ws = new WebSocket(`wss://${location.host}`);
let world = [];
let ais = [];

let cameraX = 0;
let cameraY = 0;

const TILE_SIZE = 16;
const NORMAL_AI_SIZE = 24;
const GIANT_SIZE = 32;

// Canvasを画面全体にリサイズ
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

ws.onmessage = e=>{
  const data = JSON.parse(e.data);
  world = data.world;
  ais = data.ais;
  draw();
  updateLog();
}

// キーでスクロール
document.addEventListener("keydown", e=>{
  const speed = 16;
  if(e.key==="ArrowLeft") cameraX = Math.max(0, cameraX - speed);
  if(e.key==="ArrowRight") cameraX = Math.min(world.length*TILE_SIZE - canvas.width, cameraX + speed);
  if(e.key==="ArrowUp") cameraY = Math.max(0, cameraY - speed);
  if(e.key==="ArrowDown") cameraY = Math.min(world[0].length*TILE_SIZE - canvas.height, cameraY + speed);
});

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ワールド描画
  for(let x=0;x<world.length;x++){
    for(let y=0;y<world[0].length;y++){
      let color = "#073"; // 空
      if(world[x][y]==="dirt") color="#964B00";
      if(world[x][y]==="stone") color="#888";
      if(world[x][y]==="grass") color="#0f0";
      if(world[x][y]==="wood") color="#654321";
      if(world[x][y]==="leaf") color="#0a0";

      ctx.fillStyle = color;
      ctx.fillRect(x*TILE_SIZE - cameraX, y*TILE_SIZE - cameraY, TILE_SIZE, TILE_SIZE);
    }
  }

  // AI描画
  ais.forEach(ai=>{
    const size = ai.isGiant ? GIANT_SIZE : NORMAL_AI_SIZE;
    const color = ai.isGiant ? "#f00" : "#00f";
    const emoji = ai.isGiant ? "👨‍🍳" : "👦";

    ctx.fillStyle = color;
    ctx.fillRect(ai.x*TILE_SIZE - cameraX, ai.y*TILE_SIZE - cameraY, size, size);

    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(emoji, ai.x*TILE_SIZE - cameraX + size/2, ai.y*TILE_SIZE - cameraY + size/2);
  });
}

function updateLog(){
  logDiv.innerHTML = "";
  ais.forEach(ai=>{
    if(ai.message!=""){
      let div = document.createElement("div");
      div.textContent = ai.message;
      logDiv.appendChild(div);
    }
  });
  logDiv.scrollTop = logDiv.scrollHeight;
}
