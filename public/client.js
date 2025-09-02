const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const logDiv = document.getElementById("log");

let ws = new WebSocket(`wss://${location.host}`);
let world = [];
let ais = [];

ws.onmessage = e=>{
  const data = JSON.parse(e.data);
  world = data.world;
  ais = data.ais;
  draw();
  updateLog();
}

const TILE_SIZE = 16;
const NORMAL_AI_SIZE = 24;
const GIANT_SIZE = 32;

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ワールド全体サイズ
  const worldWidthPx = world.length * TILE_SIZE;
  const worldHeightPx = world[0].length * TILE_SIZE;

  // Canvas 中央オフセット
  const offsetX = (canvas.width - worldWidthPx)/2;
  const offsetY = (canvas.height - worldHeightPx)/2;

  // ワールド描画
  for(let x=0;x<world.length;x++){
    for(let y=0;y<world[0].length;y++){
      ctx.fillStyle = world[x][y]!="" ? "#0f0" : "#073";
      ctx.fillRect(offsetX + x*TILE_SIZE, offsetY + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // AI描画
  ais.forEach(ai=>{
    const size = ai.isGiant ? GIANT_SIZE : NORMAL_AI_SIZE;
    const color = ai.isGiant ? "#f00" : "#00f";
    const emoji = ai.isGiant ? "👨‍🍳" : "👦";

    ctx.fillStyle = color;
    ctx.fillRect(offsetX + ai.x*TILE_SIZE, offsetY + ai.y*TILE_SIZE, size, size);

    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(emoji, offsetX + ai.x*TILE_SIZE + size/2, offsetY + ai.y*TILE_SIZE + size/2);
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
