/* Imite-moi — jeu d'imitation sonore pour Kuroven (même écran). Chargé à la demande par index.html.
   Données : imite/sons.json + imite/sons/*.mp3 (à mettre à côté de index.html). */
(function(){
'use strict';
var BASE='imite/';
var $=function(id){return document.getElementById(id)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function clamp(x,a,b){return x<a?a:x>b?b:x}

/* ============================ ANALYSE AUDIO ============================ */
var AR=16000,HOP=160,WIN=320,PWIN=640;
function toMono16k(ch,sr){
  if(Math.abs(sr-AR)<1)return ch;
  var r=sr/AR,n=Math.floor(ch.length/r),out=new Float32Array(n);
  for(var i=0;i<n;i++){var a=Math.floor(i*r),b=Math.max(a+1,Math.floor((i+1)*r)),s=0;for(var j=a;j<b&&j<ch.length;j++)s+=ch[j];out[i]=s/(b-a)}
  return out}
function envelope(x){
  var n=Math.max(0,Math.floor((x.length-WIN)/HOP)+1),e=new Float32Array(n);
  for(var i=0;i<n;i++){var s=0,o=i*HOP;for(var j=0;j<WIN;j++){var v=x[o+j];s+=v*v}e[i]=Math.sqrt(s/WIN)}
  return e}
function pct(arr,p){var s=Array.prototype.slice.call(arr).sort(function(a,b){return a-b});return s.length?s[Math.min(s.length-1,Math.floor(p*(s.length-1)))]:0}
function activeRegion(env,absMin,ref){
  var p95=pct(env,.95),lowN=Math.max(3,Math.floor(env.length*.15)),low=Array.prototype.slice.call(env).sort(function(a,b){return a-b}).slice(0,lowN),floor=low[low.length>>1]||0;
  var thr=ref?Math.max(p95*.12,absMin||.0008):Math.min(Math.max(floor*2.8,p95*.12,absMin||.0015),p95*.45),a=-1,b=-1,n=env.length;
  for(var i=0;i<n-2;i++){if(env[i]>thr&&env[i+1]>thr&&env[i+2]>thr){a=i;break}}
  for(var k=n-1;k>=2;k--){if(env[k]>thr&&env[k-1]>thr&&env[k-2]>thr){b=k;break}}
  return{a:a,b:b,p95:p95,floor:floor,thr:thr}}
function pitchTrack(x,env,thr){
  var n=env.length,out=new Float32Array(n),minLag=Math.floor(AR/600),maxLag=Math.floor(AR/70);
  for(var f=0;f<n;f++){
    if(env[f]<thr*1.2)continue;
    var o=f*HOP-((PWIN-WIN)>>1);if(o<0||o+PWIN+maxLag>x.length)continue;
    var e0=0;for(var j=0;j<PWIN;j++)e0+=x[o+j]*x[o+j];if(e0<1e-9)continue;
    var best=0,bl=0,rs=new Float32Array(maxLag+2);
    for(var lag=minLag;lag<=maxLag;lag++){
      var c=0,e1=0;for(var m=0;m<PWIN;m+=2){var u=x[o+m],v=x[o+m+lag];c+=u*v;e1+=v*v}
      var r=c/Math.sqrt((e0/2)*e1+1e-12);rs[lag]=r;if(r>best){best=r;bl=lag}}
    if(best<.5)continue;
    // préférer la plus petite période presque aussi bonne (évite les sauts d'octave)
    for(var l2=minLag;l2<bl;l2++){if(rs[l2]>=best*.92&&rs[l2]>=rs[l2-1]&&rs[l2]>=rs[l2+1]){bl=l2;break}}
    out[f]=69+12*Math.log2((AR/bl)/440)}
  // lissage médian 5 + suppression des îlots voisés très courts
  var sm=new Float32Array(n);
  for(var i=0;i<n;i++){var w=[];for(var d=-2;d<=2;d++){var v2=out[i+d];if(v2>0)w.push(v2)}if(w.length>=3&&out[i]>0){w.sort(function(a,b){return a-b});sm[i]=w[w.length>>1]}}
  var i3=0;while(i3<n){if(sm[i3]>0){var j3=i3;while(j3<n&&sm[j3]>0)j3++;if(j3-i3<4)for(var q=i3;q<j3;q++)sm[q]=0;i3=j3}else i3++}
  return sm}
function analyse(x,opts){
  opts=opts||{};
  var env=envelope(x),ar=activeRegion(env,opts.absMin,opts.ref);
  if(ar.a<0||ar.b<=ar.a||ar.p95<(opts.minLevel||.003))return{ok:false,env:env,ar:ar,dur:0};
  var pit=pitchTrack(x,env,ar.thr);
  return{ok:true,env:env,pit:pit,ar:ar,a:ar.a,b:ar.b,dur:(ar.b-ar.a+1)*HOP/AR,p95:ar.p95}}
function sampleEnv(F,M){ // enveloppe normalisée (racine) de la zone active, M points
  var out=new Float32Array(M),len=F.b-F.a;
  for(var i=0;i<M;i++){var p=F.a+len*i/(M-1),i0=Math.floor(p),f=p-i0,v=F.env[i0]*(1-f)+(F.env[Math.min(i0+1,F.b)]||0)*f;out[i]=Math.sqrt(clamp(v/F.p95,0,1.4))}
  return out}
function samplePitch(F,M){ // hauteur relative (demi-tons) ou NaN
  var vs=[];for(var i=F.a;i<=F.b;i++)if(F.pit[i]>0)vs.push(F.pit[i]);
  var out=new Float32Array(M);if(vs.length<8){for(var z=0;z<M;z++)out[z]=NaN;return{p:out,ok:false,n:vs.length}}
  vs.sort(function(a,b){return a-b});var med=vs[vs.length>>1],len=F.b-F.a;
  for(var k=0;k<M;k++){var c=Math.round(F.a+len*k/(M-1)),best=NaN;for(var d=0;d<=2&&isNaN(best);d++){var a1=F.pit[c-d],a2=F.pit[c+d];if(a1>0)best=a1;else if(a2>0)best=a2}out[k]=isNaN(best)?NaN:best-med}
  return{p:out,ok:true,n:vs.length}}
function dtw(a,b,band){
  var n=a.length,m=b.length,INF=1e9,D=[],i,j;
  for(i=0;i<=n;i++){D.push(new Float32Array(m+1).fill(INF))}
  D[0][0]=0;
  for(i=1;i<=n;i++){var j0=Math.max(1,Math.round(i*m/n-band)),j1=Math.min(m,Math.round(i*m/n+band));
    for(j=j0;j<=j1;j++){var c=Math.abs(a[i-1]-b[j-1]);D[i][j]=c+Math.min(D[i-1][j],D[i][j-1],D[i-1][j-1])}}
  var path=[],ii=n,jj=m;
  while(ii>0&&jj>0){path.push([ii-1,jj-1]);var x=D[ii-1][jj-1],y=D[ii-1][jj],z=D[ii][jj-1];if(x<=y&&x<=z){ii--;jj--}else if(y<z)ii--;else jj--}
  path.reverse();return{cost:D[n][m]/path.length,path:path}}
var M=64;
function score(ref,rec){
  var R={score:0,parts:{},msg:''};
  if(!rec||!rec.ok){R.msg='Je n’ai rien entendu. Parle plus fort ou rapproche-toi du micro.';R.silent=true;return R}
  var er=sampleEnv(ref,M),eu=sampleEnv(rec,M);
  var dt=dtw(er,eu,Math.round(M*.22));
  var direct=0;for(var i=0;i<M;i++)direct+=Math.abs(er[i]-eu[i]);direct/=M;
  var simE=clamp(1-(.65*dt.cost+.35*direct)/.42,0,1);
  var ratio=rec.dur/ref.dur,simD=Math.exp(-Math.pow(Math.log(ratio),2)/(2*.38*.38));
  var pr=samplePitch(ref,M),pu=samplePitch(rec,M),simP=null,pn=0;
  if(pr.ok&&pu.ok){var s=0;for(var k=0;k<dt.path.length;k++){var u=pr.p[dt.path[k][0]],v=pu.p[dt.path[k][1]];if(!isNaN(u)&&!isNaN(v)){s+=Math.min(Math.abs(u-v),12);pn++}}
    if(pn>=Math.max(6,M*.12))simP=Math.exp(-(s/pn)/3.4)}
  var wE=.5,wD=.2,wP=simP==null?0:.3,tot=wE+wD+wP;
  var raw=(wE*simE+wD*simD+wP*(simP||0))/tot;
  var sc=Math.round(100*clamp(Math.pow(raw,1.4)*1.04,0,1));
  R.score=sc;R.parts={rythme:Math.round(simE*100),duree:Math.round(simD*100),melodie:simP==null?null:Math.round(simP*100)};
  R.er=er;R.eu=eu;R.pr=pr.p;R.pu=pu.p;R.path=dt.path;R.ratio=ratio;
  return R}
function label(s){return s>=93?'Parfait !':s>=80?'Excellent':s>=65?'Bien joué':s>=45?'Pas mal':s>=25?'Bof…':'Raté'}

/* ============================ AUDIO (lecture + micro) ============================ */
var ctx=null,master=null,vol=35,cur=null,mic=null,st3=null,p3=null,use3d=true;
function volGain(v){return 1.6*Math.pow(v/100,1.6)}
function ensureCtx(){
  if(!ctx){var C=window.AudioContext||window.webkitAudioContext;ctx=new C();master=ctx.createGain();master.gain.value=volGain(vol);var lim=ctx.createDynamicsCompressor();lim.threshold.value=-6;lim.knee.value=3;lim.ratio.value=20;lim.attack.value=.003;lim.release.value=.15;master.connect(lim);lim.connect(ctx.destination)}
  if(ctx.state==='suspended')ctx.resume();return ctx}
function setVol(v){vol=clamp(+v||0,0,100);lsSet('im_vol',String(vol));if(master)master.gain.value=volGain(vol)}
function stopPlay(){if(cur){try{cur.onended=null;cur.stop()}catch(e){}cur=null}if(st3)st3.playing(false)}
function playBuf(buf,onEnd){
  ensureCtx();stopPlay();var s=ctx.createBufferSource();s.buffer=buf;s.connect(master);
  s.onended=function(){if(cur===s)cur=null;if(st3)st3.playing(false);if(onEnd)onEnd()};cur=s;if(st3)st3.playing(true);s.start();return s}
var cache={};
function loadSound(sn){
  if(cache[sn.id])return cache[sn.id];
  return cache[sn.id]=fetch(BASE.replace(/\/?$/,'/')+sn.src.replace(/^imite\//,'')).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer()})
    .then(function(ab){ensureCtx();return new Promise(function(ok,ko){ctx.decodeAudioData(ab,ok,ko)})})
    .then(function(buf){var x=toMono16k(buf.getChannelData(0),buf.sampleRate);var F=analyse(x,{absMin:.0008,minLevel:.0008,ref:true});return{buf:buf,x:x,F:F,dur:buf.duration}})
    .catch(function(e){delete cache[sn.id];throw e})}
function micStart(){
  if(mic&&mic.stream&&mic.stream.getAudioTracks().some(function(t){return t.readyState==='live'}))return Promise.resolve(mic);
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return Promise.reject(new Error('nomic'));
  return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){
    ensureCtx();var src=ctx.createMediaStreamSource(st),sp=ctx.createScriptProcessor(2048,1,1),mute=ctx.createGain();mute.gain.value=0;
    mic={stream:st,src:src,sp:sp,mute:mute,rec:null};
    sp.onaudioprocess=function(e){if(mic.rec){var d=e.inputBuffer.getChannelData(0);mic.rec.chunks.push(new Float32Array(d))}};
    src.connect(sp);sp.connect(mute);mute.connect(ctx.destination);return mic})}
function micStop(){if(mic){try{mic.stream.getTracks().forEach(function(t){t.stop()})}catch(e){}try{mic.src.disconnect();mic.sp.disconnect()}catch(e){}mic=null}}
function recStart(){mic.rec={chunks:[],t0:ctx.currentTime,sr:ctx.sampleRate}}
function recEnd(){
  var r=mic.rec;mic.rec=null;var n=0,i;for(i=0;i<r.chunks.length;i++)n+=r.chunks[i].length;
  var all=new Float32Array(n),o=0;for(i=0;i<r.chunks.length;i++){all.set(r.chunks[i],o);o+=r.chunks[i].length}
  var buf=ctx.createBuffer(1,Math.max(1,n),r.sr);buf.copyToChannel(all.length?all:new Float32Array(1),0);return{pcm:all,sr:r.sr,buf:buf}}

/* ============================ DONNÉES ============================ */
var DB=null;
function loadDB(){
  if(DB)return Promise.resolve(DB);
  return fetch(BASE+'sons.json?v='+(window.IM_VER||1)).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json()}).then(function(j){DB=j;return j})}
var FLAGS=[];try{FLAGS=JSON.parse(lsGet('im_flags')||'[]')}catch(e){FLAGS=[]}
function saveFlags(){lsSet('im_flags',JSON.stringify(FLAGS))}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}

