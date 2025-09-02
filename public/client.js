const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const logDiv = document.getElementById("log");

let ws = new WebSocket(`wss://${location.host}`); // Render HTTPSに対応
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

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ワールド描画
  for(let x=0;x<world.length;x++){
    for(let y=0;y<world[0].length;y++){
      if(world[x][y]!==""){
        ctx.fillStyle="green";
        ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // AI描画
  ais.forEach(ai=>{
    ctx.fillStyle = ai.isGiant ? "red":"blue";
    ctx.fillRect(ai.x*TILE_SIZE, ai.y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle="white";
    ctx.font="12px sans-serif";
    ctx.fillText(ai.isGiant?"👨‍🍳":"👦", ai.x*TILE_SIZE, ai.y*TILE_SIZE+12);
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
