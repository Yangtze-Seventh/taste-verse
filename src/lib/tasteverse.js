// ============================================================
// TasteVerse core logic — ported verbatim from original demo.html
// Wrapped as an exported startApp() to be invoked inside a React
// useEffect on mount. Depends on window.THREE, window.ForceGraph3D,
// and the full DOM from App.jsx.
// ============================================================

export function startApp() {
(function(){
'use strict';

function showError(msg){
  var b=document.getElementById('error-banner');
  b.textContent='[Debug] '+msg;b.style.display='block';
  console.error('[TasteVerse]',msg);
}

if(typeof ForceGraph3D==='undefined'){
  showError('ForceGraph3D not loaded! Check browser console (F12). THREE='+(typeof THREE)+', scripts may be blocked by CORS or ad-blocker.');
  return;
}
console.log('[TasteVerse] ForceGraph3D: OK, THREE: '+(typeof THREE!=='undefined'?'OK':'missing'));

// ══════════════════════════════════════════════════
//  AUTH SYSTEM — email verification (MVP: localStorage)
// ══════════════════════════════════════════════════
var currentUser=null; // {email:'xxx@xxx.com'}
var _verifyEmail='';
var _verifyHash='';   // HMAC hash from server
var _verifyExpiry=0;  // expiry timestamp from server

function storageKey(email,key){return 'tv_'+email.toLowerCase().trim()+'_'+key;}

// ── Login Particle Animation Engine ──
var _loginAnim={running:false,raf:0,particles:[],ghostLayer:[],captureZone:null,morphing:false,emojiIdx:0};
var _loginEMOJIS=['☕','🍲','🍷','🍣','🍕','🍰','🥘','🍦','🍹'];
var _loginTheme={current:{h:215,s:65,l:85},from:{h:215,s:65,l:85},to:{h:215,s:65,l:85},colorT:1,transitioning:false};

function _lRgbToHsl(r,g,b){r/=255;g/=255;b/=255;var mx=Math.max(r,g,b),mn=Math.min(r,g,b),h,s,l=(mx+mn)/2;if(mx===mn){h=s=0;}else{var d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}return{h:h*360,s:s*100,l:l*100};}
function _lLerp(a,b,t){return{h:a.h*(1-t)+b.h*t,s:a.s*(1-t)+b.s*t,l:a.l*(1-t)+b.l*t};}

function _lInitParticles(){
  var cv=document.getElementById('login-canvas');if(!cv)return;
  var W=cv.width=innerWidth,H=cv.height=innerHeight;
  _loginAnim.W=W;_loginAnim.H=H;_loginAnim.ctx=cv.getContext('2d');
  _loginAnim.particles=[];
  for(var i=0;i<4500;i++){
    var big=Math.random()<0.25;
    var r=big?Math.random()*2.5+1.5:Math.random()*1.0+0.3;
    var spd=big?0.3+Math.random()*0.2:0.35+Math.random()*0.25;
    var al=big?0.15+Math.random()*0.2:0.3+Math.random()*0.45;
    var ang=Math.random()*Math.PI*2;
    _loginAnim.particles.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,speed:spd,
      r:r,origR:r,baseAlpha:al,
      hOff:(Math.random()-0.5)*22,sOff:(Math.random()-0.5)*12,lOff:(Math.random()-0.5)*10,
      phase:Math.random()*Math.PI*2,drift:0.15+Math.random()*0.2,
      captured:false,blend:0,captureColor:null,highlight:0
    });
  }
}

function _lEdgePos(){
  var W=_loginAnim.W,H=_loginAnim.H;
  var z=[{x:W*0.16,y:H*0.22},{x:W*0.84,y:H*0.22},{x:W*0.16,y:H*0.78},{x:W*0.84,y:H*0.78},{x:W*0.1,y:H*0.5},{x:W*0.9,y:H*0.5},{x:W*0.5,y:H*0.12},{x:W*0.5,y:H*0.88}];
  return z[Math.floor(Math.random()*z.length)];
}

function _lBuildZone(emoji,cx,cy){
  var tc=document.createElement('canvas'),c=tc.getContext('2d'),sz=160;
  tc.width=sz;tc.height=sz;c.textAlign='center';c.textBaseline='middle';c.font=sz*0.8+'px Arial';c.fillText(emoji,sz/2,sz/2);
  var d=c.getImageData(0,0,sz,sz).data,mask=new Uint8Array(sz*sz),colors=new Array(sz*sz),scale=2.5;
  for(var y=0;y<sz;y++){for(var x=0;x<sz;x++){var i=(y*sz+x)*4;if(d[i+3]>70){mask[y*sz+x]=1;var a=d[i+3];colors[y*sz+x]=_lRgbToHsl(Math.min(255,Math.round(d[i]*255/a)),Math.min(255,Math.round(d[i+1]*255/a)),Math.min(255,Math.round(d[i+2]*255/a)));}}}
  return{cx:cx,cy:cy,mask:mask,colors:colors,w:sz,h:sz,scale:scale,fillCount:{},rotation:(Math.random()-0.5)*0.52};
}

function _lGetDomHsl(zone){
  var th=0,ts=0,tl=0,n=0;
  for(var i=0;i<zone.mask.length;i+=7){if(zone.mask[i]&&zone.colors[i]){var c=zone.colors[i];th+=c.h;ts+=c.s;tl+=c.l;n++;}}
  if(!n)return{h:30,s:55,l:72};return{h:th/n,s:Math.max(35,Math.min(70,ts/n)),l:Math.max(55,Math.min(80,tl/n))};
}

function _lMorph(){
  if(_loginAnim.morphing||!_loginAnim.running)return;
  _loginAnim.morphing=true;
  var emoji=_loginEMOJIS[_loginAnim.emojiIdx];
  var pos=_lEdgePos();
  _loginAnim.captureZone=_lBuildZone(emoji,pos.x,pos.y);
  _loginAnim.ghostLayer=[];
  var newDom=_lGetDomHsl(_loginAnim.captureZone);
  _loginTheme.from={h:_loginTheme.current.h,s:_loginTheme.current.s,l:_loginTheme.current.l};
  _loginTheme.to=newDom;_loginTheme.colorT=0;_loginTheme.transitioning=true;
  _loginAnim.emojiIdx=(_loginAnim.emojiIdx+1)%_loginEMOJIS.length;
  var morphStart=Date.now(),ghostFillSpawned=false;
  var checkFill=setInterval(function(){
    if(!_loginAnim.captureZone||!_loginAnim.running){clearInterval(checkFill);_loginAnim.morphing=false;return;}
    var elapsed=Date.now()-morphStart;
    var capturedCount=0;_loginAnim.particles.forEach(function(p){if(p.captured)capturedCount++;});
    // Phase 1.5: after 0.8s, spawn ghost particles to gently fill gaps while capture continues
    if(!ghostFillSpawned&&elapsed>800){
      ghostFillSpawned=true;
      var z=_loginAnim.captureZone,gPts=[];
      for(var y=0;y<z.h;y+=2){for(var x=0;x<z.w;x+=2){var idx=y*z.w+x;if(z.mask[idx]&&z.colors[idx]){var gx=Math.floor(x/2),gy=Math.floor(y/2),gkey=gy*1000+gx;if((z.fillCount[gkey]||0)<2){var lxr=x-z.w/2,lyr=y-z.h/2,cosR=Math.cos(z.rotation),sinR=Math.sin(z.rotation);gPts.push({x:lxr*z.scale*cosR-lyr*z.scale*sinR+z.cx,y:lxr*z.scale*sinR+lyr*z.scale*cosR+z.cy,color:z.colors[idx]});}}}}
      gPts.sort(function(){return Math.random()-0.5;});
      for(var gi=0;gi<gPts.length;gi++){
        var gp=gPts[gi],batch=Math.floor(gi/20);
        // Slow fade-in: small fadeSpeed, staggered delays for natural appearance
        _loginAnim.ghostLayer.push({x:gp.x,y:gp.y,r:Math.random()*0.4+0.7,tColor:gp.color,alpha:0,targetAlpha:0.8,delay:batch*12+Math.floor(Math.random()*30),elapsed:0,fadeSpeed:0.004+Math.random()*0.003,state:'waiting',vx:0,vy:0,phase:Math.random()*Math.PI*2});
      }
    }
    // Phase 2: capture complete — finalize ghost layer for remaining gaps, then schedule dispersal
    if(capturedCount>200||elapsed>3500){
      clearInterval(checkFill);
      var z=_loginAnim.captureZone;_loginAnim.captureZone=null;
      // Fill any remaining gaps with final ghost particles
      var ghostPts=[];
      for(var y=0;y<z.h;y+=2){for(var x=0;x<z.w;x+=2){var idx=y*z.w+x;if(z.mask[idx]&&z.colors[idx]){var gx=Math.floor(x/2),gy=Math.floor(y/2),gkey=gy*1000+gx;if((z.fillCount[gkey]||0)<3){var lxr=x-z.w/2,lyr=y-z.h/2,cosR=Math.cos(z.rotation),sinR=Math.sin(z.rotation);ghostPts.push({x:lxr*z.scale*cosR-lyr*z.scale*sinR+z.cx,y:lxr*z.scale*sinR+lyr*z.scale*cosR+z.cy,color:z.colors[idx]});}}}}
      ghostPts.sort(function(){return Math.random()-0.5;});
      for(var i=0;i<ghostPts.length;i++){
        var p=ghostPts[i],batch=Math.floor(i/30);
        _loginAnim.ghostLayer.push({x:p.x,y:p.y,r:Math.random()*0.5+0.9,tColor:p.color,alpha:0,targetAlpha:0.88,delay:batch*8+Math.floor(Math.random()*15),elapsed:0,fadeSpeed:0.008+Math.random()*0.006,state:'waiting',vx:0,vy:0,phase:Math.random()*Math.PI*2});
      }
      setTimeout(function(){
        if(!_loginAnim.running){_loginAnim.morphing=false;return;}
        // Dispersal: captured particles release smoothly — reset to base state immediately
        _loginAnim.particles.forEach(function(p){if(p.captured){var delay=Math.floor(Math.random()*800);setTimeout(function(){p.captured=false;p.blend=0;p.highlight=0;p.r=p.origR;p.captureColor=null;var a=Math.random()*Math.PI*2;p.vx=Math.cos(a)*p.speed;p.vy=Math.sin(a)*p.speed;},delay);}});
        // Ghost particles disperse at background-particle speed and fade gradually
        _loginAnim.ghostLayer.forEach(function(g){var delay=Math.floor(Math.random()*800);setTimeout(function(){g.state='dispersing';var a=Math.random()*Math.PI*2;var spd=0.25+Math.random()*0.15;g.vx=Math.cos(a)*spd;g.vy=Math.sin(a)*spd;},delay);});
        setTimeout(function(){_loginAnim.ghostLayer=[];_loginAnim.morphing=false;},8000);
      },5000);
    }
  },150);
}

var _lTextEls=null,_lSyncFrame=0;
function _lSyncTextColor(){
  if(++_lSyncFrame%3!==0)return;
  if(!_lTextEls){
    _lTextEls={
      logo:document.querySelector('.login-logo'),
      en:document.querySelector('.login-logo-en'),
      sub:document.querySelector('.login-sub'),
      card:document.querySelector('.login-card'),
      cardH3:document.querySelector('.login-card h3'),
      btn:document.querySelector('.login-btn'),
      labels:document.querySelectorAll('.login-card .input-group label'),
      inputs:document.querySelectorAll('.login-card .input-group input'),
      footer:document.querySelector('.login-footer'),
      footerLinks:document.querySelectorAll('.login-footer a'),
      msg:document.querySelector('.login-msg')
    };
    if(!_lTextEls.logo)return;
  }
  var th=_loginTheme.current;
  var h1=th.h,h2=(th.h+30)%360,h3=(th.h+60)%360;
  var s=Math.max(50,Math.min(80,th.s+10)),l=Math.max(65,Math.min(88,th.l));
  var e=_lTextEls;
  // Logo gradient text
  if(e.logo){e.logo.style.background='linear-gradient(135deg,hsl('+h1+','+s+'%,'+l+'%),hsl('+h2+','+s+'%,'+l+'%),hsl('+h3+','+s+'%,'+l+'%))';e.logo.style.webkitBackgroundClip='text';e.logo.style.webkitTextFillColor='transparent';e.logo.style.backgroundClip='text';}
  // English name & subtitle
  if(e.en){e.en.style.color='hsla('+h1+','+s+'%,'+l+'%,0.6)';}
  if(e.sub){e.sub.style.color='hsla('+((h1+15)%360)+','+(s-10)+'%,'+(l-5)+'%,0.5)';}
  // Card border glow
  if(e.card){e.card.style.borderColor='hsla('+h1+','+Math.round(s*0.6)+'%,'+Math.round(l*0.5)+'%,0.15)';}
  // Card title
  if(e.cardH3){e.cardH3.style.color='hsla('+h1+','+(s-5)+'%,'+Math.min(92,l+5)+'%,0.9)';}
  // Input labels
  if(e.labels){for(var i=0;i<e.labels.length;i++){e.labels[i].style.color='hsla('+h1+','+(s-15)+'%,'+l+'%,0.55)';}}
  // Input focus border (set CSS variable approach — use inline style on inputs)
  if(e.inputs){for(var i=0;i<e.inputs.length;i++){e.inputs[i].style.setProperty('--dyn-focus','hsla('+h1+','+s+'%,'+l+'%,0.4)');}}
  // Button gradient + hover shadow
  if(e.btn&&!e.btn.disabled){e.btn.style.background='linear-gradient(135deg,hsl('+h1+','+s+'%,'+l+'%),hsl('+h2+','+s+'%,'+l+'%))';e.btn.style.setProperty('--dyn-btn-shadow','0 6px 28px hsla('+h1+','+s+'%,'+l+'%,0.25)');}
  // Footer text & links
  if(e.footer){e.footer.style.color='hsla('+h1+','+(s-20)+'%,'+l+'%,0.35)';}
  if(e.footerLinks){for(var i=0;i<e.footerLinks.length;i++){e.footerLinks[i].style.color='hsla('+h2+','+s+'%,'+l+'%,0.55)';}}
  // Message text
  if(e.msg){e.msg.style.setProperty('--dyn-accent','hsl('+h1+','+s+'%,'+l+'%)');if(!e.msg.classList.contains('error')&&!e.msg.classList.contains('success')){e.msg.style.color='hsla('+h1+','+(s-15)+'%,'+l+'%,0.4)';}}
}

function _lAnimate(){
  if(!_loginAnim.running)return;
  var W=_loginAnim.W,H=_loginAnim.H,ctx=_loginAnim.ctx;
  if(!ctx)return;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#050508';ctx.fillRect(0,0,W,H);
  if(_loginTheme.transitioning){_loginTheme.colorT=Math.min(1,_loginTheme.colorT+0.004);_loginTheme.current=_lLerp(_loginTheme.from,_loginTheme.to,_loginTheme.colorT);if(_loginTheme.colorT>=1)_loginTheme.transitioning=false;}
  _lSyncTextColor();
  var th=_loginTheme.current,zone=_loginAnim.captureZone;
  var ps=_loginAnim.particles,pLen=ps.length;
  // --- Update all particles ---
  for(var i=0;i<pLen;i++){
    var p=ps[i];
    if(p.captured){
      p.vx*=0.97;p.vy*=0.97;
      if(Math.abs(p.vx)<0.005)p.vx=0;
      if(Math.abs(p.vy)<0.005)p.vy=0;
      p.x+=p.vx;p.y+=p.vy;
      p.blend=Math.min(1,p.blend+0.006);
      p.highlight=Math.min(1,p.highlight+0.008);
      p.r+=(Math.max(1.2,p.origR)-p.r)*0.015;
    }else{
      p.phase+=0.006;
      p.x+=p.vx;p.y+=p.vy+Math.sin(p.phase)*p.drift*0.015;
      // Fast decay on release — blend/highlight/size shrink quickly so particles fade out smoothly
      p.blend*=0.985; if(p.blend<0.005)p.blend=0;
      p.highlight*=0.98; if(p.highlight<0.005)p.highlight=0;
      p.r+=(p.origR-p.r)*0.06;
      if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;
      if(p.y<-10)p.y=H+10;if(p.y>H+10)p.y=-10;
      if(zone){
        // No attraction — particles drift freely; capture only when naturally passing through
        var dx0=p.x-zone.cx,dy0=p.y-zone.cy,cosR=Math.cos(-zone.rotation),sinR=Math.sin(-zone.rotation);
        var rx=dx0*cosR-dy0*sinR,ry=dx0*sinR+dy0*cosR;
        var lx=Math.floor((rx+zone.w*zone.scale/2)/zone.scale),ly=Math.floor((ry+zone.h*zone.scale/2)/zone.scale);
        if(lx>=0&&lx<zone.w&&ly>=0&&ly<zone.h){
          var idx=ly*zone.w+lx;
          if(zone.mask[idx]){var gx=Math.floor(lx/2),gy=Math.floor(ly/2),gkey=gy*1000+gx;if(!zone.fillCount[gkey])zone.fillCount[gkey]=0;if(zone.fillCount[gkey]<6){zone.fillCount[gkey]++;p.captured=true;p.captureColor=zone.colors[idx];}}
        }
      }
    }
  }
  // --- Draw free particles (batched by size for performance) ---
  // Small particles (r <= 1.2): use fillRect (much faster than arc)
  for(var i=0;i<pLen;i++){
    var p=ps[i];if(p.captured)continue;
    var gh=th.h+p.hOff,gs=Math.max(0,Math.min(100,th.s+p.sOff)),gl=Math.max(0,Math.min(100,th.l+p.lOff));
    var a=p.baseAlpha;
    if(p.blend>0&&p.captureColor){var bt=p.blend;gh=gh*(1-bt)+p.captureColor.h*bt;gs=gs*(1-bt)+p.captureColor.s*bt;gl=gl*(1-bt)+p.captureColor.l*bt;a=a*(1-bt)+0.85*bt;}
    if(p.r<=1.2){
      var d=p.r*2;ctx.fillStyle='hsla('+gh+','+gs+'%,'+gl+'%,'+a+')';ctx.fillRect(p.x-p.r,p.y-p.r,d,d);
    }else{
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='hsla('+gh+','+gs+'%,'+gl+'%,'+a+')';ctx.fill();
    }
  }
  // --- Ghosts ---
  var ghosts=_loginAnim.ghostLayer;
  for(var gi=0;gi<ghosts.length;gi++){
    var g=ghosts[gi];g.elapsed++;
    if(g.state==='waiting'&&g.elapsed>=g.delay)g.state='appearing';
    if(g.state==='appearing'){g.alpha=Math.min(g.targetAlpha,g.alpha+g.fadeSpeed);if(g.alpha>=g.targetAlpha)g.state='locked';}
    if(g.state==='dispersing'){g.phase+=0.006;g.x+=g.vx;g.y+=g.vy+Math.sin(g.phase)*0.01;g.alpha*=0.993;if(g.alpha<0.01)g.alpha=0;}
    if(g.alpha>0){var d2=g.r*2;ctx.fillStyle='hsla('+g.tColor.h+','+g.tColor.s+'%,'+Math.min(100,g.tColor.l+5)+'%,'+g.alpha+')';ctx.fillRect(g.x-g.r,g.y-g.r,d2,d2);}
  }
  // --- Captured on top ---
  for(var ci=0;ci<pLen;ci++){
    var cp=ps[ci];if(!cp.captured)continue;
    var cgh=th.h+cp.hOff,cgs=Math.max(0,Math.min(100,th.s+cp.sOff)),cgl=Math.max(0,Math.min(100,th.l+cp.lOff)),ca=cp.baseAlpha;
    if(cp.blend>0&&cp.captureColor){var ct=cp.blend;cgh=cgh*(1-ct)+cp.captureColor.h*ct;cgs=cgs*(1-ct)+cp.captureColor.s*ct;cgl=cgl*(1-ct)+cp.captureColor.l*ct;cgl=cgl+(100-cgl)*cp.highlight*0.1;ca=ca*(1-ct)+(0.85+cp.highlight*0.05)*ct;}
    if(cp.r>1.8){var cg=ctx.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,cp.r);cg.addColorStop(0,'hsla('+cgh+','+cgs+'%,'+cgl+'%,'+ca+')');cg.addColorStop(1,'hsla('+cgh+','+cgs+'%,'+cgl+'%,0)');ctx.beginPath();ctx.arc(cp.x,cp.y,cp.r,0,Math.PI*2);ctx.fillStyle=cg;ctx.fill();}
    else{ctx.beginPath();ctx.arc(cp.x,cp.y,cp.r,0,Math.PI*2);ctx.fillStyle='hsla('+cgh+','+cgs+'%,'+cgl+'%,'+ca+')';ctx.fill();}
  }
  _loginAnim.raf=requestAnimationFrame(_lAnimate);
}

function startLoginAnimation(){
  if(_loginAnim.running)return;
  _loginAnim.running=true;
  _lTextEls=null;_lSyncFrame=0;
  _lInitParticles();
  _lAnimate();
  setTimeout(_lMorph,3000);
  _loginAnim.morphInterval=setInterval(function(){if(!_loginAnim.morphing&&_loginAnim.running)_lMorph();},1000);
}

function stopLoginAnimation(){
  _loginAnim.running=false;
  cancelAnimationFrame(_loginAnim.raf);
  if(_loginAnim.morphInterval)clearInterval(_loginAnim.morphInterval);
  _loginAnim.particles=[];_loginAnim.ghostLayer=[];_loginAnim.captureZone=null;_loginAnim.morphing=false;
}

function showLoginScreen(){
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-nav').style.display='none';
  document.querySelectorAll('.view').forEach(function(v){v.style.display='none';});
  startLoginAnimation();
}

function hideLoginScreen(){
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-nav').style.display='';
  document.querySelectorAll('.view').forEach(function(v){v.style.display='';});
  setTimeout(stopLoginAnimation,1000); // stop after fade-out completes
}

function updateUserBadge(){
  if(!currentUser)return;
  // Try to use profile data (nickname, avatar)
  try{
    var p=getProfile();
    var avatar=document.getElementById('user-avatar');
    var display=document.getElementById('user-email-display');
    if(p&&p.avatarData){
      avatar.innerHTML='<img src="'+p.avatarData+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover">';
    }else{
      avatar.textContent=((p&&p.nickname?p.nickname:currentUser.email).charAt(0)).toUpperCase();
    }
    display.textContent=(p&&p.nickname)||currentUser.email;
  }catch(e){
    document.getElementById('user-email-display').textContent=currentUser.email;
    document.getElementById('user-avatar').textContent=currentUser.email.charAt(0).toUpperCase();
  }
}

function logout(){
  currentUser=null;
  try{localStorage.removeItem('tv_session');}catch(e){}
  showLoginScreen();
  // Reset login form
  document.getElementById('login-email').value='';
  document.getElementById('login-code').value='';
  document.getElementById('verify-group').style.display='none';
  document.getElementById('login-btn').textContent='发送验证码';
  document.getElementById('login-msg').textContent='';
  document.getElementById('login-msg').className='login-msg';
  document.getElementById('login-title').textContent='登录 / 注册';
}