/* ============================ STYLE ============================ */
function injectCss(){
  if($('imCss'))return;var s=document.createElement('style');s.id='imCss';
  s.textContent=[
  '.im{display:flex;flex-direction:column;gap:12px}',
  '.im .sub{color:var(--mut);margin:0;text-align:center;font-size:.92rem}',
  '.im-modes{display:grid;gap:10px}',
  '.im-mode{display:flex;flex-direction:column;gap:3px;text-align:left;background:var(--card);color:var(--tx);border:2px solid var(--bd);border-radius:16px;padding:14px 16px;font:inherit;cursor:pointer}',
  '.im-mode b{font-size:1.05rem}.im-mode small{color:var(--mut);font-size:.84rem;line-height:1.3}',
  '.im-mode:hover{border-color:var(--ac)}.im-mode:focus-visible{outline:3px solid var(--ac);outline-offset:2px}',
  '.im-vol{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:8px 12px}',
  '.im-vol span{font-size:1.1rem}.im-vol input{flex:1;min-width:0;accent-color:var(--ac)}.im-vol output{min-width:2.6em;text-align:right;font-weight:800;font-size:.85rem;color:var(--mut)}',
  '.im-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
  '.im-pill{background:var(--card);border:1px solid var(--bd);border-radius:999px;padding:4px 12px;font-weight:800;font-size:.85rem}',
  '.im-hearts{letter-spacing:2px;font-size:1.1rem}',
  '.im-wv{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:8px;position:relative}',
  '.im-wv canvas{display:block;width:100%;height:120px}',
  '.im-wv .lg{display:flex;gap:14px;font-size:.74rem;color:var(--mut);font-weight:700;padding:2px 6px 0}',
  '.im-wv .lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}',
  '.im-state{text-align:center;font-weight:800;font-size:1.15rem;min-height:1.6em}',
  '.im-cd{text-align:center;font-weight:900;font-size:4rem;line-height:1;min-height:4rem;color:var(--ac)}',
  '.im-row{display:flex;gap:10px;flex-wrap:wrap}.im-row .btn{flex:1 1 140px}',
  '.im-big{font-size:1.1rem;padding:14px 18px}',
  '.im-score{text-align:center}.im-score .n{font-size:4.4rem;font-weight:900;line-height:1;color:var(--ac)}.im-score .l{font-size:1.2rem;font-weight:800;margin-top:2px}',
  '.im-parts{display:grid;gap:7px}.im-part{display:grid;grid-template-columns:78px 1fr 36px;align-items:center;gap:8px;font-size:.85rem;font-weight:700}',
  '.im-part i{display:block;height:9px;border-radius:5px;background:var(--in);overflow:hidden}.im-part i b{display:block;height:100%;background:var(--ac);border-radius:5px}',
  '.im-pl{display:flex;gap:8px}.im-pl input{flex:1;min-width:0;padding:10px;border-radius:10px;border:2px solid var(--bd);background:var(--card);color:var(--tx);font:inherit}',
  '.im-rank{display:grid;gap:6px}.im-rk{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:center;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;font-weight:800}',
  '.im-rk.first{border-color:var(--ac);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac) 22%,transparent)}.im-rk small{color:var(--mut);font-weight:700}',
  '.im-title{text-align:center;font-size:1.05rem;font-weight:800}',
  '.im-err{color:#c0392b;font-weight:700;text-align:center}',
  '.im .chips{margin:0}',
  '.im-flag{background:none;border:0;color:var(--mut);font:inherit;font-size:.8rem;cursor:pointer;text-decoration:underline;padding:4px}',
  '.im-stage{position:relative;height:clamp(220px,40vh,400px);border-radius:16px;overflow:hidden;background:#0e0716;touch-action:pan-y}',
  '.im3d-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}',
  '.im3d-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
  '.im3d-tags .tag{position:absolute;z-index:4;transform:translate(-50%,-100%);pointer-events:none;background:rgba(255,255,255,.95);color:#1b2130;border-radius:99px;padding:3px 10px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 6px 14px -6px rgba(0,0,0,.6);transition:opacity .2s}',
  '.im3d-tags .tag b{color:#1f9d63}',
  '.im-vbar{display:flex;align-items:center;gap:8px}.im-vbar .im-vol{flex:1;min-width:0}',
  '.im-vb{background:var(--card);color:var(--tx);border:1px solid var(--bd);border-radius:10px;font:inherit;font-weight:800;min-width:34px;height:34px;cursor:pointer}',
  '.im-av{display:flex;gap:6px;flex-wrap:wrap}.im-av button{background:var(--card);color:var(--tx);border:2px solid var(--bd);border-radius:999px;padding:5px 12px;font:inherit;font-weight:800;font-size:.85rem;cursor:pointer}.im-av button[aria-pressed=true]{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,var(--card))}',
  '.im-root.full .im-stage{position:fixed;left:0;right:0;top:0;bottom:var(--imH,45vh);height:auto;border-radius:0;z-index:190}',
  '.im-root.full #imUi{position:fixed;left:0;right:0;bottom:0;z-index:192;max-height:54vh;overflow:auto;background:var(--bg);border-radius:20px 20px 0 0;box-shadow:0 -14px 40px -12px rgba(0,0,0,.65);padding:14px max(16px,env(safe-area-inset-left,0px)) calc(14px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-right,0px))}',
  '.im-root.full #imUi>.im{max-width:640px;margin:0 auto}',
  '.im-root.full .im-vbar{position:fixed;top:0;left:0;right:0;z-index:193;padding:calc(8px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 8px max(12px,env(safe-area-inset-left,0px));background:linear-gradient(rgba(10,5,18,.7),transparent)}',
  '.im-root.full .im-vbar .im-vol{max-width:520px;margin-left:auto}',
  '.im-root.full #imV3{display:none}',
  '.im-root.full .im-wv canvas{height:84px}.im-root.full .im-cd{font-size:3rem;min-height:3rem}',
  '#imX{display:none;width:auto;padding:0 12px}.im-root.full #imX{display:inline-block}',
  '@media(prefers-reduced-motion:reduce){.im *{animation:none!important;transition:none!important}}'
  ].join('\n');document.head.appendChild(s)}

