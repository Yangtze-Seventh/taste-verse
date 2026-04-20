// AI Sommelier Engine — all rendering, chat, and interaction logic.

export function startSommelier(opts={}) {
const _EMBEDDED=!!opts.embedded; // true when inside main app (no own topbar)
const _CONTAINER=opts.container||null; // parent element for sizing

// ============ USER PROFILE ============
// Dynamic: read from main app's user badge, fallback to defaults.
// Main app renders either <img> (uploaded avatar) or text (initial letter)
// inside #user-avatar — detect both so the center orb shows the real photo.
const _userEl=document.getElementById('user-avatar');
const _emailEl=document.getElementById('user-email-display');
const _avatarImgEl=_userEl?_userEl.querySelector('img'):null;
const _userInitial=_userEl?(_userEl.textContent.trim()||'U'):'U';
const _userName=_emailEl?(_emailEl.textContent.trim()||'User'):'User';
const USER={name:_userName,initial:_userInitial,avatarUrl:_avatarImgEl?_avatarImgEl.src:''};

// ============ DATA: bridge from main app or use built-in demo ============
// Helper: parse hex color string "#RRGGBB" into {r,g,b}
function _hexRgb(h){h=h.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return{r:parseInt(h.substring(0,2),16),g:parseInt(h.substring(2,4),16),b:parseInt(h.substring(4,6),16)};}

let CT,RC,G,CK;

if(_EMBEDDED && window.__tvNotes && window.__tvCategories){
  // ── EMBEDDED MODE: read live data from main app ──
  const tvNotes=window.__tvNotes;
  const tvCats=window.__tvCategories;
  // Build CT (category table) from main app's CATEGORIES
  CT={};
  Object.keys(tvCats).forEach(k=>{
    const c=tvCats[k];
    const rgb=_hexRgb(c.color||'#888888');
    CT[k]={l:c.name, r:rgb.r, g:rgb.g, b:rgb.b, hex:c.color||'#888888', i:c.icon||'📝'};
  });
  // Build RC (records) from main app's notes — convert field names
  RC=tvNotes.map((n,i)=>({
    id:n.id||('tv_'+i),
    c:n.cat,
    n:n.name,
    d:n.time,
    s:Math.round((n.score||0)*10),  // main app scores 0-10, sommelier expects 0-100
    f:n.tags||[],
    o:'',    // main app doesn't track origin separately
    m:'',    // main app doesn't track method separately
    nt:n.note||''
  }));
}else{
  // ── STANDALONE MODE: built-in demo data ──
  CT={
    coffee:{l:'咖啡',r:212,g:165,b:116,hex:'#d4a574',i:'☕'},
    tea:{l:'茶',r:126,g:200,b:130,hex:'#7ec882',i:'🍵'},
    wine:{l:'葡萄酒',r:199,g:91,b:122,hex:'#c75b7a',i:'🍷'},
    whisky:{l:'威士忌',r:232,g:168,b:56,hex:'#e8a838',i:'🥃'},
    sake:{l:'清酒',r:142,g:184,b:229,hex:'#8eb8e5',i:'🍶'}
  };
  RC=[
    {id:1,c:'coffee',n:'埃塞俄比亚 耶加雪菲',d:'2025-04-12',s:92,f:['蓝莓','柑橘','巧克力'],o:'埃塞俄比亚',m:'V60',nt:'蓝莓果酱甜感。'},
    {id:2,c:'coffee',n:'哥伦比亚 粉波旁',d:'2025-04-08',s:88,f:['焦糖','坚果','红苹果'],o:'哥伦比亚',m:'Kalita',nt:'焦糖甜感。'},
    {id:3,c:'coffee',n:'巴拿马 瑰夏',d:'2025-03-28',s:95,f:['茉莉','佛手柑','蜂蜜'],o:'巴拿马',m:'V60',nt:'茉莉花香。'},
    {id:4,c:'coffee',n:'肯尼亚 AA',d:'2025-03-15',s:90,f:['黑加仑','番茄'],o:'肯尼亚',m:'Chemex',nt:'黑加仑酸感。'},
    {id:5,c:'coffee',n:'危地马拉 花神',d:'2025-03-05',s:87,f:['烟熏','可可'],o:'危地马拉',m:'法压壶',nt:'烟熏可可。'},
    {id:6,c:'tea',n:'福鼎白毫银针',d:'2025-04-10',s:91,f:['毫香','蜜韵'],o:'福建',m:'盖碗',nt:'毫香蜜韵。'},
    {id:7,c:'tea',n:'武夷正岩肉桂',d:'2025-04-02',s:93,f:['桂皮','岩韵'],o:'武夷山',m:'盖碗',nt:'岩韵显著。'},
    {id:8,c:'tea',n:'安溪铁观音',d:'2025-03-20',s:86,f:['兰花','奶香'],o:'安溪',m:'盖碗',nt:'兰花香。'},
    {id:9,c:'wine',n:'Opus One 2019',d:'2025-04-06',s:94,f:['黑醋栗','雪松'],o:'Napa Valley',m:'醒酒2h',nt:'单宁丝滑。'},
    {id:10,c:'wine',n:'Penfolds Grange 2018',d:'2025-03-25',s:96,f:['黑莓','香料'],o:'S. Australia',m:'醒酒3h',nt:'层次丰富。'},
    {id:11,c:'wine',n:'Château Margaux 2015',d:'2025-03-10',s:97,f:['紫罗兰','丝绒'],o:'Bordeaux',m:'醒酒2.5h',nt:'传奇年份。'},
    {id:12,c:'whisky',n:'山崎 18年',d:'2025-04-04',s:93,f:['蜜瓜','水楢木'],o:'日本',m:'纯饮',nt:'东方香气。'},
    {id:13,c:'whisky',n:'麦卡伦 25年',d:'2025-03-18',s:95,f:['干果','太妃糖'],o:'苏格兰',m:'纯饮',nt:'雪莉桶。'},
    {id:14,c:'sake',n:'獺祭 二割三分',d:'2025-04-09',s:91,f:['白桃','花蜜'],o:'山口',m:'冷饮',nt:'白桃果香。'},
    {id:15,c:'sake',n:'十四代',d:'2025-03-30',s:94,f:['哈密瓜','荔枝'],o:'山形',m:'冷饮',nt:'传说级。'},
  ];
}
// Group records by category
G={};RC.forEach(r=>{if(!G[r.c])G[r.c]=[];G[r.c].push(r)});
Object.values(G).forEach(g=>g.sort((a,b)=>new Date(a.d)-new Date(b.d)));
// Only keep categories that have records (avoid empty strips on the Möbius ring)
// CK_ALL: every category with records (for legend, chat, data). CK: top 8 by count (for Möbius ring).
const CK_ALL=Object.keys(G).sort((a,b)=>G[b].length-G[a].length); // descending by count
CK=CK_ALL.slice(0,8); // Möbius ring shows at most 8 categories

const cv=document.getElementById('sC'),ctx=cv.getContext('2d');
const tipEl=document.getElementById('tip');
let W,H,dpr,fr=0,_lastRenderT=0,_smoothDt=16.667,mX=-999,mY=-999,hov=null,hovStrip=-1;
// Camera LOCKED front-facing — no drag, no auto-drift. Keep variables for draw code compatibility.
let drag=false,dsx=0,dsy=0,camRY=0.00,camRX=0.14;
let particles=[];

// Layout: must match --ulA in CSS. Möbius is drawn at the centroid of the UL triangle.
const UL_A=0.40; // Left divider top intercept matches --dL
let DX=0,DY=0;                                       // recomputed on resize
let _ringScale=1;  // set to real SCALE value once RING config is computed

function _bounds(){
  if(_CONTAINER){const r=_CONTAINER.getBoundingClientRect();return{w:r.width,h:r.height};}
  return{w:innerWidth,h:innerHeight};
}
function resize(){
  dpr=devicePixelRatio||1;
  const b=_bounds();
  W=b.w;H=b.h;
  cv.width=W*dpr;cv.height=H*dpr;
  cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sH=_EMBEDDED?H:H-48; // embedded: no own topbar; standalone: 48px topbar
  // Center the Möbius ring within the UL triangle, adjusting for ring scale
  DX=UL_A*W*(0.28+0.05*_ringScale);
  DY=sH*(0.30+0.04*_ringScale);
}
addEventListener('resize',resize);resize();

// Legend sidebar — shows ALL categories, collapses to thin strip, expands on hover
const lgd=document.getElementById('lgd');
lgd.innerHTML=''; // clear
// Build items for every category (CK_ALL), marking which are on the ring
CK_ALL.forEach((k,i)=>{
  const c=CT[k];if(!c)return;
  const onRing=CK.includes(k);
  const e=document.createElement('i');
  e.innerHTML=`<b style="background:${c.hex}"></b>${c.i} ${c.l} <span style="opacity:.5">·${G[k].length}</span>`
    + (!onRing ? ' <span style="opacity:.35;font-size:8px">(隐)</span>' : '');
  lgd.appendChild(e);
});
// Collapsed indicator
const lgdTab=document.createElement('div');
lgdTab.className='lgd-tab';
lgdTab.innerHTML=`◁ ${CK_ALL.length} 品类`;
lgd.parentElement.insertBefore(lgdTab,lgd.nextSibling);

// ============ 3D MATH ============
function rotY(p,a){const c=Math.cos(a),s=Math.sin(a);return[p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c]}
function rotX(p,a){const c=Math.cos(a),s=Math.sin(a);return[p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c]}
// Möbius drawn at incenter of UL triangle (DX,DY updated in resize).
function proj(p){const f=620,z=p[2]+440,s=f/Math.max(f*.18,f+z);return[DX+p[0]*s,DY+p[1]*s,s,z]}
function norm(v){const l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1;return[v[0]/l,v[1]/l,v[2]/l]}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}

/*
  ═══════════════════════════════════════════
   V23: FIGURE-8 MÖBIUS — THREADS THROUGH AVATAR FROM BOTH SIDES
   - 把环带看成一条无穷符号 ∞ 的线: 左叶 → 穿过头像 → 右叶 → 再次穿过头像 → 闭合
   - 头像位于 ∞ 的中心交叉点, 环带在两个方向上都穿过它
   - 采用 Gerono 曲线 (x=R·cosθ, y=R·sinθ·cosθ), 在 θ=π/2 和 θ=3π/2 两次过原点
   - 轻微 Z 偏移让两次交叉位于不同高度 (真正 3D 莫比乌斯式穿越)
   - 5 条品类 = 莫比乌斯带宽度方向的 5 个切片
   - 半扭转沿整圈分布: w(θ) = cos(θ/2)·B + sin(θ/2)·N(θ)
   - 不做「绕中心的大旋转」, 只有扭相漂移 + 星尘沿 θ 流动
  ═══════════════════════════════════════════
*/
// --- Figure-8 Möbius config (loop passes THROUGH origin twice per cycle) ---
// The entire Möbius ring scales with category count:
//   Few cats (≤5): compact ring.  Many cats (>10): bigger ring, wider strip.
const ACTUAL_COUNT=CK.length;
// Scale factor: 1.0 for 5 cats, grows up to 1.5 for 15+ cats, shrinks to 0.85 for 3 cats
const SCALE=Math.max(0.85, Math.min(1.5, 0.7 + ACTUAL_COUNT * 0.06));
const TOTAL_HW=Math.max(60, Math.min(140, 10*ACTUAL_COUNT)) * SCALE;
const DENSITY=Math.min(1, Math.max(0.45, 5/ACTUAL_COUNT));
const RING={
  R:220 * SCALE,                      // ring radius scales with category count
  halfW:TOTAL_HW,
  tilt:0.24,
  zSkew:44 * SCALE,
  flowSpd:0.0028,
  twistDrift:0.00042,
  thick:4.0,
  planetDriftSpd:0.003,               // ~35s per full revolution — clearly visible movement
  planetThetaAmp:0.03,                // minimal wobble — keeps motion smooth at crossings
  planetUAmp:0.015,                   // near-zero transverse bob — avoids Möbius twist jumps
  planetSizeScale:Math.max(0.40, DENSITY),
};
const RIBBON_COUNT=ACTUAL_COUNT;
const RIBBON_HW=RING.halfW/Math.max(1,RIBBON_COUNT);

// Now that SCALE is defined, update the bridge variable and recalculate DX/DY.
_ringScale=SCALE;
resize();

// Each ribbon = a u-slice of the big Möbius strip.
// Distribute N ribbons evenly across the full width.
const STRIPS=CK.map((k,i)=>{
  const center=RIBBON_COUNT<=1 ? 0
    : -RING.halfW + RIBBON_HW + (i/(RIBBON_COUNT-1))*(2*(RING.halfW-RIBBON_HW));
  return{
    cat:k,
    recs:G[k],
    uC:center,
    hw:RIBBON_HW*0.88,       // slight gap between adjacent ribbons
    thick:RING.thick,
  };
});

// Asteroid clouds: for each ribbon, scattered along (theta, localU) within its slice.
// Scale down asteroid count with more categories to keep total manageable (~600 max)
const ASTEROIDS=STRIPS.map((s,si)=>{
  const rnd=mulberry32(1234+si*97);
  const list=[];
  const n=Math.max(20, Math.round(115 * Math.min(1, 5/ACTUAL_COUNT)));
  for(let i=0;i<n;i++){
    const r=rnd();
    let sz, sizeClass;
    if(r<.60){sz=.55+rnd()*.9;sizeClass=0}       // small
    else if(r<.90){sz=1.4+rnd()*1.1;sizeClass=1} // medium
    else{sz=2.6+rnd()*1.4;sizeClass=2}           // large
    list.push({
      theta:rnd()*Math.PI*2,         // position around the loop
      lu:(rnd()-.5)*1.8,             // local u within the ribbon slice (-.9..+.9 effective)
      v:(rnd()-.5)*1.4,              // tiny thickness
      size:sz,sizeClass,
      tint:.72+rnd()*.28,
      rotSeed:rnd()*Math.PI*2,
      wobble:rnd()*.28,
      flow:.4+rnd()*.8               // per-asteroid flow speed along theta
    });
  }
  return list;
});

// Per-planet motion seeds — each record wanders along its ribbon with its own rhythm
const PLANET_SEEDS=STRIPS.map((s,si)=>{
  const rnd=mulberry32(9000+si*53);
  const cnt=s.recs.length;
  return s.recs.map((_,ri)=>({
    baseTheta:((ri+.5)/Math.max(1,cnt))*Math.PI*2,
    dir: 1,                      // all drift same direction — avoids crossing jumps
    driftFactor: .6+rnd()*.5,    // tighter range for more uniform motion
    thetaPhase: rnd()*Math.PI*2,
    thetaFreq: .55+rnd()*.6,     // how fast the θ sinus wobbles
    uPhase: rnd()*Math.PI*2,
    uFreq: .7+rnd()*.8,          // how fast the transverse bob oscillates
    uBase: (rnd()-.5)*.08,       // nearly centered — avoids Möbius half-twist visual jumps
    sizeJit: .85+rnd()*.25,
  }));
});

const INNER_STARS=(function(){
  const rnd=mulberry32(7777);
  const list=[];
  for(let i=0;i<26;i++){
    let x,y,z,d;
    do{x=(rnd()-.5)*2;y=(rnd()-.5)*2;z=(rnd()-.5)*2;d=x*x+y*y+z*z}while(d>1);
    const r=Math.cbrt(rnd())*.85;
    const mag=Math.sqrt(d)||1;
    list.push({p:[x/mag*r,y/mag*r,z/mag*r],sz:.5+rnd()*1.2,tw:rnd()*Math.PI*2,spd:.5+rnd()*.8,tint:rnd()});
  }
  return list;
})();

// Gentle breathing scalar (no shape taper - full Möbius strip is a closed loop,
// so width is constant around the loop, but we modulate alpha/density for life).
function ringBreath(theta){
  return 1+.08*Math.sin(theta*3.5+fr*.006)
          +.05*Math.sin(theta*7.0-fr*.004);
}

// ============ FIGURE-8 MÖBIUS PARAMETRIZATION ============
// Center curve (Gerono lemniscate in XY-plane + small z skew at crossings):
//   c(θ) = ( R·cosθ,  R·sinθ·cosθ,  zSkew·sinθ )
//   • θ=0        → ( R, 0, 0 )                right lobe tip
//   • θ=π/2      → ( 0, 0, +zSkew )           FIRST crossing through avatar (above)
//   • θ=π        → (-R, 0, 0 )                left lobe tip
//   • θ=3π/2     → ( 0, 0, -zSkew )           SECOND crossing through avatar (below)
//   • θ=2π       → ( R, 0, 0 )                back to start (closed loop)
//
// Two origin crossings → the strip THREADS the avatar from both sides,
// forming a complete Möbius figure-8.
//
// Möbius half-twist over θ ∈ [0, 2π]:
//   w(θ) = cos(φ/2) * B  +  sin(φ/2) * N(θ)
//   where B = (0,0,1) is the out-of-plane binormal,
//         N(θ) = T(θ) × B  (in-plane perpendicular to tangent, normalized)
//
// twistDrift gently advances φ over time (surface undulation).
// NO big global rotation — the ring stays attached at the avatar.
function mobiusPoint(theta,u){
  const phi=theta + fr*RING.twistDrift;          // twist phase (subtle drift)
  const ch=Math.cos(phi*.5), sh=Math.sin(phi*.5);
  const ct=Math.cos(theta),  st=Math.sin(theta);
  const c2=Math.cos(2*theta);

  // Base center curve: Gerono figure-8 with small z skew at the two crossings
  const bx=RING.R*ct;
  const by=RING.R*st*ct;                         // = (R/2)·sin(2θ)
  const bz=RING.zSkew*st;                        // lifts crossings apart in depth

  // Tangent T(θ) = dc/dθ  (ignoring small z component for normal direction)
  const tx=-RING.R*st;
  const ty= RING.R*c2;
  const tlen=Math.hypot(tx,ty)||1;

  // In-plane perpendicular N = T × (0,0,1), normalized → (ty, -tx, 0)/|T|
  const nx= ty/tlen;
  const ny=-tx/tlen;

  // Möbius width direction: rotates from B=(0,0,1) to N(θ) as φ goes 0 → π
  const wx= sh*nx;
  const wy= sh*ny;
  const wz= ch;

  let x=bx + u*wx;
  let y=by + u*wy;
  let z=bz + u*wz;

  // Static tilt around X-axis — lean loop forward so we see 3D depth.
  const tc=Math.cos(RING.tilt), ts=Math.sin(RING.tilt);
  const y2=y*tc - z*ts;
  const z2=y*ts + z*tc;
  return[x, y2, z2];
}

// Helper: get a point within ribbon si at (theta, localU ∈ [-1,1], localV thickness)
function ribbonPoint(si,theta,localU,localV){
  const s=STRIPS[si];
  const u=s.uC + localU*s.hw;     // absolute u on the big Möbius strip
  // Tiny thickness: offset perpendicular to the Möbius surface.
  // Approximate surface normal numerically via two tangents.
  if(localV===0||!localV){
    return mobiusPoint(theta,u);
  }
  const p0=mobiusPoint(theta,u);
  const eps=0.0015;
  const pT=mobiusPoint(theta+eps,u);          // tangent along theta
  const pU=mobiusPoint(theta,u+0.8);          // tangent along u
  const tX=pT[0]-p0[0], tY=pT[1]-p0[1], tZ=pT[2]-p0[2];
  const uX=pU[0]-p0[0], uY=pU[1]-p0[1], uZ=pU[2]-p0[2];
  // normal = tangent × widthTangent
  const nx=tY*uZ-tZ*uY;
  const ny=tZ*uX-tX*uZ;
  const nz=tX*uY-tY*uX;
  const nl=Math.hypot(nx,ny,nz)||1;
  const k=localV*s.thick/nl;
  return[p0[0]+nx*k, p0[1]+ny*k, p0[2]+nz*k];
}