// Login flow
(function(){
  var emailInput=document.getElementById('login-email');
  var codeInput=document.getElementById('login-code');
  var btn=document.getElementById('login-btn');
  var msg=document.getElementById('login-msg');
  var verifyGroup=document.getElementById('verify-group');
  var resendLink=document.getElementById('resend-link');
  var step='email'; // 'email' or 'verify'
  var resendTimer=null;

  function startResendCountdown(seconds){
    if(resendTimer)clearInterval(resendTimer);
    var remaining=seconds;
    resendLink.style.cursor='default';
    resendLink.style.color='var(--text3)';
    resendLink.style.textDecoration='none';
    resendLink.textContent=remaining+' 秒后可重发';
    resendTimer=setInterval(function(){
      remaining--;
      if(remaining<=0){
        clearInterval(resendTimer);resendTimer=null;
        resendLink.textContent='重新发送';
        resendLink.style.cursor='pointer';
        resendLink.style.color='var(--accent)';
        resendLink.style.textDecoration='underline';
      }else{
        resendLink.textContent=remaining+' 秒后可重发';
      }
    },1000);
  }

  function sendCode(email,onSuccess,onError){
    fetch('/api/auth/send-code',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email})
    }).then(function(r){return r.json().then(function(d){return {ok:r.ok,status:r.status,data:d};});})
    .then(function(result){
      if(!result.ok){
        var e=new Error(result.data.error||'发送失败');
        e.status=result.status;e.retryAfter=result.data.retryAfter;
        throw e;
      }
      _verifyHash=result.data.hash;
      _verifyExpiry=result.data.expiry;
      onSuccess(result.data.cooldown||60);
    }).catch(onError);
  }

  resendLink.onclick=function(){
    if(resendTimer)return; // still cooling down
    if(!_verifyEmail)return;
    msg.textContent='正在重新发送...';msg.className='login-msg';
    sendCode(_verifyEmail,function(cooldown){
      msg.textContent='验证码已重新发送，请查收';msg.className='login-msg success';
      startResendCountdown(cooldown);
    },function(err){
      console.error('[TasteVerse] resend error:',err);
      if(err.status===429&&err.retryAfter){
        startResendCountdown(err.retryAfter);
        msg.textContent='请等待 '+err.retryAfter+' 秒后重试';msg.className='login-msg error';
      }else{
        msg.textContent='重发失败: '+(err.message||'请检查网络');msg.className='login-msg error';
      }
    });
  };

  btn.onclick=function(){
    if(step==='email'){
      var email=emailInput.value.trim();
      if(!email||email.indexOf('@')<1||email.indexOf('.')<3){
        msg.textContent='请输入有效的邮箱地址';msg.className='login-msg error';return;
      }
      _verifyEmail=email;
      btn.disabled=true;
      btn.textContent='发送中...';
      msg.textContent='正在发送验证码...';msg.className='login-msg';

      sendCode(email,function(cooldown){
        step='verify';
        verifyGroup.style.display='block';
        btn.disabled=false;
        btn.textContent='验证并登录';
        document.getElementById('login-title').textContent='输入验证码';
        msg.textContent='验证码已发送到 '+email+'，请查收邮箱（含垃圾箱）';
        msg.className='login-msg success';
        emailInput.disabled=true;
        startResendCountdown(cooldown);
        setTimeout(function(){codeInput.focus();},100);
      },function(err){
        console.error('[TasteVerse] send-code error:',err);
        if(err.status===429&&err.retryAfter){
          msg.textContent='发送过于频繁，请 '+err.retryAfter+' 秒后重试';
        }else{
          msg.textContent='发送失败: '+(err.message||'请检查网络');
        }
        msg.className='login-msg error';
        btn.disabled=false;btn.textContent='重新发送';
      });
    }else{
      var code=codeInput.value.trim();
      if(!code){msg.textContent='请输入验证码';msg.className='login-msg error';return;}
      btn.disabled=true;
      btn.textContent='验证中...';

      // Call backend to verify code against HMAC
      fetch('/api/auth/verify-code',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:_verifyEmail,code:code,hash:_verifyHash,expiry:_verifyExpiry})
      }).then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d};});})
      .then(function(result){
        if(!result.ok){
          throw new Error(result.data.error||'验证失败');
        }
        // Login success
        currentUser={email:_verifyEmail};
        try{localStorage.setItem('tv_session',JSON.stringify(currentUser));}catch(e){}
        msg.textContent='登录成功！';msg.className='login-msg success';
        setTimeout(function(){
          hideLoginScreen();
          btn.disabled=false;
          step='email';
          emailInput.disabled=false;
          loadUserData();
          startApp();
        },500);
      }).catch(function(err){
        console.error('[TasteVerse] verify-code error:',err);
        var errMsg=err.message==='Code expired'?'验证码已过期，请重新发送':
                   err.message==='Invalid code'?'验证码错误，请重试':
                   '验证失败: '+(err.message||'请检查网络');
        msg.textContent=errMsg;msg.className='login-msg error';
        btn.disabled=false;btn.textContent='验证并登录';
      });
    }
  };

  emailInput.onkeydown=function(e){if(e.key==='Enter')btn.click();};
  codeInput.onkeydown=function(e){if(e.key==='Enter')btn.click();};
})();

// ── PROFILE SYSTEM ─────────────────────────────
function getProfile(){
  if(!currentUser)return {};
  try{
    var raw=localStorage.getItem(storageKey(currentUser.email,'profile'));
    return raw?JSON.parse(raw):{};
  }catch(e){return {};}
}
function saveProfile(profile){
  if(!currentUser)return;
  try{localStorage.setItem(storageKey(currentUser.email,'profile'),JSON.stringify(profile));}catch(e){}
}

function updateUserBadgeFromProfile(){
  if(!currentUser)return;
  var p=getProfile();
  var avatar=document.getElementById('user-avatar');
  var display=document.getElementById('user-email-display');
  if(p.avatarData){
    avatar.innerHTML='<img src="'+p.avatarData+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover">';
  }else{
    avatar.textContent=((p.nickname||currentUser.email).charAt(0)).toUpperCase();
  }
  display.textContent=p.nickname||currentUser.email;
}

function showProfile(){
  if(!currentUser)return;
  var p=getProfile();
  var email=currentUser.email;
  // Stats
  var totalNotes=notes.length;
  var totalVisits=notes.reduce(function(s,n){return s+(n.visits?n.visits.length:0)+1;},0);
  var catCount=Object.keys(CATEGORIES).length;
  var avgScore=totalNotes?(notes.reduce(function(s,n){return s+n.score;},0)/totalNotes).toFixed(1):'—';

  var avatarHtml=p.avatarData
    ?'<img src="'+p.avatarData+'"><div class="avatar-overlay">更换</div>'
    :'<span>'+((p.nickname||email).charAt(0)).toUpperCase()+'</span><div class="avatar-overlay">上传</div>';

  document.getElementById('profile-content').innerHTML=
    '<h3>个人资料</h3>'
    +'<div class="profile-avatar-wrap">'
      +'<div class="profile-avatar-lg" id="profile-avatar-lg">'+avatarHtml+'</div>'
      +'<input type="file" id="profile-avatar-input" accept="image/*" style="display:none">'
      +'<div class="profile-avatar-hint">点击更换头像</div>'
    +'</div>'
    +'<div class="profile-field"><label>昵称</label><input type="text" id="pf-nickname" placeholder="给自己起个名字" value="'+(p.nickname||'').replace(/"/g,'&quot;')+'"></div>'
    +'<div class="profile-field"><label>邮箱</label><div class="pf-static">'+email+'</div></div>'
    +'<div class="profile-field"><label>生日</label><input type="date" id="pf-birthday" value="'+(p.birthday||'')+'"></div>'
    +'<div class="profile-field"><label>个性签名</label><input type="text" id="pf-bio" placeholder="用一句话描述你的味觉偏好" value="'+(p.bio||'').replace(/"/g,'&quot;')+'"></div>'
    +'<div class="profile-stats">'
      +'<div class="profile-stat"><div class="ps-num">'+totalNotes+'</div><div class="ps-label">品鉴</div></div>'
      +'<div class="profile-stat"><div class="ps-num">'+totalVisits+'</div><div class="ps-label">总次数</div></div>'
      +'<div class="profile-stat"><div class="ps-num">'+avgScore+'</div><div class="ps-label">均分</div></div>'
    +'</div>'
    +'<div class="profile-stats" style="grid-template-columns:1fr 1fr;margin-top:0">'
      +'<div class="profile-stat"><div class="ps-num">'+catCount+'</div><div class="ps-label">品类</div></div>'
      +'<div class="profile-stat"><div class="ps-num">'+(p.joinDate||new Date().toISOString().split('T')[0])+'</div><div class="ps-label">加入日期</div></div>'
    +'</div>'
    +'<div class="profile-actions">'
      +'<button class="btn-save-profile" id="pf-save">保存资料</button>'
      +'<button class="btn-logout" id="pf-logout">退出登录</button>'
    +'</div>';

  // Wire avatar upload
  document.getElementById('profile-avatar-lg').onclick=function(){
    document.getElementById('profile-avatar-input').click();
  };
  document.getElementById('profile-avatar-input').onchange=function(){
    var file=this.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(e){
      // Resize to 128x128 for storage
      var img=new Image();
      img.onload=function(){
        var canvas=document.createElement('canvas');
        canvas.width=128;canvas.height=128;
        var ctx=canvas.getContext('2d');
        var size=Math.min(img.width,img.height);
        var sx=(img.width-size)/2,sy=(img.height-size)/2;
        ctx.drawImage(img,sx,sy,size,size,0,0,128,128);
        var data=canvas.toDataURL('image/jpeg',0.8);
        var pr=getProfile();
        pr.avatarData=data;
        saveProfile(pr);
        updateUserBadgeFromProfile();
        showProfile(); // refresh
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Wire save
  document.getElementById('pf-save').onclick=function(){
    var pr=getProfile();
    pr.nickname=(document.getElementById('pf-nickname').value||'').trim();
    pr.birthday=document.getElementById('pf-birthday').value||'';
    pr.bio=(document.getElementById('pf-bio').value||'').trim();
    if(!pr.joinDate)pr.joinDate=new Date().toISOString().split('T')[0];
    saveProfile(pr);
    updateUserBadgeFromProfile();
    document.getElementById('profile-panel').classList.remove('open');
  };

  // Wire logout
  document.getElementById('pf-logout').onclick=function(){
    document.getElementById('profile-panel').classList.remove('open');
    showModal('<h3>退出登录</h3>'
      +'<p style="color:var(--text2);font-size:13px">确定要退出 <b style="color:var(--text)">'+email+'</b> 吗？你的品鉴数据会保留在本地。</p>'
      +'<div class="modal-actions">'
      +'<button class="btn-s" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'open\')">取消</button>'
      +'<button class="btn-danger" id="confirm-logout">退出</button></div>');
    document.getElementById('confirm-logout').onclick=function(){closeModal();logout();};
  };

  document.getElementById('profile-panel').classList.add('open');
}

document.getElementById('close-profile').onclick=function(){
  document.getElementById('profile-panel').classList.remove('open');
};

// User badge → open profile
document.getElementById('user-badge').onclick=function(){
  showProfile();
};

// ── CONFIG ─────────────────────────────────────
var EVEROS_MODE='cloud';
var EVEROS_LOCAL='http://localhost:1995/api/v1';
var EVEROS_CLOUD='/api/everos';  // Vercel serverless proxy (bypasses CORS)
var EVEROS_API_KEY='';  // Key is now handled server-side in the proxy
var EVEROS_API=(EVEROS_MODE==='cloud')?EVEROS_CLOUD:EVEROS_LOCAL;
var USER_ID='flavortrace_user_001';

// ── DEFAULT DATA (5 core categories for new users) ──
var DEFAULT_TAXONOMY={
  drinks:{name:'饮品',children:['coffee','tea','wine']},
  food:{name:'美食',children:['chinese','dessert']},
  other:{name:'其他',children:[]}
};
var DEFAULT_CATEGORIES={
  coffee:{name:'咖啡',icon:'☕',color:'#D4956A',parent:'drinks'},
  tea:{name:'茶',icon:'🍵',color:'#5EBE8E',parent:'drinks'},
  wine:{name:'葡萄酒',icon:'🍷',color:'#C85068',parent:'drinks'},
  chinese:{name:'中餐',icon:'🥢',color:'#E86848',parent:'food'},
  dessert:{name:'甜品',icon:'🍰',color:'#E8A0C0',parent:'food'}
};

var TAXONOMY,CATEGORIES;

// Deep clone helper
function deepClone(obj){return JSON.parse(JSON.stringify(obj));}

// ── PERSISTENCE ────────────────────────────────
function saveUserData(){
  if(!currentUser)return;
  try{
    localStorage.setItem(storageKey(currentUser.email,'notes'),JSON.stringify(notes));
    localStorage.setItem(storageKey(currentUser.email,'taxonomy'),JSON.stringify(TAXONOMY));
    localStorage.setItem(storageKey(currentUser.email,'categories'),JSON.stringify(CATEGORIES));
  }catch(e){console.warn('[TasteVerse] Save failed:',e);}
}

function loadUserData(){
  if(!currentUser)return;
  var email=currentUser.email;
  USER_ID='tv_'+email.replace(/[^a-zA-Z0-9]/g,'_');
  updateUserBadge();
  try{
    var savedNotes=localStorage.getItem(storageKey(email,'notes'));
    var savedTax=localStorage.getItem(storageKey(email,'taxonomy'));
    var savedCats=localStorage.getItem(storageKey(email,'categories'));
    if(savedNotes&&savedTax&&savedCats){
      notes=JSON.parse(savedNotes);
      TAXONOMY=JSON.parse(savedTax);
      CATEGORIES=JSON.parse(savedCats);
      console.log('[TasteVerse] Loaded '+notes.length+' notes for '+email);
    }else{
      // New user — give defaults, no demo notes
      TAXONOMY=deepClone(DEFAULT_TAXONOMY);
      CATEGORIES=deepClone(DEFAULT_CATEGORIES);
      notes=[];
      saveUserData();
      // Set join date for new users
      try{var pr=getProfile();if(!pr.joinDate){pr.joinDate=new Date().toISOString().split('T')[0];saveProfile(pr);}}catch(e){}
      console.log('[TasteVerse] New user: '+email+' — initialized with 5 default categories');
    }
  }catch(e){
    console.warn('[TasteVerse] Load failed, using defaults:',e);
    TAXONOMY=deepClone(DEFAULT_TAXONOMY);
    CATEGORIES=deepClone(DEFAULT_CATEGORIES);
    notes=[];
  }
}

// Temporary init (will be overwritten by loadUserData)
TAXONOMY=deepClone(DEFAULT_TAXONOMY);
CATEGORIES=deepClone(DEFAULT_CATEGORIES);

var notes=[];
var selectedScore=0,userTags=[],Graph=null,graphSearchQuery='',graphSearchResults=[],graphFocusedCategory='',graphSelectedNoteId='';

// ── MODAL SYSTEM ───────────────────────────────
function showModal(html){
  document.getElementById('modal-content').innerHTML=html;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal(){document.getElementById('modal-overlay').classList.remove('open');}
document.getElementById('modal-overlay').onclick=function(e){if(e.target===this)closeModal();};

// ── NAV ─────────────────────────────────────────
document.querySelectorAll('.tab').forEach(function(tab){
  tab.onclick=function(){
    document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
    document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
    tab.classList.add('active');
    document.getElementById(tab.dataset.view).classList.add('active');
    if(tab.dataset.view==='universe-view'&&Graph)Graph.width(window.innerWidth).height(window.innerHeight-52);
    if(tab.dataset.view==='categories-view')renderCategories();
  };
});
// Helper: switch to a view directly (no longer requires the view to have a tab in the nav).
function switchView(viewId){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t.dataset.view===viewId);});
  document.querySelectorAll('.view').forEach(function(v){v.classList.toggle('active',v.id===viewId);});
}
document.getElementById('btn-new-note').onclick=function(){switchView('record-view');};

// ── CALENDAR ──────────────────────────────────────
var _calYear,_calMonth,_calSelectedDay=null,_calMiniGraph=null,_calMiniBreathRAF=null;
function calInit(){
  var d=new Date();_calYear=d.getFullYear();_calMonth=d.getMonth();
  calRender();
}
function calRender(){
  var label=_calYear+'年'+(_calMonth+1)+'月';
  document.getElementById('cal-month-label').textContent=label;
  var grid=document.getElementById('cal-grid');grid.innerHTML='';
  var first=new Date(_calYear,_calMonth,1);
  var startDay=first.getDay(); // 0=Sun
  var daysInMonth=new Date(_calYear,_calMonth+1,0).getDate();
  var prevDays=new Date(_calYear,_calMonth,0).getDate();
  var today=new Date();var todayStr=today.toISOString().split('T')[0];
  // Build date→notes map for this month
  var notesByDay={};
  notes.forEach(function(n){
    if(!n.time)return;
    var parts=n.time.split('-');
    if(parseInt(parts[0])===_calYear&&parseInt(parts[1])===_calMonth+1){
      var day=parseInt(parts[2]);
      if(!notesByDay[day])notesByDay[day]=[];
      notesByDay[day].push(n);
    }
  });
  // Previous month fill
  for(var i=startDay-1;i>=0;i--){
    var el=document.createElement('div');el.className='cal-day other';el.textContent=prevDays-i;grid.appendChild(el);
  }
  // Current month
  for(var d=1;d<=daysInMonth;d++){
    var el=document.createElement('div');el.className='cal-day';
    var dateStr=_calYear+'-'+String(_calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    if(dateStr===todayStr)el.classList.add('today');
    if(_calSelectedDay===d)el.classList.add('selected');
    var dayNotes=notesByDay[d];
    if(dayNotes&&dayNotes.length){
      el.classList.add('has-notes');
      var dotsDiv=document.createElement('div');dotsDiv.className='cal-dots';
      // Show up to 4 colored dots
      var shown=Math.min(dayNotes.length,4);
      for(var di=0;di<shown;di++){
        var dot=document.createElement('div');dot.className='cal-dot';
        var cat=CATEGORIES[dayNotes[di].cat];
        dot.style.background=cat?cat.color:'var(--accent)';
        dotsDiv.appendChild(dot);
      }
      el.appendChild(document.createTextNode(d));
      el.appendChild(dotsDiv);
    }else{
      el.textContent=d;
    }
    (function(day,dn){
      el.onclick=function(){
        if(!dn||!dn.length)return;
        _calSelectedDay=day;calRender();calShowDay(day,dn);
      };
    })(d,dayNotes);
    grid.appendChild(el);
  }
  // Next month fill
  var total=startDay+daysInMonth;var rem=total%7?7-total%7:0;
  for(var i=1;i<=rem;i++){
    var el=document.createElement('div');el.className='cal-day other';el.textContent=i;grid.appendChild(el);
  }
  // If no day selected, clear detail
  if(!_calSelectedDay){document.getElementById('cal-day-detail').innerHTML='';document.getElementById('cal-mini-graph').style.display='none';}
}
function calShowDay(day,dayNotes){
  var dateStr=_calYear+'年'+(_calMonth+1)+'月'+day+'日';
  var html='<div class="cal-day-detail"><div class="cal-day-title"><span class="cdt-date">'+dateStr+'</span><span style="font-size:11px;color:var(--text3)">'+dayNotes.length+'条记录</span></div>';
  dayNotes.forEach(function(n){
    var cat=CATEGORIES[n.cat]||{icon:'📝',name:n.cat,color:'#888'};
    html+='<div class="cal-note-item" data-note-id="'+n.id+'">'
      +'<div class="cni-top"><div class="cni-dot" style="background:'+cat.color+'"></div>'
      +'<span class="cni-name">'+cat.icon+' '+escapeHtml(n.name)+'</span>'
      +'<span class="cni-score" style="color:'+cat.color+'">'+n.score+'</span></div>'
      +'<div class="cni-cat">'+cat.name+'</div>';
    if(n.tags&&n.tags.length){
      html+='<div class="cni-tags">';
      n.tags.forEach(function(t){html+='<span class="cni-tag">'+escapeHtml(t)+'</span>';});
      html+='</div>';
    }
    html+='</div>';
  });
  html+='</div>';
  document.getElementById('cal-day-detail').innerHTML=html;
  // Click note item → focus in main graph
  document.querySelectorAll('.cal-note-item').forEach(function(el){
    el.onclick=function(){
      var nid=el.dataset.noteId;
      if(typeof focusNoteInGraph==='function')focusNoteInGraph(nid);
    };
  });
  // Mini 3D cluster
  calBuildMiniGraph(dayNotes);
}
function calBuildMiniGraph(dayNotes){
  var container=document.getElementById('cal-mini-graph');
  container.style.display='block';container.innerHTML='';
  if(typeof ForceGraph3D==='undefined')return;
  var T=window.THREE;if(!T)return;
  if(_calMiniGraph){try{_calMiniGraph._destructor();}catch(e){}_calMiniGraph=null;}
  if(_calMiniBreathRAF){cancelAnimationFrame(_calMiniBreathRAF);_calMiniBreathRAF=null;}

  // ── Build graph data matching main graph logic ──
  var gNodes=[],gLinks=[];
  dayNotes.forEach(function(n){
    var c=CATEGORIES[n.cat]||{color:'#888',name:n.cat,icon:'📝'};
    var vc=(n.visits?n.visits.length:0)+1;
    gNodes.push({id:n.id,name:n.name,cat:n.cat,catName:c.name,catIcon:c.icon,color:c.color,
      val:3+n.score*0.5+(Math.log(vc)/Math.log(1.5))*3,score:n.score,note:n.note,tags:n.tags,time:n.time,visits:vc,_noteRef:n});
  });

  // Same-category links with similarity
  var byCat={};
  dayNotes.forEach(function(n){if(!byCat[n.cat])byCat[n.cat]=[];byCat[n.cat].push(n);});
  Object.keys(byCat).forEach(function(cat){
    var arr=byCat[cat];
    for(var i=0;i<arr.length;i++){for(var j=i+1;j<arr.length;j++){
      var sim=typeof noteSimilarity==='function'?noteSimilarity(arr[i],arr[j]):0.5;
      var catColor=colorForCategory(cat);
      gLinks.push({source:arr[i].id,target:arr[j].id,_catLink:true,_catColor:catColor,
        _sourceColor:catColor,_targetColor:catColor,_str:0.08,_sim:sim});
    }}
  });

  // Shared-tag cross-category links
  for(var i=0;i<dayNotes.length;i++){for(var j=i+1;j<dayNotes.length;j++){
    if(dayNotes[i].cat===dayNotes[j].cat)continue;
    var shared=(dayNotes[i].tags||[]).filter(function(t){return (dayNotes[j].tags||[]).indexOf(t)>=0;});
    if(shared.length>0){
      var c1=colorForCategory(dayNotes[i].cat),c2=colorForCategory(dayNotes[j].cat);
      gLinks.push({source:dayNotes[i].id,target:dayNotes[j].id,_tagLink:true,_sharedTags:shared,
        _linkColor:mixHex(c1,c2,0.5),_sourceColor:c1,_targetColor:c2,_str:shared.length*0.15});
    }
  }}

  // Cross-category links (same taxonomy group)
  Object.keys(TAXONOMY).forEach(function(gk){
    var ch=TAXONOMY[gk].children.filter(function(c){return byCat[c]&&byCat[c].length;});
    for(var a=0;a<ch.length;a++){for(var b=a+1;b<ch.length;b++){
      var na=byCat[ch[a]][0],nb=byCat[ch[b]][0];
      if(na&&nb)gLinks.push({source:na.id,target:nb.id,_crossLink:true,
        _sourceColor:colorForCategory(ch[a]),_targetColor:colorForCategory(ch[b]),_str:0.03});
    }}
  });

  // ── Shared comet teardrop geometry (same as main graph) ──
  var _mCometProfile=[];
  for(var _i=0;_i<=6;_i++){var _a=Math.PI/2*_i/6;_mCometProfile.push(new T.Vector2(0.5*Math.sin(_a),-0.5*Math.cos(_a)));}
  for(var _i=1;_i<=12;_i++){var _t=_i/12;_mCometProfile.push(new T.Vector2(0.5*Math.pow(1-_t,2.2),7.0*_t));}
  var _mCometGeo=new T.LatheGeometry(_mCometProfile,10);
  var _mCometUp=new T.Vector3(0,1,0),_mCometTmp=new T.Vector3();

  // ── Gradient line helpers (scoped for mini graph) ──
  var _mLineAnimClock=0;
  function mCreateGradLine(link){
    var pts=link._crossLink?20:(link._tagLink?32:14);
    var positions=new Float32Array(pts*3),colors=new Float32Array(pts*3);
    var sc=hexRgb(link._sourceColor||'#7b86a8'),ec=hexRgb(link._targetColor||link._sourceColor||'#7b86a8');
    for(var i=0;i<pts;i++){var t=pts===1?0:i/(pts-1);colors[i*3]=(sc[0]+(ec[0]-sc[0])*t)/255;colors[i*3+1]=(sc[1]+(ec[1]-sc[1])*t)/255;colors[i*3+2]=(sc[2]+(ec[2]-sc[2])*t)/255;}
    var geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('color',new T.BufferAttribute(colors,3));
    var baseOp=link._catLink?(0.3+(link._sim||0)*0.4):(link._tagLink?0.52:0.26);
    var mat=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:baseOp,blending:T.AdditiveBlending,depthWrite:false});
    var line=new T.Line(geo,mat);line.renderOrder=2;
    line.userData={pointCount:pts,curveAmp:link._crossLink?0.08:(link._tagLink?0.16:0.05),linkRef:link,baseOpacity:baseOp,_pulsePhase:Math.random()*Math.PI*2};
    return line;
  }
  function mUpdateGradLine(obj,start,end){
    if(!obj||!obj.geometry||!start||!end)return;
    var count=obj.userData.pointCount||2,curveAmp=obj.userData.curveAmp||0,link=obj.userData.linkRef;
    if(obj.material)obj.material.opacity=obj.userData.baseOpacity;
    var arr=obj.geometry.attributes.position.array;
    var dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
    var len=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
    var bendX=-dy/len*len*curveAmp,bendY=dx/len*len*curveAmp,bendZ=Math.sin((dx+dy+dz)*0.01)*len*curveAmp*0.6;
    for(var i=0;i<count;i++){var t=count===1?0:i/(count-1);var ease=4*t*(1-t);arr[i*3]=start.x+dx*t+bendX*ease;arr[i*3+1]=start.y+dy*t+bendY*ease;arr[i*3+2]=start.z+dz*t+bendZ*ease;}
    obj.geometry.attributes.position.needsUpdate=true;obj.geometry.computeBoundingSphere();
    // Flowing energy pulse
    if(obj.geometry.attributes.color&&count>3){
      var colors=obj.geometry.attributes.color.array;
      var phase=obj.userData._pulsePhase||0;
      var speed=link&&link._catLink?0.8:(link&&link._tagLink?0.7:0.4);
      var pulsePos=((_mLineAnimClock*speed+phase)%1+1)%1;
      var pulseWidth=link&&link._catLink?0.28:0.22;
      var sC=hexRgb(link&&link._sourceColor||'#7b86a8'),eC=hexRgb(link&&link._targetColor||link&&link._sourceColor||'#7b86a8');
      for(var i=0;i<count;i++){var t2=count===1?0:i/(count-1);var br2=sC[0]+(eC[0]-sC[0])*t2,bg2=sC[1]+(eC[1]-sC[1])*t2,bb2=sC[2]+(eC[2]-sC[2])*t2;
        var dist=Math.abs(t2-pulsePos);if(dist>0.5)dist=1-dist;var pulse2=Math.max(0,1-dist/pulseWidth);pulse2*=pulse2;var boost=pulse2*(link&&link._catLink?0.85:0.6);
        colors[i*3]=Math.min(1,(br2/255)+boost);colors[i*3+1]=Math.min(1,(bg2/255)+boost);colors[i*3+2]=Math.min(1,(bb2/255)+boost);}
      obj.geometry.attributes.color.needsUpdate=true;
    }
  }

  // ── Build mini ForceGraph3D ──
  var _mBreathNodes=[];
  _calMiniGraph=ForceGraph3D({controlType:'orbit'})(container)
    .width(container.clientWidth).height(240)
    .backgroundColor('#0b1026')
    .showNavInfo(false)
    .nodeVal(function(n){return n.val||1;})
    .nodeOpacity(1)
    .nodeResolution(24)
    .nodeLabel(function(n){
      return '<div style="background:rgba(5,5,15,0.95);padding:10px 14px;border-radius:8px;border:1px solid '+n.color+'30;max-width:220px;font-family:Inter,sans-serif">'
        +'<div style="font-size:9px;color:'+n.color+';font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">'+escapeHtml(n.catIcon||'')+' '+escapeHtml(n.catName||'')+'</div>'
        +'<div style="font-size:13px;font-weight:700;color:#e8e8f0;margin-bottom:3px">'+escapeHtml(n.name)+'</div>'
        +'<div style="font-size:20px;font-weight:800;color:'+n.color+'">'+n.score+'<span style="font-size:10px;opacity:0.4">/10</span></div></div>';
    })
    .nodeThreeObject(function(n){
      var grp=new T.Group();
      grp.userData={baseScale:1,phase:Math.random()*Math.PI*2,speed:0.3+Math.random()*0.4,noteRef:n};
      var sz=Math.cbrt(n.val||5)*1.65;
      var col=new T.Color(n.color||'#ffffff');
      var colHex=n.color||'#ffffff';
      var cRgb=hexRgb(colHex);

      // [0] Core sphere (MeshPhongMaterial with emissive glow)
      grp.add(new T.Mesh(new T.SphereGeometry(sz*1.1,32,32),new T.MeshPhongMaterial({color:col,emissive:col,emissiveIntensity:0.8,shininess:100,transparent:true,opacity:0.9})));

      // [1] Inner white core
      grp.add(new T.Mesh(new T.SphereGeometry(sz*0.36,12,12),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5})));

      // [2] Glow sprite (128px canvas, AdditiveBlending)
      var cv=document.createElement('canvas');cv.width=128;cv.height=128;var cx=cv.getContext('2d');
      var gd=cx.createRadialGradient(64,64,0,64,64,64);
      gd.addColorStop(0,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.9)');
      gd.addColorStop(0.15,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.5)');
      gd.addColorStop(0.4,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.15)');
      gd.addColorStop(0.7,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.03)');
      gd.addColorStop(1,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0)');
      cx.fillStyle=gd;cx.fillRect(0,0,128,128);
      var sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(cv),transparent:true,blending:T.AdditiveBlending,opacity:0.5,depthWrite:false}));
      sp.scale.set(sz*5,sz*5,1);grp.add(sp);

      // [3] Outer glow layer
      grp.add(new T.Mesh(new T.SphereGeometry(sz*4.8,24,24),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.06,depthWrite:false,side:T.BackSide})));

      // [4] Inner glow layer
      grp.add(new T.Mesh(new T.SphereGeometry(sz*3.0,22,22),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.12,depthWrite:false})));

      // [5] Primary ring
      var ring1=new T.Mesh(new T.TorusGeometry(sz*2.5,sz*0.08,12,56),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.26,depthWrite:false}));
      ring1.rotation.x=Math.PI/2.8;ring1.rotation.y=Math.random()*Math.PI;grp.add(ring1);

      // [6] Secondary ring
      var ring2=new T.Mesh(new T.TorusGeometry(sz*3.15,sz*0.05,10,64),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.1,depthWrite:false}));
      ring2.rotation.x=Math.PI/2;ring2.rotation.z=Math.random()*Math.PI;grp.add(ring2);

      // [7] Comet orbitals — smooth 3D teardrop (same as main graph)
      var cometCount=14+Math.floor(Math.random()*10);
      var cometGroup=new T.Group();
      cometGroup.userData={_cometHost:true,_comets:[]};
      for(var ci=0;ci<cometCount;ci++){
        var cRadius=sz*(1.5+Math.random()*4.5);
        var cAngle=Math.random()*Math.PI*2;
        var cSpeed=(0.25+Math.random()*0.9)*(Math.random()>0.5?1:-1);
        var cTiltX=(Math.random()-0.5)*1.4;
        var cTiltZ=(Math.random()-0.5)*1.4;
        var cYoff=(Math.random()-0.5)*sz*1.5;
        var cScale=sz*(0.14+Math.random()*0.08);
        var cMat=new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.8,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
        var cMesh=new T.Mesh(_mCometGeo,cMat);
        cMesh.scale.set(cScale,cScale,cScale);
        cMesh.frustumCulled=false;
        cometGroup.add(cMesh);
        cometGroup.userData._comets.push({mesh:cMesh,angle:cAngle,radius:cRadius,speed:cSpeed,tiltX:cTiltX,tiltZ:cTiltZ,yOff:cYoff});
      }
      grp.add(cometGroup);

      _mBreathNodes.push(grp);
      return grp;
    })
    .nodeThreeObjectExtend(false)
    // ── Links matching main graph ──
    .linkWidth(function(l){
      if(l._crossLink)return 0.35;
      if(l._catLink){var s=l._sim||0;return 0.2+s*0.45;}
      if(l._tagLink)return 0.42;
      return 0.28;
    })
    .linkOpacity(function(l){
      if(l._crossLink)return 0.28;
      if(l._catLink){var s=l._sim||0;return 0.12+s*0.28;}
      if(l._tagLink)return 0.32;
      return 0.22;
    })
    .linkColor(function(l){
      if(l._catLink)return l._catColor||'#6c7896';
      if(l._crossLink)return mixHex(l._sourceColor||'#60708a',l._targetColor||'#8ea4c8',0.5);
      if(l._tagLink&&l._linkColor)return l._linkColor;
      return mixHex(l._sourceColor||'#60708a',l._targetColor||'#8ea4c8',0.5);
    })
    .linkCurvature(function(l){
      if(l._tagLink)return 0.14;if(l._crossLink)return 0.06;return 0.03;
    })
    .linkDirectionalParticles(function(l){
      if(l._catLink)return 3;if(l._crossLink)return 3;if(l._tagLink)return 3;return 2;
    })
    .linkDirectionalParticleWidth(function(l){
      if(l._catLink)return 2.5;if(l._crossLink)return 2.5;if(l._tagLink)return 2.2;return 2.0;
    })
    .linkDirectionalParticleSpeed(function(l){
      if(l._catLink)return 0.002+Math.random()*0.003;if(l._crossLink)return 0.002+Math.random()*0.003;return 0.003+Math.random()*0.005;
    })
    .linkDirectionalParticleColor(function(l){
      if(l._catLink)return mixHex(l._catColor||'#7fe0cf','#ffffff',0.6);
      if(l._crossLink)return mixHex(l._sourceColor||'#7fe0cf','#ffffff',0.6);
      if(l._tagLink)return mixHex(l._linkColor||'#af79ff','#ffffff',0.5);
      return '#ffffff';
    })
    .linkThreeObject(function(l){return mCreateGradLine(l);})
    .linkThreeObjectExtend(true)
    .linkPositionUpdate(function(obj,pos){mUpdateGradLine(obj,pos.start,pos.end);return true;})
    .onNodeClick(function(n){if(n._noteRef)focusNoteInGraph(n._noteRef.id);})
    .enableNavigationControls(true)
    .graphData({nodes:gNodes,links:gLinks});

  // ── Forces matching main graph clustering ──
  setTimeout(function(){
    if(!_calMiniGraph)return;
    try{
      var charge=_calMiniGraph.d3Force('charge');
      if(charge){charge.strength(-35);charge.distanceMax(250);}
      _calMiniGraph.d3Force('center',null);
      function miniCenterForce(dim){
        var str=0.025;
        function force(alpha){var nodes=force._nodes||[];for(var i=0;i<nodes.length;i++){var n=nodes[i];
          if(dim==='x')n.vx-=n.x*str*alpha;else if(dim==='y')n.vy-=n.y*str*alpha;else n.vz=(n.vz||0)-((n.z||0)*str*alpha);}}
        force.initialize=function(nodes){force._nodes=nodes;};return force;
      }
      _calMiniGraph.d3Force('gravityX',miniCenterForce('x'));
      _calMiniGraph.d3Force('gravityY',miniCenterForce('y'));
      _calMiniGraph.d3Force('gravityZ',miniCenterForce('z'));
      var lnk=_calMiniGraph.d3Force('link');
      if(lnk){
        lnk.distance(function(ll){if(ll._crossLink)return 75;if(ll._catLink){var sim=ll._sim||0;return 32-sim*20;}return 55;});
        lnk.strength(function(ll){if(ll._crossLink)return 0.06;if(ll._catLink){var sim=ll._sim||0;return 0.15+sim*0.4;}return (ll._str||0.1)*1.1;});
      }
    }catch(e){console.warn('[TasteVerse] Mini force cfg:',e);}
  },100);

  // ── Scene: Starfield + Nebula + Lights (matching main graph) ──
  setTimeout(function(){
    if(!_calMiniGraph)return;
    var scene=_calMiniGraph.scene();if(!scene)return;

    // Deep-space color veil
    var bgShells=[
      {color:0x0a1830,r:600,op:0.22,pos:[0,0,0]},
      {color:0x12356a,r:500,op:0.18,pos:[40,-30,-60]},
      {color:0x3a1a5a,r:440,op:0.16,pos:[-60,40,30]},
      {color:0x1b5c49,r:400,op:0.14,pos:[20,60,-30]}
    ];
    bgShells.forEach(function(s){
      var shell=new T.Mesh(new T.SphereGeometry(s.r,24,24),new T.MeshBasicMaterial({color:s.color,transparent:true,opacity:s.op,side:T.BackSide,depthWrite:false}));
      shell.position.set(s.pos[0],s.pos[1],s.pos[2]);scene.add(shell);
    });

    // Stars (3000)
    var N=3000,starPos=new Float32Array(N*3),starCol=new Float32Array(N*3);
    for(var si=0;si<N;si++){
      starPos[si*3]=(Math.random()-0.5)*1200;starPos[si*3+1]=(Math.random()-0.5)*1200;starPos[si*3+2]=(Math.random()-0.5)*1200;
      var br=0.5+Math.random()*0.5;starCol[si*3]=br;starCol[si*3+1]=br;starCol[si*3+2]=br;
    }
    var sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(starPos,3));sg.setAttribute('color',new T.BufferAttribute(starCol,3));
    scene.add(new T.Points(sg,new T.PointsMaterial({size:1.2,vertexColors:true,transparent:true,opacity:0.8,sizeAttenuation:true,depthWrite:false})));

    // Nebula clouds
    var clouds=[
      {pos:[120,50,-180],color:0x1a3a5a,r:120,op:0.04},
      {pos:[-140,-80,-100],color:0x3a1a5a,r:130,op:0.04},
      {pos:[30,20,15],color:0x285040,r:50,op:0.03}
    ];
    clouds.forEach(function(c){
      var mesh=new T.Mesh(new T.SphereGeometry(c.r,16,16),new T.MeshBasicMaterial({color:c.color,transparent:true,opacity:c.op,side:T.BackSide,depthWrite:false}));
      mesh.position.set(c.pos[0],c.pos[1],c.pos[2]);scene.add(mesh);
    });

    // Lights
    scene.add(new T.AmbientLight(0x334466,0.5));
    var pl=new T.PointLight(0x8899bb,0.6,500);scene.add(pl);
    scene.add(new T.PointLight(0x5a4488,0.35,600));

    _calMiniGraph.zoomToFit(500,50);
  },200);

  // ── Breathing animation loop (matches main graph) ──
  var _mClock=0;
  (function miniBreath(){
    _calMiniBreathRAF=requestAnimationFrame(miniBreath);
    if(!_calMiniGraph)return;
    _mClock+=0.016;
    _mLineAnimClock+=0.016;
    for(var bi=0;bi<_mBreathNodes.length;bi++){
      var g=_mBreathNodes[bi];if(!g.userData)continue;
      var t=_mClock*g.userData.speed+g.userData.phase;
      var pulse=1+Math.sin(t)*0.1;
      g.scale.set(pulse,pulse,pulse);

      // [0] Core emissive
      if(g.children[0]&&g.children[0].material&&g.children[0].material.emissiveIntensity!==undefined){
        g.children[0].material.emissiveIntensity=0.6+Math.sin(t*1.2)*0.2;
        g.children[0].material.opacity=0.88;
      }
      // [1] Inner white core
      if(g.children[1]&&g.children[1].material)g.children[1].material.opacity=0.35;
      // [2] Sprite glow
      if(g.children[2]&&g.children[2].material)g.children[2].material.opacity=0.4+Math.sin(t*1.5)*0.2;
      // [3] Outer glow
      if(g.children[3]&&g.children[3].material)g.children[3].material.opacity=0.05+Math.sin(t*0.7)*0.02;
      // [4] Inner glow
      if(g.children[4]&&g.children[4].material)g.children[4].material.opacity=0.1+Math.sin(t*1.1)*0.04;
      // [5] Ring
      if(g.children[5]&&g.children[5].material)g.children[5].material.opacity=0.2+Math.sin(t*0.8)*0.06;
      // [6] Outer ring
      if(g.children[6]&&g.children[6].material)g.children[6].material.opacity=0.07+Math.sin(t*0.6)*0.03;

      // Slow rotation
      g.rotation.y=_mClock*0.15+g.userData.phase;

      // Animate comet teardrops
      for(var ci=0;ci<g.children.length;ci++){
        var child=g.children[ci];
        if(child.userData&&child.userData._cometHost){
          var comets=child.userData._comets;
          for(var cj=0;cj<comets.length;cj++){
            var cm=comets[cj];
            cm.angle+=cm.speed*0.016;
            var tA=cm.angle;
            var rx=Math.cos(tA)*cm.radius,rz=Math.sin(tA)*cm.radius;
            var ry=cm.yOff+Math.sin(tA*2)*cm.radius*0.06;
            var px=rx*Math.cos(cm.tiltZ)-ry*Math.sin(cm.tiltZ);
            var py=rx*Math.sin(cm.tiltZ)*Math.sin(cm.tiltX)+ry*Math.cos(cm.tiltX)+rz*Math.sin(cm.tiltX)*0.3;
            cm.mesh.position.set(px,py,rz);
            var tA2=tA+0.02*Math.sign(cm.speed);
            var rx2=Math.cos(tA2)*cm.radius,rz2=Math.sin(tA2)*cm.radius;
            var ry2=cm.yOff+Math.sin(tA2*2)*cm.radius*0.06;
            var px2=rx2*Math.cos(cm.tiltZ)-ry2*Math.sin(cm.tiltZ);
            var py2=rx2*Math.sin(cm.tiltZ)*Math.sin(cm.tiltX)+ry2*Math.cos(cm.tiltX)+rz2*Math.sin(cm.tiltX)*0.3;
            _mCometTmp.set(px-px2,py-py2,rz-rz2).normalize();
            cm.mesh.quaternion.setFromUnitVectors(_mCometUp,_mCometTmp);
            cm.mesh.material.opacity=0.55;
          }
        }
      }
    }

    // Gentle scene rotation
    try{var sc=_calMiniGraph.scene();if(sc){sc.rotation.y+=0.0002;sc.rotation.z+=0.0001;}}catch(e){}

    // Pulsing link particle speed
    try{
      _calMiniGraph.linkDirectionalParticleSpeed(function(l){
        var p=0.0015+Math.sin(_mClock*0.9)*0.0012;
        if(l._tagLink)return 0.004+Math.abs(p)*0.6+Math.random()*0.001;
        if(l._catLink)return 0.003+Math.abs(p)*0.4+Math.random()*0.001;
        return 0.003+Math.abs(p)*0.35+Math.random()*0.001;
      });
    }catch(e){}
  })();

  setTimeout(function(){if(_calMiniGraph)_calMiniGraph.zoomToFit(400,40);},1200);
}
// Toggle
document.getElementById('cal-toggle').onclick=function(){
  var panel=document.getElementById('cal-panel');
  var btn=document.getElementById('cal-toggle');
  var isOpen=panel.classList.contains('open');
  if(isOpen){panel.classList.remove('open');btn.classList.remove('active');}
  else{panel.classList.add('open');btn.classList.add('active');calInit();}
};
document.getElementById('cal-close').onclick=function(){
  document.getElementById('cal-panel').classList.remove('open');
  document.getElementById('cal-toggle').classList.remove('active');
  if(_calMiniBreathRAF){cancelAnimationFrame(_calMiniBreathRAF);_calMiniBreathRAF=null;}
  if(_calMiniGraph){try{_calMiniGraph._destructor();}catch(e){}_calMiniGraph=null;}
};
document.getElementById('cal-prev').onclick=function(){_calMonth--;if(_calMonth<0){_calMonth=11;_calYear--;}_calSelectedDay=null;calRender();};
document.getElementById('cal-next').onclick=function(){_calMonth++;if(_calMonth>11){_calMonth=0;_calYear++;}_calSelectedDay=null;calRender();};
document.getElementById('cal-today-btn').onclick=function(){var d=new Date();_calYear=d.getFullYear();_calMonth=d.getMonth();_calSelectedDay=null;calRender();};
// Helper: focus note in main graph by id
function focusNoteInGraph(noteId){
  if(!Graph)return;
  var data=Graph.graphData();
  var node=data.nodes.find(function(n){return n._noteRef&&n._noteRef.id===noteId;});
  if(node){
    // Close calendar, switch to universe view, focus camera
    document.getElementById('cal-panel').classList.remove('open');
    document.getElementById('cal-toggle').classList.remove('active');
    document.querySelector('[data-view="universe-view"]').click();
    var dist=120;
    var pos=node;
    Graph.cameraPosition({x:pos.x+dist,y:pos.y+dist*0.3,z:pos.z+dist},pos,1200);
    // Trigger selection
    if(typeof showDetail==='function')showDetail(node._noteRef||node);
  }
}