/* ============================ 3D (chargée à la demande) ============================ */
function loadScript(src){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){ko(new Error(src))};document.head.appendChild(s)})}
function load3d(){
  if(p3)return p3;
  p3=(window.THREE?Promise.resolve():loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'))
    .then(function(){return window.IM3D?0:loadScript('imite3d.js?v='+(window.IM_VER||1))})
    .then(function(){try{return window.IM3D.init(window.THREE)}catch(e){return null}})
    .catch(function(){return null});
  return p3}
function mountStage(){
  var el=$('imStage');if(!el||!st3)return;st3.mount(el)}
function cast3d(){
  if(!st3)return;
  var G=S.G;
  if(G&&G.mode==='turn')st3.cast(G.pl.map(function(p,i){return{name:p.name,key:st3.keys[i%st3.keys.length]}}));
  else st3.cast([{name:'',key:S.char||'lea'}])}
var last3=null;
function m3(m,o){last3={m:m,o:o};if(st3)try{st3.mode(m,o)}catch(e){}}
function kindOf(sc,res,G){
  if(res.silent)return'silent';
  if(G.mode==='surv'){var pass=sc>=target({n:G.n-1});return pass?(sc>=target({n:G.n-1})+18?'great':'ok'):'bad'}
  return sc>=80?'great':sc>=45?'ok':sc>=20?'silent':'bad'}

var uiRO=null;
function setFull(b){
  var r=$('imRoot');if(!r)return;b=!!b&&!!st3&&use3d;r.classList.toggle('full',b);
  try{document.documentElement.style.overflow=b?'hidden':''}catch(e){}
  if(uiRO){uiRO.disconnect();uiRO=null}
  if(b){var ui=$('imUi');var f=function(){r.style.setProperty('--imH',ui.offsetHeight+'px')};f();if(window.ResizeObserver){uiRO=new ResizeObserver(f);uiRO.observe(ui)}}
  else r.style.removeProperty('--imH')}

/* ============================ ÉTAT & NAVIGATION ============================ */
var S={packs:null,niv:0,mode:null,G:null,players:['Joueur 1','Joueur 2'],rounds:5,char:'lea'};
var body=null,tok=0,anim=0;
function B(){return body=$('imUi')||body}
function setHtml(h){tok++;cancelAnimationFrame(anim);stopPlay();B().innerHTML='<div class="im">'+h+'</div>'}
function volHtml(){return '<div class="im-vol"><button class="im-vb" id="imVm" aria-label="Moins fort" type="button">🔉</button><input type="range" id="imVol" min="0" max="100" step="1" value="'+vol+'" aria-label="Volume du jeu"><output id="imVolO">'+vol+'%</output><button class="im-vb" id="imVp" aria-label="Plus fort" type="button">🔊</button></div>'}
function bindVol(){var v=$('imVol');if(!v)return;var upd=function(){v.value=vol;$('imVolO').textContent=Math.round(vol)+'%'};
  v.oninput=function(){setVol(v.value);upd()};$('imVm').onclick=function(){setVol(vol-10);upd()};$('imVp').onclick=function(){setVol(vol+10);upd()}}
function pool(){
  var packs=S.packs||Object.keys(DB.packs),niv=S.niv;
  return DB.sons.filter(function(s){return packs.indexOf(s.pack)>=0&&(!niv||s.niveau===niv)&&FLAGS.indexOf(s.id)<0})}

/* ---------- Menu ---------- */
function menu(){
  S.G=null;stopPlay();micStop();setFull(false);
  var best=+lsGet('im_best_survie')||0,np=pool().length;
  var packs=Object.keys(DB.packs),on=S.packs||packs;
  var chips='<div class="chips" id="imPk">'+packs.map(function(k){return '<button type="button" data-pk="'+k+'" aria-pressed="'+(on.indexOf(k)>=0)+'">'+esc(DB.packs[k])+'</button>'}).join('')+'</div>';
  var nv='<div class="chips" id="imNv">'+[['Tous',0],['Facile',1],['Moyen',2],['Difficile',3]].map(function(a){return '<button type="button" data-nv="'+a[1]+'" aria-pressed="'+(S.niv===a[1])+'">'+a[0]+'</button>'}).join('')+'</div>';
  setHtml('<p class="sub">Écoute un son, imite-le avec ta voix : le jeu te note sur 100.</p>'+
    '<div class="im-modes">'+
    '<button class="im-mode" data-m="train"><b>🎯 Entraînement</b><small>Sans pression : réessaie autant que tu veux.</small></button>'+
    '<button class="im-mode" data-m="surv"><b>❤️ Survie</b><small>3 vies. Il faut atteindre le score demandé, qui monte à chaque manche.'+(best?' Ton record : '+best+' manche'+(best>1?'s':'')+'.':'')+'</small></button>'+
    '<button class="im-mode" data-m="turn"><b>👥 À tour de rôle</b><small>2 à 8 joueurs sur le même écran, on se passe l’appareil. Le meilleur total gagne.</small></button></div>'+
    '<div class="pn"><h2>Ton personnage <small style="color:var(--mut);font-weight:600">(modes solo)</small></h2><div class="im-av" id="imAv">'+(st3?st3.keys:['lea','kenji','sora','mizuki','ryo','ren']).map(function(k){return '<button type="button" data-ch="'+k+'" aria-pressed="'+(S.char===k)+'">'+({lea:'Léa',kenji:'Kenji',sora:'Sora',mizuki:'Mizuki',ryo:'Ryo',ren:'Ren'})[k]+'</button>'}).join('')+'</div></div>'+
    '<div class="pn"><div class="ph"><h2>Sons</h2><span class="im-pill" id="imCnt">'+np+' sons</span></div>'+chips+'<div class="hint" style="padding:0">Difficulté (longueur du son)</div>'+nv+'</div>'+
    (FLAGS.length?'<div style="text-align:center"><button class="im-flag" id="imFl">'+FLAGS.length+' son'+(FLAGS.length>1?'s':'')+' signalé'+(FLAGS.length>1?'s':'')+' (masqué'+(FLAGS.length>1?'s':'')+') — copier la liste · vider</button></div>':'')+
    '<div class="hint" style="text-align:center">Le micro n’est utilisé que pendant l’enregistrement, et rien n’est envoyé : ta voix reste sur ton appareil.</div>');
  var root=B();
  $('imAv').onclick=function(e){var b=e.target.closest('[data-ch]');if(!b)return;S.char=b.dataset.ch;$('imAv').querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))})};
  m3('menu');
  root.querySelectorAll('[data-m]').forEach(function(b){b.onclick=function(){start(b.dataset.m)}});
  $('imPk').onclick=function(e){var b=e.target.closest('[data-pk]');if(!b)return;var cur2=S.packs||Object.keys(DB.packs).slice(),k=b.dataset.pk,i=cur2.indexOf(k);
    if(i>=0){if(cur2.length>1)cur2.splice(i,1)}else cur2.push(k);S.packs=cur2;menu()};
  $('imNv').onclick=function(e){var b=e.target.closest('[data-nv]');if(!b)return;S.niv=+b.dataset.nv;menu()};
  var fl=$('imFl');if(fl)fl.onclick=function(){var t=FLAGS.join(', ');try{navigator.clipboard.writeText(t)}catch(e){}FLAGS=[];saveFlags();menu()}}