function computeStripItems(si){
  const s=STRIPS[si];
  const cnt=s.recs.length;
  const items=[];

  // --- RIBBON FOG QUADS around full loop ---
  const RIBBON_SAMPLES=64;
  // Build samples at each theta step for this ribbon slice
  const samples=[];
  for(let k=0;k<=RIBBON_SAMPLES;k++){
    const theta=(k/RIBBON_SAMPLES)*Math.PI*2;
    const pA=ribbonPoint(si,theta, 1,0);   // "outer" u edge of this slice
    const pB=ribbonPoint(si,theta,-1,0);   // "inner" u edge of this slice
    const ctr=ribbonPoint(si,theta,0,0);
    samples.push({pA,pB,ctr,theta});
  }
  for(let k=0;k<RIBBON_SAMPLES;k++){
    const s1=samples[k],s2=samples[k+1];
    const mid=[
      (s1.ctr[0]+s2.ctr[0])*.5,
      (s1.ctr[1]+s2.ctr[1])*.5,
      (s1.ctr[2]+s2.ctr[2])*.5
    ];
    items.push({
      type:'ribbon',pos:mid,si,k,
      q:[s1.pA,s1.pB,s2.pB,s2.pA],
      t:k/RIBBON_SAMPLES,
      theta:s1.theta
    });
  }

  // --- ASTEROIDS scattered within this ribbon slice ---
  const tw=fr*RING.flowSpd;
  for(const a of ASTEROIDS[si]){
    // slow drift along the loop — NO modulo (same reason as planets: Möbius twist continuity)
    const theta=a.theta + tw*a.flow;
    const br=ringBreath(theta);
    const localU=Math.max(-1,Math.min(1,a.lu))*br*.9;
    const localV=a.v*0.9;
    const pos=ribbonPoint(si,theta,localU,localV);
    items.push({type:'ast',pos,size:a.size,sizeClass:a.sizeClass,tint:a.tint,seed:a.rotSeed,si,wobble:a.wobble});
  }

  // --- PLANET markers with wider, individualized motion along & across the ribbon ---
  const seeds=PLANET_SEEDS[si];
  for(let ri=0;ri<cnt;ri++){
    const sd=seeds[ri];
    // Slow continuous drift along θ — NO modulo wrapping!
    // On a Möbius strip, the width vector w uses cos(θ/2) and sin(θ/2) which have period 4π.
    // Wrapping θ to [0,2π] causes w to flip sign instantly → visible position jump.
    // Letting θ grow continuously keeps cos/sin smooth. The center curve (cos θ, sin θ·cos θ)
    // has period 2π and handles any θ value. The Möbius surface closes after 4π (two laps).
    const ft=fr*RING.planetDriftSpd*sd.driftFactor;
    const theta=sd.baseTheta + ft
      + Math.sin(fr*.002*sd.thetaFreq + sd.thetaPhase)*RING.planetThetaAmp;
    // Transverse bob: keep very small to minimize twist-induced position shift.
    const localU=Math.max(-1,Math.min(1,
      sd.uBase + Math.sin(fr*.003*sd.uFreq + sd.uPhase)*RING.planetUAmp
    ));
    const pos=ribbonPoint(si,theta,localU,0);
    items.push({type:'planet',pos,rec:s.recs[ri],cat:CT[s.cat],si,theta});
  }

  return items;
}

// ============ SNOW-GLOBE CENTER ============
const avatarImg=new Image();let avatarReady=false;
if(USER.avatarUrl){avatarImg.onload=()=>{avatarReady=true};avatarImg.src=USER.avatarUrl}

const GLOBE_RADIUS=42;

function drawGlobeBackHalf(sx,sy,sc){
  const sz=GLOBE_RADIUS*sc;
  const haloR=sz*3.2;
  const hg=ctx.createRadialGradient(sx,sy,sz*.9,sx,sy,haloR);
  hg.addColorStop(0,'rgba(160,220,230,.16)');
  hg.addColorStop(.5,'rgba(140,200,220,.05)');
  hg.addColorStop(1,'rgba(100,180,220,0)');
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=hg;ctx.fillRect(sx-haloR,sy-haloR,haloR*2,haloR*2);
  ctx.restore();
  // Subtle inner glass — blends into background, no hard dark edge
  ctx.save();
  ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.clip();
  const bg=ctx.createRadialGradient(sx-sz*.3,sy-sz*.35,0,sx,sy,sz*1.15);
  bg.addColorStop(0,'rgba(30,55,75,.15)');
  bg.addColorStop(.55,'rgba(14,22,40,.22)');
  bg.addColorStop(1,'rgba(4,8,20,.30)');
  ctx.fillStyle=bg;ctx.fillRect(sx-sz,sy-sz,sz*2,sz*2);
  ctx.restore();
}

function drawGlobeFrontHalf(sx,sy,sc){
  const sz=GLOBE_RADIUS*sc;
  // Removed hard dark ring — only keep subtle glass highlights below
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.strokeStyle='rgba(255,255,255,.5)';
  ctx.lineWidth=Math.max(1.2,sz*.05);
  ctx.lineCap='round';
  ctx.beginPath();ctx.arc(sx,sy,sz*.92,Math.PI*1.05,Math.PI*1.4);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.2)';
  ctx.lineWidth=Math.max(2,sz*.12);
  ctx.beginPath();ctx.arc(sx,sy,sz*.88,Math.PI*1.08,Math.PI*1.32);ctx.stroke();
  const shg=ctx.createRadialGradient(sx-sz*.4,sy-sz*.45,0,sx-sz*.4,sy-sz*.45,sz*.22);
  shg.addColorStop(0,'rgba(255,255,255,.9)');
  shg.addColorStop(.5,'rgba(255,255,255,.28)');
  shg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=shg;ctx.fillRect(sx-sz,sy-sz,sz*2,sz*2);
  const brg=ctx.createRadialGradient(sx+sz*.35,sy+sz*.4,0,sx+sz*.35,sy+sz*.4,sz*.5);
  brg.addColorStop(0,'rgba(120,200,220,.22)');
  brg.addColorStop(1,'rgba(120,200,220,0)');
  ctx.fillStyle=brg;ctx.fillRect(sx-sz,sy-sz,sz*2,sz*2);
  ctx.restore();
}