// ── SELECTS ─────────────────────────────────────
function populateCatSelects(){
  var sel=document.getElementById('rec-cat');sel.innerHTML='';
  Object.keys(TAXONOMY).forEach(function(gk){
    var g=TAXONOMY[gk];
    var og=document.createElement('optgroup');og.label=g.name;
    g.children.forEach(function(ck){var c=CATEGORIES[ck];if(!c)return;var o=document.createElement('option');o.value=ck;o.textContent=c.icon+' '+c.name;og.appendChild(o);});
    if(og.children.length)sel.appendChild(og);
  });
  var co=document.createElement('option');co.value='__custom__';co.textContent='+ 自定义品类';sel.appendChild(co);
  sel.onchange=function(){
    var isC=sel.value==='__custom__';
    document.getElementById('custom-cat-group').style.display=isC?'block':'none';
    document.getElementById('parent-cat-group').style.display=isC?'block':'none';
    if(isC){var ps=document.getElementById('rec-parent-cat');ps.innerHTML='';Object.keys(TAXONOMY).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=TAXONOMY[k].name;ps.appendChild(o);});}
  };
}
populateCatSelects();

// ── SCORE / TAGS ────────────────────────────────
var scoreRow=document.getElementById('score-row');
for(var i=1;i<=10;i++){(function(i){var b=document.createElement('div');b.className='score-btn';b.textContent=i;b.onclick=function(){selectedScore=i;scoreRow.querySelectorAll('.score-btn').forEach(function(s){s.classList.remove('sel');});b.classList.add('sel');};scoreRow.appendChild(b);})(i);}
var tagInput=document.getElementById('tag-input'),tagsRow=document.getElementById('tags-row');
tagInput.onkeydown=function(e){if(e.key==='Enter'&&tagInput.value.trim()){e.preventDefault();var v=tagInput.value.trim();if(userTags.indexOf(v)<0){userTags.push(v);var t=document.createElement('div');t.className='tag rm';t.textContent=v;t.onclick=function(){userTags=userTags.filter(function(x){return x!==v;});t.remove();};tagsRow.insertBefore(t,tagInput);}tagInput.value='';}};

// ── PRICE ──────────────────────────────────────
var priceMode='unit'; // 'unit' or 'avg'
document.getElementById('price-mode-toggle').onclick=function(e){
  var t=e.target;
  if(!t.dataset||!t.dataset.mode)return;
  priceMode=t.dataset.mode;
  this.querySelectorAll('.price-mode').forEach(function(m){m.classList.toggle('sel',m.dataset.mode===priceMode);});
  document.getElementById('price-unit-group').style.display=priceMode==='unit'?'flex':'none';
  document.getElementById('price-avg-group').style.display=priceMode==='avg'?'block':'none';
  document.getElementById('price-avg-result').textContent='';
};
function calcAvgPrice(){
  var total=parseFloat(document.getElementById('rec-price-total').value)||0;
  var people=parseInt(document.getElementById('rec-price-people').value)||1;
  var result=document.getElementById('price-avg-result');
  if(total>0&&people>0){
    var avg=(total/people).toFixed(2);
    result.textContent='≈ 人均 ¥'+avg;
  }else{
    result.textContent='';
  }
}
document.getElementById('rec-price-total').oninput=calcAvgPrice;
document.getElementById('rec-price-people').oninput=calcAvgPrice;

function getPriceData(){
  if(priceMode==='unit'){
    var v=parseFloat(document.getElementById('rec-price').value);
    return v>0?{type:'unit',price:v}:null;
  }else{
    var total=parseFloat(document.getElementById('rec-price-total').value)||0;
    var people=parseInt(document.getElementById('rec-price-people').value)||1;
    if(total>0)return {type:'avg',total:total,people:people,price:Math.round(total/people*100)/100};
    return null;
  }
}

function resetPriceFields(){
  document.getElementById('rec-price').value='';
  document.getElementById('rec-price-total').value='';
  document.getElementById('rec-price-people').value='2';
  document.getElementById('price-avg-result').textContent='';
}

// ── SAVE ────────────────────────────────────────
// ── PHOTO UPLOAD ───────────────────────────────
var recPhoto=document.getElementById('rec-photo'),photoPreview=document.getElementById('photo-preview'),photoImg=document.getElementById('photo-img');
var uploadedPhotoData=null;
recPhoto.onchange=function(){
  var file=recPhoto.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    uploadedPhotoData=e.target.result;
    photoImg.src=uploadedPhotoData;
    photoPreview.style.display='block';
  };
  reader.readAsDataURL(file);
};

// ── LOCATE ─────────────────────────────────────
document.getElementById('btn-locate').onclick=function(){
  var locInput=document.getElementById('rec-location');
  if(!navigator.geolocation){locInput.placeholder='浏览器不支持定位';return;}
  locInput.value='定位中...';
  navigator.geolocation.getCurrentPosition(function(pos){
    var lat=pos.coords.latitude.toFixed(5),lng=pos.coords.longitude.toFixed(5);
    locInput.value='📍 '+lat+', '+lng;
  },function(err){
    locInput.value='';locInput.placeholder='定位失败: '+err.message;
  },{enableHighAccuracy:true,timeout:8000});
};