function start(mode){
  if(pool().length<3){alert('Pas assez de sons avec ces filtres.');return}
  S.mode=mode;
  if(mode==='turn')return setup();
  newGame(mode)}

/* ---------- Réglages tour à tour ---------- */
function setup(){
  var P=S.players;
  setHtml('<div class="im-title">À tour de rôle</div>'+
    '<div class="pn"><h2>Joueurs</h2><div id="imPl" style="display:grid;gap:8px">'+P.map(function(n,i){return '<div class="im-pl"><input data-i="'+i+'" value="'+esc(n)+'" maxlength="14" aria-label="Nom du joueur '+(i+1)+'">'+(P.length>2?'<button class="btn alt sm" data-rm="'+i+'" aria-label="Retirer">✕</button>':'')+'</div>'}).join('')+'</div>'+
    (P.length<8?'<button class="btn alt sm" id="imAdd">+ Ajouter un joueur</button>':'')+'</div>'+
    '<div class="pn"><h2>Manches</h2><div class="chips" id="imRd">'+[3,5,8,10].map(function(n){return '<button type="button" data-r="'+n+'" aria-pressed="'+(S.rounds===n)+'">'+n+'</button>'}).join('')+'</div></div>'+
    '<div class="im-row"><button class="btn alt" id="imBk">← Retour</button><button class="btn" id="imGo">C’est parti</button></div>');
  var inputs=function(){B().querySelectorAll('#imPl input').forEach(function(i){P[+i.dataset.i]=i.value})};
  $('imAdd')&&($('imAdd').onclick=function(){inputs();P.push('Joueur '+(P.length+1));setup()});
  B().querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){inputs();P.splice(+b.dataset.rm,1);setup()}});
  $('imRd').onclick=function(e){var b=e.target.closest('[data-r]');if(!b)return;inputs();S.rounds=+b.dataset.r;setup()};
  $('imBk').onclick=menu;
  $('imGo').onclick=function(){inputs();S.players=P.map(function(n,i){return(String(n).trim()||'Joueur '+(i+1)).slice(0,14)});newGame('turn')}}