function drawAvatarBillboard(sx,sy,sc){
  const sz=GLOBE_RADIUS*sc;
  const innerR=sz*.58;
  const t=fr*.016;
  const pulse=1+Math.sin(t*.9)*.03;
  const r=innerR*pulse;
  ctx.save();
  const gb=ctx.createRadialGradient(sx,sy,0,sx,sy,r*1.6);
  gb.addColorStop(0,'rgba(120,200,230,.28)');
  gb.addColorStop(.6,'rgba(120,200,230,.08)');
  gb.addColorStop(1,'rgba(120,200,230,0)');
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=gb;ctx.fillRect(sx-r*1.6,sy-r*1.6,r*3.2,r*3.2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.clip();
  if(avatarReady){
    ctx.drawImage(avatarImg,sx-r,sy-r,r*2,r*2);
  }else{
    const ag=ctx.createRadialGradient(sx-r*.3,sy-r*.35,0,sx,sy,r);
    ag.addColorStop(0,'rgba(130,190,215,.98)');
    ag.addColorStop(.7,'rgba(65,115,155,.95)');
    ag.addColorStop(1,'rgba(30,60,90,.92)');
    ctx.fillStyle=ag;ctx.fillRect(sx-r,sy-r,r*2,r*2);
    ctx.fillStyle='rgba(240,252,255,.96)';
    ctx.font=`600 ${(r*1.22)|0}px 'Noto Sans SC',sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='rgba(100,180,220,.55)';ctx.shadowBlur=r*.3;
    ctx.fillText(USER.initial,sx,sy+r*.04);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle='rgba(180,230,240,.45)';
  ctx.lineWidth=Math.max(1,r*.05);
  ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

function drawInnerStar(sx,sy,sc,st){
  const t=fr*.016;
  const tw=.35+Math.abs(Math.sin(t*st.spd+st.tw))*.65;
  const sz=Math.max(.3,st.sz*sc*.9);
  const r=220+st.tint*35, g=235+st.tint*20, b=255;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const gl=ctx.createRadialGradient(sx,sy,0,sx,sy,sz*3);
  gl.addColorStop(0,`rgba(${r|0},${g|0},${b},${(tw*.35).toFixed(3)})`);
  gl.addColorStop(1,`rgba(${r|0},${g|0},${b},0)`);
  ctx.fillStyle=gl;ctx.fillRect(sx-sz*3,sy-sz*3,sz*6,sz*6);
  ctx.fillStyle=`rgba(${r|0},${g|0},${b},${tw.toFixed(3)})`;
  ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

// ============ ASTEROID RENDER ============
function drawAsteroid(sx,sy,sc,item){
  const cat=CT[STRIPS[item.si].cat];
  const cr=(cat.r*item.tint)|0,cg=(cat.g*item.tint)|0,cb=(cat.b*item.tint)|0;
  const t=fr*.016;
  const sz=Math.max(.4,item.size*sc*(1+Math.sin(t*.9+item.seed)*item.wobble*.1));

  if(item.sizeClass===0){
    const a=Math.min(1,.5+sc*.5);
    ctx.fillStyle=`rgba(${cr},${cg},${cb},${a.toFixed(3)})`;
    ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fill();
  }else if(item.sizeClass===1){
    const hr=Math.min(255,cr+45),hg=Math.min(255,cg+45),hb=Math.min(255,cb+45);
    const g=ctx.createRadialGradient(sx-sz*.3,sy-sz*.3,0,sx,sy,sz);
    g.addColorStop(0,`rgba(${hr},${hg},${hb},.95)`);
    g.addColorStop(1,`rgba(${(cr*.4)|0},${(cg*.4)|0},${(cb*.4)|0},.9)`);
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fill();
  }else{
    const hr=Math.min(255,cr+65),hg=Math.min(255,cg+65),hb=Math.min(255,cb+65);
    const gl=ctx.createRadialGradient(sx,sy,sz*.8,sx,sy,sz*2);
    gl.addColorStop(0,`rgba(${cr},${cg},${cb},.15)`);
    gl.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=gl;ctx.fillRect(sx-sz*2,sy-sz*2,sz*4,sz*4);
    ctx.restore();
    const g=ctx.createRadialGradient(sx-sz*.35,sy-sz*.35,0,sx,sy,sz);
    g.addColorStop(0,`rgba(${hr},${hg},${hb},1)`);
    g.addColorStop(.55,`rgba(${cr},${cg},${cb},.96)`);
    g.addColorStop(1,`rgba(${(cr*.35)|0},${(cg*.35)|0},${(cb*.35)|0},.92)`);
    ctx.fillStyle=g;
    ctx.beginPath();
    const turns=6;
    for(let i=0;i<turns;i++){
      const a=i/turns*Math.PI*2+item.seed*.2;
      const jitter=.82+((item.seed*7+i)%10)/35;
      const px=sx+Math.cos(a)*sz*jitter;
      const py=sy+Math.sin(a)*sz*jitter;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.arc(sx-sz*.3,sy-sz*.3,sz*.2,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.fill();
  }
}

// ============ MÖBIUS RIBBON QUAD (leaf spine) ============
// Each quad = a segment of the leaf ribbon. Surface orientation (via projected
// quad area) modulates both alpha and a subtle hue shift — so the front face
// reads distinctly from the back face, making the Möbius half-twist legible.
// Also draws faint edge contours to outline the leaf silhouette.
function drawRibbonQuad(q2d,si,highlight,t,signedArea){
  const cat=CT[STRIPS[si].cat];
  const [p1,p2,p3,p4]=q2d;
  // Signed 2D cross of diagonals to tell front- vs back-face
  const d1x=p3[0]-p1[0],d1y=p3[1]-p1[1];
  const d2x=p4[0]-p2[0],d2y=p4[1]-p2[1];
  const signed=(d1x*d2y-d1y*d2x);
  const facing=Math.min(1,Math.abs(signed)/2600);
  const front=signed>0;

  const pulse=.55+Math.sin(fr*.015+t*5+si*.7)*.45;
  const baseA=highlight?.28:.18;
  // Front face a touch brighter / warmer than back face → Möbius twist becomes readable
  const faceBias=front?1.0:.65;
  const alpha=baseA*(.3+facing*.85)*(.75+pulse*.25)*faceBias;

  // Slightly lift saturation / lightness on front face
  const fr_=front?1.15:.8;
  const r=Math.min(255,(cat.r*fr_)|0),g=Math.min(255,(cat.g*fr_)|0),b=Math.min(255,(cat.b*fr_)|0);

  ctx.save();
  ctx.globalCompositeOperation='lighter';
  // Centroid radial gradient (fog-like density)
  const cx=(p1[0]+p2[0]+p3[0]+p4[0])*.25;
  const cy=(p1[1]+p2[1]+p3[1]+p4[1])*.25;
  const maxR=Math.max(
    Math.hypot(p1[0]-cx,p1[1]-cy),
    Math.hypot(p2[0]-cx,p2[1]-cy),
    Math.hypot(p3[0]-cx,p3[1]-cy),
    Math.hypot(p4[0]-cx,p4[1]-cy)
  )*1.25;
  const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,maxR);
  gr.addColorStop(0,`rgba(${r},${g},${b},${alpha.toFixed(4)})`);
  gr.addColorStop(.55,`rgba(${r},${g},${b},${(alpha*.55).toFixed(4)})`);
  gr.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.fillStyle=gr;
  ctx.beginPath();
  ctx.moveTo(p1[0],p1[1]);
  ctx.lineTo(p2[0],p2[1]);
  ctx.lineTo(p3[0],p3[1]);
  ctx.lineTo(p4[0],p4[1]);
  ctx.closePath();
  ctx.fill();

  // (No hard side edge lines — keep the ribbon as soft fog only.)
  ctx.restore();
}

// ============ PLANET (V16 full 7-layer TasteVerse-style) ============
const PLANET_STATE={};
function ensurePlanetState(id){
  if(PLANET_STATE[id])return PLANET_STATE[id];
  const comets=[];
  const n=10+Math.floor(Math.random()*6);
  for(let i=0;i<n;i++){
    comets.push({
      angle:Math.random()*Math.PI*2,
      radius:1.5+Math.random()*3.5,
      speed:(.25+Math.random()*.9)*(Math.random()>.5?1:-1),
      tiltX:(Math.random()-.5)*1.4,
      tiltZ:(Math.random()-.5)*1.4,
      yOff:(Math.random()-.5)*1.5,
      size:.14+Math.random()*.08
    });
  }
  PLANET_STATE[id]={comets,phase:Math.random()*Math.PI*2,ringPhase:Math.random()*Math.PI};
  return PLANET_STATE[id];
}

function drawPlanet(sx,sy,sc,cat,isHov,rec){
  const cr=cat.r,cg=cat.g,cb=cat.b;
  const st=ensurePlanetState(rec.id);
  const t=fr*.016;
  const breath=1+Math.sin(t*1.2+st.phase)*.1;
  const base=(6+rec.s*.065)*sc*RING.planetSizeScale;
  const sz=base*breath*(isHov?1.25:1);

  // L1 halo
  const haloR=sz*5;
  const op1=(isHov?.7:.45)+Math.sin(t*1.5+st.phase)*.1;
  const g1=ctx.createRadialGradient(sx,sy,0,sx,sy,haloR);
  g1.addColorStop(0,`rgba(${cr},${cg},${cb},${(op1*.9).toFixed(3)})`);
  g1.addColorStop(.15,`rgba(${cr},${cg},${cb},${(op1*.5).toFixed(3)})`);
  g1.addColorStop(.4,`rgba(${cr},${cg},${cb},${(op1*.15).toFixed(3)})`);
  g1.addColorStop(.7,`rgba(${cr},${cg},${cb},${(op1*.03).toFixed(3)})`);
  g1.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=g1;ctx.fillRect(sx-haloR,sy-haloR,haloR*2,haloR*2);
  ctx.restore();

  // L2 outer atmosphere
  const outerR=sz*4.8;
  const op2=(isHov?.1:.06)+Math.sin(t*.7+st.phase)*.02;
  const g2=ctx.createRadialGradient(sx,sy,outerR*.7,sx,sy,outerR);
  g2.addColorStop(0,`rgba(${cr},${cg},${cb},0)`);
  g2.addColorStop(.6,`rgba(${cr},${cg},${cb},${(op2*.4).toFixed(3)})`);
  g2.addColorStop(1,`rgba(${cr},${cg},${cb},${op2.toFixed(3)})`);
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=g2;ctx.beginPath();ctx.arc(sx,sy,outerR,0,Math.PI*2);ctx.fill();
  ctx.restore();

  // L3 inner glow
  const innerR=sz*3.0;
  const op3=(isHov?.2:.12)+Math.sin(t*1.1+st.phase)*.04;
  const g3=ctx.createRadialGradient(sx,sy,0,sx,sy,innerR);
  g3.addColorStop(0,`rgba(${cr},${cg},${cb},${(op3*.8).toFixed(3)})`);
  g3.addColorStop(.6,`rgba(${cr},${cg},${cb},${(op3*.3).toFixed(3)})`);
  g3.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=g3;ctx.fillRect(sx-innerR,sy-innerR,innerR*2,innerR*2);
  ctx.restore();

  // L4 ring
  const ringTilt=Math.PI/2.8;
  const ringRotZ=t*.12+st.ringPhase;
  const r1Radius=sz*2.5;
  const op4=(isHov?.45:.28)+Math.sin(t*.8+st.phase)*.06;
  ctx.save();ctx.translate(sx,sy);ctx.rotate(ringRotZ);
  ctx.scale(1,Math.cos(ringTilt));
  ctx.strokeStyle=`rgba(${cr},${cg},${cb},${op4.toFixed(3)})`;
  ctx.lineWidth=Math.max(1,sz*.16);
  ctx.beginPath();ctx.arc(0,0,r1Radius,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=`rgba(${cr},${cg},${cb},${(op4*.4).toFixed(3)})`;
  ctx.lineWidth=Math.max(1,sz*.30);
  ctx.stroke();
  ctx.restore();

  // L5 secondary ring
  const r2Radius=sz*3.15;
  const ringRotZ2=-t*.08+st.ringPhase*.7;
  const op5=(isHov?.18:.1)+Math.sin(t*.6+st.phase)*.03;
  ctx.save();ctx.translate(sx,sy);ctx.rotate(ringRotZ2);
  ctx.scale(1,.3);
  ctx.strokeStyle=`rgba(255,255,255,${op5.toFixed(3)})`;
  ctx.lineWidth=Math.max(.8,sz*.10);
  ctx.beginPath();ctx.arc(0,0,r2Radius,0,Math.PI*2);ctx.stroke();
  ctx.restore();

  // L6 main body (phong)
  const hr=Math.min(255,cr+80),hg=Math.min(255,cg+80),hb=Math.min(255,cb+80);
  const lx=sx-sz*.35,ly=sy-sz*.35;
  const g6=ctx.createRadialGradient(lx,ly,0,sx,sy,sz);
  g6.addColorStop(0,`rgba(${hr},${hg},${hb},1)`);
  g6.addColorStop(.3,`rgba(${cr},${cg},${cb},.98)`);
  g6.addColorStop(.8,`rgba(${(cr*.5)|0},${(cg*.5)|0},${(cb*.5)|0},.9)`);
  g6.addColorStop(1,`rgba(${(cr*.25)|0},${(cg*.25)|0},${(cb*.25)|0},.82)`);
  ctx.fillStyle=g6;ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fill();

  // L7 white core
  const coreR=sz*.38;
  const op7=isHov?.75:.5;
  const g7=ctx.createRadialGradient(sx-sz*.15,sy-sz*.15,0,sx,sy,coreR);
  g7.addColorStop(0,`rgba(255,255,255,${op7.toFixed(3)})`);
  g7.addColorStop(1,`rgba(255,255,255,${(op7*.4).toFixed(3)})`);
  ctx.fillStyle=g7;ctx.beginPath();ctx.arc(sx,sy,coreR,0,Math.PI*2);ctx.fill();

  // Specular
  ctx.beginPath();ctx.arc(sx-sz*.3,sy-sz*.3,sz*.14,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,.65)';ctx.fill();

  // Comets
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const c of st.comets){
    c.angle+=c.speed*.015;
    const rx=Math.cos(c.angle)*c.radius*sz;
    const ry=c.yOff*sz+Math.sin(c.angle*2)*c.radius*sz*.06;
    const rz=Math.sin(c.angle)*c.radius*sz;
    const px=rx*Math.cos(c.tiltZ)-ry*Math.sin(c.tiltZ);
    const py=rx*Math.sin(c.tiltZ)*Math.sin(c.tiltX)+ry*Math.cos(c.tiltX)+rz*Math.sin(c.tiltX)*.3;
    const csx=sx+px,csy=sy+py;
    const tA2=c.angle+.05*Math.sign(c.speed);
    const rx2=Math.cos(tA2)*c.radius*sz;
    const ry2=c.yOff*sz+Math.sin(tA2*2)*c.radius*sz*.06;
    const rz2=Math.sin(tA2)*c.radius*sz;
    const px2=rx2*Math.cos(c.tiltZ)-ry2*Math.sin(c.tiltZ);
    const py2=rx2*Math.sin(c.tiltZ)*Math.sin(c.tiltX)+ry2*Math.cos(c.tiltX)+rz2*Math.sin(c.tiltX)*.3;
    const ang=Math.atan2(py2-py,px2-px)+Math.PI;
    const cSz=c.size*sz*.9;
    const tailLen=cSz*4;
    const cOp=(isHov?.7:.45);
    ctx.save();ctx.translate(csx,csy);ctx.rotate(ang);
    const tg=ctx.createLinearGradient(0,0,tailLen,0);
    tg.addColorStop(0,`rgba(${cr},${cg},${cb},${cOp.toFixed(3)})`);
    tg.addColorStop(.5,`rgba(${cr},${cg},${cb},${(cOp*.4).toFixed(3)})`);
    tg.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle=tg;
    ctx.beginPath();ctx.moveTo(0,-cSz*.7);
    ctx.quadraticCurveTo(tailLen*.5,0,tailLen,0);
    ctx.quadraticCurveTo(tailLen*.5,0,0,cSz*.7);
    ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.arc(0,0,cSz*.55,0,Math.PI*2);
    ctx.fillStyle=`rgba(${hr},${hg},${hb},${cOp.toFixed(3)})`;ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ============ PARTICLES ============
function spawnP(){
  if(particles.length>110)return;
  STRIPS.forEach((s,si)=>{
    if(Math.random()>.2)return;
    const cat=CT[s.cat];
    const theta=Math.random()*Math.PI*2;
    const localU=(Math.random()*2-1);
    const localV=(Math.random()*2-1)*.4;
    const pos=ribbonPoint(si,theta,localU,localV);
    pos[0]+=(Math.random()-.5)*8;
    pos[1]+=(Math.random()-.5)*8;
    pos[2]+=(Math.random()-.5)*8;
    const tp=Math.random();
    particles.push({pos,vel:[(Math.random()-.5)*.12,-.04-Math.random()*.08,(Math.random()-.5)*.09],life:1,decay:.004+Math.random()*.004,cr:cat.r,cg:cat.g,cb:cat.b,sz:1+Math.random()*1.6,tp:tp<.55?'fly':'dust'});
  });
}
function updateP(){const dtScale=_smoothDt/16.667;for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.pos[0]+=p.vel[0]*dtScale;p.pos[1]+=p.vel[1]*dtScale;p.pos[2]+=p.vel[2]*dtScale;p.life-=p.decay*dtScale;if(p.life<=0)particles.splice(i,1)}}

// ============ MAIN RENDER ============
function transform(p){let r2=rotX(p,camRX);r2=rotY(r2,camRY);return r2}

function render(){
  // Time-based frame counter with exponential smoothing to prevent catch-up jumps.
  // Smoothed dt prevents a single late frame from advancing animation by 2+ steps.
  const _now=performance.now();
  if(_lastRenderT>0){
    const rawDt=Math.min(_now-_lastRenderT,34); // cap at ~2 frames (never skip more)
    _smoothDt=_smoothDt*0.7+rawDt*0.3;          // exponential smoothing
    fr+=_smoothDt/16.667;
  }else{fr++;}
  _lastRenderT=_now;
  ctx.clearRect(0,0,W,H);

  const bg=ctx.createRadialGradient(W*.45,H*.45,0,W*.5,H*.5,W*1.2);
  bg.addColorStop(0,'#0f0f20');bg.addColorStop(.45,'#080814');bg.addColorStop(1,'#040408');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  if(!render._stars){
    render._stars=[];
    for(let i=0;i<180;i++){
      const brightness=Math.random(); // 0=dim, 1=bright
      render._stars.push([
        Math.random()*W, Math.random()*H,
        brightness>.92 ? 1.8+Math.random()*1.2 : Math.random()*1.4+.3, // a few large bright stars
        Math.random()*Math.PI*2,
        brightness // store brightness class
      ]);
    }
  }
  for(const s of render._stars){
    const tw=.4+Math.sin(fr*.018+s[3])*.35;
    const bright=s[4]||0;
    // Brighter base + twinkle, with a few standout stars
    const alpha=bright>.92 ? .55+tw*.25 : bright>.6 ? .30+tw*.18 : .14+tw*.10;
    const r=bright>.92?230:200, g=bright>.92?240:210, b=255;
    ctx.fillStyle=`rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    ctx.beginPath();ctx.arc(s[0],s[1],s[2],0,Math.PI*2);ctx.fill();
    // Glow halo for bright stars
    if(bright>.85){
      const gl=ctx.createRadialGradient(s[0],s[1],0,s[0],s[1],s[2]*4);
      gl.addColorStop(0,`rgba(180,210,255,${(alpha*.18).toFixed(3)})`);
      gl.addColorStop(1,'rgba(180,210,255,0)');
      ctx.fillStyle=gl;ctx.fillRect(s[0]-s[2]*4,s[1]-s[2]*4,s[2]*8,s[2]*8);
    }
  }

  if(Math.floor(fr)%5===0)spawnP();updateP();

  let all=[];
  for(let si=0;si<STRIPS.length;si++){
    all.push(...computeStripItems(si));
  }

  const innerStarItems=INNER_STARS.map(st=>{
    const p=[st.p[0]*GLOBE_RADIUS*.85,st.p[1]*GLOBE_RADIUS*.85,st.p[2]*GLOBE_RADIUS*.85];
    return{type:'istar',pos:p,star:st};
  });

  // Project all items. For ribbon quads we need 4 projected corners.
  const projItems=all.concat(innerStarItems).map(it=>{
    const r2=transform(it.pos);
    const p=proj(r2);
    let q2d=null;
    if(it.type==='ribbon'){
      q2d=it.q.map(v=>{const rr=transform(v);const pp=proj(rr);return[pp[0],pp[1]]});
    }
    return{...it,sx:p[0],sy:p[1],sc:p[2],sz:p[3],q2d};
  });

  const cp=proj(transform([0,0,0]));
  const cx=cp[0],cy=cp[1],csc=cp[2],cz=cp[3];

  // Hover detect (planets first)
  hov=null;hovStrip=-1;
  const nearbyAst=[];
  for(const it of projItems){
    if(drag)continue;
    if(it.type==='planet'){
      const baseR=(6+it.rec.s*.065)*it.sc;
      const dx=mX-it.sx,dy=mY-it.sy;
      if(Math.sqrt(dx*dx+dy*dy)<baseR+14){hov=it}
    }else if(it.type==='ast'){
      const dx=mX-it.sx,dy=mY-it.sy;
      const sz=Math.max(.4,it.size*it.sc);
      if(Math.sqrt(dx*dx+dy*dy)<sz+6)nearbyAst.push(it);
    }
  }
  if(!hov&&nearbyAst.length){
    nearbyAst.sort((a,b)=>Math.hypot(mX-a.sx,mY-a.sy)-Math.hypot(mX-b.sx,mY-b.sy));
    hovStrip=nearbyAst[0].si;
  }

  // Split behind / front of center for snow-globe passes
  const behind=[],front=[];
  for(const it of projItems){
    if(it.sz>cz)behind.push(it);else front.push(it);
  }
  behind.sort((a,b)=>b.sz-a.sz);
  front.sort((a,b)=>b.sz-a.sz);

  // Pass 1: back glass
  drawGlobeBackHalf(cx,cy,csc);

  // Pass 2: items behind center
  for(const it of behind){
    if(it.type==='ribbon')drawRibbonQuad(it.q2d,it.si,hovStrip===it.si,it.t,0);
    else if(it.type==='ast')drawAsteroid(it.sx,it.sy,it.sc,it);
    else if(it.type==='planet'){
      const isH=hov===it;
      drawPlanet(it.sx,it.sy,it.sc,it.cat,isH,it.rec);
    }
    else if(it.type==='istar')drawInnerStar(it.sx,it.sy,it.sc,it.star);
  }

  // Pass 3: front glass
  drawGlobeFrontHalf(cx,cy,csc);

  // Pass 4: items in front of center
  for(const it of front){
    if(it.type==='ribbon')drawRibbonQuad(it.q2d,it.si,hovStrip===it.si,it.t,0);
    else if(it.type==='ast')drawAsteroid(it.sx,it.sy,it.sc,it);
    else if(it.type==='planet'){
      const isH=hov===it;
      drawPlanet(it.sx,it.sy,it.sc,it.cat,isH,it.rec);
    }
    else if(it.type==='istar')drawInnerStar(it.sx,it.sy,it.sc,it.star);
  }

  // Pass 5: billboard avatar (always on top)
  drawAvatarBillboard(cx,cy,csc);

  // Strip hover asteroid glow
  if(hovStrip>=0&&!hov){
    const cat=CT[STRIPS[hovStrip].cat];
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const it of projItems){
      if(it.si!==hovStrip||it.type!=='ast')continue;
      const sz=Math.max(.4,it.size*it.sc);
      const gl=ctx.createRadialGradient(it.sx,it.sy,0,it.sx,it.sy,sz*3);
      gl.addColorStop(0,`rgba(${cat.r},${cat.g},${cat.b},.22)`);
      gl.addColorStop(1,`rgba(${cat.r},${cat.g},${cat.b},0)`);
      ctx.fillStyle=gl;
      ctx.fillRect(it.sx-sz*3,it.sy-sz*3,sz*6,sz*6);
    }
    ctx.restore();
    tipEl.innerHTML=`<div class="tc" style="color:${cat.hex}">${cat.i} ${cat.l}</div><div style="font-size:12px;color:var(--sub)">${G[STRIPS[hovStrip].cat].length} 条品鉴记录 · 莫比乌斯第 ${hovStrip+1} 环</div>`;
    tipEl.style.left=Math.min(mX+16,W-220)+'px';
    tipEl.style.top=Math.min(mY-30,H-80)+'px';
    tipEl.classList.add('show');
  }

  // Particles
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const p of particles){
    const r2=transform(p.pos);
    const pp=proj(r2);
    const sx=pp[0],sy=pp[1],sc=pp[2];
    const a=p.life*Math.max(.3,sc);
    if(p.tp==='dust'){
      const sz=p.sz*sc*1.7;
      const gl=ctx.createRadialGradient(sx,sy,0,sx,sy,sz*3);
      gl.addColorStop(0,`rgba(${p.cr},${p.cg},${p.cb},${(a*.3).toFixed(3)})`);
      gl.addColorStop(1,`rgba(${p.cr},${p.cg},${p.cb},0)`);
      ctx.fillStyle=gl;ctx.fillRect(sx-sz*3,sy-sz*3,sz*6,sz*6);
    }else{
      const sz=p.sz*sc;
      ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.cr},${p.cg},${p.cb},${(a*.6).toFixed(3)})`;ctx.fill();
      const gl=ctx.createRadialGradient(sx,sy,0,sx,sy,sz*3.5);
      gl.addColorStop(0,`rgba(${p.cr},${p.cg},${p.cb},${(a*.2).toFixed(3)})`);gl.addColorStop(1,`rgba(${p.cr},${p.cg},${p.cb},0)`);
      ctx.fillStyle=gl;ctx.fillRect(sx-sz*3.5,sy-sz*3.5,sz*7,sz*7);
    }
  }
  ctx.restore();

  if(hov){
    const r=hov.rec,ct=CT[r.c];
    tipEl.innerHTML=`<div class="tc" style="color:${ct.hex}">${ct.i} ${ct.l}</div><div class="tn">${r.n}</div><div class="td">${r.d}</div><div class="ts">评分 <b style="color:${ct.hex}">${r.s}</b>/100</div><div class="tf">${r.f.map(f=>`<span class="tt">${f}</span>`).join('')}</div>`;
    tipEl.style.left=Math.min(hov.sx+20,W-230)+'px';
    tipEl.style.top=Math.min(hov.sy-55,H-190)+'px';
    tipEl.classList.add('show');cv.style.cursor='pointer';
  }else if(hovStrip<0){
    tipEl.classList.remove('show');
    cv.style.cursor='default';
  }else{
    cv.style.cursor='pointer';
  }

  // Camera is LOCKED — no drift, no rotation.
  // (Möbius motion comes entirely from in-surface flow + twist drift.)

  requestAnimationFrame(render);
}

// Camera is LOCKED — only hover tracking for tooltips / clicks.
addEventListener('mousemove',e=>{
  const rc=cv.getBoundingClientRect();mX=e.clientX-rc.left;mY=e.clientY-rc.top;
});
cv.addEventListener('click',()=>{if(hov)showModal(hov.rec)});
render();

// ============ NEBULA FOCUS LENS (LR zone — source tracing visualization) ============
// A self-contained canvas that shows a "magnified" view of referenced planets.
// When uSrc() triggers with records, the lens animates in the corresponding planets
// as large glowing orbs with connection lines, orbital rings, and ambient particles.

// ============ NEBULA FOCUS LENS — Star-Planet Interactive System (v2) ============
// Telescope standby + scan-lock + time ripple + synced breathing + gravitational lensing
// + spiral-nebula time layout + hover tooltip (sticky) + supernova decay
const DR_LENS=0.6;
const srcCv=document.getElementById('srcCanvas');
const srcCtx=srcCv.getContext('2d');
const srcTipEl=document.getElementById('srcTip');
let srcW=0,srcH=0;

let lensState='standby';
let lensT0=0;
let focusNodes=[];
let srcParticles=[];
let rippleWaves=[];
let supernovaFx=[];
let hoveredNode=null;
let lockedNode=null;
// Per-planet state cache (mirrors PLANET_STATE for Möbius planets — comets, ring phase etc.)
const SRC_PLANET_STATE={};
function ensureSrcPlanetState(id){
  if(SRC_PLANET_STATE[id])return SRC_PLANET_STATE[id];
  const comets=[];
  const n=6+Math.floor(Math.random()*4);
  for(let i=0;i<n;i++){
    comets.push({angle:Math.random()*Math.PI*2,radius:1.5+Math.random()*3,
      speed:(.25+Math.random()*.8)*(Math.random()>.5?1:-1),
      tiltX:(Math.random()-.5)*1.2,tiltZ:(Math.random()-.5)*1.2,
      yOff:(Math.random()-.5)*1.2,size:.12+Math.random()*.07});
  }
  SRC_PLANET_STATE[id]={comets,phase:Math.random()*Math.PI*2,ringPhase:Math.random()*Math.PI};
  return SRC_PLANET_STATE[id];
}

const TEL={aperture:0.85,scanProg:0,innerFade:0,mouseRot:0,mouseRotTarget:0,lastMouseA:null,
  frozenOp:0.6,frozenTimeMul:2.5}; // standby=0.85, zoom to 1.6 on scanlock; frozenOp/frozenTimeMul hold active-state values

function resizeSrcCanvas(){
  const rect=srcCv.parentElement.getBoundingClientRect();
  srcW=rect.width*devicePixelRatio;srcH=rect.height*devicePixelRatio;
  srcCv.width=srcW;srcCv.height=srcH;
  srcCv.style.width=rect.width+'px';srcCv.style.height=rect.height+'px';
}
resizeSrcCanvas();addEventListener('resize',resizeSrcCanvas);

// Use the INCIRCLE center of the LR triangle — the largest circle fitting inside.
// LR triangle vertices (normalized): A=(1,0), B=(1,1), C=(DR,1).
// Incircle center ≈ (0.839W, 0.839H), radius ≈ 0.161 * min(W,H).
function lrCenter(){
  const DR=DR_LENS;
  // Incircle center weighted by opposite side lengths:
  // AB=1, BC=(1-DR), CA=sqrt((1-DR)^2+1)
  const ab=1, bc=1-DR, ca=Math.sqrt(bc*bc+1);
  const perim=ab+bc+ca;
  const ix=(ab*DR+bc*1+ca*1)/perim; // x: weighted by opposite side
  const iy=(ab*1+bc*0+ca*1)/perim;  // y: weighted by opposite side
  // Nudge up-right to better center visually in the triangle
  return{x:srcW*(ix+0.038), y:srcH*(iy-0.050)};
}
function lrInRadius(){
  const DR=DR_LENS;
  const ab=1,bc=1-DR,ca=Math.sqrt(bc*bc+1);
  const s=(ab+bc+ca)/2;
  const area=(1-DR)/2; // triangle area
  return area/s*Math.min(srcW,srcH);
}

// Seed ambient particles
function seedParticles(count){
  const c=lrCenter(),sp=lrInRadius()*0.8;
  for(let i=0;i<count;i++){
    srcParticles.push({x:c.x+(Math.random()-.5)*sp*3,y:c.y+(Math.random()-.5)*sp*3,
      vx:(Math.random()-.5)*.10,vy:(Math.random()-.5)*.10,
      life:Math.random(),decay:.001+Math.random()*.002,
      size:.4+Math.random()*1.2,r:160+Math.random()*80,g:170+Math.random()*70,b:200+Math.random()*55});
  }
}
seedParticles(50);

// ============ SCOPE HUD v4 — Blue telescope HUD (adapted from telescope-hud-demo) ============
function _hudRng(s){let v=s;return()=>{v=(v*9301+49297)%233280;return v/233280;};}

let _hudDataCache=null;
function _genHudData(){
  if(_hudDataCache)return _hudDataCache;
  const rng=_hudRng(91);
  const P2=Math.PI*2;

  const arcs=[];

  // --- PRIMARY arcs: moderate-thick (4-7px), bright ---
  const priRadii=[0.30,0.52,0.74,0.92];
  for(const rf of priRadii){
    const n=1+Math.floor(rng()*2);
    let cur=rng()*P2;
    for(let i=0;i<n;i++){
      const span=rf>=0.7?Math.PI*(1.2+rng()*0.4):Math.PI*(0.35+rng()*0.9);
      arcs.push({sa:cur,span,rf,w:2.5+rng()*2, op:0.65+rng()*0.15, spd:(rng()>0.5?1:-1)*(0.01+rng()*0.02),tier:0,
        dt:0,
        decos:_genHudArcDecos(rng,cur,span,rf,0),
        lights:_genHudLightArrays(rng,cur,span,rf),
      });
      cur+=span+Math.PI*(0.2+rng()*0.3);
    }
  }

  // --- SECONDARY arcs: moderate width (2-4px) ---
  const secRadii=[0.20,0.36,0.44,0.60,0.68,0.82,0.88];
  for(const rf of secRadii){
    const n=1+Math.floor(rng()*2);
    let cur=rng()*P2;
    for(let i=0;i<n;i++){
      const span=rf>=0.65?Math.PI*(1.0+rng()*0.5):Math.PI*(0.25+rng()*1.0);
      const dt=Math.floor(rng()*3);
      arcs.push({sa:cur,span,rf,w:0.8+rng()*0.9, op:0.35+rng()*0.15, spd:(rng()>0.5?1:-1)*(0.015+rng()*0.025),tier:1,
        dt,
        decos:_genHudArcDecos(rng,cur,span,rf,1),
        lights:_genHudLightArrays(rng,cur,span,rf),
      });
      cur+=span+Math.PI*(0.15+rng()*0.3);
    }
  }

  // --- TERTIARY arcs: very thin (0.3-0.6px), very dim ---
  for(let i=0;i<24;i++){
    const rf=0.12+rng()*0.88;
    const span=Math.PI*(0.15+rng()*0.8);
    const sa=rng()*P2;
    const dt=Math.floor(rng()*4);
    arcs.push({sa,span,rf,w:0.2+rng()*0.25, op:0.08+rng()*0.08, spd:(rng()>0.5?1:-1)*(0.02+rng()*0.03),tier:2,
      dt,
      decos:[],
      lights:[],
    });
  }

  // === Bar segments ===
  const bars=[];
  for(let i=0;i<22;i++){
    const rf=0.18+rng()*0.80;
    const sa=rng()*P2;
    const span=Math.PI*(0.02+rng()*0.08);
    const w=1.2+rng()*1.8;
    const bright=rng()>0.5;
    bars.push({rf,sa,span,w,op:bright?(0.40+rng()*0.25):(0.10+rng()*0.08),spd:(rng()>0.5?1:-1)*0.01});
  }

  // === Radial rays ===
  const rays=[];
  for(let i=0;i<16;i++){
    const angle=rng()*P2;
    const innerF=0.03+rng()*0.05;
    const outerF=0.30+rng()*0.70;
    const dashed=rng()>0.45;
    const w=0.5+rng()*1.2;
    const nodes=[];
    for(const prf of priRadii){
      if(prf>=innerF&&prf<=outerF&&rng()>0.4) nodes.push(prf);
    }
    for(const srf of secRadii){
      if(srf>=innerF&&srf<=outerF&&rng()>0.5) nodes.push(srf);
    }
    rays.push({angle,innerF,outerF,dashed,w,op:0.10+rng()*0.18,nodes});
  }

  // === Scattered decos ===
  const decos=[];
  for(let i=0;i<45;i++){
    decos.push({angle:rng()*P2,rf:0.10+rng()*0.90,kind:Math.floor(rng()*6),sz:1.5+rng()*2});
  }

  // === Mini ring clusters (between arc layers) ===
  const miniRings=[];
  const gapMids=[0.15,0.25,0.41,0.48,0.56,0.63,0.67,0.78,0.83,0.88];
  for(const gmid of gapMids){
    if(rng()>0.35){
      const angle=rng()*P2;
      const count=2+Math.floor(rng()*4);
      const rings=[];
      for(let j=0;j<count;j++){
        rings.push({
          angOff:(j-(count-1)/2)*0.035,
          rad:2+rng()*3.5,
          w:0.5+rng()*1.0,
          bright:rng()>0.4,
        });
      }
      miniRings.push({rf:gmid,baseAngle:angle,rings,spd:(rng()>0.5?1:-1)*(0.008+rng()*0.015)});
    }
  }

  _hudDataCache={arcs,bars,rays,decos,miniRings};
  return _hudDataCache;
}

function _genHudArcDecos(rng,sa,span,rf,tier){
  const decos=[];
  const n=tier===0?(4+Math.floor(rng()*4)):(3+Math.floor(rng()*3));
  for(let i=0;i<n;i++){
    const frac=0.05+rng()*0.90;
    const angle=sa+span*frac;
    const type=Math.floor(rng()*8);
    const side=rng()>0.5?1:-1;
    const sz=tier===0?(3+rng()*3):(2.5+rng()*2);
    decos.push({angle,type,side,sz});
  }
  return decos;
}

function _genHudLightArrays(rng,sa,span,rf){
  const groups=[];
  const numGroups=1+Math.floor(rng()*3);
  for(let g=0;g<numGroups;g++){
    const startFrac=0.1+rng()*0.7;
    const side=rng()>0.5?1:-1;
    const count=3+Math.floor(rng()*3);
    const lights=[];
    for(let j=0;j<count;j++){
      lights.push({
        offsetFrac:startFrac+j*0.025+(rng()-0.5)*0.005,
        w:2.5+rng()*2.5,
        bright:rng()>0.4,
      });
    }
    groups.push({lights,side});
  }
  return groups;
}

function _hudBtmBr(angle){return 0.50+0.50*Math.max(0,Math.sin(angle));}

function _hudDrawArcs(cx,cy,r,t,op,data,dp,iFade){
  const innerThresh=0.20; // arcs below this radius fade with innerFade (keep rf=0.30 ring visible)
  for(const arc of data.arcs){
    const rr=r*arc.rf;
    const rot=t*arc.spd+TEL.mouseRot;
    const sa=arc.sa+rot;
    const ea=sa+arc.span;
    const midA=sa+arc.span/2;
    const bf=_hudBtmBr(midA);
    // Inner arcs fade out during scanlock — simplified for smooth animation
    const innerMul=arc.rf<innerThresh?(1-(iFade||0)):1;
    const alpha=arc.op*op*bf*innerMul;
    if(alpha<0.003)continue;

    srcCtx.save();srcCtx.globalCompositeOperation='lighter';

    let bR,bG,bB;
    if(arc.tier===0){bR=70;bG=150;bB=255;}
    else if(arc.tier===1){bR=55;bG=120;bB=220;}
    else{bR=30;bG=60;bB=130;}

    srcCtx.strokeStyle=`rgba(${bR},${bG},${bB},${alpha.toFixed(3)})`;
    srcCtx.lineWidth=arc.w*dp;

    if(arc.dt===1)srcCtx.setLineDash([5*dp,4*dp]);
    else if(arc.dt===2)srcCtx.setLineDash([2*dp,3*dp]);
    else if(arc.dt===3){
      srcCtx.lineWidth=0.8*dp;
      const step=Math.PI/40;
      for(let ta=sa;ta<ea;ta+=step){
        const c1=Math.cos(ta),s1=Math.sin(ta);
        srcCtx.beginPath();
        srcCtx.moveTo(cx+c1*(rr-3*dp),cy+s1*(rr-3*dp));
        srcCtx.lineTo(cx+c1*(rr+3*dp),cy+s1*(rr+3*dp));
        srcCtx.stroke();
      }
      srcCtx.restore();continue;
    }

    srcCtx.beginPath();srcCtx.arc(cx,cy,rr,sa,ea);srcCtx.stroke();

    if(arc.tier===0){
      srcCtx.strokeStyle=`rgba(90,170,255,${(alpha*0.25).toFixed(3)})`;
      srcCtx.lineWidth=(arc.w+2)*dp;
      srcCtx.beginPath();srcCtx.arc(cx,cy,rr,sa,ea);srcCtx.stroke();
      srcCtx.strokeStyle=`rgba(70,140,240,${(alpha*0.10).toFixed(3)})`;
      srcCtx.lineWidth=(arc.w+4)*dp;
      srcCtx.beginPath();srcCtx.arc(cx,cy,rr,sa,ea);srcCtx.stroke();
    }else if(arc.tier===1 && arc.w>1.0){
      srcCtx.strokeStyle=`rgba(65,140,235,${(alpha*0.15).toFixed(3)})`;
      srcCtx.lineWidth=(arc.w+1.5)*dp;
      srcCtx.beginPath();srcCtx.arc(cx,cy,rr,sa,ea);srcCtx.stroke();
    }

    srcCtx.restore();

    for(const d of arc.decos){
      const da=d.angle+rot;
      const offset=d.side*(arc.w*0.5+14)*dp;
      const px=cx+Math.cos(da)*(rr+offset);
      const py=cy+Math.sin(da)*(rr+offset);
      const decoAlpha=arc.tier===0?alpha*0.95:alpha*0.80;
      _hudDrawAttachedDeco(px,py,da,d.type,d.sz*dp,decoAlpha,dp);
    }

    for(const grp of arc.lights){
      for(const lt of grp.lights){
        const la=sa+arc.span*lt.offsetFrac;
        const offset=grp.side*(arc.w*0.5+arc.w*0.6+4)*dp;
        const lrr=rr+offset;
        const spanEach=Math.PI*0.012;
        const blockAlpha=lt.bright?(alpha*0.70):(alpha*0.25);
        srcCtx.save();srcCtx.globalCompositeOperation='lighter';
        srcCtx.strokeStyle=lt.bright?
          `rgba(75,160,250,${blockAlpha.toFixed(3)})`:
          `rgba(40,90,170,${blockAlpha.toFixed(3)})`;
        srcCtx.lineWidth=lt.w*dp;
        srcCtx.lineCap='butt';
        srcCtx.beginPath();srcCtx.arc(cx,cy,lrr,la,la+spanEach);srcCtx.stroke();
        if(lt.bright){
          srcCtx.strokeStyle=`rgba(90,170,250,${(blockAlpha*0.3).toFixed(3)})`;
          srcCtx.lineWidth=(lt.w+1.5)*dp;
          srcCtx.beginPath();srcCtx.arc(cx,cy,lrr,la,la+spanEach);srcCtx.stroke();
        }
        srcCtx.restore();
      }
    }
  }
}

function _hudDrawAttachedDeco(px,py,angle,type,sz,op,dp){
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  const c=`rgba(60,145,255,${(op*0.70).toFixed(3)})`;
  const cb=`rgba(80,165,255,${(op*0.80).toFixed(3)})`;

  if(type===0){
    srcCtx.fillStyle=cb;
    srcCtx.save();srcCtx.translate(px,py);srcCtx.rotate(angle);
    srcCtx.fillRect(-sz*0.4,-sz*0.4,sz*0.8,sz*0.8);
    srcCtx.restore();
  }else if(type===1){
    srcCtx.strokeStyle=c;srcCtx.lineWidth=1.2*dp;
    srcCtx.save();srcCtx.translate(px,py);srcCtx.rotate(angle);
    srcCtx.strokeRect(-sz*0.45,-sz*0.45,sz*0.9,sz*0.9);
    srcCtx.restore();
  }else if(type===2){
    srcCtx.strokeStyle=cb;srcCtx.lineWidth=1.5*dp;
    const nx=Math.cos(angle),ny=Math.sin(angle);
    const tx=-ny,ty=nx;
    srcCtx.beginPath();
    srcCtx.moveTo(px+tx*sz*0.5+nx*sz*0.7,py+ty*sz*0.5+ny*sz*0.7);
    srcCtx.lineTo(px,py);
    srcCtx.lineTo(px-tx*sz*0.5+nx*sz*0.7,py-ty*sz*0.5+ny*sz*0.7);
    srcCtx.stroke();
    const off=sz*0.55;
    srcCtx.beginPath();
    srcCtx.moveTo(px+tx*sz*0.5+nx*(sz*0.7+off),py+ty*sz*0.5+ny*(sz*0.7+off));
    srcCtx.lineTo(px+nx*off,py+ny*off);
    srcCtx.lineTo(px-tx*sz*0.5+nx*(sz*0.7+off),py-ty*sz*0.5+ny*(sz*0.7+off));
    srcCtx.stroke();
  }else if(type===3){
    srcCtx.strokeStyle=cb;srcCtx.lineWidth=1.5*dp;
    const nx=Math.cos(angle),ny=Math.sin(angle);
    const tx=-ny,ty=nx;
    srcCtx.beginPath();
    srcCtx.moveTo(px+nx*sz*0.8,py+ny*sz*0.8);
    srcCtx.lineTo(px,py);
    srcCtx.lineTo(px+tx*sz*0.8,py+ty*sz*0.8);
    srcCtx.stroke();
  }else if(type===4){
    srcCtx.fillStyle=`rgba(100,180,255,${(op*0.85).toFixed(3)})`;
    srcCtx.beginPath();srcCtx.arc(px,py,sz*0.3,0,Math.PI*2);srcCtx.fill();
    srcCtx.strokeStyle=`rgba(60,140,240,${(op*0.35).toFixed(3)})`;
    srcCtx.lineWidth=0.8*dp;
    srcCtx.beginPath();srcCtx.arc(px,py,sz*0.6,0,Math.PI*2);srcCtx.stroke();
  }else if(type===5){
    srcCtx.strokeStyle=cb;srcCtx.lineWidth=1.2*dp;
    srcCtx.beginPath();
    srcCtx.moveTo(px,py-sz*0.6);srcCtx.lineTo(px+sz*0.4,py);
    srcCtx.lineTo(px,py+sz*0.6);srcCtx.lineTo(px-sz*0.4,py);srcCtx.closePath();srcCtx.stroke();
  }else if(type===6){
    srcCtx.strokeStyle=c;srcCtx.lineWidth=1.0*dp;
    srcCtx.beginPath();srcCtx.arc(px,py,sz*0.45,0,Math.PI*2);srcCtx.stroke();
    srcCtx.fillStyle=`rgba(70,155,245,${(op*0.5).toFixed(3)})`;
    srcCtx.beginPath();srcCtx.arc(px,py,sz*0.12,0,Math.PI*2);srcCtx.fill();
  }else if(type===7){
    srcCtx.strokeStyle=cb;srcCtx.lineWidth=1.2*dp;
    srcCtx.beginPath();srcCtx.moveTo(px-sz*0.45,py);srcCtx.lineTo(px+sz*0.45,py);srcCtx.stroke();
    srcCtx.beginPath();srcCtx.moveTo(px,py-sz*0.45);srcCtx.lineTo(px,py+sz*0.45);srcCtx.stroke();
  }
  srcCtx.restore();
}

function _hudDrawBars(cx,cy,r,t,op,data,dp,iFade){
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(const bar of data.bars){
    const rr=r*bar.rf;
    const innerMul=bar.rf<0.20?Math.max(0,1-(iFade||0)*1.5):1;
    if(innerMul<0.01)continue;
    const sa=bar.sa+t*bar.spd+TEL.mouseRot;
    const ea=sa+bar.span;
    const bf=_hudBtmBr(sa+bar.span/2);
    const alpha=bar.op*op*bf*innerMul;

    srcCtx.strokeStyle=`rgba(80,160,255,${alpha.toFixed(3)})`;
    srcCtx.lineWidth=bar.w*dp;
    srcCtx.lineCap='butt';
    srcCtx.beginPath();srcCtx.arc(cx,cy,rr,sa,ea);srcCtx.stroke();

    if(bar.op>0.3){
      srcCtx.strokeStyle=`rgba(160,210,255,${(alpha*0.25).toFixed(3)})`;
      srcCtx.lineWidth=(bar.w+2)*dp;
      srcCtx.beginPath();srcCtx.arc(cx,cy,rr,sa,ea);srcCtx.stroke();
    }
  }
  srcCtx.restore();
}

function _hudDrawRays(cx,cy,r,op,data,dp,iFade){
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(const ray of data.rays){
    // Shorten inner extent of rays when inner zone is clearing
    const effInner=iFade>0?Math.max(ray.innerF,0.30*(iFade||0)):ray.innerF;
    const c1=Math.cos(ray.angle),s1=Math.sin(ray.angle);
    const bf=_hudBtmBr(ray.angle);
    srcCtx.strokeStyle=`rgba(70,150,255,${(ray.op*op*bf).toFixed(3)})`;
    srcCtx.lineWidth=ray.w*dp;
    if(ray.dashed)srcCtx.setLineDash([4*dp,5*dp]);else srcCtx.setLineDash([]);
    srcCtx.beginPath();
    srcCtx.moveTo(cx+c1*r*effInner,cy+s1*r*effInner);
    srcCtx.lineTo(cx+c1*r*ray.outerF,cy+s1*r*ray.outerF);
    srcCtx.stroke();
    srcCtx.setLineDash([]);
    for(const nf of ray.nodes){
      const nx=cx+c1*r*nf,ny=cy+s1*r*nf;
      srcCtx.fillStyle=`rgba(90,170,255,${(ray.op*op*bf*1.8).toFixed(3)})`;
      srcCtx.beginPath();srcCtx.arc(nx,ny,2.5*dp,0,Math.PI*2);srcCtx.fill();
      srcCtx.strokeStyle=`rgba(60,140,240,${(ray.op*op*bf*0.4).toFixed(3)})`;
      srcCtx.lineWidth=0.5*dp;
      srcCtx.beginPath();srcCtx.arc(nx,ny,4.5*dp,0,Math.PI*2);srcCtx.stroke();
    }
  }
  srcCtx.restore();
}

function _hudDrawMiniRings(cx,cy,r,t,op,data,dp,iFade){
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(const cluster of data.miniRings){
    const innerMul=cluster.rf<0.20?Math.max(0,1-(iFade||0)*1.5):1;
    if(innerMul<0.01)continue;
    const baseA=cluster.baseAngle+t*cluster.spd+TEL.mouseRot;
    const rr=r*cluster.rf;
    const bf=_hudBtmBr(baseA);
    for(const ring of cluster.rings){
      const a=baseA+ring.angOff;
      const px=cx+Math.cos(a)*rr;
      const py=cy+Math.sin(a)*rr;
      const rad=ring.rad*dp;
      const alpha=(ring.bright?0.40:0.15)*op*bf;

      srcCtx.strokeStyle=`rgba(65,150,245,${alpha.toFixed(3)})`;
      srcCtx.lineWidth=ring.w*dp;
      srcCtx.beginPath();srcCtx.arc(px,py,rad,0,Math.PI*2);srcCtx.stroke();

      if(ring.bright){
        srcCtx.fillStyle=`rgba(80,165,250,${(alpha*0.7).toFixed(3)})`;
        srcCtx.beginPath();srcCtx.arc(px,py,rad*0.25,0,Math.PI*2);srcCtx.fill();
        srcCtx.strokeStyle=`rgba(70,155,240,${(alpha*0.25).toFixed(3)})`;
        srcCtx.lineWidth=(ring.w+1)*dp;
        srcCtx.beginPath();srcCtx.arc(px,py,rad,0,Math.PI*2);srcCtx.stroke();
      }
    }
  }
  srcCtx.restore();
}

function _hudDrawCrosshair(cx,cy,r,op,dp,iFade){
  const fadeOp=op*Math.max(0,1-(iFade||0)*1.5);
  if(fadeOp<0.01){return;}
  op=fadeOp;
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';

  const ringRs=[0.020, 0.038, 0.065];
  const ringAs=[0.55, 0.32, 0.20];
  const ringWs=[1.2, 0.9, 0.6];
  for(let i=0;i<3;i++){
    srcCtx.strokeStyle=`rgba(70,155,250,${(ringAs[i]*op).toFixed(3)})`;
    srcCtx.lineWidth=ringWs[i]*dp;
    srcCtx.beginPath();srcCtx.arc(cx,cy,r*ringRs[i],0,Math.PI*2);srcCtx.stroke();
  }

  srcCtx.strokeStyle=`rgba(65,150,245,${(0.35*op).toFixed(3)})`;
  srcCtx.lineWidth=0.8*dp;
  const g1=r*0.025,g2=r*0.065,g3=r*0.09,g4=r*0.20;
  srcCtx.beginPath();srcCtx.moveTo(cx,cy-g1);srcCtx.lineTo(cx,cy-g2);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx,cy+g1);srcCtx.lineTo(cx,cy+g2);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx-g1,cy);srcCtx.lineTo(cx-g2,cy);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx+g1,cy);srcCtx.lineTo(cx+g2,cy);srcCtx.stroke();

  srcCtx.setLineDash([3*dp,3*dp]);
  srcCtx.strokeStyle=`rgba(80,160,255,${(0.20*op).toFixed(3)})`;
  srcCtx.beginPath();srcCtx.moveTo(cx,cy-g3);srcCtx.lineTo(cx,cy-g4);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx,cy+g3);srcCtx.lineTo(cx,cy+g4);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx-g3,cy);srcCtx.lineTo(cx-g4,cy);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx+g3,cy);srcCtx.lineTo(cx+g4,cy);srcCtx.stroke();
  srcCtx.setLineDash([]);

  srcCtx.strokeStyle=`rgba(65,150,245,${(0.30*op).toFixed(3)})`;
  srcCtx.lineWidth=1.0*dp;
  const bs=r*0.11,bl=r*0.04;
  for(const[sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const bx=cx+sx*bs,by=cy+sy*bs;
    srcCtx.beginPath();srcCtx.moveTo(bx,by);srcCtx.lineTo(bx-sx*bl,by);srcCtx.stroke();
    srcCtx.beginPath();srcCtx.moveTo(bx,by);srcCtx.lineTo(bx,by-sy*bl);srcCtx.stroke();
  }

  srcCtx.fillStyle=`rgba(120,185,255,${(0.90*op).toFixed(3)})`;
  srcCtx.beginPath();srcCtx.arc(cx,cy,2*dp,0,Math.PI*2);srcCtx.fill();
  const cg=srcCtx.createRadialGradient(cx,cy,0,cx,cy,r*0.018);
  cg.addColorStop(0,`rgba(80,165,250,${(0.30*op).toFixed(3)})`);
  cg.addColorStop(1,'rgba(60,140,240,0)');
  srcCtx.fillStyle=cg;srcCtx.fillRect(cx-r*0.02,cy-r*0.02,r*0.04,r*0.04);

  srcCtx.restore();
}

function _hudDrawScattered(cx,cy,r,t,op,data,dp,iFade){
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(const d of data.decos){
    if(d.rf<0.20 && (iFade||0)>0.1)continue; // skip inner decos when fading
    const ang=d.angle+t*0.004+TEL.mouseRot;
    const px=cx+Math.cos(ang)*r*d.rf;
    const py=cy+Math.sin(ang)*r*d.rf;
    const sz=d.sz*dp;
    const bf=_hudBtmBr(ang);
    const a=0.16*op*bf;
    const c=`rgba(70,150,255,${a.toFixed(3)})`;
    const cb=`rgba(130,195,255,${(a*1.2).toFixed(3)})`;

    if(d.kind===0){srcCtx.fillStyle=cb;srcCtx.fillRect(px-sz*0.35,py-sz*0.35,sz*0.7,sz*0.7);}
    else if(d.kind===1){srcCtx.strokeStyle=c;srcCtx.lineWidth=0.6*dp;srcCtx.strokeRect(px-sz*0.4,py-sz*0.4,sz*0.8,sz*0.8);}
    else if(d.kind===2){
      srcCtx.strokeStyle=c;srcCtx.lineWidth=0.6*dp;
      srcCtx.beginPath();srcCtx.moveTo(px,py-sz);srcCtx.lineTo(px+sz*0.6,py);srcCtx.lineTo(px,py+sz);srcCtx.lineTo(px-sz*0.6,py);srcCtx.closePath();srcCtx.stroke();
    }else if(d.kind===3){
      srcCtx.strokeStyle=c;srcCtx.lineWidth=0.5*dp;
      srcCtx.beginPath();srcCtx.moveTo(px-sz,py);srcCtx.lineTo(px+sz,py);srcCtx.stroke();
      srcCtx.beginPath();srcCtx.moveTo(px,py-sz);srcCtx.lineTo(px,py+sz);srcCtx.stroke();
    }else if(d.kind===4){
      srcCtx.fillStyle=c;const dir=d.angle;
      srcCtx.beginPath();
      srcCtx.moveTo(px+Math.cos(dir)*sz*1.2,py+Math.sin(dir)*sz*1.2);
      srcCtx.lineTo(px+Math.cos(dir+2.3)*sz*0.7,py+Math.sin(dir+2.3)*sz*0.7);
      srcCtx.lineTo(px+Math.cos(dir-2.3)*sz*0.7,py+Math.sin(dir-2.3)*sz*0.7);
      srcCtx.closePath();srcCtx.fill();
    }else{
      srcCtx.fillStyle=cb;srcCtx.beginPath();srcCtx.arc(px,py,sz*0.3,0,Math.PI*2);srcCtx.fill();
    }
  }
  srcCtx.restore();
}

function _hudDrawBottomLight(cx,cy,r,op,dp){
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  const g1=srcCtx.createLinearGradient(cx,cy+r*1.3,cx,cy-r*0.7);
  g1.addColorStop(0,`rgba(60,140,255,${(0.12*op).toFixed(3)})`);
  g1.addColorStop(0.3,`rgba(40,100,220,${(0.05*op).toFixed(3)})`);
  g1.addColorStop(0.7,'rgba(30,70,160,0)');
  srcCtx.fillStyle=g1;srcCtx.beginPath();srcCtx.arc(cx,cy,r*1.3,0,Math.PI*2);srcCtx.fill();
  const g2=srcCtx.createRadialGradient(cx,cy+r*0.6,0,cx,cy+r*0.6,r*0.5);
  g2.addColorStop(0,`rgba(100,180,255,${(0.09*op).toFixed(3)})`);
  g2.addColorStop(0.5,`rgba(60,130,240,${(0.03*op).toFixed(3)})`);
  g2.addColorStop(1,'rgba(40,90,200,0)');
  srcCtx.fillStyle=g2;srcCtx.fillRect(cx-r*0.7,cy+r*0.15,r*1.4,r*0.9);
  srcCtx.restore();
}

function _hudDrawHalos(cx,cy,r,op,dp){
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(const h of [{f:1.04,a:0.05},{f:1.10,a:0.035},{f:1.18,a:0.022},{f:1.28,a:0.015},{f:1.40,a:0.008},{f:1.55,a:0.005}]){
    srcCtx.strokeStyle=`rgba(70,150,255,${(h.a*op).toFixed(3)})`;
    srcCtx.lineWidth=0.7*dp;
    srcCtx.beginPath();srcCtx.arc(cx,cy,r*h.f,0,Math.PI*2);srcCtx.stroke();
  }
  srcCtx.restore();
}

function _hudDrawGrid(cx,cy,r,op,dp){
  srcCtx.save();
  srcCtx.fillStyle=`rgba(60,130,220,${(0.018*op).toFixed(3)})`;
  const gs=22*dp,lim=r*0.95;
  for(let gx=cx-lim;gx<cx+lim;gx+=gs){
    for(let gy=cy-lim;gy<cy+lim;gy+=gs){
      if(Math.hypot(gx-cx,gy-cy)<lim) srcCtx.fillRect(gx,gy,dp*0.5,dp*0.5);
    }
  }
  srcCtx.restore();
}

function _hudDrawAcqArcs(cx,cy,r,t,op,dp,iFade){
  const fadeOp=op*Math.max(0,1-(iFade||0)*1.5);
  if(fadeOp<0.01)return;
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(const p of [{f:0.08,spd:0.35,span:0.25},{f:0.14,spd:-0.25,span:0.20},{f:0.21,spd:0.18,span:0.22}]){
    srcCtx.strokeStyle=`rgba(80,170,255,${(0.22*fadeOp).toFixed(3)})`;
    srcCtx.lineWidth=0.8*dp;
    const a=t*p.spd+TEL.mouseRot;
    srcCtx.beginPath();srcCtx.arc(cx,cy,r*p.f,a,a+Math.PI*p.span);srcCtx.stroke();
    srcCtx.beginPath();srcCtx.arc(cx,cy,r*p.f,a+Math.PI,a+Math.PI+Math.PI*p.span);srcCtx.stroke();
  }
  srcCtx.restore();
}

function _hudDrawLensFlare(cx,cy,r,op,dp,iFade){
  op=op*Math.max(0,1-(iFade||0)*1.2);
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  srcCtx.strokeStyle=`rgba(150,210,255,${(0.06*op).toFixed(3)})`;
  srcCtx.lineWidth=0.4*dp;
  srcCtx.beginPath();srcCtx.moveTo(cx-r*0.50,cy);srcCtx.lineTo(cx+r*0.50,cy);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx,cy-r*0.50);srcCtx.lineTo(cx,cy+r*0.50);srcCtx.stroke();
  srcCtx.strokeStyle=`rgba(70,150,255,${(0.02*op).toFixed(3)})`;
  srcCtx.lineWidth=2*dp;
  srcCtx.beginPath();srcCtx.moveTo(cx-r*0.45,cy);srcCtx.lineTo(cx+r*0.45,cy);srcCtx.stroke();
  srcCtx.beginPath();srcCtx.moveTo(cx,cy-r*0.45);srcCtx.lineTo(cx,cy+r*0.45);srcCtx.stroke();
  srcCtx.restore();
}

function drawScopeHUD(cx,cy,r,t,opacity){
  const dp=devicePixelRatio;
  const op=opacity;
  const data=_genHudData();
  const iFade=TEL.innerFade||0; // 0=full HUD, 1=inner zone cleared

  _hudDrawGrid(cx,cy,r,op,dp);
  _hudDrawBottomLight(cx,cy,r,op,dp);
  _hudDrawHalos(cx,cy,r,op,dp);
  _hudDrawArcs(cx,cy,r,t,op,data,dp,iFade);
  _hudDrawBars(cx,cy,r,t,op,data,dp,iFade);
  _hudDrawMiniRings(cx,cy,r,t,op,data,dp,iFade);
  _hudDrawRays(cx,cy,r,op,data,dp,iFade);
  _hudDrawScattered(cx,cy,r,t,op,data,dp,iFade);
  _hudDrawAcqArcs(cx,cy,r,t,op,dp,iFade);
  _hudDrawCrosshair(cx,cy,r,op,dp,iFade);
  _hudDrawLensFlare(cx,cy,r,op,dp,iFade);
}

// ============ ACTIVE-STATE HUD FRAME — outer rings stay, inner cleared for planets + water ripple ============
function drawHUDFrame(cx,cy,r,t){
  // Draw full HUD but with inner zone faded out (TEL.innerFade=1)
  drawScopeHUD(cx,cy,r,t,0.45);
  drawWaterRipple(cx,cy,r,t);
}

function drawWaterRipple(cx,cy,r,t){
  const dp=devicePixelRatio;
  const rippleCount=5;
  const speed=0.15;
  const maxR=r*0.30; // ripples confined to inner ring area

  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(let i=0;i<rippleCount;i++){
    const phase=((t*speed+i/rippleCount)%1);
    const rr=phase*maxR;
    const life=Math.sin(phase*Math.PI);
    const alpha=life*0.10;
    if(alpha<0.004)continue;
    srcCtx.strokeStyle=`rgba(70,150,255,${alpha.toFixed(3)})`;
    srcCtx.lineWidth=(0.8+life*1.2)*dp;
    srcCtx.beginPath();srcCtx.arc(cx,cy,rr,0,Math.PI*2);srcCtx.stroke();
  }
  srcCtx.restore();
}

// ============ SCAN-LOCK TRANSITION ============
// Zoom-in effect: aperture grows from 0.85 → 1.6, arcs spread apart.
// Crosshair/center clears (innerFade), innermost ring (rf=0.30) stays as "lock ring" for planets.
function startScanLock(){
  lensState='scanlock';lensT0=performance.now()*0.001;
  TEL.scanProg=0;TEL.innerFade=0;
  // Pre-allocate ripple waves to avoid mid-animation GC stutter
  const c=lrCenter();
  const innerR=lrInRadius()*0.40; // ripple radius — inner area
  rippleWaves.length=0;
  const t0=lensT0+0.6; // ripples start in phase 2
  for(let i=0;i<3;i++) rippleWaves.push({x:c.x,y:c.y,r:0,maxR:innerR,
    speed:50+i*18,alpha:0.5-i*0.12,born:t0+i*0.10});
}
function updateScanLock(t){
  const el=t-lensT0;
  const ss=function(p){return p*p*(3-2*p);}; // smoothstep
  // Phase 1 (0-0.6s): begin zoom, spin accelerates, crosshair starts dimming
  if(el<0.6){
    const p=ss(el/0.6);
    TEL.aperture=0.85+p*0.35; // 0.85 → 1.20
    TEL.scanProg=p*0.3;
    TEL.innerFade=p*0.4; // crosshair/acq fade begins
  }
  // Phase 2 (0.6-1.5s): zoom continues, inner clears, ripple waves active
  else if(el<1.5){
    const p=ss((el-0.6)/0.9);
    TEL.aperture=1.20+p*0.40; // 1.20 → 1.60
    TEL.scanProg=0.3+p*0.5;
    TEL.innerFade=0.4+p*0.6; // fully clear at 1.0
  }
  // Phase 3 (1.5-2.2s): hold zoom, planets awaken
  else if(el<2.2){
    const p=ss((el-1.5)/0.7);
    TEL.aperture=1.60;
    TEL.scanProg=0.8+p*0.2;
    TEL.innerFade=1.0;
  }
  // Done — transition to active. Snapshot final scanlock values so active holds them exactly.
  else{
    TEL.aperture=1.60;TEL.innerFade=1.0;TEL.scanProg=1.0;
    TEL.frozenOp=Math.max(0.35,1.0-1.0*0.4); // =0.6, the opacity at scanProg=1.0
    TEL.frozenTimeMul=1.0+1.0*1.5;            // =2.5, the time multiplier at scanProg=1.0
    lensState='active';
  }
}

// ============ TIME RIPPLE WAVES ============
function updateRipples(t){
  const dp=devicePixelRatio;
  for(let i=rippleWaves.length-1;i>=0;i--){
    const w=rippleWaves[i];if(t<w.born)continue;
    w.r+=w.speed*0.016;const life=1-w.r/w.maxR;
    if(life<=0){rippleWaves.splice(i,1);continue;}
    srcCtx.save();srcCtx.strokeStyle=`rgba(70,150,255,${(w.alpha*life).toFixed(3)})`;
    srcCtx.lineWidth=1.5*dp;srcCtx.beginPath();srcCtx.arc(w.x,w.y,w.r,0,Math.PI*2);srcCtx.stroke();
    srcCtx.restore();
    focusNodes.forEach(n=>{
      if(n.state==='dim'){const d=Math.hypot(n.targetX-w.x,n.targetY-w.y);
        if(d<=w.r+20&&d>=w.r-40)n.state='waking';}
    });
  }
}

// ============ AMBIENT PARTICLES + GENTLE GRAVITATIONAL DRIFT ============
function updateAndDrawParticles(t){
  const dp=devicePixelRatio,c=lrCenter(),sp=lrInRadius()*0.8;
  for(let i=srcParticles.length-1;i>=0;i--){
    const p=srcParticles[i];
    let gx=0,gy=0;
    // Reduced gravitational lensing — much gentler pull
    for(const n of focusNodes){if(n.opacity<0.1)continue;
      const dx=n.x-p.x,dy=n.y-p.y,d2=dx*dx+dy*dy+3000;
      const f=n.opacity*200/d2;gx+=dx*f;gy+=dy*f;}
    p.vx+=gx*0.003;p.vy+=gy*0.003; // much lower gravity multiplier
    p.vx*=0.990;p.vy*=0.990; // stronger damping
    // Clamp velocity to prevent wild movement
    const vMag=Math.hypot(p.vx,p.vy);
    if(vMag>0.5){p.vx*=0.5/vMag;p.vy*=0.5/vMag;}
    p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;
    if(p.life<=0){p.x=c.x+(Math.random()-.5)*sp*3;p.y=c.y+(Math.random()-.5)*sp*3;
      p.vx=(Math.random()-.5)*.12;p.vy=(Math.random()-.5)*.12;p.life=1;}
    srcCtx.globalAlpha=p.life*0.20;
    srcCtx.fillStyle=`rgb(${p.r|0},${p.g|0},${p.b|0})`;
    srcCtx.beginPath();srcCtx.arc(p.x,p.y,p.size*dp,0,Math.PI*2);srcCtx.fill();
  }
  srcCtx.globalAlpha=1;
}

// ============ PLANET RENDERING — Matches Möbius drawPlanet style ============
function drawSrcPlanet(n,t){
  const dp=devicePixelRatio;
  const cr=n.ct.r,cg=n.ct.g,cb=n.ct.b;
  const st=ensureSrcPlanetState(n.rec.id);
  const c=lrCenter();
  const distC=Math.hypot(n.x-c.x,n.y-c.y);
  const breathDelay=distC*0.003;
  const breathAmp=n.breathIndependent?0.03:0.1;
  const breath=1+breathAmp*Math.sin(t*1.2-breathDelay+st.phase);
  const baseSz=n.size*dp;
  const sz=baseSz*breath;
  const isH=(n===hoveredNode);

  // Time-based dimming: newer planets are brighter, older ones fade
  const timeBright=1-(n.timeFrac||0)*0.4; // 1.0→0.6
  srcCtx.save();srcCtx.globalAlpha=n.opacity*timeBright;

  // L1 halo (matches Möbius)
  const haloR=sz*5;
  const op1=(isH?.6:.4)+Math.sin(t*1.5+st.phase)*.08;
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  const g1=srcCtx.createRadialGradient(n.x,n.y,0,n.x,n.y,haloR);
  g1.addColorStop(0,`rgba(${cr},${cg},${cb},${(op1*.8).toFixed(3)})`);
  g1.addColorStop(.15,`rgba(${cr},${cg},${cb},${(op1*.4).toFixed(3)})`);
  g1.addColorStop(.4,`rgba(${cr},${cg},${cb},${(op1*.12).toFixed(3)})`);
  g1.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
  srcCtx.fillStyle=g1;srcCtx.fillRect(n.x-haloR,n.y-haloR,haloR*2,haloR*2);
  srcCtx.restore();

  // L2 outer atmosphere ring
  const outerR=sz*4.5;
  const op2=(isH?.08:.04)+Math.sin(t*.7+st.phase)*.02;
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  const g2=srcCtx.createRadialGradient(n.x,n.y,outerR*.7,n.x,n.y,outerR);
  g2.addColorStop(0,`rgba(${cr},${cg},${cb},0)`);
  g2.addColorStop(.6,`rgba(${cr},${cg},${cb},${(op2*.4).toFixed(3)})`);
  g2.addColorStop(1,`rgba(${cr},${cg},${cb},${op2.toFixed(3)})`);
  srcCtx.fillStyle=g2;srcCtx.beginPath();srcCtx.arc(n.x,n.y,outerR,0,Math.PI*2);srcCtx.fill();
  srcCtx.restore();

  // L3 inner glow
  const innerR=sz*2.8;
  const op3=(isH?.16:.08)+Math.sin(t*1.1+st.phase)*.03;
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  const g3=srcCtx.createRadialGradient(n.x,n.y,0,n.x,n.y,innerR);
  g3.addColorStop(0,`rgba(${cr},${cg},${cb},${(op3*.7).toFixed(3)})`);
  g3.addColorStop(.6,`rgba(${cr},${cg},${cb},${(op3*.2).toFixed(3)})`);
  g3.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
  srcCtx.fillStyle=g3;srcCtx.fillRect(n.x-innerR,n.y-innerR,innerR*2,innerR*2);
  srcCtx.restore();

  // L4 primary orbital ring (tilted ellipse, rotates)
  const ringTilt=Math.PI/2.8;
  const ringRotZ=t*.12+st.ringPhase;
  const r1Radius=sz*2.5;
  const op4=(isH?.4:.25)+Math.sin(t*.8+st.phase)*.05;
  srcCtx.save();srcCtx.translate(n.x,n.y);srcCtx.rotate(ringRotZ);srcCtx.scale(1,Math.cos(ringTilt));
  srcCtx.strokeStyle=`rgba(${cr},${cg},${cb},${op4.toFixed(3)})`;
  srcCtx.lineWidth=Math.max(1,sz*.14);
  srcCtx.beginPath();srcCtx.arc(0,0,r1Radius,0,Math.PI*2);srcCtx.stroke();
  srcCtx.strokeStyle=`rgba(${cr},${cg},${cb},${(op4*.35).toFixed(3)})`;
  srcCtx.lineWidth=Math.max(1,sz*.25);srcCtx.stroke();
  srcCtx.restore();

  // L5 secondary ring
  const r2Radius=sz*3;
  const ringRotZ2=-t*.08+st.ringPhase*.7;
  const op5=(isH?.14:.07)+Math.sin(t*.6+st.phase)*.02;
  srcCtx.save();srcCtx.translate(n.x,n.y);srcCtx.rotate(ringRotZ2);srcCtx.scale(1,.28);
  srcCtx.strokeStyle=`rgba(255,255,255,${op5.toFixed(3)})`;
  srcCtx.lineWidth=Math.max(.8,sz*.08);
  srcCtx.beginPath();srcCtx.arc(0,0,r2Radius,0,Math.PI*2);srcCtx.stroke();
  srcCtx.restore();

  // L6 main body (phong shading — matches Möbius exactly)
  const hr=Math.min(255,cr+80),hg=Math.min(255,cg+80),hb=Math.min(255,cb+80);
  const lx=n.x-sz*.35,ly=n.y-sz*.35;
  const g6=srcCtx.createRadialGradient(lx,ly,0,n.x,n.y,sz);
  g6.addColorStop(0,`rgba(${hr},${hg},${hb},1)`);
  g6.addColorStop(.3,`rgba(${cr},${cg},${cb},.98)`);
  g6.addColorStop(.8,`rgba(${cr*.5|0},${cg*.5|0},${cb*.5|0},.9)`);
  g6.addColorStop(1,`rgba(${cr*.25|0},${cg*.25|0},${cb*.25|0},.82)`);
  srcCtx.fillStyle=g6;srcCtx.beginPath();srcCtx.arc(n.x,n.y,sz,0,Math.PI*2);srcCtx.fill();

  // L7 white core
  const coreR=sz*.38;const op7=isH?.7:.45;
  const g7=srcCtx.createRadialGradient(n.x-sz*.15,n.y-sz*.15,0,n.x,n.y,coreR);
  g7.addColorStop(0,`rgba(255,255,255,${op7.toFixed(3)})`);
  g7.addColorStop(1,`rgba(255,255,255,${(op7*.35).toFixed(3)})`);
  srcCtx.fillStyle=g7;srcCtx.beginPath();srcCtx.arc(n.x,n.y,coreR,0,Math.PI*2);srcCtx.fill();

  // Specular
  srcCtx.beginPath();srcCtx.arc(n.x-sz*.3,n.y-sz*.3,sz*.14,0,Math.PI*2);
  srcCtx.fillStyle='rgba(255,255,255,.6)';srcCtx.fill();

  // Comets (orbiting particles — same as Möbius)
  srcCtx.save();srcCtx.globalCompositeOperation='lighter';
  for(const cm of st.comets){
    cm.angle+=cm.speed*.015;
    const rx=Math.cos(cm.angle)*cm.radius*sz;
    const ry=cm.yOff*sz+Math.sin(cm.angle*2)*cm.radius*sz*.06;
    const rz=Math.sin(cm.angle)*cm.radius*sz;
    const px=rx*Math.cos(cm.tiltZ)-ry*Math.sin(cm.tiltZ);
    const py=rx*Math.sin(cm.tiltZ)*Math.sin(cm.tiltX)+ry*Math.cos(cm.tiltX)+rz*Math.sin(cm.tiltX)*.3;
    const csx=n.x+px,csy=n.y+py;
    const cSz=cm.size*sz*.9;
    const cOp=isH?.6:.35;
    srcCtx.beginPath();srcCtx.arc(csx,csy,cSz*.5,0,Math.PI*2);
    srcCtx.fillStyle=`rgba(${hr},${hg},${hb},${cOp.toFixed(3)})`;srcCtx.fill();
  }
  srcCtx.restore();

  // Label below planet
  srcCtx.fillStyle=`rgba(255,255,255,${(n.opacity*.7).toFixed(3)})`;
  srcCtx.font=`${10*dp}px 'Noto Sans SC',sans-serif`;srcCtx.textAlign='center';
  srcCtx.fillText(n.rec.n.length>10?n.rec.n.slice(0,9)+'…':n.rec.n,n.x,n.y+sz+14*dp);
  srcCtx.fillStyle=`rgba(${cr},${cg},${cb},${(n.opacity*.55).toFixed(3)})`;
  srcCtx.font=`${9*dp}px 'Noto Sans SC',sans-serif`;
  srcCtx.fillText(n.rec.s+' 分',n.x,n.y+sz+26*dp);

  srcCtx.restore();
  n._screenR=sz/dp;n._screenX=n.x/dp;n._screenY=n.y/dp;
}

// ============ SUPERNOVA DECAY (refined: cracks, white flash, 40-particle burst) ============
function triggerSupernova(node){
  node.state='supernova';
  supernovaFx.push({node,t0:performance.now()*0.001,burstParticles:[],flashAlpha:0});
}
function updateSupernovae(t){
  const dp=devicePixelRatio;
  for(let i=supernovaFx.length-1;i>=0;i--){
    const fx=supernovaFx[i],n=fx.node,el=t-fx.t0;

    // Phase 1 (0-0.6s): Expansion + color shift to red + surface cracks
    if(el<0.6){
      const p=el/0.6;
      n.size=n._baseSize*(1+p*1.5);
      n.ct={r:255,g:Math.max(50,n._baseCt.g*(1-p)),b:Math.max(30,n._baseCt.b*(1-p)),hex:'#ff3030',l:n._baseCt.l,i:n._baseCt.i};
      // Draw surface cracks when >30% through expansion
      if(p>0.3){
        const sz=n.size*dp;
        const crackOp=((p-0.3)/0.7)*0.6;
        srcCtx.save();
        srcCtx.strokeStyle=`rgba(255,255,150,${crackOp.toFixed(2)})`;
        srcCtx.lineWidth=1*dp;
        const crackCount=8;
        for(let k=0;k<crackCount;k++){
          const angle=k/crackCount*Math.PI*2+Math.sin(k*1.7)*0.3;
          const x1=n.x+Math.cos(angle)*sz*0.4;
          const y1=n.y+Math.sin(angle)*sz*0.4;
          const x2=n.x+Math.cos(angle)*sz*1.1;
          const y2=n.y+Math.sin(angle)*sz*1.1;
          // Jagged crack (2 segments)
          const mx=n.x+Math.cos(angle+0.15)*sz*0.7+Math.sin(k*3)*sz*0.1;
          const my=n.y+Math.sin(angle+0.15)*sz*0.7+Math.cos(k*3)*sz*0.1;
          srcCtx.beginPath();srcCtx.moveTo(x1,y1);srcCtx.lineTo(mx,my);srcCtx.lineTo(x2,y2);srcCtx.stroke();
        }
        srcCtx.restore();
      }
    }
    // Phase 2 (0.6-1.0s): Implosion + white flash
    else if(el<1.0){
      const p=(el-0.6)/0.4;
      n.size=n._baseSize*Math.max(0.12,2.5-p*2.38);
      n.opacity=Math.max(0.3,1-p*0.5);
      fx.flashAlpha=1-p; // white flash fades out
      // Draw white flash
      if(fx.flashAlpha>0.01){
        const sz=n._baseSize*dp*2.5;
        const fg=srcCtx.createRadialGradient(n.x,n.y,0,n.x,n.y,sz*2);
        fg.addColorStop(0,`rgba(255,255,255,${(fx.flashAlpha*0.8).toFixed(2)})`);
        fg.addColorStop(0.3,`rgba(255,255,220,${(fx.flashAlpha*0.4).toFixed(2)})`);
        fg.addColorStop(1,'rgba(255,255,255,0)');
        srcCtx.save();srcCtx.globalCompositeOperation='lighter';
        srcCtx.fillStyle=fg;srcCtx.fillRect(n.x-sz*2,n.y-sz*2,sz*4,sz*4);
        srcCtx.restore();
      }
    }
    // Phase 3 (1.0-1.4s): 40-particle colored burst
    else if(el<1.4){
      if(fx.burstParticles.length===0){
        const cr=n._baseCt.r,cg=n._baseCt.g,cb=n._baseCt.b;
        for(let j=0;j<40;j++){
          const a=Math.random()*Math.PI*2,spd=1.5+Math.random()*4;
          // Colored particles: mix of original color, white, and warm tones
          const colorMix=Math.random();
          let pr,pg,pb;
          if(colorMix<0.4){pr=cr;pg=cg;pb=cb;} // original color
          else if(colorMix<0.7){pr=255;pg=200+Math.random()*55;pb=100+Math.random()*100;} // warm
          else{pr=220+Math.random()*35;pg=220+Math.random()*35;pb=220+Math.random()*35;} // white-ish
          fx.burstParticles.push({x:n.x,y:n.y,vx:Math.cos(a)*spd*dp,vy:Math.sin(a)*spd*dp,
            life:1,size:0.8+Math.random()*2.5,r:pr,g:pg,b:pb,
            trail:[] // particle trail positions
          });
        }
      }
      n.size=n._baseSize*0.12;n.opacity=0.2;
    }
    // Phase 4 (1.4s+): White dwarf remnant
    else{
      n.size=n._baseSize*0.3;n.opacity=0.25;
      n.ct={r:180,g:190,b:210,hex:'#b4bee2',l:n._baseCt.l,i:n._baseCt.i};
      n.state='remnant';n.breathIndependent=true;
      if(el>3.0){supernovaFx.splice(i,1);continue;}
    }

    // Draw burst particles with trailing effect
    for(let j=fx.burstParticles.length-1;j>=0;j--){
      const bp=fx.burstParticles[j];
      // Store trail position
      bp.trail.push({x:bp.x,y:bp.y});
      if(bp.trail.length>6)bp.trail.shift();
      bp.x+=bp.vx;bp.y+=bp.vy;bp.vx*=0.95;bp.vy*=0.95;bp.life-=0.02;
      if(bp.life<=0){fx.burstParticles.splice(j,1);continue;}
      // Draw trail
      srcCtx.save();srcCtx.globalCompositeOperation='lighter';
      for(let ti=0;ti<bp.trail.length;ti++){
        const tp=bp.trail[ti];
        const ta=(ti/bp.trail.length)*bp.life*0.3;
        srcCtx.fillStyle=`rgba(${bp.r|0},${bp.g|0},${bp.b|0},${ta.toFixed(2)})`;
        srcCtx.beginPath();srcCtx.arc(tp.x,tp.y,bp.size*dp*0.5,0,Math.PI*2);srcCtx.fill();
      }
      // Draw particle head
      srcCtx.fillStyle=`rgba(${bp.r|0},${bp.g|0},${bp.b|0},${(bp.life*0.7).toFixed(2)})`;
      srcCtx.beginPath();srcCtx.arc(bp.x,bp.y,bp.size*dp,0,Math.PI*2);srcCtx.fill();
      srcCtx.restore();
    }
    srcCtx.globalAlpha=1;
  }
}

// ============ SPIRAL TIME CONNECTION LINES + TIME LABELS ============
function drawSpiralConnections(t){
  if(focusNodes.length<2)return;
  const dp=devicePixelRatio;
  // Sort oldest→newest (outer→inner spiral)
  const sorted=[...focusNodes].filter(n=>n.opacity>0.05&&n.state!=='remnant')
    .sort((a,b)=>new Date(a.rec.d)-new Date(b.rec.d));
  if(sorted.length<2)return;
  srcCtx.save();

  // Draw flowing gradient spiral line (brighter toward center = newer)
  for(let i=1;i<sorted.length;i++){
    const a=sorted[i-1],b=sorted[i];
    const frac=i/(sorted.length-1); // 0=oldest edge, 1=newest center
    const alpha=0.04+frac*0.12; // gets brighter toward center
    srcCtx.strokeStyle=`rgba(100,255,218,${alpha.toFixed(3)})`;
    srcCtx.lineWidth=(0.5+frac*1)*dp;
    srcCtx.setLineDash([3*dp,6*dp]);
    srcCtx.lineDashOffset=-t*18;
    srcCtx.beginPath();
    const mx=(a.x+b.x)/2+(Math.sin(t*0.5+i)*10*dp);
    const my=(a.y+b.y)/2+(Math.cos(t*0.5+i)*8*dp);
    srcCtx.moveTo(a.x,a.y);srcCtx.quadraticCurveTo(mx,my,b.x,b.y);srcCtx.stroke();
  }
  srcCtx.setLineDash([]);

  // Time labels on first (oldest) and last (newest) planets
  const oldest=sorted[0], newest=sorted[sorted.length-1];
  srcCtx.font=`${8*dp}px monospace`;srcCtx.textAlign='center';

  // "NOW" label near newest (center)
  srcCtx.fillStyle=`rgba(100,255,218,${(newest.opacity*0.5).toFixed(3)})`;
  srcCtx.fillText('NOW',newest.x,newest.y-newest._screenR*dp-8*dp);

  // Date label on oldest (outer)
  if(oldest!==newest){
    srcCtx.fillStyle=`rgba(100,255,218,${(oldest.opacity*0.3).toFixed(3)})`;
    srcCtx.fillText(oldest.rec.d.slice(5),oldest.x,oldest.y-oldest._screenR*dp-8*dp);
  }

  srcCtx.restore();
}

// ============ SPIRAL NEBULA LAYOUT ============
// Places planets on a logarithmic spiral from center (newest) outward (oldest).
function spiralLayout(recs){
  const c=lrCenter();
  const baseR=lrInRadius();
  // Use a much larger portion of the available triangle — 0.65 of inradius
  // This spreads planets across most of the visible LR zone
  const maxRadius=baseR*0.82; // use most of the triangle area
  // Sort by date: newest first (center), oldest last (outer)
  const sorted=[...recs].sort((a,b)=>new Date(b.d)-new Date(a.d));
  const n=sorted.length;
  // More turns for more records — keeps inter-planet spacing generous
  const turns=Math.max(3.0, 2.0 + n*0.25);
  return sorted.map((r,i)=>{
    const frac=n===1?0:i/(n-1); // 0=newest, 1=oldest
    const theta=frac*Math.PI*2*turns+Math.PI*0.4;
    // Start from 15% of max radius so center isn't too crowded
    const radius=maxRadius*(0.15+frac*0.85);
    // Moderate jitter to break perfect-spiral look
    const jitterR=radius*0.10*Math.sin(i*2.7+0.5);
    const jitterA=0.18*Math.cos(i*3.1+1.2);
    const tx=c.x+Math.cos(theta+jitterA)*(radius+jitterR);
    const ty=c.y+Math.sin(theta+jitterA)*(radius+jitterR);
    return{rec:r,tx,ty,timeFrac:frac};
  });
}

// ============ ACTIVATE FOCUS LENS ============
function activateFocusLens(recs){
  // Ensure canvas has proper dimensions before computing layout
  resizeSrcCanvas();
  const c=lrCenter();
  const layout=spiralLayout(recs);
  focusNodes=layout.map((l,i)=>{
    const ct=CT[l.rec.c];
    // Smaller planets to fit the triangle. Newest(center)=slightly larger, oldest=smaller.
    const ageFade=1-l.timeFrac*0.3; // 1.0 for newest → 0.7 for oldest
    const baseSz=(4+l.rec.s*0.04)*ageFade;
    return{rec:l.rec,ct:{...ct},_baseCt:{...ct},
      x:c.x,y:c.y,targetX:l.tx,targetY:l.ty,
      size:baseSz,_baseSize:baseSz,
      phase:i*0.4,opacity:0,
      timeFrac:l.timeFrac, // 0=newest, 1=oldest — used for brightness
      orbitAngle:Math.random()*Math.PI*2,orbitSpeed:0.003+Math.random()*0.004,
      state:'dim',breathIndependent:false};
  });
  rippleWaves=[];supernovaFx=[];
  if(lensState==='standby'){startScanLock();}
  else{lensState='active';
    const c2=lrCenter();
    for(let i=0;i<3;i++)rippleWaves.push({x:c2.x,y:c2.y,r:0,maxR:lrInRadius()*0.45,
      speed:90+i*20,alpha:0.35-i*0.08,born:performance.now()*0.001+i*0.12});
    focusNodes.forEach(n=>n.state='waking');
  }
}

function deactivateFocusLens(){
  focusNodes.forEach(n=>{n.opacity=0;n.state='dim'});
  lensState='standby';TEL.aperture=0.85;TEL.innerFade=0; // back to standby
  hoveredNode=null;lockedNode=null;srcTipEl.classList.remove('show');
}

// ============ MAIN RENDER LOOP ============
function renderFocusLens(){
  // Safety: ensure canvas has dimensions (embedded mode may initialize before layout)
  if(srcW<10||srcH<10) resizeSrcCanvas();
  srcCtx.clearRect(0,0,srcW,srcH);
  const t=performance.now()*0.001;
  const c=lrCenter();
  const baseR=lrInRadius();
  const scopeR=baseR*TEL.aperture;

  // Star field background for right canvas (matches left canvas style)
  if(!renderFocusLens._stars){
    renderFocusLens._stars=[];
    for(let i=0;i<140;i++){
      const brightness=Math.random();
      renderFocusLens._stars.push({
        x:Math.random(), y:Math.random(),
        r:brightness>.92?1.6+Math.random()*1.0:Math.random()*1.2+.25,
        phase:Math.random()*Math.PI*2, bright:brightness
      });
    }
  }
  const dp=devicePixelRatio;
  for(const st of renderFocusLens._stars){
    const sx=st.x*srcW, sy=st.y*srcH;
    const tw=.4+Math.sin(t*1.1+st.phase)*.35;
    const alpha=st.bright>.92?.50+tw*.22:st.bright>.6?.26+tw*.15:.12+tw*.08;
    const cr=st.bright>.92?210:180, cg=st.bright>.92?230:200;
    srcCtx.fillStyle=`rgba(${cr},${cg},255,${alpha.toFixed(3)})`;
    srcCtx.beginPath();srcCtx.arc(sx,sy,st.r*dp,0,Math.PI*2);srcCtx.fill();
    if(st.bright>.85){
      const gl=srcCtx.createRadialGradient(sx,sy,0,sx,sy,st.r*dp*3.5);
      gl.addColorStop(0,`rgba(160,200,255,${(alpha*.15).toFixed(3)})`);
      gl.addColorStop(1,'rgba(160,200,255,0)');
      srcCtx.fillStyle=gl;const hr=st.r*dp*3.5;
      srcCtx.fillRect(sx-hr,sy-hr,hr*2,hr*2);
    }
  }

  // Smooth mouse rotation (lerp toward target)
  TEL.mouseRot+=(TEL.mouseRotTarget-TEL.mouseRot)*0.08;

  updateAndDrawParticles(t);
  if(lensState==='scanlock')updateScanLock(t);

  // Update planet positions + states
  focusNodes.forEach(n=>{
    n.x+=(n.targetX-n.x)*0.06;n.y+=(n.targetY-n.y)*0.06;
    if(n.state==='waking'){n.opacity=Math.min(1,n.opacity+0.035);if(n.opacity>=0.95){n.state='alive';n.opacity=1;}}
    else if(n.state==='alive'||n.state==='remnant'){}
    else if(n.state!=='supernova'){n.opacity=Math.max(0,n.opacity-0.02);}
  });

  drawSpiralConnections(t);
  updateRipples(t);
  focusNodes.forEach(n=>{if(n.opacity<0.01||n.state==='supernova')return;drawSrcPlanet(n,t);});
  updateSupernovae(t);
  focusNodes.forEach(n=>{if(n.state==='supernova'&&n.opacity>0.01)drawSrcPlanet(n,t);});

  // Telescope HUD overlay (no text — geometric only)
  if(lensState==='standby'){
    drawScopeHUD(c.x,c.y,scopeR,t,1.0);
  }else if(lensState==='scanlock'){
    // Zoom-in: scopeR grows via TEL.aperture, arcs spread apart. Faster spin.
    drawScopeHUD(c.x,c.y,scopeR,t*(1+TEL.scanProg*1.5),Math.max(0.35,1.0-TEL.scanProg*0.4));
  }else if(lensState==='active'){
    // Hold exactly the scanlock-end state — no further changes, no decay.
    drawScopeHUD(c.x,c.y,scopeR,t*TEL.frozenTimeMul,TEL.frozenOp);
    drawWaterRipple(c.x,c.y,scopeR,t);
  }
}

// Hook into main render loop
const _origRender=render;
render=function(){_origRender();renderFocusLens();};

// ============ MOUSE-DRIVEN TELESCOPE ROTATION (standby + active) ============
(function(){
  const lrEl=document.getElementById('zoneLr');
  lrEl.addEventListener('mousemove',function(e){
    if(lensState==='scanlock')return; // block during zoom animation only
    const rect=lrEl.getBoundingClientRect();
    const dp=devicePixelRatio;
    const c=lrCenter();
    const mx=(e.clientX-rect.left)*dp, my=(e.clientY-rect.top)*dp;
    const angle=Math.atan2(my-c.y,mx-c.x);
    if(TEL.lastMouseA!==null){
      let delta=angle-TEL.lastMouseA;
      if(delta>Math.PI)delta-=Math.PI*2;
      if(delta<-Math.PI)delta+=Math.PI*2;
      TEL.mouseRotTarget+=delta*0.25; // 25% of mouse angular movement
    }
    TEL.lastMouseA=angle;
  });
  lrEl.addEventListener('mouseleave',function(){TEL.lastMouseA=null;});
})();

// ============ MOUSE INTERACTION — Sticky Tooltip ============
(function(){
  const lrEl=document.getElementById('zoneLr');
  let tipVisible=false;
  let tipHideTimer=null;

  function getNodeAt(mx,my){
    const rect=lrEl.getBoundingClientRect();
    const lx=mx-rect.left,ly=my-rect.top;
    for(let i=focusNodes.length-1;i>=0;i--){
      const n=focusNodes[i];if(n.opacity<0.3||n.state==='dim')continue;
      const nx=n._screenX||0,ny=n._screenY||0,nr=n._screenR||10;
      if((lx-nx)**2+(ly-ny)**2<=(nr+8)**2)return n;}
    return null;
  }

  function buildTipHTML(n){
    const r=n.rec;
    const _ct=CT[r.c]||{hex:'#888',i:'📝',l:r.c};
    return `<div class="st-cat" style="color:${_ct.hex}">${_ct.i} ${_ct.l}</div>
