// server.js — Authoritative Snake Server (copy-paste ready)
// Run: node server.js
// Requires: npm i ws

const WebSocket = require('ws');

// ====== Tunables ======
const PORT = 8080;
const TICK_HZ = 60;        // physics tick
const SNAPSHOT_HZ = 20;    // broadcast rate (recommend 20–30 for local tests)
const MAP_WIDTH = 4000, MAP_HEIGHT = 4000;

// ====== Game Config (mirrors client where relevant) ======
const CONFIG = {
  turn:{playerMax:2.8,aiMax:3.5,accel:18,gain:2.8,speedAccel:280},
  ai:{
    biggerStart:[200,360],
    aggressionBoostChance:0.015,
    bodyAvoidRadius:90, bodyDangerRadius:60, safeChaseDistance:160,
    canSeeDots:true, avoidWalls:true, tryCutOffHeads:true, tryCircleTargets:true,
    lookahead:240, wallMargin:160, pathDangerRadius:26, dotSeekingRange:800, dotSeekingWeight:1.2,
    personalityTemplates: {
      fearful:   {aggression:[0.05,0.25], dotSeekingWeight:[1.6,2.4], bodyAvoidRadius:[120,180], wallMargin:[180,240]},
      balanced:  {aggression:[0.40,0.60], dotSeekingWeight:[1.0,1.4], bodyAvoidRadius:[95,130],  wallMargin:[140,190]},
      aggressive:{aggression:[0.70,0.95], dotSeekingWeight:[0.7,1.1], bodyAvoidRadius:[75,100],  wallMargin:[110,160]},
    },
    traitJitterOnRespawn:false
  },
  continuity:{respawnEnabled:true,respawnDelay:1.2,dropRemainsOnDeath:true,remainsPelletEveryPx:26},
  trailDots:{enabled:true,stepPx:50,size:4,value:5,ownerPickupDelay:0.9,},
  apples:{lifetime:20},
  magnet:{enabled:true,radius:95,maxSpeed:240,falloff:1.5},
  boost:{depletionRate:20,speedFactor:2,minLengthFloor:80,overheatSeconds:1.9},
  width:{base:12,scale:0.8,max:100},
  pathSmoothing:{enabled:true,strength:0.15,maxAngle:Math.PI/6,minSegmentLength:8},
  spawn:{wallMargin:200,safeRadiusFromSnakes:260,maxAttempts:60}
};