/* ---------- Partie ---------- */
function newGame(mode){
  setFull(true);
  var G={mode:mode,queue:shuffle(pool()),n:0,lives:3,passed:0,sum:0,cnt:0,pi:0,scores:[],tries:0};
  if(mode==='turn')G.pl=S.players.map(function(n){return{name:n,total:0,last:0}});
  S.G=G;cast3d();nextRound()}
function nextSound(G){if(!G.queue.length)G.queue=shuffle(pool());return G.queue.shift()}
function target(G){return Math.min(70,45+3*G.n)}
function nextRound(){
  var G=S.G;G.sn=nextSound(G);G.pi=0;G.rs=[];G.tries=0;G.listens=0;G.n++;
  // survie : n compte les manches jouées ; objectif calculé sur la manche en cours
  listen()}
function head(){
  var G=S.G,h='<div class="im-top">';
  if(G.mode==='train')h+='<span class="im-pill">Entraînement</span><span class="im-pill">Essai '+(G.tries+1)+'</span>';
  if(G.mode==='surv')h+='<span class="im-pill">Manche '+G.n+'</span><span class="im-hearts" aria-label="'+G.lives+' vies">'+'❤️'.repeat(G.lives)+'🖤'.repeat(3-G.lives)+'</span><span class="im-pill">Objectif '+target({n:G.n-1})+'</span>';
  if(G.mode==='turn')h+='<span class="im-pill">Manche '+G.n+'/'+S.rounds+'</span><span class="im-pill">Au tour de '+esc(G.pl[G.pi].name)+'</span>';
  return h+'</div>'}