document.getElementById('btn-save').onclick=function(){
  var cat=document.getElementById('rec-cat').value;
  if(cat==='__custom__'){var cn=document.getElementById('rec-custom-cat').value.trim();if(!cn){alert('请输入品类名');return;}var ci=document.getElementById('rec-custom-icon').value.trim()||'📝';var pc=document.getElementById('rec-parent-cat').value;cat='custom_'+Date.now();CATEGORIES[cat]={name:cn,icon:ci,color:'#'+Math.floor(Math.random()*0x999999+0x333333).toString(16),parent:pc};TAXONOMY[pc].children.push(cat);populateCatSelects();}
  var name=document.getElementById('rec-name').value.trim();if(!name){alert('请输入名称');return;}
  var loc=document.getElementById('rec-location').value.trim();
  var priceData=getPriceData();
  var noteObj={id:'n'+Date.now(),cat:cat,name:name,score:selectedScore,tags:userTags.slice(),note:document.getElementById('rec-notes').value.trim(),time:new Date().toISOString().split('T')[0],location:loc||'',photo:uploadedPhotoData||''};
  if(priceData)noteObj.price=priceData;
  notes.push(noteObj);
  document.getElementById('rec-name').value='';document.getElementById('rec-notes').value='';document.getElementById('rec-location').value='';selectedScore=0;userTags=[];uploadedPhotoData=null;
  resetPriceFields();
  photoPreview.style.display='none';recPhoto.value='';
  scoreRow.querySelectorAll('.score-btn').forEach(function(s){s.classList.remove('sel');});tagsRow.querySelectorAll('.tag').forEach(function(t){t.remove();});
  saveUserData();sendToEverOS(notes[notes.length-1]);refreshGraph();document.querySelector('[data-view="universe-view"]').click();
};

// ── DUPLICATE DETECTION ─────────────────────────
(function(){
  var recName=document.getElementById('rec-name');
  var dupHint=document.getElementById('dup-hint');
  var dupList=document.getElementById('dup-hint-list');
  var _dupTimer=null;

  // Fuzzy match score between two strings (0~1)
  function fuzzyScore(a,b){
    a=a.toLowerCase().trim();b=b.toLowerCase().trim();
    if(a===b)return 1;
    if(a.indexOf(b)>=0||b.indexOf(a)>=0)return 0.85;
    // Token-based matching
    var tokA=_extractTokens(a),tokB=_extractTokens(b);
    if(!tokA.length||!tokB.length)return 0;
    var matched=0;
    tokA.forEach(function(ta){
      tokB.forEach(function(tb){
        if(ta===tb)matched+=1;
        else if(ta.length>=2&&tb.length>=2&&(ta.indexOf(tb)>=0||tb.indexOf(ta)>=0))matched+=0.6;
      });
    });
    return matched/Math.max(tokA.length,tokB.length);
  }

  recName.addEventListener('input',function(){
    clearTimeout(_dupTimer);
    var val=recName.value.trim();
    if(val.length<2){dupHint.classList.remove('show');return;}
    _dupTimer=setTimeout(function(){
      var matches=[];
      notes.forEach(function(n){
        var score=fuzzyScore(val,n.name);
        if(score>=0.35)matches.push({note:n,score:score});
      });
      matches.sort(function(a,b){return b.score-a.score;});
      matches=matches.slice(0,3);
      if(!matches.length){dupHint.classList.remove('show');return;}
      dupList.innerHTML=matches.map(function(m){
        var c=CATEGORIES[m.note.cat]||{icon:'📝',name:m.note.cat,color:'#888'};
        var pct=Math.round(m.score*100);
        return '<div class="dup-hint-item">'
          +'<div><div class="dup-hint-name">'+c.icon+' '+escapeHtml(m.note.name)+'</div>'
          +'<div class="dup-hint-meta">'+m.note.score+'/10 · '+m.note.time+' · 匹配 '+pct+'%</div></div>'
          +'<button class="dup-hint-btn" data-merge-id="'+m.note.id+'">合并为再次品鉴</button>'
          +'</div>';
      }).join('');
      dupHint.classList.add('show');
      // Wire merge buttons
      dupList.querySelectorAll('.dup-hint-btn').forEach(function(btn){
        btn.onclick=function(){
          var targetNote=notes.filter(function(n){return n.id===btn.dataset.mergeId;})[0];
          if(!targetNote)return;
          // Switch to universe view, open detail panel with re-tasting form
          dupHint.classList.remove('show');
          recName.value='';
          document.querySelector('[data-view="universe-view"]').click();
          showDetail(targetNote);
          // Auto-open the retaste form
          setTimeout(function(){
            var rtBtn=document.getElementById('btn-retaste');
            if(rtBtn){rtBtn.click();}
          },300);
        };
      });
    },250); // debounce 250ms
  });

  // Also clear hint when saving or switching views
  document.getElementById('btn-save').addEventListener('click',function(){dupHint.classList.remove('show');});
})();