// ====== Helpers ======
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const distance = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDiff = (a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const moveTowards=(cur,tgt,md)=>cur<tgt?Math.min(cur+md,tgt):Math.max(cur-md,tgt);
const rand = (min,max)=>min+Math.random()*(max-min);
const nowMs = ()=>Date.now();

let NEXT_ID = 1;
const colors = ["lime","cyan","magenta","yellow","orange","purple","pink","teal","brown","deepskyblue","gold","white","violet"];

function pick([a,b]){ return a + Math.random()*(b-a); }

function makePersonality(type){
  const tpl = CONFIG.ai.personalityTemplates[type];
  return {
    aggression: pick(tpl.aggression),
    dotSeekingWeight: pick(tpl.dotSeekingWeight),
    bodyAvoidRadius: Math.max(70, pick(tpl.bodyAvoidRadius)),
    wallMargin: pick(tpl.wallMargin)
  };
}

// ====== Entities ======
class Snake {
  constructor(x,y,color,isPlayer=false, name="Player"){
    this.id = NEXT_ID++;
    this.x=x; this.y=y; this.path=[{x,y}];
    this.angle = Math.random()*Math.PI*2; this.angVel=0;
    this.maxTurnRate=isPlayer?CONFIG.turn.playerMax:CONFIG.turn.aiMax;
    this.turnAccel=CONFIG.turn.accel; this.turnGain=CONFIG.turn.gain;
    this.baseSpeed=150; this.curSpeed=this.baseSpeed;
    this.targetLength=200; this.color=color; this.isPlayer=isPlayer; this.alive=true;
    this.name = name;

    if(!isPlayer){
      const types = Object.keys(CONFIG.ai.personalityTemplates);
      const t = types[Math.floor(Math.random()*types.length)];
      this.personalityType=t; this.personality=makePersonality(t);
    }
    this.boosting=false; this.boostCooldown=0; this.minLength=CONFIG.boost.minLengthFloor;
    this._steer=0; this._steerW=0;

    // For players: server uses last input (mouse + boost)
    this.input = { mx:x, my:y, boosting:false };
  }
  getThickness(){ const t=CONFIG.width.base+Math.sqrt(this.targetLength)*CONFIG.width.scale; return Math.min(t,CONFIG.width.base+CONFIG.width.max); }
  getHeadRadius(){ return Math.max(7,this.getThickness()*0.5); }
}

// ====== World ======
const world = {
  snakes: [],
  apples: [],
  clients: new Set(),      // Set<WebSocket>
  playerByConn: new Map(), // Map<WebSocket, Snake>
};

function randomSpawnPoint(){
  const m = CONFIG.spawn.wallMargin;
  return { x: rand(m, MAP_WIDTH-m), y: rand(m, MAP_HEIGHT-m) };
}
function isPointSafe(x,y){
  const R = CONFIG.spawn.safeRadiusFromSnakes, R2=R*R;
  for(const s of world.snakes){
    if(!s.alive)continue;
    const dx=x-s.x, dy=y-s.y; if(dx*dx+dy*dy<R2) return false;
  }
  return true;
}
function getSafeSpawn(){
  for(let i=0;i<CONFIG.spawn.maxAttempts;i++){
    const p=randomSpawnPoint(); if(isPointSafe(p.x,p.y)) return p;
  }
  return randomSpawnPoint();
}

// ====== AI & Physics ======
function steerToward(snake,desired,weight=1){
  const diff=angleDiff(desired,snake.angle);
  snake._steer += diff*weight; snake._steerW += weight;
}
function applySteering(snake,dt){
  const desiredAvg = snake._steerW>0? snake._steer/snake._steerW : 0;
  const targetAngVel = clamp(desiredAvg*snake.turnGain,-snake.maxTurnRate,snake.maxTurnRate);
  snake.angVel = moveTowards(snake.angVel,targetAngVel,CONFIG.turn.accel*dt);
  snake.angle += snake.angVel*dt;
  snake._steer = 0; snake._steerW = 0;
}

function aiUpdate(s,dt){
  // Minimal dot-seeking AI (keeps code short)
  let nearest=null, nd=1e9;
  for(const a of world.apples){
    const d = distance(s,a);
    if(d<nd){ nd=d; nearest=a; }
  }
  if(nearest) steerToward(s, Math.atan2(nearest.y-s.y, nearest.x-s.x), 1.0);
  else steerToward(s, s.angle+(Math.random()-0.5)*0.6, 0.3);

  // light boost logic
  if(!s.boosting && s.boostCooldown<=0 && s.targetLength>140 && Math.random()<0.02){
    s.boosting=true; s._boostTimer=0.5;
  }
  if(s.boosting){ s._boostTimer-=dt; if(s._boostTimer<=0){ s.boosting=false; s.boostCooldown=CONFIG.boost.overheatSeconds; } }
}

function applyInputs(){
  for(const s of world.snakes){
    if(!s.isPlayer || !s.alive) continue;
    steerToward(s, Math.atan2(s.input.my-s.y, s.input.mx-s.x), 1.0);
    s.boosting = !!s.input.boosting && s.boostCooldown<=0;
  }
}

function tick(dt){
  applyInputs();

  for(const s of world.snakes){
    s._steer=0; s._steerW=0;
    if(!s.isPlayer) aiUpdate(s,dt);
    applySteering(s,dt);

    const targetSpeed = s.baseSpeed * (s.boosting? CONFIG.boost.speedFactor : 1);
    s.curSpeed = moveTowards(s.curSpeed, targetSpeed, CONFIG.turn.speedAccel*dt);

    if(s.boosting){
      s.targetLength -= CONFIG.boost.depletionRate*dt;
      if(s.targetLength<=s.minLength){ s.targetLength=s.minLength; s.boosting=false; s.boostCooldown=CONFIG.boost.overheatSeconds; }
    }

    const dx=Math.cos(s.angle)*s.curSpeed*dt, dy=Math.sin(s.angle)*s.curSpeed*dt;
    s.x=clamp(s.x+dx,0,MAP_WIDTH); s.y=clamp(s.y+dy,0,MAP_HEIGHT);
    s.path.push({x:s.x,y:s.y});
    // trim path to targetLength distance
    let total=0;
    for(let i=s.path.length-1;i>0;i--){
      const seg=distance(s.path[i],s.path[i-1]); total+=seg;
      if(total>s.targetLength){
        const excess=total-s.targetLength, ratio=(seg-excess)/seg;
        s.path[i-1] = {
          x: s.path[i].x + (s.path[i-1].x - s.path[i].x)*ratio,
          y: s.path[i].y + (s.path[i-1].y - s.path[i].y)*ratio
        };
        s.path = s.path.slice(i-1);
        break;
      }
    }
  }

  // Collect apples
  for(const s of world.snakes){
    if(!s.alive) continue;
    const headR = Math.max(7, (CONFIG.width.base+Math.sqrt(s.targetLength)*CONFIG.width.scale)*0.5);
    for(let i=world.apples.length-1;i>=0;i--){
      const a=world.apples[i];
      if(distance(s,a) < headR + 6){
        s.targetLength += 20; world.apples.splice(i,1);
        world.apples.push({x:rand(0,MAP_WIDTH), y:rand(0,MAP_HEIGHT)});
      }
    }
  }

  // Walls kill
  for(const s of world.snakes){
    if(!s.alive) continue;
    if(s.x<=0||s.x>=MAP_WIDTH||s.y<=0||s.y>=MAP_HEIGHT) s.alive=false;
  }

  // Respawn AI quickly; players wait for UI decision
  for(const s of world.snakes){
    if(!s.alive && !s.isPlayer){
      const p = getSafeSpawn();
      s.x=p.x; s.y=p.y; s.path=[{x:p.x,y:p.y}]; s.targetLength=200; s.alive=true;
    }
  }
}

// ====== Snapshot / Broadcast ======
function snapshot(){
  const compressPath = (p)=> {
    if (!p || p.length===0) return [];
    const MAX_POINTS = 20; // clamp payload size
    const step = Math.max(1, Math.floor(p.length / MAX_POINTS));
    const out=[]; for(let i=0;i<p.length;i+=step) out.push(p[i]);
    if (out[out.length-1] !== p[p.length-1]) out.push(p[p.length-1]);
    return out;
  };
  return {
    t: nowMs(),
    snakes: world.snakes.map(s=>({
      id:s.id, x:s.x, y:s.y, angle:s.angle, color:s.color, name:s.name,
      isPlayer:s.isPlayer, alive:s.alive, targetLength: s.targetLength,
      path: compressPath(s.path)
    })),
    apples: world.apples
  };
}

function broadcast(obj){
  const msg = JSON.stringify(obj);
  for(const ws of world.clients){
    if(ws.readyState===1) ws.send(msg);
  }
}

// ====== Bootstrap World ======
function initWorld(){
  world.snakes.length = 0;
  world.apples.length = 0;

  for(let i=0;i<60;i++){
    world.apples.push({x:rand(0,MAP_WIDTH), y:rand(0,MAP_HEIGHT)});
  }
  // Populate some AI
  for(let i=0;i<12;i++){
    const p = getSafeSpawn();
    const s = new Snake(p.x,p.y,colors[i%colors.length], false, `AI-${i+1}`);
    s.targetLength = CONFIG.ai.biggerStart[0] + Math.random()*(CONFIG.ai.biggerStart[1]-CONFIG.ai.biggerStart[0]);
    world.snakes.push(s);
  }
}
initWorld();

// ====== WebSocket Server ======
const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`🟢 Server listening on ws://localhost:${PORT}`);
  console.log(`   Tick: ${TICK_HZ} Hz | Snapshots: ${SNAPSHOT_HZ} Hz`);
});