function colors(){var cs=getComputedStyle(document.documentElement),g=function(k,d){return(cs.getPropertyValue(k)||'').trim()||d};return{ac:g('--ac','#2f6fd8'),mut:g('--mut','#667085'),tx:g('--tx','#1b2130'),p2:g('--p2','#e11d48')}}
function wvHtml(extra){return '<div class="im-wv"><canvas id="imCv" aria-label="Forme d’onde du son"></canvas><div class="lg"><span><i style="background:var(--mut);opacity:.55"></i>Le son</span>'+(extra||'')+'</div></div>'}
function fitCanvas(c){var r=window.devicePixelRatio||1,w=c.clientWidth||300,h=c.clientHeight||120;if(c.width!==Math.round(w*r)||c.height!==Math.round(h*r)){c.width=Math.round(w*r);c.height=Math.round(h*r)}return{w:c.width,h:c.height,r:r}}
function refBars(sound,N){ // barres du son de référence (durée complète)
  var env=sound.F.env,out=new Float32Array(N),p=sound.F.p95||pct(env,.95)||1;
  for(var i=0;i<N;i++){var a=Math.floor(i*env.length/N),b=Math.max(a+1,Math.floor((i+1)*env.length/N)),m=0;for(var j=a;j<b&&j<env.length;j++)if(env[j]>m)m=env[j];out[i]=Math.sqrt(clamp(m/p,0,1.2))}
  return out}
function drawBars(c,bars,total,col,mark,live){ // live: tableau de [t,rms] pour la voix
  var d=fitCanvas(c),g=c.getContext('2d'),N=bars.length,bw=d.w/N,mid=d.h/2;g.clearRect(0,0,d.w,d.h);
  var C=colors();
  g.fillStyle=C.mut;g.globalAlpha=.5;
  for(var i=0;i<N;i++){var h=Math.max(2*d.r,bars[i]*mid*.92);g.fillRect(i*bw+bw*.18,mid-h,bw*.64,h*2)}
  g.globalAlpha=1;
  if(live){g.fillStyle=C.ac;var bt=total/N;
    var acc=new Float32Array(N);live.forEach(function(p){var k=Math.min(N-1,Math.floor(p[0]/bt));if(p[1]>acc[k])acc[k]=p[1]});
    var pk=live.reduce(function(m,p){return Math.max(m,p[1])},.02);
    for(var k2=0;k2<N;k2++){if(acc[k2]>0){var h2=Math.max(2*d.r,Math.sqrt(clamp(acc[k2]/Math.max(pk,.06),0,1))*mid*.92);g.fillRect(k2*bw+bw*.18,mid-h2,bw*.64,h2*2)}}}
  if(mark!=null){g.fillStyle=C.tx;g.globalAlpha=.7;g.fillRect(clamp(mark,0,1)*d.w-d.r,0,2*d.r,d.h);g.globalAlpha=1}}

/* ---------- Écoute ---------- */
function listen(){
  var G=S.G,my=tok+1;
  m3('listen',{perf:G.mode==='turn'?G.pi:0,walk:G.mode==='turn'});
  setHtml(head()+'<div class="im-state" id="imSt">Chargement du son…</div>'+wvHtml());
  loadSound(G.sn).then(function(snd){
    if(my!==tok)return;G.snd=snd;
    var c=$('imCv'),bars=refBars(snd,64);G.bars=bars;drawBars(c,bars,snd.dur,null,null,null);
    var play=function(){
      if(my!==tok)return;G.listens++;$('imSt').textContent='🔊 Écoute bien…';$('imPlay')&&($('imPlay').disabled=true);
      var t0=performance.now();var loop=function(){if(my!==tok)return;var u=(performance.now()-t0)/1000/snd.dur;drawBars(c,bars,snd.dur,null,u<1?u:null,null);if(u<1)anim=requestAnimationFrame(loop)};anim=requestAnimationFrame(loop);
      playBuf(snd.buf,function(){if(my!==tok)return;$('imSt').textContent='À toi : imite-le !';drawBars(c,bars,snd.dur,null,null,null);var b=$('imPlay');if(b)b.disabled=false})};
    var rowHtml='<div class="im-row"><button class="btn alt" id="imPlay">▶ Réécouter</button><button class="btn im-big" id="imRec">🎤 Je l’imite</button></div>';
    var d=document.createElement('div');d.innerHTML=rowHtml;B().firstChild.appendChild(d.firstChild);
    if(G.mode==='train'||G.mode==='surv'){var q=document.createElement('div');q.style.textAlign='center';q.innerHTML='<button class="im-flag" id="imBack">← Quitter la partie</button>';B().firstChild.appendChild(q);$('imBack').onclick=function(){stopPlay();menu()}}
    else{var q2=document.createElement('div');q2.style.textAlign='center';q2.innerHTML='<button class="im-flag" id="imBack">← Quitter la partie</button>';B().firstChild.appendChild(q2);$('imBack').onclick=function(){stopPlay();menu()}}
    $('imPlay').onclick=play;$('imRec').onclick=function(){stopPlay();record()};
    setTimeout(play,350)
  }).catch(function(){if(my!==tok)return;setHtml('<p class="im-err">Impossible de charger ce son.</p><div class="im-row"><button class="btn" id="imSk">Passer au suivant</button><button class="btn alt" id="imBk">Menu</button></div>');$('imSk').onclick=function(){G.n--;nextRound()};$('imBk').onclick=menu})}

/* ---------- Enregistrement ---------- */
function micError(e){
  var msg=(e&&e.name==='NotAllowedError')?'Le micro est refusé. Autorise-le dans ton navigateur (icône à gauche de l’adresse), puis réessaie.':
    (e&&e.message==='nomic')?'Ce navigateur ne permet pas d’utiliser le micro ici (il faut une page en https).':'Impossible d’accéder au micro : '+esc(e&&e.message||e);
  setHtml('<p class="im-err">'+msg+'</p><div class="im-row"><button class="btn" id="imRt">Réessayer</button><button class="btn alt" id="imBk">Menu</button></div>');
  $('imRt').onclick=record;$('imBk').onclick=menu}