<div class="st-name">${r.n}</div>
<div class="st-meta">${r.d}${r.o?' · '+r.o:''}${r.m?' · '+r.m:''}</div>
<div class="st-score">评分 <b style="color:${_ct.hex}">${r.s}</b>/100</div>
<div class="st-tags">${r.f.map(f=>'<span class="st-tag">'+f+'</span>').join('')}</div>
<div class="st-fb">
  <button onclick="voteSrc('${r.id}',1,this)">👍 准确</button>
  <button onclick="voteSrc('${r.id}',-1,this)">👎 不对</button>
</div>`;
  }

  function showTip(node,x,y){
    if(tipHideTimer){clearTimeout(tipHideTimer);tipHideTimer=null;}
    hoveredNode=node;
    srcTipEl.innerHTML=buildTipHTML(node);
    // Position: prefer to the right of cursor, but clamp to viewport
    const tipW=220,tipH=200;
    let tx=x+16,ty=y-10;
    if(tx+tipW>innerWidth-10)tx=x-tipW-10;
    if(ty+tipH>innerHeight-10)ty=innerHeight-tipH-10;
    if(ty<10)ty=10;
    srcTipEl.style.left=tx+'px';srcTipEl.style.top=ty+'px';
    srcTipEl.classList.add('show');tipVisible=true;
    lrEl.style.cursor='pointer';
  }

  function scheduleTipHide(){
    if(tipHideTimer)return;
    tipHideTimer=setTimeout(()=>{
      tipHideTimer=null;hoveredNode=null;
      srcTipEl.classList.remove('show');tipVisible=false;
      lrEl.style.cursor='';
    },300); // 300ms grace period — user can move to tooltip
  }

  lrEl.addEventListener('mousemove',e=>{
    const hit=getNodeAt(e.clientX,e.clientY);
    if(hit){
      if(hit!==hoveredNode) showTip(hit,e.clientX,e.clientY);
      else if(tipHideTimer){clearTimeout(tipHideTimer);tipHideTimer=null;} // still on same planet
    }else if(tipVisible){
      scheduleTipHide();
    }
  });

  // When mouse enters the tooltip itself, cancel the hide timer
  srcTipEl.addEventListener('mouseenter',()=>{
    if(tipHideTimer){clearTimeout(tipHideTimer);tipHideTimer=null;}
  });
  // When mouse leaves the tooltip, start hide timer
  srcTipEl.addEventListener('mouseleave',()=>{
    scheduleTipHide();
  });

  lrEl.addEventListener('mouseleave',()=>{scheduleTipHide();});

  lrEl.addEventListener('click',e=>{
    const hit=getNodeAt(e.clientX,e.clientY);
    if(hit) showModal(hit.rec);
  });
})();

// ============ CHAT (parallelogram pages + diagonal scroll) ============
// Geometry (within stage, below topbar):
//   Left divider:  (0, sH) → (DL*W, 0)      where sH = stage height, DL = 0.4
//   Right divider: (W, 0)  → (DR*W, sH)      where DR = 0.6
//   These are parallel ⟹ middle zone is a parallelogram.
//   AI messages along LEFT divider, user along RIGHT divider, interleaved.
//   When a page fills, it archives and a new blank page appears.
//   User scrolls between pages diagonally (along the divider direction).

const pageScrollerEl=document.getElementById('pageScroller');
const ciEl=document.getElementById('ci');
const atchEl=document.getElementById('atch');
const fileInputEl=document.getElementById('fileInput');
const pageDotsEl=document.getElementById('pageDots');

// Geometry constants
const DL=0.4, DR=0.6;
const TOPBAR_H=_EMBEDDED?0:48;
const Y_PAD_TOP=70;      // top padding — keep messages away from narrow top edge
const Y_PAD_BOT=90;      // bottom padding (clear of input area)
const Y_STEP=95;          // vertical step between message slots
const PERP_AI=75;         // perpendicular offset into band (AI, left side)
const PERP_USER=75;       // perpendicular offset into band (user, right side)
const MSG_EST_H=72;       // estimated rendered height of one message bubble
const DIVIDER_GAP=16;     // extra gap after a turn divider before next msg

// Page state
const pages=[]; // each page: {msgs:[], el:null}
let curPageIdx=0;

function stageH(){return _bounds().h-TOPBAR_H}
function fmtTs(){const t=new Date();return String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')}

// ---- Zone clip-paths (called on resize) ----
function updateZoneClips(){
  const W=_bounds().w, H=stageH();
  const lx=DL*W, rx=DR*W;
  // UL triangle: (0,0), (lx,0), (0,H)
  document.getElementById('zoneUl').style.clipPath=`polygon(0 0, ${lx}px 0, 0 ${H}px)`;
  // LR triangle: (W,0), (W,H), (rx,H)
  document.getElementById('zoneLr').style.clipPath=`polygon(${W}px 0, ${W}px ${H}px, ${rx}px ${H}px)`;
  // Mid parallelogram: (lx,0), (W,0), (rx,H), (0,H)
  const midClip=`polygon(${lx}px 0, ${W}px 0, ${rx}px ${H}px, 0 ${H}px)`;
  document.getElementById('zoneMid').style.clipPath=midClip;
  // Constellation canvas gets the same parallelogram clip
  const midCvEl=document.getElementById('midCanvas');
  if(midCvEl) midCvEl.style.clipPath=midClip;
  // Each page gets its OWN parallelogram clip-path (moves with transform)
  applyPageClips();
}
function applyPageClips(){
  const W=_bounds().w, H=stageH();
  const lx=DL*W, rx=DR*W;
  const clip=`polygon(${lx}px 0, ${W}px 0, ${rx}px ${H}px, 0 ${H}px)`;
  pages.forEach(p=>{ p.el.style.clipPath=clip; });
}

// ---- Message position along parallelogram edges ----
// Left divider (AI): (0, sH) → (DL*W, 0). Parametrize by y (0=top, sH=bottom).
// At a given y, boundary x = DL*W*(1 - y/sH)   (x decreases as y increases)
// Right divider (User): (W, 0) → (DR*W, sH). At y, x = W - (W-DR*W)*(y/sH) = W*(1 - (1-DR)*y/sH)
// Perpendicular into the parallelogram band:
//   Both dividers have direction proportional to (DL*W, -sH). Perp CW = (sH, DL*W)/L.
//   For left side, perp INTO band is toward the right → (sH, DL*W)/L
//   For right side, perp INTO band is toward the left → (-sH, -DL*W)/L  (note: same slope because parallel)
function msgPos(tp, y){
  const W=_bounds().w, H=stageH();
  const L=Math.hypot(DL*W, H)||1;
  let bx;
  if(tp==='ai'){
    bx=DL*W*(1-y/H);
    return[bx+(H/L)*PERP_AI, y+(DL*W/L)*PERP_AI];
  }else{
    bx=W*(1-(1-DR)*y/H);
    return[bx-(H/L)*PERP_USER, y-(DL*W/L)*PERP_USER];
  }
}

function buildMsgEl(m){
  const d=document.createElement('div');
  d.className=`msg ${m.tp}`;
  let refHtml='';
  if(m.refs&&m.refs.length){
    refHtml='<div style="margin-top:6px">'+m.refs.map(r=>`<span class="rb" onclick="showRef('${r.id}')">${CT[r.c]?CT[r.c].i:'📝'} ${r.n.slice(0,8)}…</span>`).join('')+'</div>';
  }
  let imgHtml='';
  if(m.imgs&&m.imgs.length){
    imgHtml='<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">'+m.imgs.map(src=>`<img src="${src}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.08)"/>`).join('')+'</div>';
  }
  const av=m.tp==='ai'
    ? `<div class="mav" title="AI 品鉴师">✦</div>`
    : `<div class="uav" title="${USER.name}">${USER.initial}</div>`;
  d.innerHTML=`${av}<div><div class="mb">${m.html}${imgHtml}${refHtml}</div><div class="mti">${m.ts}</div></div>`;
  return d;
}

// ---- Input exclusion zone (horizontal band around the search box) ----
function inputExclZone(){
  const H=stageH();
  const cy=H*0.5;
  return{top:cy-56, bot:cy+56}; // 112px exclusion band
}

// ---- Perpendicular y-offset for a message type ----
// msgPos shifts rendered y by this amount relative to raw y:
//   AI:   py = y + (DL*W/L)*PERP_AI   (shifts DOWN)
//   User: py = y - (DL*W/L)*PERP_USER  (shifts UP)
function perpYOffset(tp){
  const W=_bounds().w, H=stageH();
  const L=Math.hypot(DL*W, H)||1;
  return tp==='ai' ? (DL*W/L)*PERP_AI : -(DL*W/L)*PERP_USER;
}

// Convert a rendered divider Y back to the minimum raw y needed so that
// a message of type `tp` renders fully below that divider line.
function rawYForRenderedBelow(divRenderedY, tp){
  const off=perpYOffset(tp);
  // rendered py = raw_y + off, so raw_y = renderedTarget - off
  return divRenderedY - off;
}

// ---- Check if a page is "full" — simulate layout to see if next msg overflows ----
function isPageFull(page){
  const H=stageH();
  const n=page.msgs.length;
  if(n<3) return false;
  const nextRenderedY=simulateLayoutRenderedY(page.msgs, n+1);
  return nextRenderedY>H-Y_PAD_BOT;
}

// Simulate layout in RENDERED y space. Returns the rendered y where the (targetCount)th message would go.
function simulateLayoutRenderedY(msgs, targetCount){
  const excl=inputExclZone();
  const pageIdx=pages.indexOf(pages.find(p=>p.msgs===msgs));
  let y=Y_PAD_TOP; // raw y cursor
  let aiCount=0;
  let lastDivRenderedY=-Infinity; // divider in RENDERED space

  for(let i=0;i<targetCount;i++){
    // Guess type for the hypothetical next message (alternate user after AI)
    const tp=(i<msgs.length)?msgs[i].tp:'user';

    // Skip input exclusion zone (raw y space)
    if(y+MSG_EST_H>excl.top && y<excl.bot) y=excl.bot;

    // Ensure rendered position is below last divider + gap
    const minRawY=rawYForRenderedBelow(lastDivRenderedY+DIVIDER_GAP, tp);
    if(y<minRawY) y=minRawY;

    const[,py]=msgPos(tp, y);

    if(i>=msgs.length) return py; // rendered y of hypothetical next message

    const m=msgs[i];
    if(m.tp==='ai'){
      aiCount++;
      const isFirstGreeting=(pageIdx===0 && aiCount===1);
      if(!isFirstGreeting){
        lastDivRenderedY=py+MSG_EST_H+8;
      }
    }
    y+=Y_STEP;
  }
  return y+perpYOffset('user'); // fallback rendered estimate
}

// ---- Render a single page's messages into its DOM element ----
// Single-pass layout computing raw y incrementally. Divider avoidance operates
// in RENDERED coordinate space so that the perpendicular y-offset for user
// messages (which shifts them ~26px UP) is correctly accounted for.
function renderPage(page){
  const el=page.el;
  let railAi=el.querySelector('.rail-ai');
  let railUser=el.querySelector('.rail-user');
  if(!railAi){
    railAi=document.createElement('div');railAi.className='rail rail-ai';el.appendChild(railAi);
    railUser=document.createElement('div');railUser.className='rail rail-user';el.appendChild(railUser);
  }
  railAi.innerHTML='';
  railUser.innerHTML='';

  const msgs=page.msgs;
  const n=msgs.length;
  const excl=inputExclZone();
  let y=Y_PAD_TOP;           // raw y cursor
  let aiCount=0;
  let lastDivRenderedY=-Infinity; // divider position in RENDERED space
  const pageIndex=pages.indexOf(page);

  for(let i=0;i<n;i++){
    const m=msgs[i];

    // Skip input exclusion zone (raw y)
    if(y+MSG_EST_H>excl.top && y<excl.bot) y=excl.bot;

    // Ensure this message's RENDERED top is below the last divider + gap.
    // rendered_py = y + perpYOffset(m.tp)
    // We need: rendered_py >= lastDivRenderedY + DIVIDER_GAP
    // So: y >= lastDivRenderedY + DIVIDER_GAP - perpYOffset(m.tp)
    const minRawY=rawYForRenderedBelow(lastDivRenderedY+DIVIDER_GAP, m.tp);
    if(y<minRawY) y=Math.ceil(minRawY);

    const[px,py]=msgPos(m.tp, y);
    // Compute available width: message must stay within the parallelogram clip at rendered py.
    const _W=_bounds().w, _H=stageH();
    // At rendered py, the left divider is at DL*W*(1 - py/H), right at W*(1 - (1-DR)*py/H)
    const clipL=DL*_W*(1-Math.max(0,py)/_H);
    const clipR=_W*(1-(1-DR)*Math.max(0,py)/_H);
    let availW;
    if(m.tp==='ai'){
      // AI bubble starts at px and grows RIGHT → must not exceed clipR
      availW=Math.max(160, clipR - px - 20);
    }else{
      // User bubble anchor at px, extends LEFT via translateX(-100%) → must not go below clipL
      availW=Math.max(160, px - clipL - 20);
    }

    const mel=buildMsgEl(m);
    mel.style.left=px+'px';
    mel.style.top=py+'px';
    mel.style.maxWidth=Math.min(availW, 680)+'px';
    if(m.tp==='user') mel.style.transform='translateX(-100%)';
    if(i<n-3) mel.classList.add('faded');
    (m.tp==='ai'?railAi:railUser).appendChild(mel);

    // Measure actual rendered height of this message bubble (not the fixed estimate)
    const actualH=mel.offsetHeight||MSG_EST_H;
    const stepH=Math.max(Y_STEP, actualH+20); // ensure next message clears this one

    // Turn divider AFTER each AI answer (skip the very first greeting on page 0)
    if(m.tp==='ai'){
      aiCount++;
      const isFirstGreeting=(pageIndex===0 && aiCount===1);
      if(!isFirstGreeting){
        const divRenderedY=py+actualH+8; // place divider BELOW real bottom of bubble
        const divRawY=y+actualH+8;
        const[lx]=msgPos('ai',divRawY);
        const[rx]=msgPos('user',divRawY);
        const dv=document.createElement('div');
        dv.className='turn-div';
        dv.style.top=divRenderedY+'px';
        dv.style.left=(lx+40)+'px';
        dv.style.width=Math.max(0,rx-lx-80)+'px';
        railAi.appendChild(dv);
        lastDivRenderedY=divRenderedY;
      }
    }

    // Advance raw y for next message — use actual height for tall bubbles
    y+=stepH;
  }
}

// ============ DIAGONAL STICKY-STACKING — NATIVE SCROLL DRIVEN ============
//
// Architecture (combines evermind.ai smoothness with true diagonal movement):
//
//  .page-scroller (overflow:hidden — NO native scroll)
//    ├── .chat-page[0]    ← position:absolute, clip-path=parallelogram, transform by JS
//    ├── .chat-page[1]    ← each page has its OWN parallelogram clip-path
//    └── ...
//
//  _vScroll (JS variable)  ← single source of truth for scroll position
//  wheel event → _vScroll → applyDiagonalPositions()  (same frame, zero jitter)
//
// No native scroll means no scroll-vs-JS fight.
// Base page: transform:none — absolutely stationary, gradually blurs.
// Cover page: transform:translate(diagonal offset) — slides from bottom-left.
//
// Stacking logic:
//   pages[i < floor(f)]  → hidden (opacity:0)
//   pages[floor(f)]      → stays in place, blurs as cover arrives
//   pages[ceil(f)]       → slides diagonally from bottom-left toward origin
//   pages[i > ceil(f)]   → fully off-screen diagonally

// Diagonal vector: from bottom-left toward top-right (direction newer pages come FROM)
function diagVec(){
  const W=_bounds().w, H=stageH();
  const L=Math.hypot(DL*W, H)||1;
  return[-DL*W/L, H/L]; // toward bottom-left
}
function diagStep(){return Math.hypot(_bounds().w,stageH())*0.92}

function createPage(){
  const page={msgs:[],el:document.createElement('div')};
  page.el.className='chat-page';
  page.el.style.height=stageH()+'px';
  // Apply parallelogram clip-path to this page
  const W=_bounds().w, H=stageH();
  const lx=DL*W, rx=DR*W;
  page.el.style.clipPath=`polygon(${lx}px 0, ${W}px 0, ${rx}px ${H}px, 0 ${H}px)`;
  pageScrollerEl.appendChild(page.el);
  pages.push(page);
  applyDiagonalPositions();
  updateDots();
  return page;
}

// ============ VIRTUAL SCROLL ============
// No native scroll — overflow:hidden on .page-scroller.
// _vScroll is the single source of truth for scroll position.
// Wheel events update _vScroll directly → applyDiagonalPositions() in the same frame.
// Base page is always at transform:none — absolutely zero jitter.
let _vScroll=0;
let _vScrollAnimId=0; // for cancelling programmatic animations

function applyDiagonalPositions(){
  const H=stageH();
  if(H<=0) return;
  const f=_vScroll/H; // continuous fraction: 0=page0, 1=page1, …
  const[dx,dy]=diagVec();
  const step=diagStep();

  pages.forEach((p,i)=>{
    p.el.style.zIndex=i+1;

    if(i<Math.floor(f)){
      // Fully covered — hidden
      p.el.style.transform='none';
      p.el.style.opacity='0';
      p.el.style.filter='blur(8px)';
      p.el.classList.add('archived');
    }else if(i===Math.floor(f)){
      // Current base page — DEAD STILL, no transform, just blur as cover arrives
      const frac=f-i; // 0→1
      p.el.style.transform='none';
      p.el.style.opacity=String(1-frac*0.5);
      p.el.style.filter=frac>0.01?`blur(${(frac*8).toFixed(1)}px)`:'none';
      p.el.classList.toggle('archived', frac>0.95);
    }else if(i===Math.ceil(f) && Math.ceil(f)!==Math.floor(f)){
      // Cover page — slides diagonally from bottom-left toward origin
      const frac=f-Math.floor(f); // 0→1
      const offset=(1-frac)*step;
      p.el.style.transform=`translate(${offset*dx}px,${offset*dy}px)`;
      p.el.style.opacity=String(0.3+frac*0.7);
      p.el.style.filter='none';
      p.el.classList.remove('archived');
    }else{
      // Future pages — fully off-screen
      const offset=(i-f)*step;
      p.el.style.transform=`translate(${offset*dx}px,${offset*dy}px)`;
      p.el.style.opacity='0';
      p.el.style.filter='none';
      p.el.classList.add('archived');
    }
  });
}

// ---- Wheel input → update _vScroll directly ----
pageScrollerEl.addEventListener('wheel',(e)=>{
  e.preventDefault();
  const maxS=Math.max(0,(pages.length-1)*stageH());
  _vScroll=Math.max(0,Math.min(_vScroll+e.deltaY, maxS));
  applyDiagonalPositions();
  // Track current page index
  const H=stageH();
  if(H<=0) return;
  const newIdx=Math.round(_vScroll/H);
  if(newIdx!==curPageIdx && newIdx>=0 && newIdx<pages.length){
    curPageIdx=newIdx;
    updateDots();
  }
},{passive:false});

// ---- Smooth animated scroll (for programmatic transitions) ----
function animateScrollTo(target,duration){
  duration=duration||400;
  cancelAnimationFrame(_vScrollAnimId);
  const start=_vScroll;
  const diff=target-start;
  if(Math.abs(diff)<1){_vScroll=target;applyDiagonalPositions();return}
  const t0=performance.now();
  function tick(now){
    const t=Math.min(1,(now-t0)/duration);
    const ease=t<.5?2*t*t:-1+(4-2*t)*t; // easeInOutQuad
    _vScroll=start+diff*ease;
    applyDiagonalPositions();
    if(t<1) _vScrollAnimId=requestAnimationFrame(tick);
    else{
      _vScroll=target;applyDiagonalPositions();
      const H=stageH();
      if(H>0){const idx=Math.round(_vScroll/H);if(idx!==curPageIdx&&idx>=0&&idx<pages.length){curPageIdx=idx;updateDots()}}
    }
  }
  _vScrollAnimId=requestAnimationFrame(tick);
}

function updateDots(){
  pageDotsEl.innerHTML='';
  pages.forEach((_,i)=>{
    const d=document.createElement('div');
    d.className='dot'+(i===curPageIdx?' active':'');
    d.addEventListener('click',()=>goToPage(i));
    pageDotsEl.appendChild(d);
  });
}

function goToPage(idx){
  idx=Math.max(0,Math.min(pages.length-1,idx));
  curPageIdx=idx;
  animateScrollTo(idx*stageH());
  updateDots();
}

function curPage(){return pages[curPageIdx]}

function addMsg(tp,html,refs,imgs){
  let page=curPage();
  if(isPageFull(page)){
    page.el.classList.add('archived');
    const newPage=createPage();
    curPageIdx=pages.length-1;
    animateScrollTo(curPageIdx*stageH(), 500);
    updateDots();
    page=newPage;
  }
  page.msgs.push({tp,html,refs:refs||null,imgs:imgs||null,ts:fmtTs()});
  renderPage(page);
}

// ---- Resize handler ----
function onResize(){
  updateZoneClips(); // also calls applyPageClips()
  const H=stageH();
  pages.forEach(p=>{
    p.el.style.height=H+'px';
    renderPage(p);
  });
  // Clamp _vScroll to new range
  const maxS=Math.max(0,(pages.length-1)*H);
  _vScroll=Math.min(_vScroll,maxS);
  applyDiagonalPositions();
}
addEventListener('resize',onResize);

// ---- Initialize ----
updateZoneClips();
createPage();

// Seed: only a greeting — page starts nearly empty, awaiting user input
addMsg('ai','你好！我是你的 AI 品鉴师 ✦<br>基于你的品鉴记忆，我可以回顾旧的体验、分析风味偏好、或帮你记录新的一次。');

// Dynamic keyword search — auto-generated from actual CT (category table) and RC (records)
// For each category: use its display name, key, and top flavor tags from records as keywords
const CAT_KEYWORDS={};
Object.keys(CT).forEach(catKey=>{
  const catInfo=CT[catKey];
  const kws=new Set();
  // Add the category display name and key
  if(catInfo.l) kws.add(catInfo.l);
  if(catKey.length>1) kws.add(catKey);
  // Add top flavor tags from records in this category (most common ones)
  const catRecs=RC.filter(r=>r.c===catKey);
  const tagCount={};
  catRecs.forEach(r=>(r.f||[]).forEach(t=>{tagCount[t]=(tagCount[t]||0)+1}));
  // Take top 6 most frequent tags as keywords
  Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([t])=>kws.add(t));
  // Add record names as keywords (shortened)
  catRecs.forEach(r=>{
    const short=r.n.split(/\s+/)[0];
    if(short.length>=2) kws.add(short);
  });
  CAT_KEYWORDS[catKey]=[...kws];
});
function findByKeyword(text){
  // Find matching category
  let matchedCat=null;
  for(const[cat,kws]of Object.entries(CAT_KEYWORDS)){
    if(kws.some(k=>text.includes(k))){matchedCat=cat;break;}
  }
  // Also try matching record names directly
  let nameMatches=RC.filter(r=>text.includes(r.n)||r.n.includes(text.replace(/[?？!！。，、]/g,'')));
  if(matchedCat){
    const catRecs=RC.filter(r=>r.c===matchedCat).sort((a,b)=>b.s-a.s);
    if(catRecs.length>0){
      const catInfo=CT[matchedCat];
      const topN=catRecs.slice(0,3);
      const resp=`${catInfo?catInfo.i:''} 你有 ${catRecs.length} 条${catInfo?catInfo.l:''}记录。`+
        topN.map((r,i)=>`<br>${i+1}. <b>${r.n}</b> ${r.s} 分`).join('')+
        (catRecs.length>3?`<br><span style="color:var(--sub)">…还有 ${catRecs.length-3} 条</span>`:'');
      // refs = ALL records in this category (shown as planets in source tracing)
      return{r:resp,refs:catRecs};
    }
  }
  if(nameMatches.length>0){
    const r=nameMatches[0];
    const catInfo=CT[r.c];
    // Also show all records in same category for context
    const sameCategory=RC.filter(rec=>rec.c===r.c).sort((a,b)=>b.s-a.s);
    return{r:`<b>${r.n}</b>（${catInfo?catInfo.l:r.c}）${r.s} 分<br>${r.nt||'暂无笔记'}`,refs:sameCategory};
  }
  // General queries: summary/preference/analysis
  if(/偏好|分析|总结|统计|overview|概览/.test(text)){
    const total=RC.length;
    const cats=Object.keys(G).length;
    const avgScore=total>0?Math.round(RC.reduce((s,r)=>s+r.s,0)/total):0;
    // Show top records from each category for a comprehensive view
    const topPerCat=CK_ALL.map(k=>G[k].slice().sort((a,b)=>b.s-a.s)[0]).filter(Boolean);
    const topRecs=RC.slice().sort((a,b)=>b.s-a.s).slice(0,3);
    return{r:`你共有 <b>${total}</b> 条记录，涵盖 <b>${cats}</b> 个品类，均分 <b>${avgScore}</b>。`+
      `<br>最高分：`+topRecs.map(r=>`<b>${r.n}</b>(${r.s})`).join('、'),refs:topPerCat};
  }
  // Recommend
  if(/推荐|最好|最佳|最高|top/.test(text)){
    const topRecs=RC.slice().sort((a,b)=>b.s-a.s).slice(0,8);
    return{r:`你评分最高的品鉴：`+topRecs.slice(0,5).map((r,i)=>`<br>${i+1}. <b>${r.n}</b>（${CT[r.c]?CT[r.c].l:r.c}）${r.s} 分`).join(''),refs:topRecs};
  }
  return null;
}

// Tasting-note detection patterns — longer descriptive text with flavor/experience keywords
const TASTING_PATTERNS=/花香|果香|蜜韵|烟熏|清爽|浓郁|丝滑|甘甜|酸感|苦味|甜感|回甘|余韵|口感|香气|层次|醇厚|顺滑|细腻|柔和|尝|喝了|品了|试了|入口|收尾/;

// Build the save-record editable card HTML
// Dynamic category name list for detection
const _catNames=Object.values(CT).map(c=>c.l).filter(l=>l&&l.length>=1).sort((a,b)=>b.length-a.length);
const _catNameRegex=_catNames.length?new RegExp(_catNames.join('|')):null;
function buildSaveCard(t2){
  const excerpt=t2.slice(0,80);
  const guessCategory=_catNameRegex?((t2.match(_catNameRegex))||[])[0]||'':'';
  const guessFlavor=t2.match(/花香|果香|蜜韵|烟熏|清爽|浓郁|丝滑|甘甜|酸感|苦味|甜感|回甘|余韵|口感|香气|层次|醇厚|顺滑|细腻|柔和/g)||[];
  return{r:`我检测到这可能是一条品鉴体验，要保存吗？`+
    `<div class="pc"><h4>📝 保存品鉴记录</h4>`+
    `<p style="margin:6px 0;font-size:12px;color:var(--sub)">以下信息已从对话中提取，请确认或编辑：</p>`+
    `<div class="mr"><span>描述</span><span contenteditable="true" style="color:#fff;border-bottom:1px dashed rgba(255,255,255,.15);outline:none;min-width:120px">${excerpt}</span></div>`+
    (guessCategory?`<div class="mr"><span>品类</span><span contenteditable="true" style="color:#fff;border-bottom:1px dashed rgba(255,255,255,.15);outline:none">${guessCategory}</span></div>`:'')+
    (guessFlavor.length?`<div class="mr"><span>风味</span><span contenteditable="true" style="color:#fff;border-bottom:1px dashed rgba(255,255,255,.15);outline:none">${guessFlavor.join('、')}</span></div>`:'')+
    `<div class="mr"><span>评分</span><span contenteditable="true" style="color:#fff;border-bottom:1px dashed rgba(255,255,255,.15);outline:none">—</span></div>`+
    `<div style="display:flex;gap:8px;margin-top:10px">`+
    `<button class="cb" onclick="cC()">✓ 确认保存</button>`+
    `<button class="cb" style="border-color:var(--sub);color:var(--sub)" onclick="this.closest('.pc').style.display='none'">取消</button>`+
    `</div></div>`,refs:[]};
}

function findR(t2){
  // PRIORITY 1: Check if this looks like a tasting note (descriptive text with flavor/experience words)
  const hasTastingWords=TASTING_PATTERNS.test(t2);
  if(t2.length>10 && hasTastingWords){
    return buildSaveCard(t2);
  }

  // PRIORITY 2: Dynamic keyword-based search from actual data
  const kwResult=findByKeyword(t2);
  if(kwResult) return kwResult;

  // PRIORITY 3: Long text without known keywords — still might be a tasting note
  if(t2.length>20){
    return buildSaveCard(t2);
  }

  return{r:'可以告诉我更多细节吗？例如品类、产地或风味特征。',refs:[]};
}

// ---- Attachments (image input) ----
let pendingImgs=[];
function refreshAtch(){
  atchEl.innerHTML='';
  pendingImgs.forEach((src,i)=>{
    const w=document.createElement('div');w.className='ap';
    w.innerHTML=`<img src="${src}"/><button onclick="rmAt(${i})">✕</button>`;
    atchEl.appendChild(w);
  });
}
window.rmAt=i=>{pendingImgs.splice(i,1);refreshAtch()};
document.getElementById('atbBtn').addEventListener('click',()=>fileInputEl.click());
fileInputEl.addEventListener('change',e=>{
  [...e.target.files].forEach(f=>{
    const r=new FileReader();
    r.onload=ev=>{pendingImgs.push(ev.target.result);refreshAtch()};
    r.readAsDataURL(f);
  });
  fileInputEl.value='';
});

function send2(){
  const t2=ciEl.value.trim();
  if(!t2&&pendingImgs.length===0)return;
  const imgs=pendingImgs.slice();
  pendingImgs=[];refreshAtch();
  ciEl.value='';
  addMsg('user',t2||'<span style="color:var(--sub)">[图片]</span>',null,imgs);
  // Check if this message is feedback for a previous thumbs-down
  if(window._pendingFeedbackRecId&&t2){
    const recId=window._pendingFeedbackRecId;
    window._pendingFeedbackRecId=null;
    // Update the last matching feedback entry with the note
    for(let i=feedbackLog.length-1;i>=0;i--){
      if(feedbackLog[i].recId===recId&&feedbackLog[i].vote===-1){
        feedbackLog[i].note=t2;break;
      }
    }
    setTimeout(()=>addMsg('ai',`🔄 收到你的反馈："${t2.slice(0,60)}"。我会记住这次修正，下次溯源时改进。`),400);
    return;
  }
  setTimeout(()=>{const rs=findR(t2||'图片');const refs=(rs.refs||[]).filter(Boolean);addMsg('ai',rs.r,refs);if(refs.length)uSrc(refs)},500+Math.random()*400);
}
document.getElementById('sb').addEventListener('click',send2);
ciEl.addEventListener('keydown',e=>{if(e.key==='Enter')send2()});
window.cC=()=>{addMsg('ai','✅ 已保存到你的品鉴记忆。')};

// ---- Feedback storage ----
const feedbackLog=[];

// ---- Source tracing: pure planet system (no cards) ----
function uSrc(recs){
  activateFocusLens(recs);
}

// Voting from tooltip buttons
window.voteSrc=function(recId,vote,btn){
  const entry={recId,vote,note:null,ts:new Date().toISOString()};
  feedbackLog.push(entry);
  const node=focusNodes.find(n=>n.rec.id===recId);
  // Update tooltip buttons
  if(btn){
    const fbDiv=btn.parentElement;
    const btns=fbDiv.querySelectorAll('button');
    btns.forEach(b=>{b.style.opacity='0.4';b.style.pointerEvents='none'});
    btn.style.opacity='1';
    btn.classList.add(vote===1?'v-up':'v-down');
  }
  if(vote===1&&node){
    node.breathIndependent=true;
    node.opacity=1;
    node.size=node._baseSize*1.15;
    setTimeout(()=>addMsg('ai','✓ 溯源确认，已记录。感谢你的反馈！'),300);
  }
  if(vote===-1&&node){
    triggerSupernova(node);
    setTimeout(()=>{
      addMsg('ai','🔄 收到你的反馈，这条溯源不太准确。能简单说明一下哪里不对吗？（直接在聊天框回复即可）');
    },800);
    window._pendingFeedbackRecId=recId;
  }
};

window.showRef=id=>{const r=RC.find(x2=>x2.id===id);if(r){uSrc([r]);showModal(r)}};
const modal=document.getElementById('modal'),mcEl=document.getElementById('mcard');
function showModal(r){const ct=CT[r.c];
  // Find existing feedback for this record
  const fb=feedbackLog.filter(f=>f.recId===r.id);
  const fbHtml=fb.length?`<div style="margin-top:12px;padding-top:8px;border-top:1px solid rgba(255,255,255,.04)"><div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--sub);margin-bottom:6px">反馈记录</div>${fb.map(f=>`<div style="font-size:11px;color:${f.vote===1?'var(--accent)':'#ff5050'};margin-bottom:4px">${f.vote===1?'👍 确认准确':'👎 标记不准'}${f.note?' — '+f.note:''}<span style="color:var(--sub);margin-left:8px;font-size:10px">${new Date(f.ts).toLocaleTimeString()}</span></div>`).join('')}</div>`:'';
  mcEl.innerHTML=`<div class="mcbn" style="background:linear-gradient(90deg,${ct.hex},rgba(255,255,255,.15))"></div><button class="mx" onclick="clM()">✕</button><div class="mbd"><div class="mcc" style="color:${ct.hex}">${ct.i} ${ct.l}</div><h3>${r.n}</h3><div class="mr"><span>日期</span><span>${r.d}</span></div><div class="mr"><span>评分</span><span style="color:${ct.hex};font-weight:700">${r.s}/100</span></div><div class="mr"><span>产地</span><span>${r.o}</span></div><div class="mr"><span>方式</span><span>${r.m}</span></div><div class="mn">${r.nt}</div><div class="mtags">${r.f.map(f=>`<span class="mtg">${f}</span>`).join('')}</div>${fbHtml}</div>`;
  modal.classList.add('show');
}
window.clM=()=>{modal.classList.remove('show')};modal.addEventListener('click',e=>{if(e.target===modal)clM()});