// ══════════════════════════════════════════════════
//  EverOS MEMORY SERVICE — 增删改查
// ══════════════════════════════════════════════════
var EverOS=(function(){
  var _headers=function(){
    var h={'Content-Type':'application/json'};
    if(EVEROS_MODE==='cloud'&&EVEROS_API_KEY)h['Authorization']='Bearer '+EVEROS_API_KEY;
    return h;
  };
  var _groupId=function(){return 'tasteverse_'+USER_ID;};
  var _groupName='TasteVerse';
  var _online=true;

  function formatMemoryContent(note){
    var cat=CATEGORIES[note.cat]||{name:note.cat,icon:'📝'};
    var parts=[];
    parts.push('品鉴记录：'+note.name);
    parts.push('品类：'+cat.icon+' '+cat.name);
    parts.push('评分：'+note.score+'/10');
    if(note.tags&&note.tags.length)parts.push('风味标签：'+note.tags.join('、'));
    if(note.note)parts.push('品鉴笔记：'+note.note);
    if(note.price){
      if(note.price.type==='avg')parts.push('人均价格：¥'+note.price.price);
      else parts.push('价格：¥'+note.price.price);
    }
    if(note.location)parts.push('地点：'+note.location);
    parts.push('日期：'+note.time);
    if(note.visits&&note.visits.length){
      parts.push('品鉴次数：'+(note.visits.length+1)+'次');
      note.visits.forEach(function(v,i){
        var vp='第'+(i+2)+'次（'+v.time+'）：'+v.score+'/10';
        if(v.tags&&v.tags.length)vp+=' 风味：'+v.tags.join('、');
        if(v.note)vp+=' '+v.note;
        parts.push(vp);
      });
    }
    return parts.join('\n');
  }

  function storeMemory(note,callback){
    // v1 API: POST /api/v1/memories
    // Body: { user_id, messages:[{role,timestamp,content}], session_id?, async_mode? }
    var ts=note.time?new Date(note.time+'T12:00:00').getTime():Date.now();
    var payload={
      user_id:USER_ID,
      session_id:note.id||('tv_'+ts),   // one session per note, enables precise delete later
      async_mode:true,
      messages:[{
        role:'user',
        timestamp:ts,
        content:formatMemoryContent(note)
      }]
    };
    fetch(EVEROS_API+'/memories',{method:'POST',headers:_headers(),body:JSON.stringify(payload)})
    .then(function(r){return r.json();})
    .then(function(d){
      _online=true;
      console.log('[EverOS] 存储成功:',note.name,(d.data&&d.data.task_id)||d.status||'');
      if(callback)callback(null,d);
    })
    .catch(function(e){
      _online=false;
      console.log('[EverOS] 存储失败 ('+EVEROS_MODE+'):',e.message);
      if(callback)callback(e);
    });
  }

  function fetchMemories(opts,callback){
    // v1 API: POST /api/v1/memories/get with body { filters:{user_id}, memory_type }
    opts=opts||{};
    var body={
      filters:{user_id:USER_ID},
      memory_type:opts.memory_type||'episodic_memory'
    };
    if(opts.session_id)body.filters.session_id=opts.session_id;
    if(opts.start_time)body.start_time=opts.start_time;
    if(opts.end_time)body.end_time=opts.end_time;
    fetch(EVEROS_API+'/memories/get',{method:'POST',headers:_headers(),body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .then(function(d){_online=true;callback(null,d);})
    .catch(function(e){_online=false;callback(e);});
  }

  function searchMemories(query,opts,callback){
    // v1 API: POST /api/v1/memories/search with body { filters:{user_id}, query, method, top_k }
    opts=opts||{};
    var body={
      filters:{user_id:USER_ID},
      query:query,
      method:opts.method||opts.retrieve_method||'hybrid',
      top_k:opts.top_k||20
    };
    if(opts.start_time)body.start_time=opts.start_time;
    if(opts.end_time)body.end_time=opts.end_time;
    fetch(EVEROS_API+'/memories/search',{method:'POST',headers:_headers(),body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .then(function(d){
      _online=true;
      var results=[];
      var payload=(d&&d.data)?d.data:((d&&d.result)?d.result:d);
      var episodes=payload.episodes||payload.memories||[];
      if(Array.isArray(episodes)){
        episodes.forEach(function(m,i){
          results.push({
            id:m.memory_id||m.id||m.event_id,
            content:m.content||m.summary||'',
            score:m.score||m.relevance_score||(payload.scores&&payload.scores[i])||0,
            importance:m.importance_score||0,
            type:m.memory_type||'episodic_memory',
            metadata:m.metadata||{}
          });
        });
      }
      results.sort(function(a,b){return b.score-a.score;});
      callback(null,results,d);
    })
    .catch(function(e){_online=false;callback(e,[]);});
  }

  function deleteMemory(noteId,callback){
    // v1 API: POST /api/v1/memories/delete
    // Batch delete mode: {user_id, session_id} — we use session_id=note.id so
    // one note's memories can be targeted without knowing the server-side memory_id.
    // Returns 204 No Content on success.
    if(!noteId){if(callback)callback(new Error('no noteId'));return;}
    var body={user_id:USER_ID,session_id:noteId};
    fetch(EVEROS_API+'/memories/delete',{
      method:'POST',headers:_headers(),
      body:JSON.stringify(body)
    })
    .then(function(r){
      _online=r.ok;
      console.log('[EverOS] 删除'+(r.ok?'成功':'失败')+':',noteId,'status='+r.status);
      if(callback)callback(r.ok?null:new Error('status '+r.status));
    })
    .catch(function(e){_online=false;console.log('[EverOS] 删除异常:',e.message);if(callback)callback(e);});
  }

  function updateMemory(note,callback){
    deleteMemory(note.id,function(){
      storeMemory(note,callback);
    });
  }

  function syncAllNotes(notesList,callback){
    if(!notesList||!notesList.length){if(callback)callback();return;}
    var done=0,total=notesList.length;
    console.log('[EverOS] 开始同步 '+total+' 条记录...');
    notesList.forEach(function(n,i){
      setTimeout(function(){
        storeMemory(n,function(){
          done++;
          if(done===total){
            console.log('[EverOS] 同步完成: '+done+'/'+total);
            if(callback)callback();
          }
        });
      },i*150);
    });
  }

  function isOnline(){return _online;}
  function checkConnection(callback){
    // v1 API: POST /api/v1/memories/get
    var body={filters:{user_id:USER_ID},memory_type:'episodic_memory'};
    fetch(EVEROS_API+'/memories/get',{method:'POST',headers:_headers(),body:JSON.stringify(body)})
    .then(function(r){_online=r.ok;callback(_online);})
    .catch(function(){_online=false;callback(false);});
  }

  return {
    store:storeMemory,
    fetch:fetchMemories,
    search:searchMemories,
    delete:deleteMemory,
    update:updateMemory,
    syncAll:syncAllNotes,
    isOnline:isOnline,
    checkConnection:checkConnection,
    formatContent:formatMemoryContent
  };
})();

// ── Legacy wrapper (backward compat) ──
function sendToEverOS(note){EverOS.store(note);}
// Sync existing notes to EverOS on load
if(notes.length)EverOS.syncAll(notes);


// ============================================================
//  PURE MESH APPROACH (no Sprite — proven compatible)
// ============================================================
function hexRgb(hex){
  hex=hex.replace('#','');
  return [parseInt(hex.substring(0,2),16),parseInt(hex.substring(2,4),16),parseInt(hex.substring(4,6),16)];
}

function rgbHex(rgb){
  function toHex(v){
    var h=Math.max(0,Math.min(255,Math.round(v))).toString(16);
    return h.length===1?'0'+h:h;
  }
  return '#'+toHex(rgb[0])+toHex(rgb[1])+toHex(rgb[2]);
}

function mixHex(a,b,t){
  var ar=hexRgb(a),br=hexRgb(b);
  return rgbHex([
    ar[0]+(br[0]-ar[0])*t,
    ar[1]+(br[1]-ar[1])*t,
    ar[2]+(br[2]-ar[2])*t
  ]);
}

function colorForCategory(catKey){
  return (CATEGORIES[catKey]&&CATEGORIES[catKey].color)||'#7b86a8';
}

function nodeMatchesQuery(n,q){
  if(!q)return true;
  if(!n||n._hidden)return false;
  var catName=n.catName||'';
  var tags=(n.tags||[]).join(' ');
  var note=n.note||'';
  var hay=(n.name+' '+tags+' '+catName+' '+note).toLowerCase();
  return hay.indexOf(q)>=0;
}

function linkMatchesQuery(l,q){
  if(!q)return true;
  var s=typeof l.source==='object'?l.source:null;
  var t=typeof l.target==='object'?l.target:null;
  return !!((s&&nodeMatchesQuery(s,q))||(t&&nodeMatchesQuery(t,q)));
}

function nodeMatchesFocusedCategory(n,catKey){
  if(!catKey)return true;
  return !!(n&&n.cat===catKey);
}

function nodeMatchesSelectedNote(n,noteId){
  if(!noteId)return true;
  return !!(n&&n.id===noteId);
}

function linkMatchesFocusedCategory(l,catKey){
  if(!catKey)return true;
  var s=typeof l.source==='object'?l.source:null;
  var t=typeof l.target==='object'?l.target:null;
  return !!((s&&s.cat===catKey)||(t&&t.cat===catKey));
}

function linkMatchesSelectedNote(l,noteId){
  if(!noteId)return true;
  var s=typeof l.source==='object'?l.source:null;
  var t=typeof l.target==='object'?l.target:null;
  return !!((s&&s.id===noteId)||(t&&t.id===noteId));
}

function getCategoryNoteCount(catKey){
  var c=0;
  for(var i=0;i<notes.length;i++)if(notes[i].cat===catKey)c++;
  return c;
}

function getCategoryFocusBoost(catKey){
  if(!catKey)return 1;
  var count=getCategoryNoteCount(catKey);
  if(count<=1)return 1.65;
  if(count<=2)return 1.5;
  if(count<=3)return 1.35;
  return 1.15;
}

function nodeIsEmphasized(n){
  if(!graphSearchQuery&&!graphFocusedCategory&&!graphSelectedNoteId)return false;
  var searchOk=!graphSearchQuery||nodeMatchesQuery(n,graphSearchQuery);
  var catOk=!graphFocusedCategory||nodeMatchesFocusedCategory(n,graphFocusedCategory);
  var noteOk=!graphSelectedNoteId||nodeMatchesSelectedNote(n,graphSelectedNoteId);
  return searchOk&&catOk&&noteOk;
}

function linkIsEmphasized(l){
  if(!graphSearchQuery&&!graphFocusedCategory&&!graphSelectedNoteId)return false;
  var searchOk=!graphSearchQuery||linkMatchesQuery(l,graphSearchQuery);
  var catOk=!graphFocusedCategory||linkMatchesFocusedCategory(l,graphFocusedCategory);
  var noteOk=!graphSelectedNoteId||linkMatchesSelectedNote(l,graphSelectedNoteId);
  return searchOk&&catOk&&noteOk;
}

function escapeHtml(str){
  return String(str||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function highlightMatch(text,q){
  var safe=escapeHtml(text||'');
  if(!q)return safe;
  var idx=safe.toLowerCase().indexOf(q.toLowerCase());
  if(idx<0)return safe;
  return safe.substring(0,idx)
    +'<span style="color:#fff;background:rgba(240,186,97,0.22);box-shadow:0 0 16px rgba(240,186,97,0.18);padding:0 3px;border-radius:4px">'
    +safe.substring(idx,idx+q.length)
    +'</span>'
    +safe.substring(idx+q.length);
}

function createGradientLineObject(T,link){
  var points=link._crossLink?20:(link._tagLink?32:14);
  var positions=new Float32Array(points*3);
  var colors=new Float32Array(points*3);
  var startColor=hexRgb(link._sourceColor||'#7b86a8');
  var endColor=hexRgb(link._targetColor||link._sourceColor||'#7b86a8');
  for(var i=0;i<points;i++){
    var t=points===1?0:i/(points-1);
    colors[i*3]=(startColor[0]+(endColor[0]-startColor[0])*t)/255;
    colors[i*3+1]=(startColor[1]+(endColor[1]-startColor[1])*t)/255;
    colors[i*3+2]=(startColor[2]+(endColor[2]-startColor[2])*t)/255;
  }
  var geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.BufferAttribute(positions,3));
  geo.setAttribute('color',new T.BufferAttribute(colors,3));
  var mat=new T.LineBasicMaterial({
    vertexColors:true,
    transparent:true,
    opacity:link._catLink?(0.3+(link._sim||0)*0.4):(link._tagLink?0.52:0.26),
    blending:T.AdditiveBlending,
    depthWrite:false
  });
  var line=new T.Line(geo,mat);
  line.renderOrder=2;
  line.userData={
    pointCount:points,
    curveAmp:link._crossLink?0.08:(link._tagLink?0.16:0.05),
    linkRef:link,
    baseOpacity:link._catLink?(0.3+(link._sim||0)*0.4):(link._tagLink?0.52:0.26)
  };
  return line;
}

var _lineAnimClock=0;
function updateGradientLineObject(obj,start,end){
  if(!obj||!obj.geometry||!start||!end)return;
  var count=obj.userData.pointCount||2;
  var curveAmp=obj.userData.curveAmp||0;
  var link=obj.userData.linkRef;
  var matched=linkIsEmphasized(link);
  if(obj.material){
    if(!graphSearchQuery&&!graphFocusedCategory)obj.material.opacity=obj.userData.baseOpacity;
    else obj.material.opacity=matched?Math.min(0.95,obj.userData.baseOpacity+0.3):0.02;
  }
  var arr=obj.geometry.attributes.position.array;
  var dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
  var mx=(start.x+end.x)/2,my=(start.y+end.y)/2,mz=(start.z+end.z)/2;
  var len=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
  var bendX=-dy/len*len*curveAmp;
  var bendY=dx/len*len*curveAmp;
  var bendZ=Math.sin((dx+dy+dz)*0.01)*len*curveAmp*0.6;
  for(var i=0;i<count;i++){
    var t=count===1?0:i/(count-1);
    var ease=4*t*(1-t);
    arr[i*3]=start.x+dx*t+bendX*ease;
    arr[i*3+1]=start.y+dy*t+bendY*ease;
    arr[i*3+2]=start.z+dz*t+bendZ*ease;
  }
  obj.geometry.attributes.position.needsUpdate=true;
  obj.geometry.computeBoundingSphere();

  // Flowing energy pulse — a bright spot traveling along the line
  if(obj.geometry.attributes.color&&count>3){
    var colors=obj.geometry.attributes.color.array;
    // Each link gets a unique phase offset based on source/target
    var phase=obj.userData._pulsePhase;
    if(phase===undefined){phase=Math.random()*Math.PI*2;obj.userData._pulsePhase=phase;}
    var speed=link&&link._catLink?0.8:(link&&link._tagLink?0.7:0.4);
    var pulsePos=((_lineAnimClock*speed+phase)%1+1)%1; // 0~1 position along line
    var pulseWidth=link&&link._catLink?0.28:0.22; // wider pulse for catLinks
    var startC=hexRgb(link&&link._sourceColor||'#7b86a8');
    var endC=hexRgb(link&&link._targetColor||link&&link._sourceColor||'#7b86a8');
    for(var i=0;i<count;i++){
      var t2=count===1?0:i/(count-1);
      // Base gradient color
      var br=startC[0]+(endC[0]-startC[0])*t2;
      var bg=startC[1]+(endC[1]-startC[1])*t2;
      var bb=startC[2]+(endC[2]-startC[2])*t2;
      // Pulse brightness boost
      var dist=Math.abs(t2-pulsePos);
      if(dist>0.5)dist=1-dist; // wrap around
      var pulse2=Math.max(0,1-dist/pulseWidth);
      pulse2=pulse2*pulse2; // sharper falloff
      var boost=pulse2*(link&&link._catLink?0.85:0.6);
      colors[i*3]=Math.min(1,(br/255)+boost);
      colors[i*3+1]=Math.min(1,(bg/255)+boost);
      colors[i*3+2]=Math.min(1,(bb/255)+boost);
    }
    obj.geometry.attributes.color.needsUpdate=true;
  }
}

// ============================================================
//  SIMILARITY HELPERS (used by both main graph & mini calendar graph)
// ============================================================
function _extractTokens(text){
  return (text||'').replace(/[·\-—–\/\\|,，、。！？!?.()（）\[\]【】""''「」：:；;\s]+/g,' ').split(' ')
    .map(function(s){return s.trim().toLowerCase();})
    .filter(function(s){return s.length>=2;});
}
function _extractNoteKeywords(noteText){
  if(!noteText)return [];
  var kw=[];
  var flavorWords=['辣','麻','甜','酸','苦','咸','鲜','香','醇','浓','淡','清','厚','滑',
    '嫩','脆','软','糯','烫','冰','凉','热','油','腻','爽','回甘','丝滑','顺滑','绵密',
    '焦香','烟熏','奶香','果香','花香','坚果','巧克力','柑橘','莓果','焦糖','蜂蜜','vanilla',
    'fruity','smoky','nutty','floral','citrus','sweet','bitter','sour','spicy','creamy',
    'rich','light','smooth','bold','mild','balanced'];
  var text=noteText.toLowerCase();
  flavorWords.forEach(function(fw){if(text.indexOf(fw)>=0)kw.push(fw);});
  var tokens=_extractTokens(noteText);
  var stop=['的','了','很','是','在','有','和','也','都','不','这','那','就','但','还',
    '会','可以','非常','比较','觉得','感觉','一个','一些','一点','可能','应该','真的',
    'the','and','but','this','that','very','really','also','just','with','from','have'];
  tokens.forEach(function(t){if(stop.indexOf(t)<0&&kw.indexOf(t)<0)kw.push(t);});
  return kw;
}
function _countSharedKeywords(kwA,kwB){
  var shared=0;
  kwA.forEach(function(a){kwB.forEach(function(b){
    if(a===b)shared++;else if(a.length>=2&&b.length>=2&&(a.indexOf(b)>=0||b.indexOf(a)>=0))shared+=0.5;
  });});
  return shared;
}
function noteSimilarity(a,b){
  var score=0;
  var tokA=_extractTokens(a.name),tokB=_extractTokens(b.name);
  var sharedName=_countSharedKeywords(tokA,tokB);
  score+=Math.min(1,sharedName/(Math.max(tokA.length,tokB.length)||1))*0.35;
  var allTagsA=(a.tags||[]).slice();(a.visits||[]).forEach(function(v){(v.tags||[]).forEach(function(t){if(allTagsA.indexOf(t)<0)allTagsA.push(t);});});
  var allTagsB=(b.tags||[]).slice();(b.visits||[]).forEach(function(v){(v.tags||[]).forEach(function(t){if(allTagsB.indexOf(t)<0)allTagsB.push(t);});});
  var sharedTags=0;allTagsA.forEach(function(t){if(allTagsB.indexOf(t)>=0)sharedTags++;});
  score+=Math.min(1,sharedTags/(Math.max(allTagsA.length,allTagsB.length)||1))*0.25;
  var allNoteA=a.note||'';(a.visits||[]).forEach(function(v){if(v.note)allNoteA+=' '+v.note;});
  var allNoteB=b.note||'';(b.visits||[]).forEach(function(v){if(v.note)allNoteB+=' '+v.note;});
  var nkA=_extractNoteKeywords(allNoteA),nkB=_extractNoteKeywords(allNoteB);
  if(nkA.length>0&&nkB.length>0){score+=Math.min(1,_countSharedKeywords(nkA,nkB)/(Math.max(nkA.length,nkB.length)||1))*0.30;}
  score+=(1-Math.abs((a.score||5)-(b.score||5))/10)*0.10;
  return Math.min(1,Math.max(0,score));
}

// ============================================================
//  3D GRAPH
// ============================================================
function buildGraphData(){
  var gN=[],gL=[];
  Object.keys(TAXONOMY).forEach(function(gk){gN.push({id:'__g_'+gk,_hidden:true});});
  Object.keys(CATEGORIES).forEach(function(ck){
    gN.push({id:'__c_'+ck,_hidden:true,_catKey:ck});
    gL.push({source:'__c_'+ck,target:'__g_'+CATEGORIES[ck].parent,_hidden:true});
  });
  notes.forEach(function(n){
    var c=CATEGORIES[n.cat]||{color:'#888',name:n.cat,icon:'📝'};
    var vc=(n.visits?n.visits.length:0)+1; // visit count (1=first tasting + visits)
    gN.push({id:n.id,name:n.name,cat:n.cat,catName:c.name,catIcon:c.icon,color:c.color,
      val:3+n.score*0.5+(Math.log(vc)/Math.log(1.5))*3,score:n.score,note:n.note,tags:n.tags,time:n.time,visits:vc,price:n.price,_noteRef:n});
    gL.push({source:n.id,target:'__c_'+n.cat,_hidden:true});
  });

  // Same-category links with intra-cluster sub-grouping
  // Notes sharing keywords in name (store, origin, style) or tags cluster tighter
  var byCat={};
  notes.forEach(function(n){if(!byCat[n.cat])byCat[n.cat]=[];byCat[n.cat].push(n);});

  // Similarity helpers now use top-level _extractTokens, _extractNoteKeywords, _countSharedKeywords, noteSimilarity

  Object.keys(byCat).forEach(function(cat){
    var arr=byCat[cat];
    for(var i=0;i<arr.length;i++){
      for(var j=i+1;j<arr.length;j++){
        var sim=noteSimilarity(arr[i],arr[j]);
        var catColor=colorForCategory(cat);
        gL.push({
          source:arr[i].id,
          target:arr[j].id,
          _hidden:false,
          _catLink:true,
          _catColor:catColor,
          _sourceColor:catColor,
          _targetColor:catColor,
          _str:0.08,
          _sim:sim  // 0=unrelated, 1=very similar
        });
      }
    }
  });

  // Shared-tag links (cross-category)
  for(var i=0;i<notes.length;i++){for(var j=i+1;j<notes.length;j++){
    if(notes[i].cat===notes[j].cat)continue;
    var shared=notes[i].tags.filter(function(t){return notes[j].tags.indexOf(t)>=0;});
    if(shared.length>0){
      var c1=colorForCategory(notes[i].cat);
      var c2=colorForCategory(notes[j].cat);
      gL.push({
        source:notes[i].id,
        target:notes[j].id,
        _hidden:false,
        _tagLink:true,
        _sharedTags:shared,
        _linkColor:mixHex(c1,c2,0.5),
        _sourceColor:c1,
        _targetColor:c2,
        _str:shared.length*0.15
      });
    }
  }}

  // Cross-category links (same taxonomy group)
  Object.keys(TAXONOMY).forEach(function(gk){
    var ch=TAXONOMY[gk].children.filter(function(c){return byCat[c]&&byCat[c].length;});
    for(var a=0;a<ch.length;a++){
      for(var b=a+1;b<ch.length;b++){
        var na=byCat[ch[a]][0],nb=byCat[ch[b]][0];
        if(na&&nb)gL.push({
          source:na.id,
          target:nb.id,
          _hidden:false,
          _crossLink:true,
          _sourceColor:colorForCategory(ch[a]),
          _targetColor:colorForCategory(ch[b]),
          _str:0.03
        });
      }
    }
  });

  return {nodes:gN,links:gL};
}

// ── Particle texture generators ──
var _cometTextureCache={};
function getCometTexture(T,hexColor){
  if(_cometTextureCache[hexColor])return _cometTextureCache[hexColor];
  var c=document.createElement('canvas');c.width=64;c.height=16;
  var ctx=c.getContext('2d');
  var rgb=hexRgb(hexColor);
  // Bright head (right side) fading to transparent tail (left side)
  var g=ctx.createRadialGradient(52,8,0,52,8,12);
  g.addColorStop(0,'rgba(255,255,255,0.95)');
  g.addColorStop(0.3,'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',0.8)');
  g.addColorStop(1,'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',0)');
  ctx.fillStyle=g;ctx.fillRect(28,0,36,16);
  // Tail streak
  var g2=ctx.createLinearGradient(0,8,52,8);
  g2.addColorStop(0,'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',0)');
  g2.addColorStop(0.5,'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',0.15)');
  g2.addColorStop(1,'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',0.6)');
  ctx.fillStyle=g2;
  ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(52,7);ctx.lineTo(52,9);ctx.lineTo(0,10);ctx.fill();
  var tex=new T.CanvasTexture(c);
  tex.needsUpdate=true;
  _cometTextureCache[hexColor]=tex;
  return tex;
}

var _circleTexture=null;
function getCircleTexture(T){
  if(_circleTexture)return _circleTexture;
  var c=document.createElement('canvas');c.width=32;c.height=32;
  var ctx=c.getContext('2d');
  var g=ctx.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(0.4,'rgba(255,255,255,0.6)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,32,32);
  _circleTexture=new T.CanvasTexture(c);
  _circleTexture.needsUpdate=true;
  return _circleTexture;
}

function initGraph(){
  try{
    var container=document.getElementById('graph-container');
    if(!container){showError('Container not found');return;}
    var data=buildGraphData();
    var visLinks=data.links.filter(function(l){return !l._hidden;});

    try{Graph=ForceGraph3D()(container);}catch(e1){
      try{Graph=new ForceGraph3D(container);}catch(e2){showError('Init failed');return;}
    }
    if(!Graph)return;

    var T=window.THREE;
    if(!T){
      try{var _sc=Graph.scene();T=Object.getPrototypeOf(_sc).constructor;if(!T.Group)T=null;}catch(e){}
    }
    if(!T){
      try{var _r=Graph.renderer();T=Object.getPrototypeOf(Object.getPrototypeOf(_r)).constructor;if(!T.Group)T=null;}catch(e){}
    }
    if(!T){showError('THREE.js not available — check network');return;}

    Graph.backgroundColor('#0b1026')
      .width(window.innerWidth)
      .height(window.innerHeight-52)
      .showNavInfo(false)
      .nodeVisibility(function(n){return !n._hidden;})
      .nodeVal(function(n){return n.val||1;})
      .nodeOpacity(1)
      .nodeResolution(24)
      .nodeLabel(function(n){
        if(n._hidden)return '';
        var q=graphSearchQuery;
        var noteText=(n.note||'').substring(0,80);
        var tagsText=(n.tags||[]).join(' · ');
        return '<div style="background:rgba(5,5,15,0.95);padding:12px 16px;border-radius:10px;border:1px solid '+n.color+'30;max-width:260px;font-family:Inter,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5)">'
          +'<div style="font-size:10px;color:'+n.color+';font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">'+escapeHtml(n.catIcon)+' '+highlightMatch(n.catName,q)+'</div>'
          +'<div style="font-size:14px;font-weight:700;color:#e8e8f0;margin-bottom:5px">'+highlightMatch(n.name,q)+'</div>'
          +(tagsText?'<div style="font-size:10px;color:#9cc7ff;margin-bottom:5px;line-height:1.5">'+highlightMatch(tagsText,q)+'</div>':'')
          +'<div style="font-size:11px;color:#7878a0;line-height:1.4">'+highlightMatch(noteText,q)+'</div>'
          +(n.price?'<div style="font-size:11px;color:#f0ba61;margin-top:4px">💰 ¥'+n.price.price+(n.price.type==='avg'?' 人均':'')+'</div>':'')
          +'<div style="font-size:24px;font-weight:800;color:'+n.color+';margin-top:6px">'+n.score+'<span style="font-size:11px;opacity:0.4">/10</span>'+(n.visits>1?' <span style="font-size:11px;opacity:0.5;margin-left:6px">×'+n.visits+'</span>':'')+'</div></div>';
      })
      .linkVisibility(function(l){return !l._hidden;})
      .linkLabel(function(l){
        if(l._hidden)return '';
        var sn=typeof l.source==='object'?l.source:null;
        var tn=typeof l.target==='object'?l.target:null;
        var sName=sn?sn.name:'';var tName=tn?tn.name:'';
        var sColor=sn?sn.color:'#888';var tColor=tn?tn.color:'#888';
        var sCat=sn?(sn.catIcon||'')+' '+(sn.catName||''):'';
        var tCat=tn?(tn.catIcon||'')+' '+(tn.catName||''):'';
        var typeLabel='',reason='',dotColor='#888';
        if(l._catLink){
          typeLabel='同品类关联';dotColor=l._catColor||'#7fe0cf';
          var sim=l._sim||0;var pct=Math.round(sim*100);
          reason='相似度 <b>'+pct+'%</b>';
          if(sim>0.3){
            // explain what contributes to similarity
            var parts=[];
            if(sn&&tn&&sn._noteRef&&tn._noteRef){
              var stA=(sn._noteRef.tags||[]),stB=(tn._noteRef.tags||[]);
              var shared=stA.filter(function(t){return stB.indexOf(t)>=0;});
              if(shared.length)parts.push('共享标签: '+shared.join('、'));
              var tokA=_extractTokens(sn.name),tokB=_extractTokens(tn.name);
              var nameSh=tokA.filter(function(t){return tokB.indexOf(t)>=0;});
              if(nameSh.length)parts.push('名称相近: '+nameSh.join('、'));
            }
            if(parts.length)reason+='<br><span style="opacity:0.7">'+parts.join(' · ')+'</span>';
          }
        }else if(l._tagLink){
          typeLabel='跨品类风味关联';dotColor=l._linkColor||'#af79ff';
          reason='共享标签: <b>'+(l._sharedTags||[]).join('、')+'</b>';
        }else if(l._crossLink){
          typeLabel='品类族群关联';dotColor=mixHex(l._sourceColor||'#888',l._targetColor||'#888',0.5);
          reason='属于同一大类（'+sCat.trim()+' ↔ '+tCat.trim()+'）';
        }else{
          return '';
        }
        return '<div style="background:rgba(5,5,15,0.95);padding:12px 16px;border-radius:10px;border:1px solid '+dotColor+'30;max-width:300px;font-family:Inter,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5)">'
          +'<div style="font-size:9px;color:'+dotColor+';font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">● '+typeLabel+'</div>'
          +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px">'
          +'<span style="font-size:12px;font-weight:600;color:'+sColor+'">'+escapeHtml(sName)+'</span>'
          +'<span style="font-size:10px;color:#555">↔</span>'
          +'<span style="font-size:12px;font-weight:600;color:'+tColor+'">'+escapeHtml(tName)+'</span>'
          +'</div>'
          +'<div style="font-size:11px;color:#99a7c7;line-height:1.6">'+reason+'</div>'
          +'</div>';
      })
      .linkWidth(function(l){
        var matched=linkIsEmphasized(l);
        if(!graphSearchQuery&&!graphFocusedCategory){
          if(l._crossLink)return 0.35;
          if(l._catLink){var s=l._sim||0;return 0.2+s*0.45;}
          if(l._tagLink)return 0.42;
          return 0.28;
        }
        if(l._crossLink)return matched?0.8:0.12;
        if(l._catLink){var s2=l._sim||0;return matched?(0.6+s2*0.5):(0.06+s2*0.08);}
        if(l._tagLink)return matched?1.05:0.14;
        return matched?0.7:0.1;
      })
      .linkOpacity(function(l){
        var matched=linkIsEmphasized(l);
        if(!graphSearchQuery&&!graphFocusedCategory){
          if(l._crossLink)return 0.28;
          if(l._catLink){var s=l._sim||0;return 0.12+s*0.28;}
          if(l._tagLink)return 0.32;
          return 0.22;
        }
        if(l._crossLink)return matched?0.55:0.04;
        if(l._catLink){var s2=l._sim||0;return matched?(0.4+s2*0.35):(0.01+s2*0.02);}
        if(l._tagLink)return matched?0.76:0.03;
        return matched?0.48:0.02;
      })
      .linkColor(function(l){
        if(l._catLink)return l._catColor||'#6c7896';
        if(l._crossLink)return mixHex(l._sourceColor||'#60708a',l._targetColor||'#8ea4c8',0.5);
        if(l._tagLink&&l._linkColor)return l._linkColor;
        return mixHex(l._sourceColor||'#60708a',l._targetColor||'#8ea4c8',0.5);
      })
      .linkCurvature(function(l){
        if(l._tagLink)return 0.14;
        if(l._crossLink)return 0.06;
        return 0.03;
      })
      .linkCurveRotation(function(l){
        if(!l._tagLink)return 0;
        var sid=typeof l.source==='object'?l.source.id:l.source;
        var tid=typeof l.target==='object'?l.target.id:l.target;
        var seed=(String(sid)+String(tid)).length;
        return (seed%6)*(Math.PI/3);
      })
      .linkDirectionalParticles(function(l){
        var matched=linkIsEmphasized(l);
        if(!graphSearchQuery&&!graphFocusedCategory){
          if(l._catLink)return 3;
          if(l._crossLink)return 3;
          if(l._tagLink)return 3;
          return 2;
        }
        if(l._catLink)return matched?5:2;
        if(l._crossLink)return matched?6:2;
        if(l._tagLink)return matched?7:1;
        return matched?4:1;
      })
      .linkDirectionalParticleWidth(function(l){
        var matched=linkIsEmphasized(l);
        if(l._catLink)return matched?3.5:2.5;
        if(l._crossLink)return matched?3.5:2.5;
        if(l._tagLink)return matched?3.8:2.2;
        return matched?3.0:2.0;
      })
      .linkDirectionalParticleSpeed(function(l){
        if(l._catLink)return 0.002+Math.random()*0.003;
        if(l._crossLink)return 0.002+Math.random()*0.003;
        return 0.003+Math.random()*0.005;
      })
      .linkDirectionalParticleColor(function(l){
        // Mix heavily toward white so particles never appear as dark dots
        if(l._catLink)return mixHex(l._catColor||'#7fe0cf','#ffffff',0.6);
        if(l._crossLink)return mixHex(l._sourceColor||'#7fe0cf','#ffffff',0.6);
        if(l._tagLink)return mixHex(l._linkColor||'#af79ff','#ffffff',0.5);
        return '#ffffff';
      })
      .linkThreeObject(function(l){
        return createGradientLineObject(T,l);
      })
      .linkThreeObjectExtend(true)
      .linkPositionUpdate(function(obj,pos){
        updateGradientLineObject(obj,pos.start,pos.end);
        return true;
      })
      .onNodeClick(function(n){
        if(!n._noteRef)return;
        graphSelectedNoteId=n.id;
        applyGraphSearch(graphSearchQuery,false);
        showDetail(n._noteRef);
      });

    // ═══════════════════════════════════════════
    //  FORCES — simulation tuning
    // ═══════════════════════════════════════════
    Graph.d3AlphaDecay(0.03)
      .d3VelocityDecay(0.45)
      .warmupTicks(80)
      .cooldownTicks(300)
      .cooldownTime(8000);

    setTimeout(function(){
      try{
        var charge=Graph.d3Force('charge');
        if(charge){
          charge.strength(function(nn){
            if(nn.id&&nn.id.indexOf('__g_')===0)return -160;
            if(nn.id&&nn.id.indexOf('__c_')===0)return -80;
            return -35;
          });
          charge.distanceMax(250);
        }
        Graph.d3Force('center',null);
        function centerForce(dim){
          var str=0.025;
          function force(alpha){
            var nodes=force._nodes||[];
            for(var i=0;i<nodes.length;i++){
              var n=nodes[i];
              if(dim==='x'){n.vx-=n.x*str*alpha;}
              else if(dim==='y'){n.vy-=n.y*str*alpha;}
              else{n.vz=(n.vz||0)-((n.z||0)*str*alpha);}
            }
          }
          force.initialize=function(nodes){force._nodes=nodes;};
          force.strength=function(s){if(!arguments.length)return str;str=s;return force;};
          return force;
        }
        Graph.d3Force('gravityX',centerForce('x'));
        Graph.d3Force('gravityY',centerForce('y'));
        Graph.d3Force('gravityZ',centerForce('z'));

        var lnk=Graph.d3Force('link');
        if(lnk){
          lnk.distance(function(ll){
            if(ll._hidden){
              var sid=typeof ll.source==='string'?ll.source:ll.source.id;
              var tid=typeof ll.target==='string'?ll.target:ll.target.id;
              if((sid.indexOf('__c_')===0&&tid.indexOf('__g_')===0)||(tid.indexOf('__c_')===0&&sid.indexOf('__g_')===0))return 35;
              return 18;
            }
            if(ll._crossLink)return 75;
            if(ll._catLink){var sim=ll._sim||0;return 32-sim*20;}
            return 55;
          });
          lnk.strength(function(ll){
            if(ll._hidden){
              var sid=typeof ll.source==='string'?ll.source:(ll.source&&ll.source.id)||'';
              var tid=typeof ll.target==='string'?ll.target:(ll.target&&ll.target.id)||'';
              if((sid.indexOf('__c_')===0&&tid.indexOf('__g_')===0)||(tid.indexOf('__c_')===0&&sid.indexOf('__g_')===0))return 0.5;
              return 0.7;
            }
            if(ll._crossLink)return 0.06;
            if(ll._catLink){var sim=ll._sim||0;return 0.15+sim*0.4;}
            return (ll._str||0.1)*1.1;
          });
        }
      }catch(e){console.warn('[TasteVerse] Force cfg:',e);}
    },100);

    // ═══════════════════════════════════════════
    //  SCENE: Enhanced Starfield + Nebula (Gemini)
    // ═══════════════════════════════════════════
    var scene=Graph.scene();

    // --- Deep-space color veil ---
    (function(){
      var bgShells=[
        {color:0x0a1830,r:2600,op:0.22,pos:[0,0,0]},
        {color:0x12356a,r:2150,op:0.18,pos:[180,-120,-260]},
        {color:0x3a1a5a,r:1880,op:0.16,pos:[-260,160,140]},
        {color:0x1b5c49,r:1680,op:0.14,pos:[80,260,-120]},
        {color:0x6c294a,r:1900,op:0.13,pos:[-90,-260,220]}
      ];
      bgShells.forEach(function(s){
        var shell=new T.Mesh(
          new T.SphereGeometry(s.r,32,32),
          new T.MeshBasicMaterial({color:s.color,transparent:true,opacity:s.op,side:T.BackSide,depthWrite:false})
        );
        shell.position.set(s.pos[0],s.pos[1],s.pos[2]);
        scene.add(shell);
      });
    })();

    // --- 7000 background stars ---
    (function(){
      var N=7000,pos=new Float32Array(N*3),col2=new Float32Array(N*3);
      for(var si=0;si<N;si++){
        pos[si*3]=(Math.random()-0.5)*4000;
        pos[si*3+1]=(Math.random()-0.5)*4000;
        pos[si*3+2]=(Math.random()-0.5)*4000;
        var br=0.5+Math.random()*0.5;
        col2[si*3]=br;
        col2[si*3+1]=br;
        col2[si*3+2]=br;
      }
      var sg=new T.BufferGeometry();
      sg.setAttribute('position',new T.BufferAttribute(pos,3));
      sg.setAttribute('color',new T.BufferAttribute(col2,3));
      scene.add(new T.Points(sg,new T.PointsMaterial({size:1.5,vertexColors:true,transparent:true,opacity:0.8,sizeAttenuation:true,depthWrite:false})));
    })();

    // --- Nebula Clouds (Gemini enhanced) ---
    (function(){
      var clouds=[
        {pos:[500,200,-800],color:0x1a3a5a,r:500,op:0.05,sx:2,sy:1,sz:2},
        {pos:[-600,-300,-500],color:0x3a1a5a,r:500,op:0.05,sx:2,sy:1,sz:2},
        {pos:[120,80,60],color:0x285040,r:90,op:0.035,sx:1,sy:1,sz:1},
        {pos:[-100,40,-50],color:0x302060,r:120,op:0.03,sx:1,sy:1,sz:1},
        {pos:[30,-70,100],color:0x503040,r:80,op:0.04,sx:1,sy:1,sz:1},
        {pos:[-60,120,-100],color:0x204060,r:110,op:0.025,sx:1,sy:1,sz:1},
        {pos:[80,-40,-80],color:0x404020,r:70,op:0.035,sx:1,sy:1,sz:1},
        {pos:[-150,-30,40],color:0x253050,r:100,op:0.03,sx:1,sy:1,sz:1},
        {pos:[300,200,-200],color:0x182838,r:250,op:0.015,sx:1,sy:1,sz:1},
        {pos:[-250,-150,300],color:0x281828,r:220,op:0.012,sx:1,sy:1,sz:1}
      ];
      clouds.forEach(function(cc){
        for(var layer=0;layer<4;layer++){
          var rrr=cc.r*(1+layer*0.6);
          var ooo=cc.op*(1-layer*0.25);
          var mm=new T.Mesh(
            new T.SphereGeometry(rrr,28,28),
            new T.MeshBasicMaterial({color:cc.color,transparent:true,opacity:ooo,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending})
          );
          mm.position.set(cc.pos[0]+(Math.random()-0.5)*20,cc.pos[1]+(Math.random()-0.5)*20,cc.pos[2]+(Math.random()-0.5)*20);
          mm.scale.set(cc.sx||1,cc.sy||1,cc.sz||1);
          scene.add(mm);
        }
      });
    })();

    // --- Colored nebula dust particles ---
    (function(){
      var N=4200,pos=new Float32Array(N*3),col3=new Float32Array(N*3);
      var cArr=Object.keys(CATEGORIES).map(function(k){return hexRgb(CATEGORIES[k].color);});
      for(var di=0;di<N;di++){
        pos[di*3]=(Math.random()-0.5)*950;
        pos[di*3+1]=(Math.random()-0.5)*950;
        pos[di*3+2]=(Math.random()-0.5)*950;
        var dcc=cArr[Math.floor(Math.random()*cArr.length)];
        col3[di*3]=Math.min(1,dcc[0]/255+Math.random()*0.1);
        col3[di*3+1]=Math.min(1,dcc[1]/255+Math.random()*0.1);
        col3[di*3+2]=Math.min(1,dcc[2]/255+Math.random()*0.14);
      }
      var dg=new T.BufferGeometry();
      dg.setAttribute('position',new T.BufferAttribute(pos,3));
      dg.setAttribute('color',new T.BufferAttribute(col3,3));
      scene.add(new T.Points(dg,new T.PointsMaterial({size:0.9,vertexColors:true,transparent:true,opacity:0.42,sizeAttenuation:true,depthWrite:false})));
    })();

    // --- Micro particles haze ---
    (function(){
      var N=4800,pos=new Float32Array(N*3),col4=new Float32Array(N*3);
      for(var hi=0;hi<N;hi++){
        pos[hi*3]=(Math.random()-0.5)*1200;
        pos[hi*3+1]=(Math.random()-0.5)*1200;
        pos[hi*3+2]=(Math.random()-0.5)*1200;
        col4[hi*3]=0.35+Math.random()*0.3;
        col4[hi*3+1]=0.45+Math.random()*0.25;
        col4[hi*3+2]=0.65+Math.random()*0.35;
      }
      var hg=new T.BufferGeometry();
      hg.setAttribute('position',new T.BufferAttribute(pos,3));
      hg.setAttribute('color',new T.BufferAttribute(col4,3));
      scene.add(new T.Points(hg,new T.PointsMaterial({size:0.34,vertexColors:true,transparent:true,opacity:0.1,sizeAttenuation:true,depthWrite:false})));
    })();

    // --- Lights ---
    scene.add(new T.AmbientLight(0xf3f7ff,0.4));
    var lp1=new T.PointLight(0x6debd4,2.2,1200);lp1.position.set(250,250,250);scene.add(lp1);
    var lp2=new T.PointLight(0x58a7ff,1.9,1200);lp2.position.set(-250,-120,180);scene.add(lp2);
    var lp3=new T.PointLight(0xb46fff,1.7,1200);lp3.position.set(0,180,-250);scene.add(lp3);
    var lp4=new T.PointLight(0xf2b66b,1.4,900);lp4.position.set(150,-200,-100);scene.add(lp4);
    var lp5=new T.PointLight(0xff5fa2,1.1,950);lp5.position.set(-180,220,90);scene.add(lp5);

    // Depth fog — slightly deeper for #050a12
    scene.fog=new T.FogExp2(0x0b1026,0.00055);

    // Stats
    document.getElementById('stat-total').textContent=notes.length;
    document.getElementById('stat-cats').textContent=Object.keys(CATEGORIES).filter(function(k){return notes.some(function(n){return n.cat===k;});}).length;
    document.getElementById('stat-conn').textContent=visLinks.length;

    // Legend (initial render — subsequent updates happen in refreshGraph)
    renderLegend();

    // ═══════════════════════════════════════════
    //  NODE RENDERING — Gemini Phong + Glow Sprite + Rings
    // ═══════════════════════════════════════════
    // Shared comet teardrop geometry: hemisphere head at -Y, flowing tail at +Y
    var _cometProfile=[];
    // Hemisphere (7 points): compact head (r=0.5)
    for(var _i=0;_i<=6;_i++){var _a=Math.PI/2*_i/6;_cometProfile.push(new T.Vector2(0.5*Math.sin(_a),-0.5*Math.cos(_a)));}
    // Flowing tail (12 points): long slender taper
    for(var _i=1;_i<=12;_i++){var _t=_i/12;_cometProfile.push(new T.Vector2(0.5*Math.pow(1-_t,2.2),7.0*_t));}
    var _cometGeo=new T.LatheGeometry(_cometProfile,10);
    var _cometUp=new T.Vector3(0,1,0),_cometTmp=new T.Vector3();

    var _breathNodes=[];
    Graph.nodeThreeObject(function(n){
      if(n._hidden){
        return new T.Mesh(new T.SphereGeometry(0.1,4,4),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      }
      var grp=new T.Group();
      grp.userData={baseScale:1,phase:Math.random()*Math.PI*2,speed:0.3+Math.random()*0.4,noteRef:n};
      var sz=Math.cbrt(n.val||5)*1.65;
      var col=new T.Color(n.color||'#ffffff');
      var colHex=n.color||'#ffffff';

      // Core sphere — Gemini MeshPhongMaterial with emissive glow
      var coreGeo=new T.SphereGeometry(sz*1.1,32,32);
      var coreMat=new T.MeshPhongMaterial({
        color:col,
        emissive:col,
        emissiveIntensity:0.8,
        shininess:100,
        transparent:true,
        opacity:0.9
      });
      var coreMesh=new T.Mesh(coreGeo,coreMat);
      grp.add(coreMesh);

      // Inner white core — transparent so highlight contrast works
      grp.add(new T.Mesh(new T.SphereGeometry(sz*0.36,12,12),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5})));

      // Glow sprite (AdditiveBlending halo) — use 128px canvas with smooth RGBA falloff
      var canvas=document.createElement('canvas');
      canvas.width=128;canvas.height=128;
      var ctx=canvas.getContext('2d');
      var cRgb=hexRgb(colHex);
      var gradient=ctx.createRadialGradient(64,64,0,64,64,64);
      gradient.addColorStop(0,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.9)');
      gradient.addColorStop(0.15,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.5)');
      gradient.addColorStop(0.4,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.15)');
      gradient.addColorStop(0.7,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0.03)');
      gradient.addColorStop(1,'rgba('+cRgb[0]+','+cRgb[1]+','+cRgb[2]+',0)');
      ctx.fillStyle=gradient;
      ctx.fillRect(0,0,128,128);
      var spriteMap=new T.CanvasTexture(canvas);
      var spriteMat=new T.SpriteMaterial({map:spriteMap,transparent:true,blending:T.AdditiveBlending,opacity:0.5,depthWrite:false});
      var sprite=new T.Sprite(spriteMat);
      sprite.scale.set(sz*5,sz*5,1);
      grp.add(sprite);

      // Outer glow layers (softer, fewer than before)
      grp.add(new T.Mesh(new T.SphereGeometry(sz*4.8,24,24),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.06,depthWrite:false,side:T.BackSide})));
      grp.add(new T.Mesh(new T.SphereGeometry(sz*3.0,22,22),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.12,depthWrite:false})));

      // Original-style ring
      var ringGeo=new T.TorusGeometry(sz*2.5,sz*0.08,12,56);
      var ringMat=new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.26,depthWrite:false});
      var ring1=new T.Mesh(ringGeo,ringMat);
      ring1.rotation.x=Math.PI/2.8;
      ring1.rotation.y=Math.random()*Math.PI;
      grp.add(ring1);

      var ring2=new T.Mesh(
        new T.TorusGeometry(sz*3.15,sz*0.05,10,64),
        new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.1,depthWrite:false})
      );
      ring2.rotation.x=Math.PI/2;
      ring2.rotation.z=Math.random()*Math.PI;
      grp.add(ring2);

      // Comet orbitals — smooth 3D teardrop (hemisphere head + flowing tail)
      var cometCount=14+Math.floor(Math.random()*10);
      var cometGroup=new T.Group();
      cometGroup.userData={_cometHost:true,_comets:[]};
      for(var ci=0;ci<cometCount;ci++){
        var cRadius=sz*(1.5+Math.random()*4.5);
        var cAngle=Math.random()*Math.PI*2;
        var cSpeed=(0.25+Math.random()*0.9)*(Math.random()>0.5?1:-1);
        var cTiltX=(Math.random()-0.5)*1.4;
        var cTiltZ=(Math.random()-0.5)*1.4;
        var cYoff=(Math.random()-0.5)*sz*1.5;
        var cScale=sz*(0.14+Math.random()*0.08);
        // One teardrop mesh per comet, reusing shared geometry
        var cMat=new T.MeshBasicMaterial({
          color:col,transparent:true,opacity:0.8,
          depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide
        });
        var cMesh=new T.Mesh(_cometGeo,cMat);
        cMesh.scale.set(cScale,cScale,cScale);
        cMesh.frustumCulled=false;
        cometGroup.add(cMesh);
        cometGroup.userData._comets.push({
          mesh:cMesh,angle:cAngle,radius:cRadius,speed:cSpeed,
          tiltX:cTiltX,tiltZ:cTiltZ,yOff:cYoff
        });
      }
      grp.add(cometGroup);

      _breathNodes.push(grp);
      return grp;
    });
    Graph.nodeThreeObjectExtend(false).graphData(data);

    // ═══════════════════════════════════════════
    //  BREATHING ANIMATION — Gemini pulse + scene rotation
    // ═══════════════════════════════════════════
    var _clock=0;
    (function breathe(){
      _clock+=0.016;
      _lineAnimClock+=0.016;
      for(var bi=0;bi<_breathNodes.length;bi++){
        var g=_breathNodes[bi];
        if(!g.userData)continue;
        var t=_clock*g.userData.speed+g.userData.phase;
        var noteRef=g.userData.noteRef;
        var idle=!graphSearchQuery&&!graphFocusedCategory&&!graphSelectedNoteId;
        var active=nodeIsEmphasized(noteRef);
        var selected=!!(graphSelectedNoteId&&noteRef&&noteRef.id===graphSelectedNoteId);
        var focusBoost=graphFocusedCategory&&noteRef&&noteRef.cat===graphFocusedCategory?getCategoryFocusBoost(noteRef.cat):1;

        // Gemini-style breathing: smooth pulse with sin wave
        var pulse=1+Math.sin(t)*0.1;
        var s=idle
          ? pulse
          : ((selected?1.32:(active?(1.08*focusBoost):0.82)))+Math.sin(t)*(selected?0.16:(active?0.13:0.02));
        g.scale.set(s,s,s);

        // [0] Core emissive intensity pulsing
        if(g.children[0]&&g.children[0].material&&g.children[0].material.emissiveIntensity!==undefined){
          g.children[0].material.emissiveIntensity=(idle?0.6:(selected?1.4:(active?1.0:0.2)))+Math.sin(t*1.2)*0.2;
          g.children[0].material.opacity=idle?0.88:(selected?1:active?1:0.25);
        }
        // [1] Inner white core — dim for non-active, bright for selected
        if(g.children[1]&&g.children[1].material){
          g.children[1].material.opacity=idle?0.35:(selected?0.95:(active?0.55:0.1));
        }
        // [2] Sprite glow pulsing
        if(g.children[2]&&g.children[2].material){
          g.children[2].material.opacity=(idle?0.4:(selected?0.8:(active?0.6:0.15)))+Math.sin(t*1.5)*(idle?0.2:0.1);
        }
        // [3,4] Outer glow layers
        if(g.children[3]&&g.children[3].material){
          g.children[3].material.opacity=(idle?0.05:(selected?0.18:(active?0.12:0.01)))+Math.sin(t*0.7)*0.02;
        }
        if(g.children[4]&&g.children[4].material){
          g.children[4].material.opacity=(idle?0.1:(selected?0.35:(active?0.24:0.03)))+Math.sin(t*1.1)*0.04;
        }
        // [5] Ring opacity pulse
        if(g.children[5]&&g.children[5].material){
          g.children[5].material.opacity=(idle?0.2:(selected?0.55:(active?0.38:0.05)))+Math.sin(t*0.8)*0.06;
        }
        // [6] Outer ring
        if(g.children[6]&&g.children[6].material){
          g.children[6].material.opacity=(idle?0.07:(selected?0.28:(active?0.18:0.02)))+Math.sin(t*0.6)*0.03;
        }

        // Rotate group slowly
        g.rotation.y=_clock*0.15+g.userData.phase;

        // Animate comet teardrops — position + orient along orbit tangent
        for(var ci=0;ci<g.children.length;ci++){
          var child=g.children[ci];
          if(child.userData&&child.userData._cometHost){
            var comets=child.userData._comets;
            for(var cj=0;cj<comets.length;cj++){
              var cm=comets[cj];
              cm.angle+=cm.speed*0.016;
              // Current position on orbit
              var tA=cm.angle;
              var rx=Math.cos(tA)*cm.radius,rz=Math.sin(tA)*cm.radius;
              var ry=cm.yOff+Math.sin(tA*2)*cm.radius*0.06;
              var px=rx*Math.cos(cm.tiltZ)-ry*Math.sin(cm.tiltZ);
              var py=rx*Math.sin(cm.tiltZ)*Math.sin(cm.tiltX)+ry*Math.cos(cm.tiltX)+rz*Math.sin(cm.tiltX)*0.3;
              cm.mesh.position.set(px,py,rz);
              // Tangent: sample a tiny step ahead to get movement direction
              var tA2=tA+0.02*Math.sign(cm.speed);
              var rx2=Math.cos(tA2)*cm.radius,rz2=Math.sin(tA2)*cm.radius;
              var ry2=cm.yOff+Math.sin(tA2*2)*cm.radius*0.06;
              var px2=rx2*Math.cos(cm.tiltZ)-ry2*Math.sin(cm.tiltZ);
              var py2=rx2*Math.sin(cm.tiltZ)*Math.sin(cm.tiltX)+ry2*Math.cos(cm.tiltX)+rz2*Math.sin(cm.tiltX)*0.3;
              // Tail (+Y) should point opposite to movement → align +Y with -tangent
              _cometTmp.set(px-px2,py-py2,rz-rz2).normalize();
              cm.mesh.quaternion.setFromUnitVectors(_cometUp,_cometTmp);
              cm.mesh.material.opacity=idle?0.55:(selected?0.85:(active?0.7:0.12));
            }
          }
        }
      }

      // Gemini: gentle background scene rotation for immersion
      scene.rotation.y+=0.0002;
      scene.rotation.z+=0.0001;

      requestAnimationFrame(breathe);
    })();

    // Pulsing link particles speed
    Graph.linkDirectionalParticleSpeed(function(l){
      var pulse=0.0015+Math.sin(_clock*0.9)*0.0012;
      var matched=linkIsEmphasized(l);
      if(l._tagLink)return (matched?0.013:0.004)+Math.abs(pulse)*(matched?2.3:0.6)+Math.random()*(matched?0.003:0.001);
      if(l._catLink)return (matched?0.009:0.003)+Math.abs(pulse)*(matched?1.3:0.4)+Math.random()*(matched?0.002:0.001);
      if(l._crossLink)return (matched?0.008:0.0025)+Math.abs(pulse)*(matched?1.1:0.35)+Math.random()*(matched?0.002:0.001);
      return (matched?0.009:0.003)+Math.abs(pulse)*(matched?1:0.35)+Math.random()*(matched?0.002:0.001);
    });

    // Camera — auto-focus on data cluster center
    setTimeout(function(){
      var gd=Graph.graphData();
      if(!gd||!gd.nodes)return Graph.cameraPosition({x:0,y:60,z:240},{x:0,y:0,z:0},2500);
      var visible=gd.nodes.filter(function(n){return !n._hidden&&typeof n.x==='number';});
      if(!visible.length)return Graph.cameraPosition({x:0,y:60,z:240},{x:0,y:0,z:0},2500);
      var cx=0,cy=0,cz=0;
      visible.forEach(function(n){cx+=n.x;cy+=n.y;cz+=n.z;});
      cx/=visible.length;cy/=visible.length;cz/=visible.length;
      var spread=0;
      visible.forEach(function(n){
        var dx=n.x-cx,dy=n.y-cy,dz=n.z-cz;
        spread=Math.max(spread,Math.sqrt(dx*dx+dy*dy+dz*dz));
      });
      var dist=Math.max(120,spread*1.6);
      Graph.cameraPosition({x:cx+dist*0.6,y:cy+dist*0.35,z:cz+dist*0.6},{x:cx,y:cy,z:cz},2500);
    },1200);

  }catch(e){
    showError('initGraph failed: '+e.message);
    console.error(e);
  }
}