function record(){
  var G=S.G,snd=G.snd,my=tok+1;
  setHtml(head()+'<div class="im-state" id="imSt">Autorise le micro si le navigateur le demande…</div><div class="im-cd" id="imCd" aria-live="assertive"></div>'+wvHtml('<span><i style="background:var(--ac)"></i>Toi</span>'));
  var c=$('imCv');drawBars(c,G.bars,snd.dur+1.8,null,null,null);
  m3('countdown',{perf:G.mode==='turn'?G.pi:0});
  micStart().then(function(){
    if(my!==tok)return;
    var n=3;$('imSt').textContent='Prépare-toi…';
    var tick=function(){if(my!==tok)return;if(n>0){$('imCd').textContent=n;n--;setTimeout(tick,650)}else{$('imCd').textContent='🎤';go()}};tick();
  }).catch(function(e){if(my!==tok)return;micError(e)});
  function go(){
    var total=snd.dur+1.8,t0=performance.now(),live=[],an=ctx.createAnalyser();an.fftSize=1024;mic.src.connect(an);var buf=new Float32Array(an.fftSize);
    recStart();m3('record',{perf:G.mode==='turn'?G.pi:0,from:true});$('imSt').textContent='🎙️ Vas-y !';
    var spoke=false,lastLoud=0,finished=false;
    var bars=refBars(snd,64);
    var finish=function(){if(finished)return;finished=true;if(st3)st3.mic(0);try{mic.src.disconnect(an)}catch(e){}
      var r=recEnd();if(my!==tok)return;G.rec=r;analyseRec(r)};
    var loop=function(){
      if(my!==tok){return}
      var t=(performance.now()-t0)/1000;an.getFloatTimeDomainData(buf);var s=0;for(var i=0;i<buf.length;i++)s+=buf[i]*buf[i];var rms=Math.sqrt(s/buf.length);
      live.push([t,rms]);if(st3)st3.mic(Math.min(1,rms*7));
      if(rms>.02){spoke=true;lastLoud=t}
      drawBars(c,bars,total,null,t/total,live);
      if(t>=total||(spoke&&t>snd.dur*.7&&t-lastLoud>.9)){finish();return}
      anim=requestAnimationFrame(loop)};
    anim=requestAnimationFrame(loop);
    var q=document.createElement('div');q.className='im-row';q.innerHTML='<button class="btn" id="imDone">✔ J’ai fini</button>';B().firstChild.appendChild(q);$('imDone').onclick=finish}}

function analyseRec(r){
  var G=S.G,x=toMono16k(r.pcm,r.sr),F=analyse(x,{minLevel:.004,absMin:.003});
  var res=score(G.snd.F,F);res.F=F;G.res=res;result()}

/* ---------- Résultat ---------- */
function curvesCanvas(c,res){
  var d=fitCanvas(c),g=c.getContext('2d'),C=colors(),w=d.w,h=d.h,M2=res.er.length,r=d.r;g.clearRect(0,0,w,h);
  var line=function(arr,col,fill){g.beginPath();for(var i=0;i<M2;i++){var x=i*w/(M2-1),y=h-4*r-arr[i]*(h-12*r)*.85;i?g.lineTo(x,y):g.moveTo(x,y)}
    if(fill){g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.globalAlpha=.25;g.fillStyle=col;g.fill();g.globalAlpha=1}
    g.lineWidth=2.2*r;g.strokeStyle=col;g.stroke()};
  line(res.er,C.mut,true);line(res.eu,C.ac,true)}
function result(){
  var G=S.G,res=G.res,sc=res.score,my=tok+1,mode=G.mode;
  var pass=mode==='surv'?sc>=target({n:G.n-1}):true;
  var partsH='';if(!res.silent){var P=res.parts,row=function(n,v){return v==null?'':'<div class="im-part"><span>'+n+'</span><i><b style="width:'+v+'%"></b></i><span>'+v+'</span></div>'};partsH='<div class="im-parts">'+row('Rythme',P.rythme)+row('Durée',P.duree)+row('Mélodie',P.melodie)+'</div>'}
  if(mode==='turn'){G.rs.push({i:G.pi,s:sc});G.pl[G.pi].total+=sc;G.pl[G.pi].last=sc}
  G.sum+=sc;G.cnt++;
  m3('result',{perf:mode==='turn'?G.pi:0,kind:kindOf(sc,res,G)});
  var nx='';
  if(mode==='train')nx='<button class="btn alt" id="imAgain">↺ Réessayer</button><button class="btn" id="imNext">Son suivant ▸</button>';
  if(mode==='surv'){if(!pass){G.lives--;nx=G.lives>0?'<button class="btn" id="imNext">Continuer ▸</button>':'<button class="btn" id="imNext">Voir le résultat</button>'}else{G.passed++;nx='<button class="btn" id="imNext">Manche suivante ▸</button>'}}
  if(mode==='turn'){var last=G.pi===G.pl.length-1;nx='<button class="btn" id="imNext">'+(last?'Résultats de la manche ▸':'Joueur suivant : '+esc(G.pl[G.pi+1].name)+' ▸')+'</button>'}
  var msg=res.silent?res.msg:(mode==='surv'?(pass?'Objectif atteint ✔':'Objectif manqué : −1 vie'):'');
  setHtml(head()+'<div class="im-score"><div class="n" id="imN">0</div><div class="l">'+esc(res.silent?'Silence':label(sc))+'</div></div>'+(msg?'<div class="im-state" style="font-size:1rem">'+esc(msg)+'</div>':'')+
    '<div class="im-title">C’était : « '+esc(G.sn.titre)+' »</div>'+
    (res.silent?'':'<div class="im-wv"><canvas id="imCv" aria-label="Comparaison du son et de ta voix"></canvas><div class="lg"><span><i style="background:var(--mut);opacity:.55"></i>Le son</span><span><i style="background:var(--ac)"></i>Toi</span></div></div>'+partsH)+
    '<div class="im-row"><button class="btn alt" id="imO">▶ L’original</button>'+(G.rec?'<button class="btn alt" id="imM">▶ Ma voix</button>':'')+'</div>'+
    '<div class="im-row">'+nx+'</div>'+
    '<div style="text-align:center"><button class="im-flag" id="imFg">🚩 Ce son est mauvais (le masquer)</button> <button class="im-flag" id="imQ">Quitter</button></div>');
  var c=$('imCv');if(c)curvesCanvas(c,res);
  var t0=performance.now(),dur=700;var up=function(){var u=clamp((performance.now()-t0)/dur,0,1);$('imN')&&($('imN').textContent=Math.round(sc*(1-Math.pow(1-u,3))));if(u<1&&my===tok)anim=requestAnimationFrame(up);else $('imN')&&($('imN').textContent=sc)};up();
  $('imO').onclick=function(){playBuf(G.snd.buf)};if($('imM'))$('imM').onclick=function(){playBuf(G.rec.buf)};
  $('imQ').onclick=function(){stopPlay();menu()};
  $('imFg').onclick=function(){if(FLAGS.indexOf(G.sn.id)<0){FLAGS.push(G.sn.id);saveFlags()}$('imFg').textContent='Masqué ✔';$('imFg').disabled=true};
  var ag=$('imAgain');if(ag)ag.onclick=function(){G.tries++;listen()};
  $('imNext').onclick=function(){stopPlay();
    if(mode==='train'){G.sn=nextSound(G);G.tries=0;G.listens=0;listen()}
    else if(mode==='surv'){if(G.lives<=0)return survOver();nextRound()}
    else{if(G.pi<G.pl.length-1){G.pi++;listen()}else roundEnd()}}}

