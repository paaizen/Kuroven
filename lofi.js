/* Kuroven : musique d'ambiance lofi, fabriquée en direct par le navigateur (aucun fichier audio, aucun droit à payer).
   Accords jazzy, batterie douce, sans aucun souffle ni craquement. Un petit bouton ♪ en bas à droite l'allume, l'éteint et règle le volume.
   Elle ne démarre qu'après un premier clic (règle des navigateurs) et baisse toute seule pendant les grandes animations. */
(function(){
'use strict';
var KEY='kvlofi',VKEY='kvlofiv';
var store={get:function(k,d){try{var v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var TEMPO=74,SPB=60/TEMPO;
var KEYS=[0,2,3,5,7,10];
var TYPES={m9:[0,3,7,10,14],maj9:[0,4,7,11,14],dom9:[0,4,7,10,14],m7:[0,3,7,10]};
var PROGS=[
 [[2,'m9'],[7,'dom9'],[0,'maj9'],[9,'m9']],
 [[0,'maj9'],[9,'m9'],[2,'m9'],[7,'dom9']],
 [[9,'m9'],[2,'m9'],[7,'dom9'],[0,'maj9']],
 [[4,'m7'],[9,'m9'],[2,'m9'],[7,'dom9']]
];
var mtof=function(m){return 440*Math.pow(2,(m-69)/12)};
function rand(a){return a[Math.floor(Math.random()*a.length)]}

/* moteur : s'attache à n'importe quel contexte audio (en direct ou hors ligne, pour les tests) */
function engine(ctx,out){
 var noiseBuf=null;
 function noise(){if(noiseBuf)return noiseBuf;var n=ctx.sampleRate*2,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(var i=0;i<n;i++)d[i]=Math.random()*2-1;noiseBuf=b;return b}
 /* réverbération douce : trois échos filtrés */
 var fxIn=ctx.createGain(),fxOut=ctx.createGain();fxOut.gain.value=.5;
 [.19,.31,.47].forEach(function(t,i){var d=ctx.createDelay(1);d.delayTime.value=t;var f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1800-i*350;var g=ctx.createGain();g.gain.value=.34-i*.06;fxIn.connect(d);d.connect(f);f.connect(g);g.connect(fxOut);g.connect(d)});
 fxOut.connect(out);
 var started=false;
 var key=rand(KEYS),prog=rand(PROGS),bar=0,step=0,next=0,time0=0;
 function env(g,t,a,d,v){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d)}
 function tone(m,t,dur,v,type,lp){
  var o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
  o.type=type||'triangle';o2.type='sine';o.frequency.value=mtof(m);o2.frequency.value=mtof(m)*2.003;
  o.detune.value=(Math.random()-.5)*12;f.type='lowpass';f.frequency.value=lp||1500;
  var g2=ctx.createGain();g2.gain.value=.22;
  o.connect(f);o2.connect(g2);g2.connect(f);f.connect(g);g.connect(out);g.connect(fxIn);
  env(g,t,.012,dur,v);o.start(t);o2.start(t);o.stop(t+dur+.1);o2.stop(t+dur+.1)}
 function kick(t,v){var o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g);g.connect(out);o.start(t);o.stop(t+.35)}
 function hit(t,type,f,q,dur,v){var s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise();fl.type=type;fl.frequency.value=f;fl.Q.value=q;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(out);s.start(t,Math.random()*1.5);s.stop(t+dur+.02)}
 function chord(t){
  var c=prog[bar%4],root=48+((key+c[0])%12),iv=TYPES[c[1]];
  iv.forEach(function(x,i){var m=root+x;if(m>74)m-=12;tone(m,t+i*.022,SPB*3.6,.05,'triangle',1100)});
  tone(root-12,t,SPB*1.7,.15,'sine',500)}
 function melody(t){var c=prog[bar%4],root=60+((key+c[0])%12),iv=TYPES[c[1]];tone(root+rand(iv)+(Math.random()<.3?12:0),t,SPB*1.3,.045,'triangle',1800)}
 function sched(t,st){
  var swing=(st%2)?SPB*.5*.18:0,tt=t+swing;
  if(st===0)chord(tt);
  if(st===0||st===5)tone(48+((key+prog[bar%4][0])%12)-12,tt,SPB*.9,.16,'sine',420);
  if(st===0||st===5)kick(tt,.24);
  if(st===3)kick(tt,.1);
  if(st===2||st===6)hit(tt,'lowpass',900,.7,.12,.028);
  if((st===1||st===3||st===4||st===7)&&Math.random()<.42)melody(tt+.01);
 }
 return{
  start:function(){if(started)return;started=true;next=ctx.currentTime+.15;time0=next},
  /* on prépare les notes un peu à l'avance */
  tick:function(until){if(!started)return;while(next<until){sched(next,step);step++;next+=SPB/2;if(step===8){step=0;bar++;if(bar%16===0){key=rand(KEYS);prog=rand(PROGS)}}}},
  fillTo:function(until){this.start();this.tick(until)}
 };
}

/* ---------- lecture en direct ---------- */
var ctx=null,master=null,eng=null,timer=0,on=store.get(KEY,'1')!=='0',vol=+store.get(VKEY,'.35'),duck=1,unlocked=false,ui={};
if(!(vol>=0&&vol<=1))vol=.35;
var BASE=.4;           // niveau de la sortie principale : le curseur de volume règle le reste
function level(){return on?BASE*vol*duck:0}
function init(){
 if(ctx)return true;
 try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  ctx=new AC();var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;
  var comp=ctx.createDynamicsCompressor();comp.threshold.value=-24;comp.ratio.value=3;
  master=ctx.createGain();master.gain.value=0;
  master.connect(lp);lp.connect(comp);comp.connect(ctx.destination);
  /* petit tremblement de bande, comme une vieille cassette */
  var lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.35;lg.gain.value=5;lfo.connect(lg);lfo.start();
  eng=engine(ctx,master);return true}catch(e){return false}}
function loop(){if(!ctx||!eng)return;eng.tick(ctx.currentTime+.6)}
function apply(fade){
 if(!master)return;var t=ctx.currentTime,g=level();master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(g,t,fade||.6)}
function play(){
 if(!on)return;if(!init())return;
 if(ctx.state==='suspended')ctx.resume();
 eng.start();if(!timer)timer=setInterval(loop,150);loop();apply(2.2)}
function stop(){apply(.4);setTimeout(function(){if(!on&&ctx&&ctx.state==='running')ctx.suspend()},1600)}
function draw(){
 if(!ui.btn)return;ui.btn.setAttribute('aria-pressed',on?'true':'false');ui.btn.title=on?'Musique d’ambiance : coupe-la':'Musique d’ambiance : allume-la';ui.btn.classList.toggle('off',!on);ui.rng.value=String(Math.round(vol*100))}
function setOn(v){on=v;store.set(KEY,on?'1':'0');draw();if(on){if(unlocked)play()}else stop()}
function setVol(v){vol=Math.max(0,Math.min(1,v));store.set(VKEY,String(vol));draw();apply(.15)}
function unlock(){
 if(unlocked)return;unlocked=true;['pointerdown','keydown','touchstart'].forEach(function(e){document.removeEventListener(e,unlock,true)});if(on)play()}
/* baisse automatique pendant les grandes animations (ouverture du magazine, animation de Gojo) et quand l'onglet est caché */
setInterval(function(){
 var d=1;if(document.getElementById('cbOpen')||document.getElementById('cbIns'))d=.35;
 if(d!==duck){duck=d;apply(.8)}
},500);
document.addEventListener('visibilitychange',function(){if(!ctx)return;if(document.hidden){if(ctx.state==='running')ctx.suspend()}else if(on&&unlocked)ctx.resume()});
/* bouton */
function build(){
 if(document.getElementById('kvlofi'))return;
 var css=document.createElement('style');css.textContent=
  '#kvlofi{position:fixed;right:14px;bottom:14px;z-index:10001;display:flex;align-items:center;gap:0;font:600 12px system-ui,sans-serif}'+
  '@media(max-width:900px){#kvlofi{bottom:74px}}'+
  '#kvlofi button{width:38px;height:38px;border-radius:50%;border:1.5px solid #ffffff3a;background:#0d1018e6;color:#ffd84a;font-size:17px;line-height:1;cursor:pointer;display:grid;place-items:center;backdrop-filter:blur(6px);box-shadow:0 4px 14px #0008;padding:0}'+
  '#kvlofi button.off{color:#8a91a6;text-decoration:line-through}'+
  '#kvlofi button:hover{border-color:#ffd84a}'+
  '#kvlofi .kvr{width:0;opacity:0;margin-right:0;transition:width .25s,opacity .25s,margin .25s;accent-color:#ffd84a;height:4px}'+
  '#kvlofi:hover .kvr,#kvlofi:focus-within .kvr{width:84px;opacity:1;margin-right:8px}';
 document.head.appendChild(css);
 var w=document.createElement('div');w.id='kvlofi';
 var r=document.createElement('input');r.type='range';r.min='0';r.max='100';r.className='kvr';r.setAttribute('aria-label','Volume de la musique d’ambiance');
 var b=document.createElement('button');b.type='button';b.textContent='♪';b.setAttribute('aria-label','Musique d’ambiance');
 w.appendChild(r);w.appendChild(b);document.body.appendChild(w);ui={btn:b,rng:r};
 b.addEventListener('click',function(e){e.stopPropagation();unlocked=true;setOn(!on)});
 r.addEventListener('input',function(){setVol(+r.value/100)});
 draw()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
['pointerdown','keydown','touchstart'].forEach(function(e){document.addEventListener(e,unlock,true)});
/* pour les tests : mesure du niveau sonore sans rien jouer */
window.KVLofi={engine:engine,get on(){return on},get volume(){return vol},get duck(){return duck},get state(){return ctx?ctx.state:'none'},get gain(){return master?master.gain.value:0},level:level,setOn:setOn,setVol:setVol};
})();