function focusCategoryCluster(catKey){
  if(!Graph)return;
  graphFocusedCategory=graphFocusedCategory===catKey?'':catKey;
  applyGraphSearch(graphSearchQuery,false);
  renderLegendState();
  if(!graphFocusedCategory)return;
  setTimeout(function(){
    var data=Graph.graphData();
    if(!data||!data.nodes)return;
    var clusterNodes=data.nodes.filter(function(n){return !n._hidden&&n.cat===graphFocusedCategory&&typeof n.x==='number';});
    if(!clusterNodes.length)return;
    var cx=0,cy=0,cz=0;
    clusterNodes.forEach(function(n){cx+=n.x;cy+=n.y;cz+=n.z;});
    cx/=clusterNodes.length;cy/=clusterNodes.length;cz/=clusterNodes.length;
    var spread=0;
    clusterNodes.forEach(function(n){
      var dx=n.x-cx,dy=n.y-cy,dz=n.z-cz;
      spread=Math.max(spread,Math.sqrt(dx*dx+dy*dy+dz*dz));
    });
    var dist=Math.max(110,spread*2.6);
    Graph.cameraPosition(
      {x:cx+dist,y:cy+dist*0.35,z:cz+dist},
      {x:cx,y:cy,z:cz},
      1600
    );
  },120);
}

function renderLegendState(){
  var legend=document.getElementById('legend');
  if(!legend)return;
  legend.querySelectorAll('.legend-item').forEach(function(item){
    item.classList.toggle('active',item.dataset.cat===graphFocusedCategory);
  });
}

function recenterCamera(){
  if(!Graph)return;
  var gd=Graph.graphData();
  if(!gd||!gd.nodes)return;
  var visible=gd.nodes.filter(function(n){return !n._hidden&&typeof n.x==='number';});
  if(!visible.length)return;
  graphFocusedCategory='';graphSelectedNoteId='';
  renderLegendState();
  var cx=0,cy=0,cz=0;
  visible.forEach(function(n){cx+=n.x;cy+=n.y;cz+=n.z;});
  cx/=visible.length;cy/=visible.length;cz/=visible.length;
  var spread=0;
  visible.forEach(function(n){
    var dx=n.x-cx,dy=n.y-cy,dz=n.z-cz;
    spread=Math.max(spread,Math.sqrt(dx*dx+dy*dy+dz*dz));
  });
  var dist=Math.max(120,spread*1.6);
  Graph.cameraPosition({x:cx+dist*0.6,y:cy+dist*0.35,z:cz+dist*0.6},{x:cx,y:cy,z:cz},1600);
  applyGraphSearch('',false);
  document.getElementById('graph-search').value='';
}
document.getElementById('btn-recenter').onclick=recenterCamera;

function renderLegend(){
  var legend=document.getElementById('legend');
  if(!legend)return;
  legend.innerHTML='';
  // Iterate ALL categories so newly-added ones appear immediately,
  // even before any note references them.
  Object.keys(CATEGORIES).forEach(function(k){
    var c=CATEGORIES[k]||{name:k,color:'#888',icon:'📝'};
    legend.innerHTML+='<div class="legend-item'+(graphFocusedCategory===k?' active':'')+'" data-cat="'+k+'"><div class="legend-dot" style="background:'+c.color+';box-shadow:0 0 10px '+c.color+'60"></div>'+c.icon+' '+c.name+'</div>';
  });
  legend.querySelectorAll('.legend-item').forEach(function(item){
    item.onclick=function(){ focusCategoryCluster(item.dataset.cat); };
  });
}

function refreshGraph(){
  if(!Graph)return;
  Graph.graphData(buildGraphData());
  document.getElementById('stat-total').textContent=notes.length;
  document.getElementById('stat-cats').textContent=Object.keys(CATEGORIES).filter(function(k){return notes.some(function(n){return n.cat===k;});}).length;
  renderLegend();
  applyGraphSearch(graphSearchQuery,false);
}

// ── SEARCH ──────────────────────────────────────
function applyGraphSearch(rawQuery,focusFirst){
  graphSearchQuery=(rawQuery||'').toLowerCase().trim();
  var meta=document.getElementById('search-meta');
  graphSearchResults=notes.filter(function(n){
    var c=CATEGORIES[n.cat]||{name:n.cat,icon:'📝',color:'#7b86a8'};
    return nodeMatchesQuery({
      name:n.name,
      tags:n.tags,
      catName:c.name,
      note:n.note
    },graphSearchQuery);
  });

  if(!graphSearchQuery){
    meta.textContent=graphFocusedCategory?'已聚焦 '+(CATEGORIES[graphFocusedCategory]?CATEGORIES[graphFocusedCategory].name:graphFocusedCategory)+' · 点击右侧类别可切换':'输入名称、标签或品类';
  }else if(graphSearchResults.length){
    meta.textContent='高亮 '+graphSearchResults.length+' 条结果'+(graphFocusedCategory?' · 聚焦 '+(CATEGORIES[graphFocusedCategory]?CATEGORIES[graphFocusedCategory].name:graphFocusedCategory):'')+' · '+graphSearchResults.slice(0,2).map(function(n){return n.name;}).join('、')+(graphSearchResults.length>2?' ...':'');
  }else{
    meta.textContent='没有匹配结果';
  }

  if(Graph){
    Graph.nodeVisibility(function(n){return !n._hidden;})
      .linkVisibility(function(l){return !l._hidden;})
      .graphData(Graph.graphData());
  }

  if(focusFirst&&Graph&&graphSearchResults.length){
    setTimeout(function(){
      var data=Graph.graphData();
      if(!data||!data.nodes)return;
      var target=null;
      for(var i=0;i<data.nodes.length;i++){
        if(data.nodes[i].id===graphSearchResults[0].id){target=data.nodes[i];break;}
      }
      if(!target||typeof target.x!=='number')return;
      var dist=70;
      var len=Math.sqrt(target.x*target.x+target.y*target.y+target.z*target.z)||1;
      Graph.cameraPosition(
        {x:target.x+(target.x/len)*dist,y:target.y+(target.y/len)*dist+18,z:target.z+(target.z/len)*dist},
        {x:target.x,y:target.y,z:target.z},
        1400
      );
    },120);
  }
}

// ── EverOS-enhanced search: debounced semantic search overlay ──
var _everosSearchTimer=null;
document.getElementById('graph-search').oninput=function(e){
  var val=e.target.value;
  // Immediate local search
  applyGraphSearch(val,true);
  // Debounced EverOS semantic search (supplements local results)
  clearTimeout(_everosSearchTimer);
  if(val.trim().length<2)return;
  _everosSearchTimer=setTimeout(function(){
    if(!EverOS.isOnline())return;
    EverOS.search(val.trim(),{method:'hybrid',top_k:10},function(err,results){
      if(err||!results.length)return;
      var localIds=graphSearchResults.map(function(n){return n.id;});
      var extraMatches=[];
      results.forEach(function(r){
        var matched=notes.filter(function(n){
          return n.id===r.id||r.content.indexOf(n.name)>=0;
        });
        matched.forEach(function(m){
          if(localIds.indexOf(m.id)<0&&extraMatches.indexOf(m)<0)extraMatches.push(m);
        });
      });
      if(extraMatches.length){
        graphSearchResults=graphSearchResults.concat(extraMatches);
        var meta=document.getElementById('search-meta');
        meta.textContent='高亮 '+graphSearchResults.length+' 条结果（含语义匹配 '+extraMatches.length+' 条）'
          +(graphSearchResults.length>0?' · '+graphSearchResults.slice(0,2).map(function(n){return n.name;}).join('、'):'')
          +(graphSearchResults.length>2?' ...':'');
        if(Graph)Graph.nodeVisibility(function(n){return !n._hidden;}).linkVisibility(function(l){return !l._hidden;}).graphData(Graph.graphData());
      }
    });
  },500);
};

// ── CHAT ────────────────────────────────────────
var chatArea=document.getElementById('chat-area'),chatInput=document.getElementById('chat-input'),typingEl=document.getElementById('typing');
function addMsg(t,type){if(!chatArea)return;var d=document.createElement('div');d.className='msg '+type;if(type==='ai')d.innerHTML='<div class="sender">AI 品鉴师 · EverOS</div>'+t;else d.textContent=t;chatArea.appendChild(d);chatArea.scrollTop=chatArea.scrollHeight;}
function handleChat(){
  if(!chatInput)return;var q=chatInput.value.trim();if(!q)return;
  addMsg(q,'user');chatInput.value='';
  typingEl.style.display='block';chatArea.scrollTop=chatArea.scrollHeight;
  // Try EverOS memory search first, fall back to local genResp
  if(EverOS.isOnline()){
    EverOS.search(q,{method:'hybrid',top_k:5},function(err,results){
      typingEl.style.display='none';
      if(!err&&results.length>0){
        var resp='<div style="font-size:10px;color:var(--accent2);margin-bottom:8px">🧠 基于 EverOS 记忆检索</div>';
        var matchedNotes=[];
        results.forEach(function(r){
          var found=notes.filter(function(n){return n.id===r.id||r.content.indexOf(n.name)>=0;})[0];
          if(found&&matchedNotes.indexOf(found)<0)matchedNotes.push(found);
        });
        if(matchedNotes.length){
          resp+=matchedNotes.slice(0,3).map(function(n){
            var c=CATEGORIES[n.cat]||{icon:'📝',name:n.cat,color:'#888'};
            return '<div style="background:var(--surface2);padding:10px 12px;border-radius:8px;margin-bottom:6px;border-left:3px solid '+c.color+';cursor:pointer" onclick="var nn=notes.filter(function(x){return x.id===\''+n.id+'\';})[0];if(nn){document.querySelector(\'[data-view=universe-view]\').click();showDetail(nn);}">'
              +'<div style="font-size:12px;font-weight:600">'+c.icon+' '+n.name+' <span style="opacity:0.5">'+n.score+'/10</span></div>'
              +'<div style="font-size:11px;color:var(--text3);margin-top:3px">'+n.tags.slice(0,4).join('、')+'</div>'
              +(n.note?'<div style="font-size:11px;color:var(--text2);margin-top:3px">'+n.note.substring(0,60)+(n.note.length>60?'...':'')+'</div>':'')
              +'</div>';
          }).join('');
          if(matchedNotes.length>3)resp+='<div style="font-size:11px;color:var(--text3);margin-top:4px">还有 '+(matchedNotes.length-3)+' 条相关记忆...</div>';
        }else{
          resp+=results.slice(0,3).map(function(r){
            return '<div style="background:var(--surface2);padding:8px 12px;border-radius:8px;margin-bottom:4px;font-size:11px;color:var(--text2);line-height:1.5">'
              +r.content.substring(0,120)+(r.content.length>120?'...':'')
              +'<span style="float:right;font-size:9px;color:var(--text3)">相关度 '+Math.round(r.score*100)+'%</span></div>';
          }).join('');
        }
        var localResp=genResp(q);
        if(localResp.indexOf('试试')!==0)resp+='<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04)">'+localResp+'</div>';
        addMsg(resp,'ai');
      }else{
        typingEl.style.display='none';
        addMsg(genResp(q),'ai');
      }
    });
  }else{
    setTimeout(function(){typingEl.style.display='none';addMsg(genResp(q),'ai');},700);
  }
}
function genResp(query){
  var q=query.toLowerCase();
  if(q.indexOf('推荐')>=0||q.indexOf('建议')>=0){var cat=null;Object.keys(CATEGORIES).forEach(function(k){if(q.indexOf(CATEGORIES[k].name)>=0)cat=k;});var pool=cat?notes.filter(function(n){return n.cat===cat;}):notes;var s=pool.slice().sort(function(a,b){return b.score-a.score;});var t=s[0];if(!t)return '没有足够记录。';var r='🏆 推荐 <b>'+t.name+'</b>（'+t.score+'/10）<br>'+t.tags.join('、');if(s[1])r+='<br><br>也推荐：<b>'+s[1].name+'</b>（'+s[1].score+'/10）';return r;}
  if(q.indexOf('上次')>=0||q.indexOf('最近')>=0){var r=notes.slice().sort(function(a,b){return b.time>a.time?1:-1;})[0];if(!r)return '暂无。';var c=CATEGORIES[r.cat]||{icon:'📝',name:r.cat};return '最近：<b>'+r.name+'</b>（'+c.icon+' '+c.name+'）'+r.time+'<br><b>'+r.score+'/10</b>';}
  if(q.indexOf('统计')>=0||q.indexOf('多少')>=0){var cats={};notes.forEach(function(n){cats[n.cat]=(cats[n.cat]||0)+1;});var avg=(notes.reduce(function(s,n){return s+n.score;},0)/notes.length).toFixed(1);var r='📊 <b>'+notes.length+'</b>条，均分<b>'+avg+'</b><br><br>';Object.keys(cats).forEach(function(k){var c=CATEGORIES[k]||{icon:'📝',name:k};r+=c.icon+' '+c.name+'：'+cats[k]+'<br>';});return r;}
  if(q.indexOf('满分')>=0||q.indexOf('最好')>=0){var p=notes.filter(function(n){return n.score===10;});if(!p.length)return '还没有满分！';return '⭐ '+p.map(function(n){return '<b>'+n.name+'</b>';}).join('、');}
  return '试试：推荐咖啡 / 统计 / 我的偏好 / 上次喝了什么';
}
var _chatSendBtn=document.getElementById('chat-send');
if(_chatSendBtn)_chatSendBtn.onclick=handleChat;
if(chatInput)chatInput.onkeydown=function(e){if(e.key==='Enter')handleChat();};