/* ---------- Fin de manche / de partie ---------- */
function rankHtml(list,key){
  var o=list.map(function(p,i){return{p:p,i:i}}).sort(function(a,b){return b.p[key]-a.p[key]});
  return '<div class="im-rank">'+o.map(function(x,r){return '<div class="im-rk'+(r===0?' first':'')+'"><span>'+(r===0?'🥇':r===1?'🥈':r===2?'🥉':(r+1))+'</span><span>'+esc(x.p.name)+'</span><span>'+x.p[key]+(key==='total'?' <small>pts</small>':'')+'</span></div>'}).join('')+'</div>'}
function roundEnd(){
  var G=S.G,fin=G.n>=S.rounds;m3('menu');
  setHtml('<div class="im-top"><span class="im-pill">Manche '+G.n+'/'+S.rounds+'</span></div><div class="im-title">C’était : « '+esc(G.sn.titre)+' »</div>'+
    '<div class="pn"><h2>Cette manche</h2>'+rankHtml(G.pl.map(function(p){return{name:p.name,last:p.last}}),'last')+'</div>'+
    '<div class="pn"><h2>Total</h2>'+rankHtml(G.pl,'total')+'</div>'+
    '<div class="im-row"><button class="btn" id="imNext">'+(fin?'Voir le podium ▸':'Manche suivante ▸')+'</button></div>');
  $('imNext').onclick=function(){fin?podium():nextRound()}}
function podium(){
  var G=S.G,o=G.pl.slice().sort(function(a,b){return b.total-a.total}),w=o[0],tie=o.length>1&&o[1].total===w.total;
  m3('podium',{list:o.map(function(p){return{i:G.pl.indexOf(p),name:p.name,score:p.total}})});
  setHtml('<div class="im-score"><div class="n" style="font-size:3rem">🏆</div><div class="l">'+(tie?'Égalité !':esc(w.name)+' gagne !')+'</div></div>'+
    '<div class="pn"><h2>Classement final</h2>'+rankHtml(G.pl,'total')+'</div>'+
    '<div class="im-row"><button class="btn" id="imAg">Rejouer</button><button class="btn alt" id="imMn">Menu</button></div>');
  $('imAg').onclick=function(){newGame('turn')};$('imMn').onclick=menu}
function survOver(){
  var G=S.G,best=+lsGet('im_best_survie')||0,rec=G.passed>best;if(rec)lsSet('im_best_survie',String(G.passed));
  m3('result',{perf:0,kind:G.passed>=5?'great':G.passed>=2?'ok':'silent'});
  setHtml('<div class="im-score"><div class="n">'+G.passed+'</div><div class="l">manche'+(G.passed>1?'s':'')+' réussie'+(G.passed>1?'s':'')+'</div></div>'+
    (rec&&G.passed>0?'<div class="im-state">🎉 Nouveau record !</div>':'<div class="im-state" style="font-size:1rem">Record : '+Math.max(best,G.passed)+'</div>')+
    '<div class="im-state" style="font-size:1rem">Moyenne : '+(G.cnt?Math.round(G.sum/G.cnt):0)+' / 100</div>'+
    '<div class="im-row"><button class="btn" id="imAg">Rejouer</button><button class="btn alt" id="imMn">Menu</button></div>');
  $('imAg').onclick=function(){newGame('surv')};$('imMn').onclick=menu}

/* ============================ API ============================ */
window.IM={
  enter:function(){
    injectCss();var v=lsGet('im_vol');vol=v==null?35:clamp(+v||0,0,100);use3d=lsGet('im_3d')!=='0';
    var b=$('imBody');if(!b)return;body=null;
    b.innerHTML='<div class="im im-root" id="imRoot"><div class="im-stage" id="imStage"'+(use3d?'':' hidden')+'></div><div class="im-vbar"><button class="im-vb" id="imX" type="button" aria-label="Quitter la partie">✕</button>'+volHtml()+'<button class="im-vb" id="imV3" type="button" aria-pressed="'+use3d+'" title="Afficher ou masquer le décor 3D" style="width:auto;padding:0 10px">🎭 3D</button></div><div id="imUi"><div class="im"><div class="im-state">Chargement…</div></div></div></div>';
    bindVol();$('imX').onclick=function(){stopPlay();micStop();menu()};
    var up3=function(){if(!use3d||!st3)return;cast3d();mountStage();if(last3)st3.mode(last3.m,last3.o)};
    $('imV3').onclick=function(){use3d=!use3d;lsSet('im_3d',use3d?'1':'0');this.setAttribute('aria-pressed',String(use3d));$('imStage').hidden=!use3d;
      if(!use3d){if(st3)st3.unmount()}else if(st3)up3();else load3d().then(function(a){st3=a;if(!a){$('imStage').hidden=true;return}up3()})};
    if(use3d){if(st3)up3();else load3d().then(function(a){st3=a;if(!a){var e=$('imStage');if(e)e.hidden=true;return}up3()})}
    loadDB().then(function(){menu()}).catch(function(){var u=$('imUi');if(u)u.innerHTML='<div class="im"><p class="im-err">Impossible de charger la liste des sons (imite/sons.json).</p></div>'})},
  leave:function(){tok++;cancelAnimationFrame(anim);stopPlay();micStop();S.G=null;setFull(false);if(st3)st3.unmount()},
  _t:{analyse:analyse,score:score,toMono16k:toMono16k,envelope:envelope,pitchTrack:pitchTrack,get ctx(){return ensureCtx()},load:function(id){return loadDB().then(function(){return loadSound(DB.sons.filter(function(s){return s.id===id})[0])})},get state(){return S},get st3(){return st3}}
};
})();