// ============ CONSTELLATION BACKGROUND FOR CHAT ZONE ============
(function initConstellationBg(){
  const midCv=document.getElementById('midCanvas');
  if(!midCv)return;
  const midCtx=midCv.getContext('2d');
  let mW=0,mH=0;

  function resizeMid(){
    const rect=midCv.parentElement.getBoundingClientRect();
    const dp=devicePixelRatio;
    mW=rect.width*dp; mH=rect.height*dp;
    midCv.width=mW; midCv.height=mH;
    midCv.style.width=rect.width+'px';
    midCv.style.height=rect.height+'px';
  }
  resizeMid();
  addEventListener('resize',resizeMid);

  // Generate constellation nodes (star positions)
  const rng=mulberry32(42424);
  const STAR_COUNT=120;
  const stars=[];
  for(let i=0;i<STAR_COUNT;i++){
    stars.push({
      x:rng(), y:rng(),
      r:rng()>.93?1.4+rng()*0.8:0.3+rng()*0.9,
      phase:rng()*Math.PI*2,
      bright:rng()
    });
  }

  // Build constellations: groups of 3-6 nearby stars connected by lines
  const CONSTELLATIONS=[];
  const used=new Set();
  const starCoords=stars.map((s,i)=>({i,x:s.x,y:s.y}));

  for(let attempt=0;attempt<30&&CONSTELLATIONS.length<12;attempt++){
    // Pick a random unused seed star
    const seed=Math.floor(rng()*STAR_COUNT);
    if(used.has(seed))continue;
    // Find nearest neighbours
    const dists=starCoords
      .filter(s=>s.i!==seed&&!used.has(s.i))
      .map(s=>({i:s.i,d:Math.hypot(s.x-stars[seed].x,s.y-stars[seed].y)}))
      .sort((a,b)=>a.d-b.d);
    const groupSize=3+Math.floor(rng()*4); // 3-6 stars
    const group=[seed];
    for(let j=0;j<Math.min(groupSize-1,dists.length);j++){
      if(dists[j].d<0.25) group.push(dists[j].i); // proximity threshold
    }
    if(group.length<3)continue;
    group.forEach(i=>used.add(i));
    // Build edges: chain + one or two extra edges for shape
    const edges=[];
    for(let j=0;j<group.length-1;j++) edges.push([group[j],group[j+1]]);
    if(group.length>3 && rng()>.3) edges.push([group[0],group[group.length-1]]); // close the shape
    if(group.length>4 && rng()>.5) edges.push([group[1],group[group.length-1]]); // cross-brace
    CONSTELLATIONS.push({
      nodes:group,
      edges,
      glowPhase:rng()*Math.PI*2,
      glowSpeed:0.15+rng()*0.25, // how fast this constellation brightens/dims
      peakDuration:2+rng()*4,     // seconds at peak brightness
      cycleDuration:8+rng()*12,   // full cycle length
      offset:rng()*20            // time offset so they don't all sync
    });
  }

  function renderConstellations(t){
    const dp=devicePixelRatio;
    midCtx.clearRect(0,0,mW,mH);

    // Dark background with subtle gradient
    const bg=midCtx.createRadialGradient(mW*.5,mH*.4,0,mW*.5,mH*.5,mW*.8);
    bg.addColorStop(0,'#0c0c1a');
    bg.addColorStop(0.5,'#0a0a18');
    bg.addColorStop(1,'#060610');
    midCtx.fillStyle=bg;
    midCtx.fillRect(0,0,mW,mH);

    // Draw base stars (always visible, subtle twinkle)
    for(const s of stars){
      const sx=s.x*mW, sy=s.y*mH;
      const tw=0.4+Math.sin(t*1.0+s.phase)*0.3;
      const alpha=s.bright>.92?0.42+tw*0.2:s.bright>.5?0.18+tw*0.1:0.08+tw*0.06;
      midCtx.fillStyle=`rgba(190,205,255,${alpha.toFixed(3)})`;
      midCtx.beginPath();midCtx.arc(sx,sy,s.r*dp,0,Math.PI*2);midCtx.fill();
      if(s.bright>.88){
        const gl=midCtx.createRadialGradient(sx,sy,0,sx,sy,s.r*dp*3);
        gl.addColorStop(0,`rgba(160,190,255,${(alpha*0.12).toFixed(3)})`);
        gl.addColorStop(1,'rgba(160,190,255,0)');
        midCtx.fillStyle=gl;
        const hr=s.r*dp*3;
        midCtx.fillRect(sx-hr,sy-hr,hr*2,hr*2);
      }
    }

    // Draw constellations with animated glow
    midCtx.save();
    midCtx.globalCompositeOperation='lighter';
    for(const con of CONSTELLATIONS){
      // Cycle: fade in → hold bright → fade out → stay dim
      const ct=((t+con.offset)%con.cycleDuration)/con.cycleDuration;
      const peakFrac=con.peakDuration/con.cycleDuration;
      const fadeFrac=0.15; // 15% of cycle for fade in/out
      let intensity=0;
      if(ct<fadeFrac){
        intensity=ct/fadeFrac; // fade in
      }else if(ct<fadeFrac+peakFrac){
        intensity=1.0; // hold peak
      }else if(ct<fadeFrac*2+peakFrac){
        intensity=1.0-(ct-fadeFrac-peakFrac)/fadeFrac; // fade out
      }
      // Smooth the intensity with sine for organic feel
      intensity=intensity*intensity*(3-2*intensity); // smoothstep
      if(intensity<0.01)continue;

      const lineAlpha=intensity*0.28;
      const nodeAlpha=intensity*0.45;

      // Draw edges (constellation lines)
      for(const[a,b] of con.edges){
        const sa=stars[a], sb=stars[b];
        const ax=sa.x*mW, ay=sa.y*mH, bx=sb.x*mW, by=sb.y*mH;
        // Gradient line: brighter in the middle
        const grad=midCtx.createLinearGradient(ax,ay,bx,by);
        grad.addColorStop(0,`rgba(100,160,255,${(lineAlpha*0.3).toFixed(3)})`);
        grad.addColorStop(0.5,`rgba(130,185,255,${lineAlpha.toFixed(3)})`);
        grad.addColorStop(1,`rgba(100,160,255,${(lineAlpha*0.3).toFixed(3)})`);
        midCtx.strokeStyle=grad;
        midCtx.lineWidth=0.8*dp;
        midCtx.beginPath();midCtx.moveTo(ax,ay);midCtx.lineTo(bx,by);midCtx.stroke();
        // Wider glow line
        midCtx.strokeStyle=`rgba(80,140,240,${(lineAlpha*0.12).toFixed(3)})`;
        midCtx.lineWidth=3*dp;
        midCtx.beginPath();midCtx.moveTo(ax,ay);midCtx.lineTo(bx,by);midCtx.stroke();
      }

      // Draw brighter nodes at constellation star positions
      for(const ni of con.nodes){
        const s=stars[ni];
        const sx=s.x*mW, sy=s.y*mH;
        const nr=Math.max(s.r*dp*1.3, 1.5*dp);
        // Bright core
        midCtx.fillStyle=`rgba(180,215,255,${nodeAlpha.toFixed(3)})`;
        midCtx.beginPath();midCtx.arc(sx,sy,nr,0,Math.PI*2);midCtx.fill();
        // Glow
        const gl=midCtx.createRadialGradient(sx,sy,0,sx,sy,nr*5);
        gl.addColorStop(0,`rgba(120,175,255,${(nodeAlpha*0.35).toFixed(3)})`);
        gl.addColorStop(0.5,`rgba(90,150,240,${(nodeAlpha*0.10).toFixed(3)})`);
        gl.addColorStop(1,'rgba(80,140,230,0)');
        midCtx.fillStyle=gl;
        midCtx.fillRect(sx-nr*5,sy-nr*5,nr*10,nr*10);
      }
    }
    midCtx.restore();

    requestAnimationFrame(()=>renderConstellations(performance.now()*0.001));
  }
  renderConstellations(performance.now()*0.001);
})();

  // --- Cleanup function ---
  return function cleanup() {
    // Cancel animation frames if needed
  };
}