// ============================================================
//  CATEGORIES — with Edit & Delete
// ============================================================
function renderCategories(){
  var grid=document.getElementById('cat-grid');grid.innerHTML='';
  var counts={},avgs={};notes.forEach(function(n){counts[n.cat]=(counts[n.cat]||0)+1;if(!avgs[n.cat])avgs[n.cat]=[];avgs[n.cat].push(n.score);});
  var mx=1;Object.keys(counts).forEach(function(k){if(counts[k]>mx)mx=counts[k];});
  Object.keys(TAXONOMY).forEach(function(gk){
    var g=TAXONOMY[gk];var gc=g.children.filter(function(c){return CATEGORIES[c];});if(!gc.length)return;
    var h=document.createElement('div');h.style.cssText='grid-column:1/-1;font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;font-weight:600;padding:8px 0 0;margin-top:8px';h.textContent=g.name;grid.appendChild(h);
    gc.forEach(function(ck){
      var c=CATEGORIES[ck];var cnt=counts[ck]||0;var avg=avgs[ck]?(avgs[ck].reduce(function(a,b){return a+b;},0)/avgs[ck].length).toFixed(1):'—';
      var card=document.createElement('div');card.className='cat-card';
      card.innerHTML='<div class="cat-card-actions">'
        +'<button class="cat-action-btn edit" data-cat="'+ck+'" title="编辑">✎</button>'
        +'<button class="cat-action-btn del" data-cat="'+ck+'" title="删除">✕</button>'
        +'</div>'
        +'<div class="cat-icon" style="background:'+c.color+'15;border:1px solid '+c.color+'20">'+c.icon+'</div>'
        +'<div class="ca" style="color:'+c.color+'">'+avg+'</div>'
        +'<h4>'+c.name+'</h4><div class="cc">'+cnt+' 条记录</div>'
        +'<div class="cb"><div class="cf" style="width:'+(cnt/mx*100)+'%;background:'+c.color+'"></div></div>';
      card.onclick=function(e){
        if(e.target.classList.contains('cat-action-btn'))return;
        showCatDetail(ck);
      };
      grid.appendChild(card);
    });
  });
  // Add new category card
  var add=document.createElement('div');add.className='cat-card';add.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:140px;border-style:dashed';
  add.innerHTML='<div style="font-size:32px;color:var(--text3)">+</div><div style="font-size:12px;color:var(--text2);margin-top:4px">添加新品类</div>';
  add.onclick=function(){switchView('record-view');};grid.appendChild(add);

  // Bind edit/delete buttons
  grid.querySelectorAll('.cat-action-btn.edit').forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();editCategory(btn.dataset.cat);};
  });
  grid.querySelectorAll('.cat-action-btn.del').forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();deleteCategory(btn.dataset.cat);};
  });
}

function editCategory(ck){
  var c=CATEGORIES[ck];if(!c)return;
  showModal('<h3>编辑品类</h3>'
    +'<div class="input-group"><label>名称</label><input type="text" id="edit-cat-name" value="'+c.name+'"></div>'
    +'<div class="input-group"><label>图标 (emoji)</label><input type="text" id="edit-cat-icon" value="'+c.icon+'" style="font-size:20px"></div>'
    +'<div class="input-group"><label>颜色</label><input type="color" id="edit-cat-color" value="'+c.color+'" style="height:40px;cursor:pointer"></div>'
    +'<div class="input-group"><label>所属大类</label><select id="edit-cat-parent">'+Object.keys(TAXONOMY).map(function(k){return '<option value="'+k+'"'+(c.parent===k?' selected':'')+'>'+TAXONOMY[k].name+'</option>';}).join('')+'</select></div>'
    +'<div class="modal-actions">'
    +'<button class="btn-s" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'open\')">取消</button>'
    +'<button class="btn-p" id="save-cat-edit">保存</button></div>');
  document.getElementById('save-cat-edit').onclick=function(){
    var newName=document.getElementById('edit-cat-name').value.trim();
    var newIcon=document.getElementById('edit-cat-icon').value.trim();
    var newColor=document.getElementById('edit-cat-color').value;
    var newParent=document.getElementById('edit-cat-parent').value;
    if(!newName)return;
    // Update parent if changed
    if(c.parent!==newParent){
      TAXONOMY[c.parent].children=TAXONOMY[c.parent].children.filter(function(x){return x!==ck;});
      TAXONOMY[newParent].children.push(ck);
    }
    c.name=newName;c.icon=newIcon;c.color=newColor;c.parent=newParent;
    saveUserData();closeModal();renderCategories();populateCatSelects();refreshGraph();
  };
}

function deleteCategory(ck){
  var c=CATEGORIES[ck];if(!c)return;
  var cnt=notes.filter(function(n){return n.cat===ck;}).length;
  showModal('<h3>删除品类</h3>'
    +'<p style="color:var(--text2);font-size:13px;line-height:1.6;margin-bottom:4px">确定要删除 <b style="color:var(--text)">'+c.icon+' '+c.name+'</b> 吗？</p>'
    +(cnt?'<p style="color:var(--danger);font-size:12px">该品类下有 '+cnt+' 条品鉴记录，将一并删除。</p>':'')
    +'<div class="modal-actions">'
    +'<button class="btn-s" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'open\')">取消</button>'
    +'<button class="btn-danger" id="confirm-del-cat">删除</button></div>');
  document.getElementById('confirm-del-cat').onclick=function(){
    notes=notes.filter(function(n){return n.cat!==ck;});
    TAXONOMY[c.parent].children=TAXONOMY[c.parent].children.filter(function(x){return x!==ck;});
    delete CATEGORIES[ck];
    saveUserData();closeModal();renderCategories();populateCatSelects();refreshGraph();
  };
}

// ── CATEGORY DETAIL — with note Edit & Delete ───
function showCatDetail(ck){
  var c=CATEGORIES[ck];if(!c)return;
  var cn=notes.filter(function(n){return n.cat===ck;}).sort(function(a,b){return b.score-a.score;});
  document.getElementById('cat-detail-title').textContent=c.icon+' '+c.name;
  document.getElementById('cat-detail-cnt').textContent=cn.length+' 条记录';
  var list=document.getElementById('cat-note-list');list.innerHTML='';
  cn.forEach(function(n){
    var item=document.createElement('div');item.className='note-item';
    item.innerHTML='<div class="ni-score" style="color:'+c.color+'">'+n.score+'</div>'
      +'<div class="ni-body"><div class="ni-name">'+n.name+'</div>'
      +'<div class="ni-note">'+n.note.substring(0,100)+'</div>'
      +'<div class="ni-tags">'+(n.tags||[]).map(function(t){return '<span class="ni-tag">'+t+'</span>';}).join('')+'</div>'
      +(n.location?'<div style="font-size:10px;color:var(--accent2);margin-top:4px">📍 '+n.location+'</div>':'')
      +'<div class="ni-time">'+n.time+'</div></div>'
      +'<div class="ni-actions">'
      +'<button class="ni-act edit" data-nid="'+n.id+'" title="编辑">✎</button>'
      +'<button class="ni-act del" data-nid="'+n.id+'" title="删除">✕</button></div>';
    item.onclick=function(e){
      if(e.target.classList.contains('ni-act'))return;
      showDetail(n);
    };
    list.appendChild(item);
  });
  // Bind note actions
  list.querySelectorAll('.ni-act.edit').forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();editNote(btn.dataset.nid,ck);};
  });
  list.querySelectorAll('.ni-act.del').forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();deleteNote(btn.dataset.nid,ck);};
  });
  document.getElementById('cat-detail').classList.add('open');
}

function editNote(nid,ck){
  var note=notes.filter(function(n){return n.id===nid;})[0];
  if(!note)return;
  showModal('<h3>编辑品鉴记录</h3>'
    +'<div class="input-group"><label>名称</label><input type="text" id="edit-note-name" value="'+note.name+'"></div>'
    +'<div class="input-group"><label>评分 (1-10)</label><input type="number" id="edit-note-score" value="'+note.score+'" min="1" max="10"></div>'
    +'<div class="input-group"><label>品鉴笔记</label><textarea id="edit-note-text" style="min-height:80px">'+note.note+'</textarea></div>'
    +'<div class="input-group"><label>风味标签 (逗号分隔)</label><input type="text" id="edit-note-tags" value="'+note.tags.join(', ')+'"></div>'
    +'<div class="input-group"><label>地点 / 门店</label><input type="text" id="edit-note-loc" value="'+(note.location||'')+'"></div>'
    +'<div class="modal-actions">'
    +'<button class="btn-s" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'open\')">取消</button>'
    +'<button class="btn-p" id="save-note-edit">保存</button></div>');
  document.getElementById('save-note-edit').onclick=function(){
    note.name=document.getElementById('edit-note-name').value.trim()||note.name;
    note.score=parseInt(document.getElementById('edit-note-score').value)||note.score;
    note.note=document.getElementById('edit-note-text').value.trim();
    note.tags=document.getElementById('edit-note-tags').value.split(',').map(function(t){return t.trim();}).filter(Boolean);
    note.location=document.getElementById('edit-note-loc').value.trim();
    saveUserData();closeModal();showCatDetail(ck);refreshGraph();
  };
}

function deleteNote(nid,ck){
  var note=notes.filter(function(n){return n.id===nid;})[0];
  if(!note)return;
  showModal('<h3>删除品鉴记录</h3>'
    +'<p style="color:var(--text2);font-size:13px">确定要删除 <b style="color:var(--text)">'+note.name+'</b> 吗？此操作不可撤销。</p>'
    +'<div class="modal-actions">'
    +'<button class="btn-s" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'open\')">取消</button>'
    +'<button class="btn-danger" id="confirm-del-note">删除</button></div>');
  document.getElementById('confirm-del-note').onclick=function(){
    notes=notes.filter(function(n){return n.id!==nid;});
    EverOS.delete(nid); // Soft delete from EverOS memory
    saveUserData();closeModal();showCatDetail(ck);refreshGraph();
  };
}

document.getElementById('cat-back').onclick=function(){document.getElementById('cat-detail').classList.remove('open');};

// ── DETAIL PANEL ────────────────────────────────
document.getElementById('close-detail').onclick=function(){
  graphSelectedNoteId='';
  document.getElementById('detail-panel').classList.remove('open');
  applyGraphSearch(graphSearchQuery,false);
};
function showDetail(note){
  graphSelectedNoteId=note.id;
  var cat=CATEGORIES[note.cat]||{name:note.cat,icon:'📝',color:'#888'};
  var rel=notes.filter(function(n){return n.id!==note.id&&(n.cat===note.cat||n.tags.some(function(t){return note.tags.indexOf(t)>=0;}));}).slice(0,4);
  var locHtml=note.location?'<div style="font-size:11px;color:var(--accent2);margin-top:8px">📍 '+note.location+'</div>':'';
  var priceHtml='';
  if(note.price){
    if(note.price.type==='avg'){
      priceHtml='<div style="font-size:12px;color:var(--accent);margin-top:8px">💰 ¥'+note.price.price+' <span style="opacity:0.5;font-size:10px">人均（总价 ¥'+note.price.total+' ÷ '+note.price.people+'人）</span></div>';
    }else{
      priceHtml='<div style="font-size:12px;color:var(--accent);margin-top:8px">💰 ¥'+note.price.price+'</div>';
    }
  }
  var photoHtml=note.photo?'<div style="margin-top:12px;border-radius:8px;overflow:hidden"><img src="'+note.photo+'" style="max-width:100%;border-radius:8px"></div>':'';

  // Visit history
  var visits=note.visits||[];
  var visitCount=visits.length+1;
  var visitsHtml='';
  if(visits.length>0){
    visitsHtml='<div class="dp-visits"><h4>品鉴记录 ×'+visitCount+'</h4>';
    // Show original tasting first
    visitsHtml+='<div class="dp-visit-item"><div><span class="vi-score" style="color:'+cat.color+'">'+note.score+'</span><span style="opacity:0.4;font-size:10px">/10 · 初次品鉴 · '+note.time+(note.price?' · ¥'+note.price.price:'')+'</span></div>';
    if(note.tags.length)visitsHtml+='<div class="vi-tags">'+note.tags.map(function(t){return '<span class="vi-tag">'+t+'</span>';}).join('')+'</div>';
    if(note.note)visitsHtml+='<div style="margin-top:4px;font-size:11px;color:var(--text3)">'+note.note.substring(0,80)+(note.note.length>80?'...':'')+'</div>';
    visitsHtml+='</div>';
    // Show each re-tasting
    visits.forEach(function(v,i){
      visitsHtml+='<div class="dp-visit-item"><div><span class="vi-score" style="color:'+cat.color+'">'+v.score+'</span><span style="opacity:0.4;font-size:10px">/10 · 第'+(i+2)+'次 · '+v.time+(v.price?' · ¥'+v.price.price:'')+'</span></div>';
      if(v.tags&&v.tags.length)visitsHtml+='<div class="vi-tags">'+v.tags.map(function(t){return '<span class="vi-tag">'+t+'</span>';}).join('')+'</div>';
      if(v.note)visitsHtml+='<div style="margin-top:4px;font-size:11px;color:var(--text3)">'+v.note.substring(0,80)+(v.note.length>80?'...':'')+'</div>';
      if(v.photo)visitsHtml+='<div style="margin-top:6px;border-radius:6px;overflow:hidden;max-height:140px"><img src="'+v.photo+'" style="width:100%;display:block"></div>';
      visitsHtml+='</div>';
    });
    visitsHtml+='</div>';
  }

  // Latest score (use most recent visit if exists)
  var latestScore=visits.length>0?visits[visits.length-1].score:note.score;
  var latestTags=visits.length>0&&visits[visits.length-1].tags&&visits[visits.length-1].tags.length?visits[visits.length-1].tags:note.tags;

  document.getElementById('detail-content').innerHTML=
    '<div class="dp-cat" style="color:'+cat.color+'">'+cat.icon+' '+cat.name+(visitCount>1?' <span style="font-size:9px;opacity:0.5;margin-left:4px">×'+visitCount+'</span>':'')+'</div>'
    +'<h3>'+note.name+'</h3>'
    +'<div class="dp-sc" style="color:'+cat.color+'">'+latestScore+'<span style="font-size:16px;opacity:0.3">/10</span></div>'
    +'<div class="dp-tg">'+latestTags.map(function(t){return '<span class="dp-t">'+t+'</span>';}).join('')+'</div>'
    +'<div class="dp-n">'+(visits.length>0&&visits[visits.length-1].note?visits[visits.length-1].note:note.note)+'</div>'
    +priceHtml+locHtml+photoHtml
    +'<div class="dp-time">📅 '+note.time+'</div>'
    +visitsHtml
    +'<button class="btn-retaste" id="btn-retaste">＋ 再次品鉴</button>'
    +'<div class="retaste-form" id="retaste-form">'
      +'<label>评分</label><div class="rt-score-row" id="rt-score-row"></div>'
      +'<label>风味标签</label><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px" id="rt-tags-row"><input type="text" id="rt-tag-input" placeholder="输入标签回车" style="flex:1;min-width:100px;padding:5px 10px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);background:var(--surface3);color:var(--text);font-size:11px;outline:none;font-family:inherit"></div>'
      +'<label>品鉴笔记</label><textarea id="rt-notes" placeholder="这次的感受..."></textarea>'
      +'<label>本次价格 <span style="opacity:0.4;font-weight:400">（选填）</span></label>'
      +'<div class="price-wrap"><div class="price-mode-toggle" id="rt-price-mode-toggle"><span class="price-mode sel" data-mode="unit">单价</span><span class="price-mode" data-mode="avg">人均</span></div>'
      +'<div class="price-inputs"><div id="rt-price-unit-group" style="display:flex;align-items:center;gap:6px"><input type="number" id="rt-price" placeholder="0.00" min="0" step="0.01" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);background:var(--surface3);color:var(--text);font-size:12px;font-family:inherit;outline:none"><span style="font-size:11px;color:var(--text3)">元</span></div>'
      +'<div id="rt-price-avg-group" style="display:none"><div style="display:flex;gap:8px;align-items:center"><input type="number" id="rt-price-total" placeholder="总价" min="0" step="0.01" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);background:var(--surface3);color:var(--text);font-size:12px;font-family:inherit;outline:none"><span style="color:var(--text3);font-size:12px">÷</span><input type="number" id="rt-price-people" placeholder="人数" min="1" step="1" value="2" style="width:68px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);background:var(--surface3);color:var(--text);font-size:12px;font-family:inherit;outline:none"><span style="font-size:11px;color:var(--text3)">人</span></div><div class="price-avg-result" id="rt-price-avg-result"></div></div>'
      +'</div></div>'
      +'<label>图片 <span style="opacity:0.4;font-weight:400">（选填）</span></label>'
      +'<input type="file" id="rt-photo" accept="image/*" capture="environment" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);background:var(--surface3);color:var(--text);font-size:11px;font-family:inherit;outline:none;cursor:pointer">'
      +'<div id="rt-photo-preview" style="display:none;margin-top:6px;border-radius:8px;overflow:hidden;max-height:160px"><img id="rt-photo-img" style="width:100%;display:block"></div>'
      +'<div class="rt-actions"><button class="rt-btn rt-btn-cancel" id="rt-cancel">取消</button><button class="rt-btn rt-btn-save" id="rt-save">保存</button></div>'
    +'</div>'
    +(rel.length?'<div class="dp-rel"><h4>记忆关联 · '+rel.length+'</h4>'+rel.map(function(r){
      var rv=(r.visits?r.visits.length:0)+1;
      var rc=CATEGORIES[r.cat]||{icon:'📝',name:r.cat,color:'#888'};
      // Determine WHY this is related
      var reasons=[];
      if(r.cat===note.cat){
        var sim=noteSimilarity(note,r);
        reasons.push('<span style="color:'+rc.color+'">同品类</span> 相似度 '+Math.round(sim*100)+'%');
        // Detail: shared tags
        var sTags=(r.tags||[]).filter(function(t){return (note.tags||[]).indexOf(t)>=0;});
        if(sTags.length)reasons.push('共享标签: '+sTags.map(function(t){return '<b>'+t+'</b>';}).join('、'));
        // Detail: shared name tokens
        var tokA=_extractTokens(note.name),tokB=_extractTokens(r.name);
        var nameMatch=tokA.filter(function(t){return tokB.indexOf(t)>=0;});
        if(nameMatch.length)reasons.push('名称相近: '+nameMatch.join('、'));
      }else{
        var crossTags=(r.tags||[]).filter(function(t){return (note.tags||[]).indexOf(t)>=0;});
        if(crossTags.length)reasons.push('<span style="color:#af79ff">跨品类</span> 共享标签: '+crossTags.map(function(t){return '<b>'+t+'</b>';}).join('、'));
      }
      return '<div class="dp-ri" data-id="'+r.id+'" style="border-left:3px solid '+rc.color+'">'
        +'<div class="dp-ri-n">'+rc.icon+' '+r.name+(rv>1?' <span style="opacity:0.4;font-size:10px">×'+rv+'</span>':'')+'</div>'
        +'<div class="dp-ri-s">'+r.score+'/10 · '+r.tags.slice(0,3).join('、')+'</div>'
        +(reasons.length?'<div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.5">'+reasons.join('<br>')+'</div>':'')
        +'</div>';
    }).join('')+'</div>':'');

  // Wire related items
  document.querySelectorAll('.dp-ri').forEach(function(el){el.onclick=function(){var n=notes.filter(function(x){return x.id===el.dataset.id;})[0];if(n)showDetail(n);};});

  // Wire re-tasting button and form
  var rtForm=document.getElementById('retaste-form');
  var rtScoreRow=document.getElementById('rt-score-row');
  var rtScore=0;
  var rtTags=[];

  // Build score buttons
  for(var s=1;s<=10;s++){
    (function(sc){
      var btn=document.createElement('button');
      btn.className='rt-score-btn';
      btn.textContent=sc;
      btn.onclick=function(){
        rtScore=sc;
        rtScoreRow.querySelectorAll('.rt-score-btn').forEach(function(b){b.classList.remove('sel');});
        btn.classList.add('sel');
      };
      rtScoreRow.appendChild(btn);
    })(s);
  }

  // Tags input
  var rtTagInput=document.getElementById('rt-tag-input');
  var rtTagsRow=document.getElementById('rt-tags-row');
  rtTagInput.onkeydown=function(e){
    if(e.key==='Enter'&&rtTagInput.value.trim()){
      e.preventDefault();
      var v=rtTagInput.value.trim();
      if(rtTags.indexOf(v)<0){
        rtTags.push(v);
        var t=document.createElement('div');
        t.style.cssText='padding:2px 8px;border-radius:10px;font-size:10px;background:rgba(255,255,255,0.06);color:var(--text2);cursor:pointer';
        t.textContent=v+' ×';
        t.onclick=function(){rtTags=rtTags.filter(function(x){return x!==v;});t.remove();};
        rtTagsRow.insertBefore(t,rtTagInput);
      }
      rtTagInput.value='';
    }
  };

  // Re-taste price mode toggle
  var rtPriceMode='unit';
  document.getElementById('rt-price-mode-toggle').onclick=function(e){
    var t=e.target;
    if(!t.dataset||!t.dataset.mode)return;
    rtPriceMode=t.dataset.mode;
    this.querySelectorAll('.price-mode').forEach(function(m){m.classList.toggle('sel',m.dataset.mode===rtPriceMode);});
    document.getElementById('rt-price-unit-group').style.display=rtPriceMode==='unit'?'flex':'none';
    document.getElementById('rt-price-avg-group').style.display=rtPriceMode==='avg'?'block':'none';
    document.getElementById('rt-price-avg-result').textContent='';
  };
  function calcRtAvgPrice(){
    var total=parseFloat(document.getElementById('rt-price-total').value)||0;
    var people=parseInt(document.getElementById('rt-price-people').value)||1;
    var result=document.getElementById('rt-price-avg-result');
    if(total>0&&people>0){result.textContent='≈ 人均 ¥'+(total/people).toFixed(2);}
    else{result.textContent='';}
  }
  document.getElementById('rt-price-total').oninput=calcRtAvgPrice;
  document.getElementById('rt-price-people').oninput=calcRtAvgPrice;

  // Re-taste photo upload
  var rtUploadedPhotoData=null;
  var rtPhotoEl=document.getElementById('rt-photo');
  var rtPhotoPreview=document.getElementById('rt-photo-preview');
  var rtPhotoImg=document.getElementById('rt-photo-img');
  rtPhotoEl.onchange=function(){
    var file=rtPhotoEl.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(e){
      rtUploadedPhotoData=e.target.result;
      rtPhotoImg.src=rtUploadedPhotoData;
      rtPhotoPreview.style.display='block';
    };
    reader.readAsDataURL(file);
  };

  document.getElementById('btn-retaste').onclick=function(){
    rtForm.classList.toggle('open');
  };
  document.getElementById('rt-cancel').onclick=function(){
    rtForm.classList.remove('open');
  };
  document.getElementById('rt-save').onclick=function(){
    if(!rtScore){alert('请选择评分');return;}
    if(!note.visits)note.visits=[];
    var rtPriceData=null;
    if(rtPriceMode==='unit'){
      var rtPriceVal=parseFloat(document.getElementById('rt-price').value);
      if(rtPriceVal>0)rtPriceData={type:'unit',price:rtPriceVal};
    }else{
      var rtTotal=parseFloat(document.getElementById('rt-price-total').value)||0;
      var rtPeople=parseInt(document.getElementById('rt-price-people').value)||1;
      if(rtTotal>0)rtPriceData={type:'avg',total:rtTotal,people:rtPeople,price:+(rtTotal/rtPeople).toFixed(2)};
    }
    var visitObj={
      score:rtScore,
      tags:rtTags.slice(),
      note:document.getElementById('rt-notes').value.trim(),
      time:new Date().toISOString().split('T')[0]
    };
    if(rtPriceData)visitObj.price=rtPriceData;
    if(rtUploadedPhotoData)visitObj.photo=rtUploadedPhotoData;
    note.visits.push(visitObj);
    saveUserData();
    EverOS.update(note); // Update memory with new visit
    refreshGraph();
    showDetail(note); // refresh detail panel
  };

  document.getElementById('detail-panel').classList.add('open');
  applyGraphSearch(graphSearchQuery,false);
}