wss.on('connection', (ws, req) => {
  world.clients.add(ws);
  const remote = req?.socket?.remoteAddress || 'unknown';
  console.log(`➡️  Client connected from ${remote}. Active clients: ${world.clients.size}`);

  let playerSnake = null;

  ws.on('message', (data) => {
    try{
      const msg = JSON.parse(data);
      if(msg.type === 'join'){
        const p = getSafeSpawn();
        const color = msg.color || 'lime';
        const name = (msg.name || 'Player').toString().slice(0,24);
        const s = new Snake(p.x,p.y,color,true,name);
        world.snakes.push(s);
        playerSnake = s;
        ws.send(JSON.stringify({ type:'joined', id: s.id }));

        console.log(`👤 JOIN: id=${s.id} name="${s.name}" color=${s.color} spawn=(${s.x.toFixed(1)}, ${s.y.toFixed(1)})`);
      }
      else if(msg.type === 'input' && playerSnake){
        playerSnake.input.mx = msg.mx;
        playerSnake.input.my = msg.my;
        playerSnake.input.boosting = !!msg.boosting;
      }
      else if(msg.type === 'leave'){
        if(playerSnake){ playerSnake.alive=false; }
        console.log(`👋 LEAVE (msg): id=${playerSnake?.id ?? 'n/a'}`);
      }
      // Optional ping/pong for RTT
      else if(msg.type === 'ping'){
        ws.send(JSON.stringify({ type:'pong', t: msg.t || nowMs() }));
      }
    }catch(e){
      // Ignore parse errors
    }
  });

  ws.on('close', ()=>{
    world.clients.delete(ws);
    if(playerSnake){ playerSnake.alive=false; }
    console.log(`⬅️  Client disconnected. Active clients: ${world.clients.size} (player id=${playerSnake?.id ?? 'n/a'})`);
  });

  // immediate snapshot for newcomer
  ws.send(JSON.stringify({ type:'snapshot', data: snapshot() }));
});

// ====== Loops ======
let last = nowMs();
setInterval(()=> {
  const t = nowMs(); const dt = Math.min(0.05, (t-last)/1000); last = t;
  tick(dt);
}, 1000/TICK_HZ);

setInterval(()=> {
  broadcast({ type:'snapshot', data: snapshot() });
}, 1000/SNAPSHOT_HZ);

// ====== Telemetry: stream player positions every 3s ======
setInterval(()=> {
  const players = world.snakes.filter(s=>s.isPlayer && s.alive);
  if(players.length===0){
    console.log('📡 Players: (none)');
    return;
  }
  console.log('📡 Players:');
  for(const p of players){
    console.log(`   id=${p.id} name="${p.name}" pos=(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) len=${Math.floor(p.targetLength)}`);
  }
}, 3000);



