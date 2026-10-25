/* Imite-moi — scène 2D légère (même rendu que la 3D, mais en images pré-calculées).
   Utilisée quand le navigateur n'a pas d'accélération matérielle (3D trop lente). Même interface que imite3d.js. */
(function(){
'use strict';
window.IM2D={init:function(base){
base=(base||'imite/').replace(/\/?$/,'/')+'spr/';
var KEYS=['lea','kenji','sora','mizuki','ryo','ren'];
var NAMES={lea:'Léa',kenji:'Kenji',sora:'Sora',mizuki:'Mizuki',ryo:'Ryo',ren:'Ren'};
function clamp(x,a,b){return x<a?a:x>b?b:x}
function lerp(a,b,t){return a+(b-a)*t}
function ease(x){x=clamp(x,0,1);return x*x*(3-2*x)}
function seg(t,a,b){return clamp((t-a)/(b-a),0,1)}
function escH(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* ---------- Chargement des images ---------- */
var man=null,IMG={},ready=false,loading=false;
function loadImg(n){return new Promise(function(ok){var i=new Image();i.onload=function(){ok(i)};i.onerror=function(){ok(null)};i.src=(window.IM2D_DATA&&window.IM2D_DATA.img[n])||(base+n)})}
function loadAll(){
  if(loading)return;loading=true;
  (window.IM2D_DATA?Promise.resolve(window.IM2D_DATA.man):fetch(base+'spr.json').then(function(r){return r.json()})).then(function(m){
    man=m;var names=['bg.jpg','cur.webp','spk.webp'].concat(KEYS.map(function(k){return k+'.webp'}));
    return Promise.all(names.map(loadImg)).then(function(a){names.forEach(function(n,i){IMG[n.replace(/\.\w+$/,'')]=a[i]});ready=!!(IMG.bg&&IMG.cur)})}).catch(function(){})}

/* ---------- Caméra fixe (même que la 3D) : monde -> image du décor (1600x900) ---------- */
var BW=1600,BH=900,FOV=44*Math.PI/180,FF=(BH/2)/Math.tan(FOV/2);
var P0=[0,2.4,10.2],L0=[0,1.5,0],fw,rt,up;
(function(){var d=[L0[0]-P0[0],L0[1]-P0[1],L0[2]-P0[2]],n=Math.hypot(d[0],d[1],d[2]);fw=[d[0]/n,d[1]/n,d[2]/n];
  rt=[-fw[2],0,fw[0]];var r=Math.hypot(rt[0],rt[1],rt[2]);rt=[rt[0]/r,0,rt[2]/r];
  up=[rt[1]*fw[2]-rt[2]*fw[1],rt[2]*fw[0]-rt[0]*fw[2],rt[0]*fw[1]-rt[1]*fw[0]]})();
function proj(x,y,z){var d0=x-P0[0],d1=y-P0[1],d2=z-P0[2],zc=d0*fw[0]+d1*fw[1]+d2*fw[2],xc=d0*rt[0]+d1*rt[1]+d2*rt[2],yc=d0*up[0]+d1*up[1]+d2*up[2];
  return{x:BW/2+xc/zc*FF,y:BH/2-yc/zc*FF,k:FF/zc,z:zc}}

/* ---------- État ---------- */
var canvas=document.createElement('canvas');canvas.className='im3d-cv';canvas.style.cursor='default';
var tagsEl=document.createElement('div');tagsEl.className='im3d-tags';
var g=canvas.getContext('2d'),app=null,W=1,H=1,DPR=1,S0=1,ro=null,running=false,rafId=0,last=0;
var cast=[{name:'',key:'lea'}],perf=0,mode='',mt=0,gt=0,S={},curtT=1,curtCur=1,mic=0,micS=0,isPlaying=false,applause=0;
var CHS={},tagEls={};
KEYS.forEach(function(k,i){CHS[k]={vis:false,x:0,y:0,z:0,pose:'idle',live:null,label:null,tag:true,ph:i*.37,rz:0}});
KEYS.forEach(function(k){var d=document.createElement('div');d.className='tag';d.style.opacity=0;tagsEl.appendChild(d);tagEls[k]=d});
var cam={zoom:1,fx:BW/2,fy:BH/2,tz:1,tx:BW/2,ty:BH/2},confetti=[],spl=[],tom=[],shake=0;
var keyOf=function(i){return cast[Math.max(0,Math.min(i,cast.length-1))].key};
var nameOf=function(i){return cast[Math.max(0,Math.min(i,cast.length-1))].name};
function put(k,x,y,z,pose){var c=CHS[k];c.vis=true;c.x=x;c.y=y;c.z=z;c.pose=pose||'idle'}
var lineX=function(i,n){return(i-(n-1)/2)*Math.min(1.5,7.4/Math.max(1,n))};
function lineOthers(pose,exi){var n=cast.length;cast.forEach(function(c,i){if(i===exi)return;put(c.key,lineX(i,n),0,-.5,pose);var u=CHS[c.key];u.tag=!!c.name;u.label=escH(c.name||'')})}
function reset(){KEYS.forEach(function(k){var c=CHS[k];c.vis=false;c.label=null;c.tag=true;c.live=null;c.rz=0;c.y=0});confetti.length=0;spl.length=0;tom.length=0;applause=0;S={};shake=0;
  cam.tz=1;cam.tx=BW/2;cam.ty=BH/2;spkOn=false;noteOn=false;pod=null;crown=false}
function camFocus(wx,wy,wz,zoom){var p=proj(wx,wy,wz);cam.tx=p.x;cam.ty=p.y;cam.tz=zoom}
var spkOn=false,spkP=[0,0,0],noteOn=false,noteSrc=[0,1.7,1],pod=null,crown=false;

/* ---------- Dessin des personnages ---------- */
var PER={idle:[2,1.6],hear:[2,2.2],wave:[4,.225],cheer:[4,.225],clap:[4,.175],shrug:[4,.315],walk:[4,.175]};
function frameOf(c,t){
  var p=c.pose,tt=t+c.ph*3,o=man.poses;
  if(p==='sing'){var m=c.live==null?(.5+.5*Math.sin(tt*9)):c.live,mi=m<.2?0:m<.6?1:2,bi=Math.floor(tt/.65)&1;return o.sing[0]+bi*3+mi}
  if(p==='bow'){var ph=(tt*.5)%1,f=ph<.2?0:ph<.3?1:ph<.7?2:ph<.85?1:0;return o.bow[0]+f}
  var q=PER[p]||PER.idle,e=o[PER[p]?p:'idle'];return e[0]+Math.floor(tt/q[1])%q[0]}
function drawChar(k,t){
  var c=CHS[k],A=IMG[k];if(!c.vis||!A)return;
  var jump=0,rot=0,tt=t+c.ph*3;
  if(c.pose==='cheer')jump=Math.abs(Math.sin(tt*7))*.1;else if(c.pose==='clap')jump=Math.abs(Math.sin(tt*5))*.03;else if(c.pose==='walk')jump=Math.abs(Math.sin(tt*9))*.04;
  else if(c.pose==='sing'){jump=Math.abs(Math.sin(tt*6.4))*.02;rot=Math.sin(tt*3.2)*.04}else if(c.pose==='idle'||c.pose==='hear')jump=Math.sin(tt*2)*.012;
  var p=proj(c.x,c.y+jump,c.z),kk=p.k/man.ppu,cw=man.cell[0],ch=man.cell[1],f=frameOf(c,t),sx=(f%man.cols)*cw,sy=Math.floor(f/man.cols)*ch;
  if(c.y<.02){g.fillStyle='rgba(0,0,0,.30)';g.beginPath();g.ellipse(p.x,proj(c.x,0,c.z).y+2*kk,.62*p.k,.17*p.k,0,0,7);g.fill()}
  g.save();g.translate(p.x+(c.rz||0)*p.k,p.y);if(rot||c.tilt)g.rotate(rot+(c.tilt||0));
  g.drawImage(A,sx,sy,cw,ch,-man.ax*kk,-man.ay*kk,cw*kk,ch*kk);g.restore()}

/* ---------- Scènes ---------- */
function burst(n,cx){for(var i=0;i<n&&confetti.length<220;i++){confetti.push({x:(cx==null?BW/2:cx)+(Math.random()-.5)*BW*.9,y:-20-Math.random()*200,vx:(Math.random()-.5)*60,vy:60+Math.random()*120,r:Math.random()*6,vr:(Math.random()-.5)*9,c:['#ffd84a','#e0561f','#2f6fd8','#1f9d63','#f19ac0','#ffffff'][i%6],w:7+Math.random()*6,h:4+Math.random()*4})}}
function tomatoPlan(perfX){var pl=[],t=.9,kinds=['wall','lea','floor','wall','wall','floor','lea','wall','floor','wall','wall','cam','floor'],rr=Math.random;
  for(var i=0;i<13;i++){var kind=kinds[(i*7+3)%kinds.length],side=rr()<.5?-1:1,e,sz;
    if(kind==='lea'){var q=proj(perfX+(rr()-.5)*.9,.4+rr()*1.5,1.3);e=q;sz=(.38+rr()*.34)*q.k}
    else if(kind==='wall'){var w=proj((rr()-.5)*13.5,.2+rr()*4.4,-3.62);e=w;sz=(1.2+rr()*1.3)*w.k*.9}
    else if(kind==='floor'){var f=proj((rr()-.5)*8,.05,-2.4+rr()*6.4);e=f;sz=(1.4+rr()*1)*f.k*.7}
    else{e={x:BW/2+(rr()-.5)*500,y:BH/2+(rr()-.5)*300,k:1};sz=130+rr()*120}
    var s=kind==='cam'?{x:BW/2+(rr()-.5)*600,y:BH+120}:{x:BW/2+side*(BW*.62),y:BH*(.55+rr()*.45)};
    pl.push({t0:t,dur:.5+rr()*.35,s:s,e:e,kind:kind,sz:sz,sp:rr()*8,done:false,h:80+rr()*140});t+=Math.max(.06,.32-i*.011)}
  return pl}
var MODES={
 menu:{enter:function(){curtT=curtCur=1;put('lea',-1.5,0,1.1,'wave');put('sora',.1,0,-.6,'cheer');put('kenji',1.9,0,.8,'clap');put('ren',3.9,0,-.4,'wave');put('mizuki',-3.4,0,-.2,'cheer');put('ryo',5.7,0,.2,'clap');KEYS.forEach(function(k){CHS[k].tag=false})},tick:function(t){camFocus(Math.sin(t*.35)*.9,1.5,0,1)}},
 lineup:{enter:function(o){o=o||{};S={sp:!!o.spk};curtT=o.closed?0:1;spkOn=S.sp;spkP=[5.3,0,1.1];var n=cast.length,P=o.poses||{};
   cast.forEach(function(c,i){put(c.key,lineX(i,n),0,0,P[c.key]||o.pose||'idle');var u=CHS[c.key];u.tag=!!c.name&&!o.closed;u.label=escH(c.name||'')+(o.marks&&o.marks[c.key]?' '+o.marks[c.key]:'')})},
   tick:function(t){camFocus(Math.sin(t*.3)*.7,1.5,0,1);noteOn=isPlaying&&S.sp;noteSrc=[5.3,1.5,1.1]}},
 listen:{enter:function(o){var k=keyOf(perf);S={k:k,walk:!!(o&&o.walk)};curtT=1;spkOn=true;spkP=[1.7,0,.4];put(k,S.walk?-8:-1.3,0,1.2,S.walk?'walk':'hear');var u=CHS[k];u.tag=cast.length>1&&!!nameOf(perf);u.label=escH(nameOf(perf));camFocus(.5,1.35,.4,1.18)},
   tick:function(t){var c=CHS[S.k];if(S.walk&&t<1.7){c.x=lerp(-8,-1.3,ease(t/1.7));c.pose='walk'}else{c.pose='hear';if(S.walk)c.x=-1.3}camFocus(.4+Math.sin(t*.4)*.5,1.35,.4,1.18);noteOn=isPlaying;noteSrc=[1.7,1.5,.5]}},
 countdown:{enter:function(){S={k:keyOf(perf)};curtT=0},tick:function(t){camFocus(0,1.5,0,1)}},
 record:{enter:function(o){var k=keyOf(perf);S={k:k,fr:(o&&o.from)?-2.6:0};curtT=1;put(k,S.fr,0,1.1,S.fr?'walk':'sing');var u=CHS[k];u.tag=cast.length>1&&!!nameOf(perf);u.label=escH(nameOf(perf));u.live=0},
   tick:function(t){var c=CHS[S.k],w=S.fr?seg(t,0,.9):1;c.x=lerp(S.fr,0,ease(w));c.pose=w<1?'walk':'sing';c.live=micS;noteOn=micS>.06;noteSrc=[0,1.75,1.1];camFocus(0,1.4,1,1.25)}},
 step:{enter:function(){var n=cast.length,i=perf,k=keyOf(i);S={k:k,fx:lineX(i,n)};curtT=1;lineOthers('hear',i);put(k,S.fx,0,0,'walk');var u=CHS[k];u.tag=true;u.label=escH(nameOf(i));u.live=0},
   tick:function(t){var c=CHS[S.k],w=ease(seg(t,0,1.1));c.x=lerp(S.fx,0,w);c.z=lerp(0,1.1,w);c.pose=w<1?'walk':'sing';c.live=micS;noteOn=micS>.06;noteSrc=[0,1.75,1.1];camFocus(0,1.4,.6,1.12)}},
 result:{enter:function(o){var k=keyOf(perf),kind=(o&&o.kind)||'ok';S={k:k,kind:kind,b:0,line:!!(o&&o.line)};curtT=1;
   var oth=function(p){if(S.line)lineOthers(p,perf);else{var ks=[],n=0;cast.forEach(function(c){if(c.key!==k)ks.push(c.key)});['kenji','sora','mizuki','ryo','lea','ren'].forEach(function(x){if(x!==k&&ks.indexOf(x)<0)ks.push(x)});
     var X=[-2.6,-1.6,.5,2.6];ks.slice(0,4).forEach(function(kk,i){put(kk,X[i],0,-.9,p);CHS[kk].tag=false})}};
   if(kind==='bad'){put(k,0,0,1,'shrug');oth('shrug');S.pl=tomatoPlan(0)}
   else if(kind==='silent'){put(k,0,0,1.1,'shrug');oth('idle')}
   else{put(k,0,0,1.4,'bow');oth(kind==='great'?'cheer':'clap')}
   var u=CHS[k];u.tag=cast.length>1&&!!nameOf(perf);u.label=escH(nameOf(perf));S.lh=-9},
   tick:function(t){var k=S.k,kind=S.kind;
     if(kind==='great'||kind==='ok'){camFocus(Math.sin(t*.4)*.6,1.3,1,1.08);
       if(kind==='great'){if(t>.5&&S.b===0){S.b=1;burst(150)}if(t>2.8&&S.b===1){S.b=2;burst(90)}}else if(t>.5&&S.b===0){S.b=1;burst(45)}}
     else if(kind==='silent'){camFocus(0,1.4,.6,1.1)}
     else{camFocus(-.2,1.4,.8,1.35);
       S.pl.forEach(function(o){var f=(t-o.t0)/o.dur;
         if(f>=1&&!o.done){o.done=true;var ti=t;spl.push({x:o.e.x,y:o.e.y,r:o.sz,t0:ti,cam:o.kind==='cam',seed:Math.random()*9});
           if(o.kind==='lea'){S.lh=ti;shake=.5}else if(o.kind==='cam')shake=.7}});
       var w=Math.max(0,1-(t-S.lh)/.22);CHS[k].rz=Math.sin(t*55)*.07*w}}},
 handoff:{enter:function(o){var a=keyOf(o.from),b=keyOf(o.to);S={a:a,b:b};curtT=1;put(a,0,0,.9,'bow');put(b,7.5,0,.8,'walk');var ua=CHS[a],ub=CHS[b];ua.label=escH(nameOf(o.from));ub.label=escH(nameOf(o.to));ua.tag=ub.tag=cast.length>1},
   tick:function(t){var A=CHS[S.a],B=CHS[S.b],ex=seg(t,1.2,3.4);A.x=lerp(0,-8.5,ease(ex));A.pose=t<1.1?'bow':'walk';var en=seg(t,1.8,4.4);B.x=lerp(7.5,.2,ease(en));B.pose=en<1?'walk':'wave';camFocus(0,1.4,0,1.05)}},
 podium:{enter:function(o){var L=(o&&o.list)||[];S={};curtT=1;var used={};
   var pick=function(i){var k=KEYS[i%6],want=cast[L[i].i]&&cast[L[i].i].key;if(want&&!used[want])k=want;if(used[k])k=KEYS.filter(function(x){return!used[x]})[0];used[k]=1;return k};
   var xs=[0,-1.9,1.9],hs=[1.5,1.05,.72];pod={n:Math.min(3,L.length),xs:xs,hs:hs,ks:[]};
   L.slice(0,3).forEach(function(r,i){var k=pick(i);pod.ks.push(k);put(k,xs[i],0,.2,i===0?'cheer':'clap');var u=CHS[k];u.tag=true;u.label=escH(r.name)+' <b>'+r.score+'</b>'});
   var rest=cast.map(function(c){return c.key}).filter(function(k){return!used[k]}),XR=[-3.9,3.9,-5,5];rest.slice(0,4).forEach(function(k,i){put(k,XR[i],0,.5,'cheer');CHS[k].tag=false});
   crown=false;S.k=0},
   tick:function(t){pod.ks.forEach(function(k,i){var e=ease(seg(t,.3+i*.35,1.5+i*.35));CHS[k].y=pod.hs[i]*e});crown=t>2.4&&pod.ks.length>0;S.cd=seg(t,2.4,3.1);
     if(t>1.8&&S.k<5&&t>1.8+S.k*1.4){S.k++;burst(80)}camFocus(Math.sin(t*.28)*.8,1.5,0,1)}}
};
function setMode(m,o){mode=m;mt=0;reset();MODES[m].enter(o||{})}

/* ---------- Rendu ---------- */
function resize(){if(!app)return;var w=app.clientWidth||1,h=app.clientHeight||1;DPR=Math.min(window.devicePixelRatio||1,1.5);W=Math.round(w*DPR);H=Math.round(h*DPR);canvas.width=W;canvas.height=H;
  S0=(w/h>=1.2)?Math.max(W/BW,H/BH):W/BW}
function drawCurtain(o){
  var s=lerp(1,.4,ease(o)),a=-270,b=1870,im=IMG.cur;if(!im)return;
  g.save();g.translate(a,0);g.scale(s,1);g.translate(-a,0);g.drawImage(im,0,0,1170,BH,-370,0,1170,BH);g.restore();
  g.save();g.translate(b,0);g.scale(s,1);g.translate(-b,0);g.drawImage(im,1170,0,1170,BH,BW/2,0,1170,BH);g.restore()}
function drawPodium(t){
  if(!pod)return;var cols=[['#e6bd55','#b78a28'],['#c4cbd9','#8d96aa'],['#dc9a6b','#a9673c']],lbl=['1','2','3'];
  for(var i=0;i<pod.n;i++){var e=ease(seg(t,.3+i*.35,1.5+i*.35)),h=pod.hs[i]*Math.max(.001,e),x=pod.xs[i],z=.2;
    var a=proj(x-.8,0,z+.75),b=proj(x+.8,0,z+.75),c=proj(x+.8,h,z+.75),d=proj(x-.8,h,z+.75),e1=proj(x-.8,h,z-.75),f1=proj(x+.8,h,z-.75);
    g.fillStyle=cols[i][1];g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();g.fill();
    g.fillStyle=cols[i][0];g.beginPath();g.moveTo(d.x,d.y);g.lineTo(c.x,c.y);g.lineTo(f1.x,f1.y);g.lineTo(e1.x,e1.y);g.closePath();g.fill();
    if(e>.5){g.fillStyle='rgba(255,255,255,.9)';g.font='800 '+Math.round(.7*a.k)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(lbl[i],(a.x+b.x)/2,(a.y+d.y)/2)}}}
function drawCrown(){
  if(!crown||!pod||!pod.ks.length)return;var c=CHS[pod.ks[0]],h=c.y+2.18+(1-ease(S.cd||1))*2.4,p=proj(pod.xs[0],h,.2),k=p.k*.5;
  g.save();g.translate(p.x,p.y);g.fillStyle='#ffd84a';g.strokeStyle='#b78a28';g.lineWidth=2;g.beginPath();g.moveTo(-k*.6,k*.3);g.lineTo(-k*.7,-k*.3);g.lineTo(-k*.3,0);g.lineTo(0,-k*.5);g.lineTo(k*.3,0);g.lineTo(k*.7,-k*.3);g.lineTo(k*.6,k*.3);g.closePath();g.fill();g.stroke();g.restore()}
function drawSpk(t){
  if(!spkOn||!IMG.spk||!man.spk)return;var p=proj(spkP[0],spkP[1],spkP[2]),kk=p.k/man.spk.ppu;
  if(isPlaying){for(var i=0;i<3;i++){var q=((t*.55+i/3)%1),c=proj(spkP[0],.55,spkP[2]+.4);g.strokeStyle='rgba(255,178,122,'+(.7*(1-q)).toFixed(2)+')';g.lineWidth=3;g.beginPath();g.arc(c.x,c.y,c.k*(.4+q*1.3),0,7);g.stroke()}}
  var s=1+(isPlaying?.04*Math.sin(t*14):0);g.save();g.translate(p.x,p.y);g.scale(s,s);g.drawImage(IMG.spk,-man.spk.ax*kk,-man.spk.ay*kk,man.spk.w*kk,man.spk.h*kk);g.restore()}
function drawNotes(t){
  if(!noteOn)return;g.fillStyle='#ffd84a';g.textAlign='center';g.textBaseline='middle';
  for(var i=0;i<9;i++){var ph=((t*.45+i/9)%1),a=Math.sin(Math.PI*clamp(ph*1.1,0,1)),p=proj(noteSrc[0]+Math.sin(i*2.3)*.7*ph,noteSrc[1]+ph*1.7,noteSrc[2]+.3),s=(.2+.2*a)*p.k*1.3;
    g.globalAlpha=a;g.fillStyle=i%3===1?'#fff':i%3===2?'#ff7a3a':'#ffd84a';g.font='700 '+Math.round(s)+'px sans-serif';g.fillText('♪',p.x,p.y)}g.globalAlpha=1}
function splat(s,age,screen){
  var op=s.cam?Math.max(0,.92-Math.max(0,age-1.2)*.45):.92,r=s.r*.5;g.globalAlpha=op;g.fillStyle='#d63a2a';
  g.beginPath();g.arc(s.x,s.y,r*.55,0,7);g.fill();
  for(var i=0;i<7;i++){var a=s.seed+i*.9,d=r*(.45+.35*((i*37)%5)/5);g.beginPath();g.arc(s.x+Math.cos(a)*d,s.y+Math.sin(a)*d,r*(.18+.12*((i*13)%4)/4),0,7);g.fill()}
  g.fillStyle='#e8584a';g.beginPath();g.arc(s.x-r*.12,s.y-r*.12,r*.22,0,7);g.fill();g.globalAlpha=1}
function drawTomatoes(t){
  if(!S.pl)return;S.pl.forEach(function(o){var f=(t-o.t0)/o.dur;if(f<0||f>=1)return;
    var x=lerp(o.s.x,o.e.x,f),y=lerp(o.s.y,o.e.y,f)-Math.sin(Math.PI*f)*o.h,r=Math.max(10,22*(1-.4*f));
    g.save();g.translate(x,y);g.rotate(f*o.sp);g.fillStyle='#d63a2a';g.beginPath();g.arc(0,0,r,0,7);g.fill();g.fillStyle='#2f8a3a';g.fillRect(-r*.35,-r*1.05,r*.7,r*.3);g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(-r*.3,-r*.3,r*.3,0,7);g.fill();g.restore()})}
function drawConfetti(dt){
  for(var i=confetti.length-1;i>=0;i--){var p=confetti[i];p.vy+=70*dt;p.vx*=.995;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;if(p.y>BH+30){confetti.splice(i,1);continue}
    g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.fillRect(-p.w/2,-p.h/2,p.w,p.h);g.restore()}}
function updTags(sc,ox,oy){
  KEYS.forEach(function(k){var c=CHS[k],d=tagEls[k],show=c.vis&&c.tag!==false&&c.label;if(!show){if(d._o!==0){d.style.opacity=0;d._o=0}return}
    var p=proj(c.x,c.y+2.35,c.z),x=(p.x*sc+ox)/DPR,y=(p.y*sc+oy)/DPR;
    if(d._o!==1){d.style.opacity=1;d._o=1}
    var tr='translate('+Math.round(x)+'px,'+Math.round(y)+'px) translate(-50%,-100%)';if(d._t!==tr){d.style.left='0';d.style.top='0';d.style.transform=tr;d._t=tr}
    if(d._l!==c.label){d.innerHTML=c.label;d._l=c.label}})}
var curtainFrame=0;
function frame(now){
  if(!running)return;rafId=requestAnimationFrame(frame);
  if(now-last<32)return;
  var raw=(now-last)/1000,dt=Math.min(.1,raw);last=now;mt+=dt*.96;gt+=dt*1.45;
  if(mode)MODES[mode].tick(mt);
  curtCur+=(curtT-curtCur)*(1-Math.exp(-dt*1.5));micS+=(mic-micS)*(1-Math.exp(-dt*14));
  var kz=1-Math.exp(-dt*1.6);cam.zoom+=(cam.tz-cam.zoom)*kz;cam.fx+=(cam.tx-cam.fx)*kz;cam.fy+=(cam.ty-cam.fy)*kz;
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#0e0716';g.fillRect(0,0,W,H);
  if(!ready){return}
  var sc=S0*cam.zoom,hw=W/2/sc,hh=H/2/sc,fx=hw>=BW/2?BW/2:clamp(cam.fx,hw,BW-hw),fy=hh>=BH/2?BH/2:clamp(cam.fy,hh,BH-hh),ox=W/2-fx*sc,oy=H/2-fy*sc;
  if(shake>0){ox+=(Math.random()-.5)*shake*30;oy+=(Math.random()-.5)*shake*30;shake*=.9;if(shake<.02)shake=0}
  g.setTransform(sc,0,0,sc,ox,oy);g.drawImage(IMG.bg,0,0);
  drawSpk(gt);drawPodium(mt);
  var order=KEYS.filter(function(k){return CHS[k].vis}).sort(function(a,b){return CHS[a].z-CHS[b].z});
  order.forEach(function(k){drawChar(k,gt)});drawCrown();drawNotes(gt);
  drawCurtain(curtCur);
  if(spl.length){spl.forEach(function(s){if(!s.cam)splat(s,mt-s.t0)})}
  drawTomatoes(mt);drawConfetti(dt);
  if(spl.length){g.setTransform(1,0,0,1,0,0);spl.forEach(function(s){if(s.cam){g.save();g.translate(W/2-(BW/2)*S0,H/2-(BH/2)*S0);g.scale(S0,S0);splat(s,mt-s.t0);g.restore()}})}
  updTags(sc,ox,oy)}

return{
 mount:function(el){app=el;el.appendChild(canvas);el.appendChild(tagsEl);if(ro)ro.disconnect();if(window.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(el)}resize();loadAll();if(!running){running=true;last=performance.now();rafId=requestAnimationFrame(frame)}},
 unmount:function(){running=false;cancelAnimationFrame(rafId);if(ro){ro.disconnect();ro=null}},
 cast:function(l){cast=l&&l.length?l:[{name:'',key:'lea'}]},
 mode:function(m,o){if(m==='listen'||m==='record'||m==='countdown'||m==='result'||m==='step')perf=(o&&o.perf!=null)?o.perf:perf;if(m==='handoff')perf=o.to;setMode(m,o)},
 setPerf:function(i){perf=i},
 mic:function(v){mic=clamp(v,0,1)},
 playing:function(b){isPlaying=!!b},
 labels:function(m){for(var k in m){if(CHS[k]){CHS[k].label=m[k];CHS[k].tag=true}}},
 stats:function(){return{soft:false,lite:true,mode2d:true,ready:ready,pr:DPR}},
 keys:KEYS,names:NAMES,dbg:null
}}};
})();