// ── APP START (called after login) ──────────────
function startApp(){
  loadUserData();
  updateUserBadge();
  populateCatSelects();
  initGraph();
  renderCategories();
  // Expose data for V29 sommelier engine to consume when embedded
  window.__tvNotes=notes;
  window.__tvCategories=CATEGORIES;
  // Expose save APIs for AI sommelier chat to write back records
  // Helper: clamp + round score to our app's format (integer 0-10)
  function _normalizeScore(v){
    var n=Number(v);
    if(!isFinite(n))return 7;
    // If LLM accidentally returned 0-100, scale down
    if(n>10)n=n/10;
    return Math.max(0,Math.min(10,Math.round(n)));
  }
  // Expose USER_ID so AI sommelier can pass it to /api/ai/parse for EverOS lookup
  window.__tvUserId=USER_ID;
  // Create a new category dynamically (used by AI flow when AI suggests a new cat)
  window.__tvCreateCategory=function(catData){
    if(!catData||!catData.name)return null;
    // Sanitize key: prefer AI-provided key, fall back to timestamp-based
    var key=(catData.key||'').toString().toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/^_+|_+$/g,'');
    if(!key||CATEGORIES[key])key='custom_'+Date.now();
    var parent=catData.parent;
    if(!parent||!TAXONOMY[parent]){
      // Default to "other" top-level group
      if(!TAXONOMY.other)TAXONOMY.other={name:'其他',children:[]};
      parent='other';
    }
    var color='#'+Math.floor(Math.random()*0x999999+0x333333).toString(16).padStart(6,'0');
    CATEGORIES[key]={
      name:catData.name,
      icon:catData.icon||'📝',
      color:color,
      parent:parent
    };
    if(TAXONOMY[parent].children.indexOf(key)<0)TAXONOMY[parent].children.push(key);
    saveUserData();
    populateCatSelects();
    renderCategories();
    window.__tvCategories=CATEGORIES;
    console.log('[TasteVerse] Created new category:',key,'→',catData.name);
    return key;
  };
  window.__tvAddNote=function(data){
    // data: {name, cat, score, tags, note, location, price, photo}
    // Validate cat: must be a key in CATEGORIES, otherwise fall back
    var catKey=data.cat;
    if(!catKey||!CATEGORIES[catKey]){
      // Try matching by Chinese name (in case AI returned name instead of key)
      var matchByName=Object.keys(CATEGORIES).find(function(k){return CATEGORIES[k].name===data.cat;});
      catKey=matchByName||Object.keys(CATEGORIES)[0];
      console.warn('[TasteVerse] AI returned unknown cat "'+data.cat+'", using "'+catKey+'"');
    }
    var noteObj={
      id:'n'+Date.now(),
      cat:catKey,
      name:data.name||'未命名',
      score:_normalizeScore(data.score),
      tags:Array.isArray(data.tags)?data.tags.slice():[],
      note:data.note||'',
      time:new Date().toISOString().split('T')[0],
      location:data.location||''
    };
    if(data.price&&Number(data.price)>0)noteObj.price={type:'unit',price:Number(data.price)};
    if(data.photo)noteObj.photo=data.photo;
    notes.push(noteObj);
    saveUserData();
    if(typeof EverOS!=='undefined'&&EverOS.update)EverOS.update(noteObj);
    refreshGraph();
    window.__tvNotes=notes;
    return noteObj;
  };
  window.__tvAddVisit=function(noteId,visitData){
    var target=notes.find(function(n){return n.id===noteId;});
    if(!target)return null;
    if(!target.visits)target.visits=[];
    var visit={
      score:_normalizeScore(visitData.score),
      tags:Array.isArray(visitData.tags)?visitData.tags.slice():[],
      note:visitData.note||'',
      time:new Date().toISOString().split('T')[0]
    };
    if(visitData.price&&Number(visitData.price)>0)visit.price={type:'unit',price:Number(visitData.price)};
    if(visitData.photo)visit.photo=visitData.photo;
    target.visits.push(visit);
    saveUserData();
    if(typeof EverOS!=='undefined'&&EverOS.update)EverOS.update(target);
    refreshGraph();
    return target;
  };
  // Check EverOS connection and update status indicator
  EverOS.checkConnection(function(online){
    var dot=document.getElementById('everos-dot');
    var label=document.getElementById('everos-label');
    if(online){
      dot.style.background='#5ebe8e';label.textContent='EverOS ✓';
      label.parentElement.title='EverOS 记忆服务已连接 ('+EVEROS_API+')';
    }else{
      dot.style.background='#e85050';label.textContent='EverOS ✗';
      label.parentElement.title='EverOS 记忆服务未连接 — 仅本地模式';
    }
  });
}

window.onresize=function(){if(Graph)Graph.width(window.innerWidth).height(window.innerHeight-52);if(_loginAnim.running)_lInitParticles();};

// ── APP BOOTSTRAP — require email-verification login (no demo mode) ──
(function(){
  // Try to restore a previously authenticated session for this browser.
  var saved=null;
  try{var raw=localStorage.getItem('tv_session');if(raw)saved=JSON.parse(raw);}catch(e){}

  if(saved&&saved.email){
    // Resume existing session: skip login, load that user's data.
    currentUser={email:saved.email};
    hideLoginScreen();
    startApp();
  }else{
    // First visit / logged out: show login screen; login-btn handler will
    // call hideLoginScreen() + startApp() after successful verification.
    showLoginScreen();
  }
})();

// ── Demo seed block (disabled — uncomment for local preview) ─────────────────
/* (function(){
  currentUser={email:'demo@tasteverse.app'};
  TAXONOMY=deepClone(DEFAULT_TAXONOMY);
  TAXONOMY.drinks.children.push('cocktail','whisky','sake');
  TAXONOMY.food.children.push('japanese','italian','bbq','hotpot');
  TAXONOMY.other.children.push('snack');
  CATEGORIES=deepClone(DEFAULT_CATEGORIES);
  CATEGORIES.cocktail={name:'鸡尾酒',icon:'🍸',color:'#E06890',parent:'drinks'};
  CATEGORIES.whisky={name:'威士忌',icon:'🥃',color:'#D49040',parent:'drinks'};
  CATEGORIES.sake={name:'清酒',icon:'🍶',color:'#88B8D8',parent:'drinks'};
  CATEGORIES.japanese={name:'日料',icon:'🍣',color:'#F0A070',parent:'food'};
  CATEGORIES.italian={name:'意餐',icon:'🍝',color:'#D8786C',parent:'food'};
  CATEGORIES.bbq={name:'烧烤',icon:'🔥',color:'#E87830',parent:'food'};
  CATEGORIES.hotpot={name:'火锅',icon:'🫕',color:'#D85040',parent:'food'};
  CATEGORIES.snack={name:'小食',icon:'🥨',color:'#C8A860',parent:'other'};

  // ── AI-generated tasting notes (spanning 2025-12 to 2026-04) ──
  var _id=1;
  function mid(){return 'demo_'+(_id++);}
  notes=[
    // 2025-12
    {id:mid(),name:'M2M 哥伦比亚 薇拉',cat:'coffee',score:8,time:'2025-12-03',note:'水洗处理，入口有明亮的柑橘酸质，中段转为红糖甜感，尾韵带坚果香。',tags:['柑橘','水洗','精品'],price:{type:'unit',price:38}},
    {id:mid(),name:'Seesaw 冬季特调',cat:'coffee',score:7,time:'2025-12-05',note:'拼配豆，苦巧克力基底搭配橙皮调，奶咖表现佳，层次不错。',tags:['拼配','巧克力','橙皮'],price:{type:'unit',price:42}},
    {id:mid(),name:'龙井明前头采',cat:'tea',score:9,time:'2025-12-08',note:'豆香明显，汤色清澈，第三泡最佳，甘甜悠长。',tags:['龙井','明前','甘甜'],price:{type:'unit',price:120}},
    {id:mid(),name:'奔富 Bin 389 (2019)',cat:'wine',score:8,time:'2025-12-10',note:'黑醋栗、黑莓为主，橡木桶带来香草和烟熏感，单宁已经柔化，收尾较长。',tags:['赤霞珠','西拉','澳洲'],price:{type:'unit',price:380}},
    {id:mid(),name:'鹿儿岛黑猪涮涮锅',cat:'japanese',score:9,time:'2025-12-12',note:'黑猪肉质细腻，脂肪分布均匀，昆布汤底鲜美，配柚子醋酱完美。',tags:['黑猪','涮锅','鲜美'],price:{type:'avg',price:268}},
    {id:mid(),name:'蜀大侠牛油火锅',cat:'hotpot',score:8,time:'2025-12-15',note:'锅底醇厚，牛油香浓。毛肚七上八下口感脆嫩，鸭肠也非常新鲜。',tags:['牛油','毛肚','麻辣'],price:{type:'avg',price:135}},
    {id:mid(),name:'Lady M 千层蛋糕',cat:'dessert',score:7,time:'2025-12-18',note:'抹茶千层，层次分明但偏甜，奶油稍腻，茶味不够突出。',tags:['千层','抹茶','偏甜'],price:{type:'unit',price:78}},
    {id:mid(),name:'Negroni 经典款',cat:'cocktail',score:8,time:'2025-12-20',note:'金酒、甜味美思、金巴利 1:1:1，苦甜平衡好，橙皮油喷洒的香气点睛。',tags:['金酒','苦甜','经典'],price:{type:'unit',price:88}},
    {id:mid(),name:'全聚德烤鸭',cat:'chinese',score:7,time:'2025-12-22',note:'皮酥脆但鸭肉偏干，蘸白糖吃意外不错。配套的鸭架汤鲜美。',tags:['烤鸭','北京','酥脆'],price:{type:'avg',price:188}},
    {id:mid(),name:'山崎 12年',cat:'whisky',score:9,time:'2025-12-25',note:'蜂蜜、白桃、淡淡的雪莉桶甜香。入口丝滑，余韵带檀木和肉桂。',tags:['单一麦芽','日威','丝滑'],price:{type:'unit',price:120}},

    // 2026-01
    {id:mid(),name:'% Arabica 手冲肯尼亚',cat:'coffee',score:9,time:'2026-01-03',note:'黑莓果酱般的甜酸，中段有番茄汤的鲜感，非常干净的杯测体验。',tags:['肯尼亚','黑莓','干净'],price:{type:'unit',price:58}},
    {id:mid(),name:'凤凰单枞 鸭屎香',cat:'tea',score:8,time:'2026-01-06',note:'银花香气扑鼻，入口有奶甜感，回甘强烈，耐泡度高。',tags:['单枞','花香','回甘'],price:{type:'unit',price:85}},
    {id:mid(),name:'Il Pomodoro 那不勒斯披萨',cat:'italian',score:8,time:'2026-01-08',note:'薄底酥脆，San Marzano 番茄酱汁酸甜适中，水牛芝士拉丝绵长。',tags:['披萨','芝士','酸甜'],price:{type:'avg',price:98}},
    {id:mid(),name:'Espresso Martini',cat:'cocktail',score:9,time:'2026-01-10',note:'浓缩咖啡、伏特加、咖啡利口酒。丝绒泡沫层完美，苦中带甜，提神。',tags:['咖啡','伏特加','丝绒'],price:{type:'unit',price:98}},
    {id:mid(),name:'谭鸭血老火锅',cat:'hotpot',score:7,time:'2026-01-12',note:'鸭血嫩滑入味，但锅底偏油，花椒的麻度盖过了香料的层次。',tags:['鸭血','麻辣','偏油'],price:{type:'avg',price:115}},
    {id:mid(),name:'小山园抹茶大福',cat:'dessert',score:8,time:'2026-01-15',note:'外皮软糯，抹茶馅苦甜恰到好处，红豆颗粒感增加了口感层次。',tags:['大福','抹茶','软糯'],price:{type:'unit',price:28}},
    {id:mid(),name:'木屋烧烤 羊肉串',cat:'bbq',score:7,time:'2026-01-18',note:'炭火香气足，孜然撒得均匀，但肉块偏小，羊膻味不太够。',tags:['羊肉','孜然','炭火'],price:{type:'avg',price:78}},
    {id:mid(),name:'獭祭 二割三分',cat:'sake',score:9,time:'2026-01-20',note:'精米步合23%，极其纯净的吟酿香，蜜瓜和白花香气交织，入口如丝。',tags:['纯米大吟酿','蜜瓜','纯净'],price:{type:'unit',price:280}},
    {id:mid(),name:'勃艮第 村级夏布利',cat:'wine',score:7,time:'2026-01-22',note:'矿物感突出，青苹果和柠檬的酸度明快，余韵偏短但适合配生蚝。',tags:['霞多丽','勃艮第','矿物'],price:{type:'unit',price:220}},
    {id:mid(),name:'松鹤楼 松鼠桂鱼',cat:'chinese',score:8,time:'2026-01-25',note:'外酥里嫩，糖醋汁酸甜比例完美，鱼肉鲜嫩不柴，摆盘精致。',tags:['苏帮菜','糖醋','酥脆'],price:{type:'avg',price:168}},

    // 2026-02
    {id:mid(),name:'Peet\'s 危地马拉 安提瓜',cat:'coffee',score:7,time:'2026-02-02',note:'可可和坚果的沉稳风味，body 厚重，适合加奶做拿铁。',tags:['危地马拉','可可','厚重'],price:{type:'unit',price:45}},
    {id:mid(),name:'桐木关正山小种',cat:'tea',score:8,time:'2026-02-05',note:'松烟香怡人不呛，汤色红亮，桂圆甜感持久，适合冬天品饮。',tags:['红茶','松烟','桂圆'],price:{type:'unit',price:95}},
    {id:mid(),name:'EATALY 手工意面',cat:'italian',score:9,time:'2026-02-08',note:'新鲜鸡蛋面搭配松露黄油酱，面条弹牙，松露香气浓郁但不做作。',tags:['手工面','松露','弹牙'],price:{type:'avg',price:158}},
    {id:mid(),name:'久保田 千寿',cat:'sake',score:7,time:'2026-02-10',note:'清爽型吟酿酒，淡丽辛口，搭配刺身很合适，单饮略显单薄。',tags:['吟酿','辛口','清爽'],price:{type:'unit',price:85}},
    {id:mid(),name:'炭火烤鳗鱼',cat:'japanese',score:8,time:'2026-02-12',note:'白烧先上，品尝鳗鱼本味；蒲烧酱汁焦香浓厚，配饭一绝。',tags:['鳗鱼','炭烤','焦香'],price:{type:'avg',price:198}},
    {id:mid(),name:'Old Fashioned',cat:'cocktail',score:8,time:'2026-02-14',note:'波本威士忌为基，安古天娜苦精和方糖，橙皮油脂香完美收尾。',tags:['波本','经典','橙皮'],price:{type:'unit',price:78}},
    {id:mid(),name:'海底捞番茄锅底',cat:'hotpot',score:8,time:'2026-02-17',note:'番茄汤底酸甜浓郁，涮虾滑和嫩牛肉最佳，服务一如既往地好。',tags:['番茄','虾滑','服务好'],price:{type:'avg',price:125}},
    {id:mid(),name:'提拉米苏',cat:'dessert',score:9,time:'2026-02-19',note:'马斯卡彭奶酪绵密，手指饼浸泡浓缩咖啡和朗姆酒，层次丰富不甜腻。',tags:['意式','咖啡','绵密'],price:{type:'unit',price:58}},
    {id:mid(),name:'白州 蒸馏所限定',cat:'whisky',score:8,time:'2026-02-22',note:'青苹果、薄荷、淡淡泥煤烟熏。清新的森林系风格，冰球饮最佳。',tags:['白州','日威','清新'],price:{type:'unit',price:150}},
    {id:mid(),name:'卤煮火烧',cat:'chinese',score:7,time:'2026-02-25',note:'卤汤浓郁咸香，火烧吸满汤汁，肺头软嫩。豆腐泡是灵魂配角。',tags:['北京小吃','卤味','咸香'],price:{type:'unit',price:32}},

    // 2026-03
    {id:mid(),name:'Blue Bottle 耶加雪菲',cat:'coffee',score:9,time:'2026-03-01',note:'花香四溢，佛手柑和茉莉的清雅，尾韵有白桃甜感，极致干净。',tags:['耶加雪菲','花香','干净'],price:{type:'unit',price:62}},
    {id:mid(),name:'白毫银针 2025',cat:'tea',score:9,time:'2026-03-04',note:'毫香馥郁，汤色杏黄，入口清甜如泉，三泡后转为淡雅的稻香。',tags:['白茶','银针','清甜'],price:{type:'unit',price:180}},
    {id:mid(),name:'OMAKASE 春季限定',cat:'japanese',score:9,time:'2026-03-07',note:'樱鲷寿司鲜甜细腻，海胆军舰浓郁如奶油，最后的玉子烧完美收尾。',tags:['omakase','樱鲷','海胆'],price:{type:'avg',price:580}},
    {id:mid(),name:'Barolo DOCG 2018',cat:'wine',score:9,time:'2026-03-09',note:'玫瑰花瓣、焦油、樱桃和烟草交织。单宁如天鹅绒，余韵长达一分钟。',tags:['内比奥罗','意大利','天鹅绒'],price:{type:'unit',price:520}},
    {id:mid(),name:'黑珍珠烤肉',cat:'bbq',score:8,time:'2026-03-12',note:'澳洲和牛M7雪花均匀，轻烤五分熟，入口即化，蘸海盐最佳。',tags:['和牛','雪花','入口即化'],price:{type:'avg',price:298}},
    {id:mid(),name:'巴斯克芝士蛋糕',cat:'dessert',score:8,time:'2026-03-14',note:'外焦里嫩，焦糖化表面增加了苦甜层次，内芯如慕斯般丝滑。',tags:['巴斯克','芝士','焦糖'],price:{type:'unit',price:48}},
    {id:mid(),name:'Whisky Sour',cat:'cocktail',score:7,time:'2026-03-16',note:'波本、柠檬汁、蛋白。酸甜平衡不错但蛋白泡沫不够绵密。',tags:['波本','酸甜','蛋白'],price:{type:'unit',price:72}},
    {id:mid(),name:'小龙坎火锅',cat:'hotpot',score:8,time:'2026-03-18',note:'牛油底麻辣适中，手切鲜毛肚秒杀，黄喉脆嫩，小酥肉惊艳。',tags:['牛油','毛肚','小酥肉'],price:{type:'avg',price:128}},
    {id:mid(),name:'響 和风调和',cat:'whisky',score:8,time:'2026-03-21',note:'蜂蜜、白兰地般的甜润，中段有淡雅的花香，收尾温和不辣口。',tags:['调和','日威','甜润'],price:{type:'unit',price:95}},
    {id:mid(),name:'Din Tai Fung 小笼包',cat:'chinese',score:9,time:'2026-03-24',note:'18个褶子标准工艺，汤汁丰腴鲜美，皮薄但不破，蘸醋配姜丝绝了。',tags:['小笼包','鼎泰丰','鲜美'],price:{type:'avg',price:88}},
    {id:mid(),name:'盐烤虹鳟鱼',cat:'japanese',score:7,time:'2026-03-27',note:'鱼肉鲜嫩但盐度偏高，皮烤得不够脆。配柠檬挤汁后改善不少。',tags:['烤鱼','盐烤','偏咸'],price:{type:'avg',price:68}},
    {id:mid(),name:'冻顶乌龙',cat:'tea',score:8,time:'2026-03-30',note:'焙火恰到好处，果香和焦糖融合，汤水醇厚，越泡越甜。',tags:['乌龙','焙火','醇厚'],price:{type:'unit',price:75}},

    // 2026-04
    {id:mid(),name:'三顿半 超即溶 #3',cat:'coffee',score:6,time:'2026-04-01',note:'方便是真方便，但风味扁平，只有基础的坚果和可可味道。',tags:['即溶','方便','扁平'],price:{type:'unit',price:8}},
    {id:mid(),name:'Pierre Hermé 玫瑰荔枝',cat:'dessert',score:9,time:'2026-04-02',note:'Ispahan 马卡龙，荔枝清甜搭配玫瑰花瓣和覆盆子，层次精妙绝伦。',tags:['马卡龙','荔枝','玫瑰'],price:{type:'unit',price:42}},
    {id:mid(),name:'日式炭火烧鸟',cat:'japanese',score:8,time:'2026-04-04',note:'鸡皮烤到微焦，油脂香四溢；鸡心弹牙多汁。清酒配焼鸟是黄金搭档。',tags:['烧鸟','炭火','多汁'],price:{type:'avg',price:158}},
    {id:mid(),name:'Margherita 手工比萨',cat:'italian',score:7,time:'2026-04-05',note:'经典三色配置，但面团发酵不够充分，底部略硬，芝士品质不错。',tags:['比萨','经典','面团'],price:{type:'avg',price:68}},
    {id:mid(),name:'白桃乌龙冷泡',cat:'tea',score:7,time:'2026-04-06',note:'冷泡一夜的白桃乌龙，清甜解渴，桃味自然不做作，适合春天。',tags:['冷泡','白桃','清甜'],price:{type:'unit',price:25}},
    {id:mid(),name:'Mai Tai 热带风情',cat:'cocktail',score:8,time:'2026-04-07',note:'朗姆酒基底，杏仁糖浆、库拉索、青柠。热带水果的炸裂感配薄荷叶清爽。',tags:['朗姆','热带','青柠'],price:{type:'unit',price:92}},
    {id:mid(),name:'新疆烤馕配羊肉串',cat:'bbq',score:9,time:'2026-04-08',note:'馕坑现烤，外脆内软带芝麻香。大串羊肉肥瘦相间，孜然辣椒面地道。',tags:['新疆','烤馕','地道'],price:{type:'avg',price:52}},
    {id:mid(),name:'安溪铁观音 春茶',cat:'tea',score:8,time:'2026-04-09',note:'兰花香显，汤色金黄透亮，喉韵深远，七泡有余香。春茶就是不一样。',tags:['铁观音','兰花','春茶'],price:{type:'unit',price:110}},
    {id:mid(),name:'Onibus 埃塞俄比亚日晒',cat:'coffee',score:8,time:'2026-04-10',note:'蓝莓、发酵果实的浓郁甜感，body偏薄但风味层次丰富，冷了更好喝。',tags:['日晒','蓝莓','发酵'],price:{type:'unit',price:55}},
    {id:mid(),name:'余市 NAS',cat:'whisky',score:8,time:'2026-04-10',note:'泥煤烟熏和海盐矿物感，像北海道冬天的篝火。搭配黑巧克力绝佳。',tags:['泥煤','余市','烟熏'],price:{type:'unit',price:110}}
  ];

  // Ensure all notes have tags array and visits array
  notes.forEach(function(n){
    if(!n.tags)n.tags=[];
    if(!n.visits)n.visits=[];
  });

  // Set demo user badge
  document.getElementById('user-email-display').textContent='Demo 模式';
  document.getElementById('user-avatar').textContent='D';

  // Start app directly (with EverOS connection check)
  populateCatSelects();
  initGraph();
  renderCategories();
  // Re-expose data for V29 sommelier engine (demo seed added notes + categories after startApp)
  window.__tvNotes=notes;
  window.__tvCategories=CATEGORIES;
  // Check EverOS connection and update status indicator
  EverOS.checkConnection(function(online){
    var dot=document.getElementById('everos-dot');
    var label=document.getElementById('everos-label');
    if(online){
      dot.style.background='#5ebe8e';label.textContent='EverOS ✓';
      label.parentElement.title='EverOS 记忆服务已连接 ('+EVEROS_API+')';
    }else{
      dot.style.background='#e85050';label.textContent='EverOS ✗';
      label.parentElement.title='EverOS 记忆服务未连接 — 仅本地模式';
    }
  });
})(); */

})();
}
