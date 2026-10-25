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
  if(!ctx){var C=window.AudioContext||window.webkitAudioContext;try{ctx=new C({latencyHint:'playback'})}catch(e){ctx=new C()}
    master=ctx.createGain();master.gain.value=volGain(vol);var lim=ctx.createDynamicsCompressor();lim.threshold.value=-6;lim.knee.value=3;lim.ratio.value=20;lim.attack.value=.003;lim.release.value=.15;master.connect(lim);lim.connect(ctx.destination)}
  if(ctx.state==='suspended')ctx.resume();return ctx}
function syncVol(){document.querySelectorAll('.vol-sl').forEach(function(e){e.value=vol});document.querySelectorAll('.vol-o').forEach(function(e){e.textContent=Math.round(vol)+'%'})}
function setVol(v){vol=clamp(+v||0,0,100);lsSet('im_vol',String(vol));if(master)master.gain.value=volGain(vol);syncVol()}
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
/* Micro : capture dans un AudioWorklet (thread audio) pour ne jamais perdre d'échantillons quand la 3D occupe la page.
   Repli sur ScriptProcessor (grand tampon) si le navigateur ne sait pas. */
var WK="class R extends AudioWorkletProcessor{process(i){var c=i[0]&&i[0][0];if(c)this.port.postMessage(new Float32Array(c));return true}}registerProcessor('im-rec',R)";
var wkP=null;
function wkLoad(){if(!wkP){var u=URL.createObjectURL(new Blob([WK],{type:'application/javascript'}));wkP=ctx.audioWorklet.addModule(u)}return wkP}
function micStart(){
  if(mic&&mic.stream&&mic.stream.getAudioTracks().some(function(t){return t.readyState==='live'}))return Promise.resolve(mic);
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return Promise.reject(new Error('nomic'));
  return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){
    ensureCtx();var src=ctx.createMediaStreamSource(st),mute=ctx.createGain();mute.gain.value=0;mute.connect(ctx.destination);
    var m={stream:st,src:src,mute:mute,rec:null,node:null};
    var viaSP=function(){var sp=ctx.createScriptProcessor(4096,1,1);sp.onaudioprocess=function(e){if(m.rec)m.rec.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))};src.connect(sp);sp.connect(mute);m.node=sp;mic=m;return m};
    if(ctx.audioWorklet&&window.AudioWorkletNode){
      return wkLoad().then(function(){var n=new AudioWorkletNode(ctx,'im-rec',{numberOfInputs:1,numberOfOutputs:1,channelCount:1});n.port.onmessage=function(e){if(m.rec)m.rec.chunks.push(e.data)};src.connect(n);n.connect(mute);m.node=n;mic=m;return m}).catch(viaSP)}
    return viaSP()})}
function micStop(){if(mic){try{mic.stream.getTracks().forEach(function(t){t.stop()})}catch(e){}try{mic.src.disconnect();mic.node&&mic.node.disconnect()}catch(e){}mic=null}}
function recStart(){mic.rec={chunks:[],t0:ctx.currentTime,sr:ctx.sampleRate}}
/* écoute de « Ma voix » : retire la composante continue et les graves parasites, normalise, adoucit les bords */
function polish(pcm,sr){
  var n=pcm.length,o=new Float32Array(n),a=Math.exp(-2*Math.PI*80/sr),px=0,py=0,i;
  for(i=0;i<n;i++){var x=pcm[i];py=a*(py+x-px);px=x;o[i]=py}
  var pk=0;for(i=0;i<n;i++){var v=Math.abs(o[i]);if(v>pk)pk=v}
  var g=pk>1e-4?Math.min(6,.8/pk):1,f=Math.min(Math.floor(sr*.012),n>>1);
  for(i=0;i<n;i++){var w=1;if(i<f)w=i/f;else if(n-1-i<f)w=(n-1-i)/f;o[i]=Math.tanh(o[i]*g*1.1)*w*.9}
  return o}
function recEnd(){
  var r=mic.rec;mic.rec=null;var n=0,i;for(i=0;i<r.chunks.length;i++)n+=r.chunks[i].length;
  var all=new Float32Array(n),o=0;for(i=0;i<r.chunks.length;i++){all.set(r.chunks[i],o);o+=r.chunks[i].length}
  var pl=n?polish(all,r.sr):new Float32Array(1);
  var buf=ctx.createBuffer(1,Math.max(1,pl.length),r.sr);buf.copyToChannel(pl,0);return{pcm:all,sr:r.sr,buf:buf}}

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
  /* --- menu (page normale) --- */
  '.im{display:flex;flex-direction:column;gap:12px}',
  '.im .sub{color:var(--mut);margin:0;text-align:center;font-size:.92rem}',
  '.im-modes{display:grid;gap:10px}',
  '.im-mode{display:flex;flex-direction:column;gap:3px;text-align:left;background:var(--card);color:var(--tx);border:2px solid var(--bd);border-radius:16px;padding:14px 16px;font:inherit;cursor:pointer}',
  '.im-mode b{font-size:1.05rem}.im-mode small{color:var(--mut);font-size:.84rem;line-height:1.3}',
  '.im-mode:hover{border-color:var(--ac)}.im-mode:focus-visible{outline:3px solid var(--ac);outline-offset:2px}',
  '.im-vol{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:8px 12px}',
  '.im-vol input{flex:1;min-width:0;accent-color:var(--ac)}.im-vol output{min-width:2.6em;text-align:right;font-weight:800;font-size:.85rem;color:var(--mut)}',
  '.im-vb{background:var(--card);color:var(--tx);border:1px solid var(--bd);border-radius:10px;font:inherit;font-weight:800;min-width:34px;height:34px;cursor:pointer}',
  '.im-vbar{display:flex;align-items:center;gap:8px}.im-vbar .im-vol{flex:1;min-width:0}',
  '.im-pill{background:var(--card);border:1px solid var(--bd);border-radius:999px;padding:4px 12px;font-weight:800;font-size:.85rem}',
  '.im-row{display:flex;gap:10px;flex-wrap:wrap}.im-row .btn{flex:1 1 140px}',
  '.im-pl{display:flex;gap:8px}.im-pl input{flex:1;min-width:0;padding:10px;border-radius:10px;border:2px solid var(--bd);background:var(--card);color:var(--tx);font:inherit}',
  '.im-title{text-align:center;font-size:1.05rem;font-weight:800}',
  '.im-err{color:#c0392b;font-weight:700;text-align:center}',
  '.im .chips{margin:0}',
  '.im-flag{background:none;border:0;color:var(--mut);font:inherit;font-size:.8rem;cursor:pointer;text-decoration:underline;padding:4px}',
  '.im-av{display:flex;gap:6px;flex-wrap:wrap}.im-av button{background:var(--card);color:var(--tx);border:2px solid var(--bd);border-radius:999px;padding:5px 12px;font:inherit;font-weight:800;font-size:.85rem;cursor:pointer}.im-av button[aria-pressed=true]{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,var(--card))}',
  /* --- scène --- */
  '.im-stage{position:relative;height:clamp(220px,40vh,400px);border-radius:16px;overflow:hidden;background:radial-gradient(ellipse at 50% 18%,#3a2150,#0e0716 72%);touch-action:pan-y}',
  '.im3d-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}',
  '.im3d-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3}',
  '.im3d-tags .tag{position:absolute;transform:translate(-50%,-100%);pointer-events:none;background:rgba(255,255,255,.95);color:#1b2130;border-radius:99px;padding:3px 10px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 6px 14px -6px rgba(0,0,0,.6);transition:opacity .2s}',
  '.im3d-tags .tag b{color:#1f9d63}',
  '.im-root.full .im-stage{position:fixed;inset:0;height:auto;border-radius:0;z-index:190;touch-action:none}',
  '.im-root.full #imUi,.im-root.full .im-vbar{display:none}',
  /* --- ATH (identique à la maquette) --- */
  '.hu{display:none;position:absolute;inset:0;z-index:6;pointer-events:none;color:#fff;font-family:inherit;--tx:#1b2130;--mu:#667085;--in:#eef0f5;--es:#fde9e0;--ok:#1f9d63;--okb:#dff3e8;--ko:#d64545;--kob:#fbe4e4;--yl:#ffd84a;--yt:#1a1405;user-select:none;-webkit-user-select:none}',
  '.im-root.full .hu{display:flex;flex-direction:column}',
  '.hu button,.hu input{pointer-events:auto}',
  '.hu-top{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:calc(10px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 0 max(12px,env(safe-area-inset-left,0px))}',
  '.hu-pill{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.94);color:var(--tx);border-radius:99px;padding:7px 14px;font-weight:800;font-size:14px;box-shadow:0 8px 20px -10px rgba(0,0,0,.6)}',
  '.hu-logo{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#ee6428,#c9411a);color:#fff;display:inline-flex;align-items:center;justify-content:center}',
  '.hu-chip{display:inline-flex;align-items:center;gap:6px;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:800;letter-spacing:.03em}',
  '.hu-sp{flex:1}',
  '.hu-pls{display:flex;gap:6px;flex-wrap:wrap}',
  '.hu-pl{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.14);backdrop-filter:blur(6px);border-radius:99px;padding:3px 10px 3px 3px;font-size:12.5px;font-weight:800;color:#fff}',
  '.hu-pl i{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-style:normal;color:#10141c;font-size:11px}',
  '.hu-pl.on{background:var(--es);color:#b8431a;box-shadow:inset 0 0 0 2px #e0561f}',
  '.hu-vol{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.94);color:var(--tx);border-radius:99px;padding:4px 8px 4px 10px;box-shadow:0 8px 20px -10px rgba(0,0,0,.6)}',
  '.hu-vol button{border:0;background:none;font-size:15px;cursor:pointer;padding:2px 3px;line-height:1}.hu-vol input{width:96px;accent-color:#e0561f}.hu-vol output{min-width:2.4em;text-align:right;font-weight:800;font-size:12px;color:var(--mu)}',
  '.hu-x{width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:var(--tx);font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 8px 20px -10px rgba(0,0,0,.6)}',
  '.hu-hearts{display:inline-flex;gap:3px;background:rgba(255,255,255,.94);border-radius:99px;padding:5px 10px}.hu-hearts svg{width:18px;height:18px}',
  '.hu-scr{flex:1;min-height:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px max(16px,env(safe-area-inset-left,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-right,0px));text-align:center;transition:opacity .3s}',
  '.hu-card{background:rgba(255,255,255,.96);color:var(--tx);border-radius:22px;padding:16px 22px;box-shadow:0 20px 40px -18px rgba(0,0,0,.7);width:min(100%,640px);text-align:left}',
  '.hu-h{font-size:24px;font-weight:800;letter-spacing:-.01em;margin:8px 0}',
  '.hu-chips{display:flex;gap:8px;flex-wrap:wrap}',
  '.hu-cv{width:100%;height:auto;display:block;border-radius:12px;background:#f3f4f8}',
  '.hu-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12.5px;font-weight:700;color:var(--mu);margin-top:8px}',
  '.hu-act{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:auto;padding-bottom:6px}',
  '.hu-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border-radius:15px;border:0;font:800 15px inherit;font-family:inherit;cursor:pointer;color:var(--tx);background:#fff;box-shadow:0 8px 20px -12px rgba(0,0,0,.7)}',
  '.hu-b.p{background:linear-gradient(135deg,#ee6428,#c9411a);color:#fff;box-shadow:0 10px 22px -10px rgba(224,86,31,.8)}',
  '.hu-flag{flex:0 0 auto;min-height:34px;padding:0 12px;border:0;border-radius:12px;font:inherit;font-weight:800;font-size:12.5px;background:rgba(255,255,255,.2);color:#fff;cursor:pointer;backdrop-filter:blur(6px)}',
  '.hu-b:disabled{opacity:.55;cursor:default}',
  '.hu-big{font-size:clamp(28px,5vw,48px);font-weight:800;letter-spacing:-.025em;line-height:1.05;text-shadow:0 6px 26px rgba(0,0,0,.6);margin-top:4px}',
  '.hu-sub{font-size:clamp(14px,2vw,17px);font-weight:600;color:#f0e6ff;text-shadow:0 2px 10px rgba(0,0,0,.7);max-width:480px;line-height:1.45}',
  '.hu-num{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:clamp(110px,24vw,240px);font-weight:800;color:#fff;line-height:1;text-shadow:0 14px 40px rgba(60,0,0,.7);pointer-events:none;animation:hunum .85s ease-out forwards}',
  '@keyframes hunum{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}20%{transform:translate(-50%,-50%) scale(1.3);opacity:1}32%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.25);opacity:0}}',
  '.hu-rec{display:inline-flex;align-items:center;gap:8px;background:var(--kob);color:var(--ko);border-radius:99px;padding:7px 14px;font-weight:800;font-size:13px}.hu-rec i{width:10px;height:10px;border-radius:50%;background:var(--ko);animation:hubl 1s steps(2,start) infinite}',
  '@keyframes hubl{50%{opacity:.2}}',
  '.hu-curve{width:min(100%,640px);background:rgba(255,255,255,.96);color:var(--tx);border-radius:18px;padding:10px 12px 8px;box-shadow:0 20px 40px -18px rgba(0,0,0,.7);text-align:left;margin-top:auto}',
  '.hu-curve .t{font-size:12.5px;font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}',
  '.hu-lg{display:flex;gap:12px;font-size:11.5px;font-weight:700;color:var(--mu);flex-wrap:wrap}.hu-lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}',
  '.hu-gauge{display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:center}',
  '.hu-gn{font-size:72px;font-weight:800;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}',
  '.hu-bk{display:flex;flex-direction:column;gap:7px;min-width:210px;text-align:left}.hu-bk div.r{display:flex;justify-content:space-between;font-size:12.5px;font-weight:800;margin-bottom:3px}',
  '.hu-bar{height:8px;border-radius:99px;background:rgba(0,0,0,.14);overflow:hidden;width:100%}.hu-bar>i{display:block;height:100%;border-radius:99px;width:0;transition:width .9s cubic-bezier(.2,.7,.2,1)}',
  '.hu-rk{display:grid;grid-template-columns:30px 1fr auto auto;gap:10px;align-items:center;padding:8px 4px;font-weight:800;border-bottom:1px solid var(--in)}.hu-rk:last-child{border:0}.hu-rk small{color:var(--mu);font-weight:700}.hu-rk.first{color:#b8431a}',
  '.hu-fail{border:3px solid var(--ko);align-items:center;text-align:center;display:flex;flex-direction:column;gap:8px}',
  '.hu-hr{display:flex;gap:6px}.hu-hr svg{width:30px;height:30px}',
  '.hu-shk{animation:hushk .5s}@keyframes hushk{20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}',
  '.hu-go{font-size:17px;padding:11px 24px;animation:hupop .5s ease-out}@keyframes hupop{from{transform:scale(.6);opacity:0}}',
  '@media(max-width:600px){.hu-pls{display:none}.hu-gn{font-size:50px}.hu-card{padding:12px 16px}.hu-bk{min-width:150px}.hu-gauge{gap:10px}.hu-b{min-height:44px;padding:0 16px;font-size:14px}.hu-h{font-size:20px}.hu-vol input{width:70px}}',
  '@media(prefers-reduced-motion:reduce){.hu *,.im *{animation:none!important;transition:none!important}}'
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
function mountStage(){var el=$('imStage');if(!el||!st3)return;st3.mount(el)}
function cast3d(){
  if(!st3)return;var G=S.G;
  if(G&&G.mode==='turn')st3.cast(G.pl.map(function(p,i){return{name:p.name,key:st3.keys[i%st3.keys.length]}}));
  else st3.cast([{name:'',key:S.char||'lea'}])}
var last3=null;
function m3(m,o){last3={m:m,o:o};if(st3)try{st3.mode(m,o)}catch(e){}}
function kindOf(sc,res,G){
  if(res.silent)return'silent';
  if(G.mode==='surv'){var pass=sc>=target({n:G.n-1});return pass?(sc>=target({n:G.n-1})+18?'great':'ok'):'bad'}
  return sc>=80?'great':sc>=45?'ok':sc>=20?'silent':'bad'}
function setFull(b){
  var r=$('imRoot');if(!r)return;r.classList.toggle('full',!!b);
  try{document.documentElement.style.overflow=b?'hidden':''}catch(e){}
  var st=$('imStage');if(st)st.hidden=b?false:!(use3d&&st3)}

/* ============================ ÉTAT & NAVIGATION ============================ */
var S={packs:null,niv:0,mode:null,G:null,players:['Joueur 1','Joueur 2'],rounds:5,char:'lea'};
var body=null,tok=0,anim=0,tmo=[];
function B(){return body=$('imUi')||body}
function later(f,ms){var t=setTimeout(f,ms);tmo.push(t);return t}
function clearLater(){tmo.forEach(clearTimeout);tmo=[]}
function setHtml(h){tok++;clearLater();cancelAnimationFrame(anim);stopPlay();B().innerHTML='<div class="im">'+h+'</div>'}
function volHtml(){return '<div class="im-vol"><button class="im-vb vol-m" type="button" aria-label="Moins fort">🔉</button><input type="range" class="vol-sl" min="0" max="100" step="1" value="'+vol+'" aria-label="Volume du jeu"><output class="vol-o">'+Math.round(vol)+'%</output><button class="im-vb vol-p" type="button" aria-label="Plus fort">🔊</button></div>'}
function bindVol(root){root.querySelectorAll('.vol-sl').forEach(function(v){v.oninput=function(){setVol(v.value)}});root.querySelectorAll('.vol-m').forEach(function(b){b.onclick=function(){setVol(vol-10)}});root.querySelectorAll('.vol-p').forEach(function(b){b.onclick=function(){setVol(vol+10)}})}
function pool(){
  var packs=S.packs||Object.keys(DB.packs),niv=S.niv;
  return DB.sons.filter(function(s){return packs.indexOf(s.pack)>=0&&(!niv||s.niveau===niv)&&FLAGS.indexOf(s.id)<0})}
function target(G){return Math.min(70,45+3*G.n)}

/* ---------- Menu (page normale) ---------- */
function menu(){
  S.G=null;stopPlay();micStop();setFull(false);hudOff();
  var best=+lsGet('im_best_survie')||0,np=pool().length;
  var packs=Object.keys(DB.packs),on=S.packs||packs;
  var chips='<div class="chips" id="imPk">'+packs.map(function(k){return '<button type="button" data-pk="'+k+'" aria-pressed="'+(on.indexOf(k)>=0)+'">'+esc(DB.packs[k])+'</button>'}).join('')+'</div>';
  var nv='<div class="chips" id="imNv">'+[['Tous',0],['Facile',1],['Moyen',2],['Difficile',3]].map(function(a){return '<button type="button" data-nv="'+a[1]+'" aria-pressed="'+(S.niv===a[1])+'">'+a[0]+'</button>'}).join('')+'</div>';
  setHtml('<p class="sub">Écoute un son, imite-le avec ta voix : le jeu te note sur 100.</p>'+
    '<div class="im-modes">'+
    '<button class="im-mode" data-m="train"><b>🎯 Entraînement</b><small>Sans pression : réessaie autant que tu veux.</small></button>'+
    '<button class="im-mode" data-m="surv"><b>❤️ Survie</b><small>3 vies. Il faut atteindre le score demandé, qui monte à chaque manche.'+(best?' Ton record : '+best+' manche'+(best>1?'s':'')+'.':'')+'</small></button>'+
    '<button class="im-mode" data-m="turn"><b>👥 À tour de rôle</b><small>2 à 8 joueurs sur le même écran, on se passe l’appareil. Le meilleur total gagne.</small></button></div>'+
    '<div class="pn"><h2>Ton personnage <small style="color:var(--mut);font-weight:600">(modes solo)</small></h2><div class="im-av" id="imAv">'+['lea','kenji','sora','mizuki','ryo','ren'].map(function(k){return '<button type="button" data-ch="'+k+'" aria-pressed="'+(S.char===k)+'">'+({lea:'Léa',kenji:'Kenji',sora:'Sora',mizuki:'Mizuki',ryo:'Ryo',ren:'Ren'})[k]+'</button>'}).join('')+'</div></div>'+
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

/* ============================ ATH PLEIN ÉCRAN (comme la maquette) ============================ */
var PLC=['#f6b7a0','#9ec3f2','#f19ac0','#ffd84a','#8fe3a0','#c9b8ff','#f6b7a0','#9ec3f2'];
var HEART='<svg viewBox="0 0 24 24" fill="#d64545"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
var HEARTG='<svg viewBox="0 0 24 24" fill="#c3c9d6"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
var MIC='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>';
function fmt1(x){return x.toFixed(1).replace('.',',')}
function hud(){return $('imHud')}
function hudOff(){var h=hud();if(h)h.innerHTML=''}
function modeText(){
  var G=S.G;if(!G)return'';
  if(G.mode==='train')return'Entraînement · Essai '+(G.tries+1);
  if(G.mode==='surv')return'Survie · Manche '+G.n+' · Objectif '+target({n:G.n-1});
  return'Manche '+G.n+' sur '+S.rounds+' · À tour de rôle'}
function buildHud(){
  var G=S.G,h=hud();if(!h)return;
  var pls=G.mode==='turn'?'<span class="hu-pls" id="huPls">'+G.pl.map(function(p,i){return '<span class="hu-pl" data-i="'+i+'"><i style="background:'+PLC[i%8]+'">'+esc((p.name[0]||'?').toUpperCase())+'</i>'+esc(p.name)+'</span>'}).join('')+'</span>':'';
  h.innerHTML='<div class="hu-top"><span class="hu-pill"><span class="hu-logo">'+MIC+'</span>Imite-moi</span><span class="hu-chip" id="huMode" style="background:var(--es);color:#b8431a"></span><span id="huHr"></span><span class="hu-sp"></span>'+pls+
    '<span class="hu-vol"><button class="vol-m" type="button" aria-label="Moins fort">🔉</button><input type="range" class="vol-sl" min="0" max="100" step="1" value="'+vol+'" aria-label="Volume du jeu"><output class="vol-o">'+Math.round(vol)+'%</output><button class="vol-p" type="button" aria-label="Plus fort">🔊</button></span>'+
    '<button class="hu-x" id="huX" type="button" aria-label="Quitter la partie">✕</button></div><div class="hu-scr" id="huScr"></div>';
  bindVol(h);$('huX').onclick=function(){stopPlay();micStop();clearLater();menu()}}
function updTop(){
  var G=S.G;$('huMode')&&($('huMode').textContent=modeText());
  var hr=$('huHr');if(hr){hr.innerHTML=G.mode==='surv'?'<span class="hu-hearts" aria-label="'+G.lives+' vies">'+HEART.repeat(G.lives)+HEARTG.repeat(3-G.lives)+'</span>':''}
  document.querySelectorAll('.hu-pl').forEach(function(e){e.classList.toggle('on',G.mode==='turn'&&+e.dataset.i===G.pi)})}
function setScr(h){tok++;clearLater();cancelAnimationFrame(anim);stopPlay();var s=$('huScr');s.innerHTML=h;s.style.opacity=0;requestAnimationFrame(function(){s.style.opacity=1});updTop();return s}

/* barres (identiques à la maquette) */
var NB=88;
function huBars(c,W,H,env,n,fn,wf){var bw=W/NB,m=H/2;c.fillStyle='#dfe2ea';c.fillRect(0,m-.5,W,1);
  for(var i=0;i<n&&i<NB;i++){var h=Math.max(4,env[i]*(H*.9)),gap=bw*(1-wf);c.fillStyle=fn(i);c.fillRect(Math.round(i*bw+gap/2),Math.round(m-h/2),Math.max(2,Math.round(bw-gap)),Math.round(h))}}
function refEnv(sound,total){ // enveloppe du son sur NB barres, étalée sur `total` secondes
  var F=sound.F,env=F.env,fps=16000/160,p=F.p95||pct(env,.95)||1,out=new Float32Array(NB),a0=F.a>=0?F.a:0;
  for(var i=0;i<NB;i++){var t0=i/NB*total,t1=(i+1)/NB*total,m=0;
    if(t0<sound.dur){var f0=Math.floor(t0*fps),f1=Math.max(f0+1,Math.floor(Math.min(t1,sound.dur)*fps));for(var j=f0;j<f1&&j<env.length;j++)if(env[j]>m)m=env[j]}
    out[i]=t0>=sound.dur?0.02:Math.min(1,Math.max(.04,Math.sqrt(clamp(m/p,0,1.2))))}
  return out}

/* ---------- Partie ---------- */
function newGame(mode){
  var G={mode:mode,queue:shuffle(pool()),n:0,lives:3,passed:0,sum:0,cnt:0,pi:0,tries:0};
  if(mode==='turn')G.pl=S.players.map(function(n){return{name:n,total:0,last:0}});
  S.G=G;cast3d();setFull(true);buildHud();nextRound()}
function nextSound(G){if(!G.queue.length)G.queue=shuffle(pool());return G.queue.shift()}
function nextRound(){
  var G=S.G;G.sn=nextSound(G);G.pi=0;G.tries=0;G.n++;listen({walk:G.mode==='turn'})}
function perfIdx(){return S.G.mode==='turn'?S.G.pi:0}

/* ---------- Écoute ---------- */
function listen(o){
  var G=S.G,my=tok+1;
  m3('listen',{perf:perfIdx(),walk:!!(o&&o.walk)});
  var nv=['','Facile','Moyen','Difficile'][G.sn.niveau]||'';
  setScr('<div class="hu-card"><div class="hu-chips"><span class="hu-chip" style="background:#dcf3ee;color:#1f8a7a">'+esc(DB.packs[G.sn.pack]||'')+'</span><span class="hu-chip" style="background:var(--in);color:#475467">'+esc(nv)+'</span></div>'+
    '<div class="hu-h">Écoute bien le son mystère…</div><canvas class="hu-cv" id="huWv" width="720" height="96"></canvas>'+
    '<div class="hu-foot"><span id="huWt">Chargement du son…</span><span>Quel est ce son ? ? ? ?</span></div></div>'+
    '<div class="hu-act"><button class="hu-b" id="imPlay" disabled>▶ Réécouter</button><button class="hu-b p" id="imRec">🎤 Je l’imite</button></div>');
  var my2=tok;
  loadSound(G.sn).then(function(snd){
    if(my2!==tok)return;G.snd=snd;
    var c=$('huWv'),g=c.getContext('2d'),env=refEnv(snd,snd.dur);
    var draw=function(u){g.clearRect(0,0,720,96);huBars(g,720,96,env,NB,function(i){return i<Math.floor(u*NB)?'#14161c':'#c3c9d6'},.62);
      if(u>0&&u<1){var x=u*720;g.fillStyle='#e0561f';g.fillRect(Math.round(x)-1.5,6,3,84);g.beginPath();g.arc(x,8,6,0,7);g.fill()}};
    draw(0);
    var play=function(){
      if(my2!==tok)return;$('imPlay').disabled=true;var t0=performance.now();
      var loop=function(){if(my2!==tok)return;var u=(performance.now()-t0)/1000/snd.dur;draw(Math.min(1,u));$('huWt').textContent='Lecture du modèle · '+fmt1(Math.min(snd.dur,u*snd.dur))+' s / '+fmt1(snd.dur)+' s';if(u<1)anim=requestAnimationFrame(loop)};anim=requestAnimationFrame(loop);
      playBuf(snd.buf,function(){if(my2!==tok)return;draw(1);$('huWt').textContent='À toi : imite-le !';$('imPlay').disabled=false})};
    $('imPlay').onclick=play;$('imRec').onclick=function(){stopPlay();record()};
    later(play,450)
  }).catch(function(){if(my2!==tok)return;setScr('<div class="hu-card"><div class="hu-h">Impossible de charger ce son.</div></div><div class="hu-act"><button class="hu-b p" id="imSk">Passer au suivant</button><button class="hu-b" id="imBk">Menu</button></div>');$('imSk').onclick=function(){G.n--;nextRound()};$('imBk').onclick=menu})}

/* ---------- 3 · 2 · 1 puis enregistrement ---------- */
function micError(e){
  var msg=(e&&e.name==='NotAllowedError')?'Le micro est refusé. Autorise-le dans ton navigateur (icône à gauche de l’adresse), puis réessaie.':
    (e&&e.message==='nomic')?'Ce navigateur ne permet pas d’utiliser le micro ici (il faut une page en https).':'Impossible d’accéder au micro : '+esc(e&&e.message||e);
  setScr('<div class="hu-card hu-fail"><div class="hu-h" style="color:var(--ko)">Micro indisponible</div><div>'+msg+'</div></div><div class="hu-act"><button class="hu-b p" id="imRt">Réessayer</button><button class="hu-b" id="imBk">Menu</button></div>');
  $('imRt').onclick=record;$('imBk').onclick=menu}
function record(){
  var G=S.G,snd=G.snd,pi=perfIdx();
  m3('countdown',{perf:pi});
  var s=setScr('<div class="hu-big" id="huCt" style="font-size:clamp(24px,4.4vw,40px)">Autorise le micro si le navigateur le demande…</div><div id="huNumBox"></div><div class="hu-act" style="margin-bottom:6px"><span class="hu-pill hu-go" id="huGo" style="visibility:hidden">'+MIC+'À toi ! Imite le son</span></div>');
  var my=tok;
  micStart().then(function(){
    if(my!==tok)return;
    $('huCt').textContent='Le rideau se lève dans…';
    var n=3,tick=function(){if(my!==tok)return;
      if(n>0){$('huNumBox').innerHTML='<div class="hu-num">'+n+'</div>';n--;later(tick,900)}
      else{$('huCt').textContent='';$('huGo').style.visibility='visible';later(go,350)}};
    later(tick,500)
  }).catch(function(e){if(my!==tok)return;micError(e)});
  function go(){
    if(my!==tok)return;
    var total=snd.dur+1.8,env=refEnv(snd,total),spk=snd.dur;
    m3('record',{perf:pi,from:true});
    var an=ctx.createAnalyser();an.fftSize=1024;mic.src.connect(an);var buf=new Float32Array(an.fftSize);
    setScr('<div class="hu-act" style="margin:0;gap:10px;justify-content:center"><span class="hu-rec"><i></i>EN COURS D’ENREGISTREMENT</span><span class="hu-pill" id="huTm">0 s / '+fmt1(spk)+' s</span></div>'+
      '<div class="hu-curve"><div class="t"><span>Ta voix, en direct</span><span class="hu-lg"><span><i style="background:#c3c9d6"></i>Modèle</span><span><i style="background:#1f9d63"></i>Bien</span><span><i style="background:#e8a020"></i>À peine</span><span><i style="background:#d64545"></i>Raté</span></span></div><canvas id="huCv" width="720" height="110" class="hu-cv"></canvas></div>'+
      '<div class="hu-act" style="margin-top:0"><button class="hu-b p" id="imDone">✔ J’ai fini</button></div>');
    var my2=tok,c=$('huCv'),g=c.getContext('2d');
    recStart();
    var t0=performance.now(),acc=new Float32Array(NB),spoke=false,lastLoud=0,finished=false,pk=.05;
    var finish=function(){if(finished)return;finished=true;if(st3)st3.mic(0);try{mic.src.disconnect(an)}catch(e){}
      var r=recEnd();if(my2!==tok)return;G.rec=r;analyseRec(r)};
    var loop=function(){
      if(my2!==tok)return;
      var t=(performance.now()-t0)/1000;an.getFloatTimeDomainData(buf);var s=0;for(var i=0;i<buf.length;i++)s+=buf[i]*buf[i];var rms=Math.sqrt(s/buf.length);
      if(st3)st3.mic(Math.min(1,rms*7));
      if(rms>.02){spoke=true;lastLoud=t}
      pk=Math.max(rms,pk*.9995,.04);
      var k=Math.min(NB-1,Math.floor(t/total*NB));if(rms>acc[k])acc[k]=rms;
      var u=t/total,n=k+1;
      g.clearRect(0,0,720,110);huBars(g,720,110,env,NB,function(){return'#c3c9d6'},.86);
      var uv=new Float32Array(NB);for(var q=0;q<NB;q++)uv[q]=Math.min(1,Math.max(.03,Math.sqrt(clamp(acc[q]/pk,0,1.2))));
      huBars(g,720,110,uv,n,function(q){var d=Math.abs(uv[q]-env[q]);return d<.22?'#1f9d63':d<.4?'#e8a020':'#d64545'},.46);
      g.fillStyle='#e0561f';g.fillRect(Math.round(u*720)-1.5,4,3,102);
      $('huTm').textContent=fmt1(Math.min(t,spk))+' s / '+fmt1(spk)+' s';
      if(t>=total||(spoke&&t>snd.dur*.7&&t-lastLoud>.9)){finish();return}
      anim=requestAnimationFrame(loop)};
    anim=requestAnimationFrame(loop);
    $('imDone').onclick=finish}}
function analyseRec(r){
  var G=S.G,x=toMono16k(r.pcm,r.sr),F=analyse(x,{minLevel:.004,absMin:.003});
  var res=score(G.snd.F,F);res.F=F;G.res=res;result()}

/* ---------- Note ---------- */
function verdict(sc,silent){
  if(silent)return{t:'Je n’ai rien entendu',bg:'var(--kob)',fg:'var(--ko)',c:'#d64545'};
  if(sc>=80)return{t:'Très bien imité !',bg:'var(--okb)',fg:'var(--ok)',c:'#1f9d63'};
  if(sc>=60)return{t:'Bien joué !',bg:'var(--okb)',fg:'var(--ok)',c:'#1f9d63'};
  if(sc>=35)return{t:'Pas mal, encore un effort',bg:'#fdf0d8',fg:'#a86a0e',c:'#d97a1f'};
  return{t:'Raté !',bg:'var(--kob)',fg:'var(--ko)',c:'#d64545'}}
function result(){
  var G=S.G,res=G.res,sc=res.score,mode=G.mode,pi=perfIdx();
  var kind=kindOf(sc,res,G),pass=mode==='surv'?sc>=target({n:G.n-1}):true;
  if(mode==='turn'){G.pl[G.pi].total+=sc;G.pl[G.pi].last=sc}
  G.sum+=sc;G.cnt++;
  var failLife=mode==='surv'&&!pass;if(failLife)G.lives--;
  m3('result',{perf:pi,kind:kind});
  var V=verdict(sc,res.silent),P=res.parts||{};
  var row=function(n,v,col){return v==null?'':'<div class="r"><span>'+n+'</span><span>'+v+'%</span></div><div class="hu-bar" style="margin-top:-3px"><i data-w="'+v+'" style="background:'+col+'"></i></div>'};
  var card;
  if(failLife){
    card='<div class="hu-card hu-fail hu-shk"><div class="hu-hr" aria-label="'+G.lives+' vies restantes">'+HEART.repeat(G.lives)+'<span id="huHl">'+HEART+'</span>'+HEARTG.repeat(Math.max(0,2-G.lives))+'</div>'+
      '<span class="hu-chip" style="background:var(--kob);color:var(--ko);font-size:13px">'+(res.silent?'Je n’ai rien entendu':'Raté')+' : une vie en moins</span>'+
      '<div style="font-size:26px;font-weight:800;letter-spacing:-.015em">Il fallait '+target({n:G.n-1})+(res.silent?'':', tu as fait <span style="color:var(--ko)">'+sc+'</span>')+'</div>'+
      '<div style="font-size:13.5px;color:var(--mu);font-weight:600;max-width:380px;line-height:1.45">C’était : « '+esc(G.sn.titre)+' ». '+(G.lives>0?'Il te reste '+G.lives+' vie'+(G.lives>1?'s':'')+'.':'Plus de vie !')+'</div></div>';
  }else{
    card='<div class="hu-card"><div class="hu-gauge"><div style="text-align:center"><div class="hu-gn" id="huN" style="color:'+V.c+'">0</div><div style="font-weight:800;color:var(--mu);font-size:13px">/ 100</div>'+
      '<span class="hu-chip" style="background:'+V.bg+';color:'+V.fg+';margin-top:8px;font-size:13px">'+V.t+'</span></div>'+
      (res.silent?'<div class="hu-bk" style="min-width:200px;font-weight:700;color:var(--mu);font-size:13.5px;line-height:1.45">Parle plus fort ou rapproche-toi du micro, puis réessaie.</div>':
      '<div class="hu-bk">'+row('Mélodie',P.melodie,'#2f6fd8')+row('Rythme',P.rythme,'#1f9d63')+row('Durée',P.duree,'#d97a1f')+'</div>')+'</div>'+
      '<div style="font-size:12.5px;color:var(--mu);font-weight:700;text-align:center;margin-top:10px">C’était : « '+esc(G.sn.titre)+' »'+(mode==='surv'?' · objectif '+target({n:G.n-1})+' atteint ✔':'')+'</div></div>'}
  var nx='';
  if(mode==='train')nx='<button class="hu-b" id="imAgain">↺ Réessayer</button><button class="hu-b p" id="imNext">Son suivant ▸</button>';
  else if(mode==='surv'){if(failLife)nx='<button class="hu-b p" id="imNext">'+(G.lives>0?'Continuer ▸':'Voir le résultat')+'</button>';else{G.passed++;nx='<button class="hu-b p" id="imNext">Manche suivante ▸</button>'}}
  else{var last=G.pi===G.pl.length-1;nx='<button class="hu-b p" id="imNext">'+(last?'Résultats de la manche ▸':'Joueur suivant : '+esc(G.pl[G.pi+1].name)+' ▸')+'</button>'}
  setScr(card+'<div class="hu-act"><button class="hu-b" id="imO">▶ L’original</button>'+(G.rec?'<button class="hu-b" id="imM">▶ Ma voix</button>':'')+nx+'<button class="hu-flag" id="imFg" title="Ce son est mauvais : le masquer">🚩 Mauvais son</button></div>');
  var N=$('huN');if(N){var t0=performance.now(),my=tok;var up=function(){var u=clamp((performance.now()-t0)/900,0,1);N.textContent=Math.round(sc*(1-Math.pow(1-u,3)));if(u<1&&my===tok)anim=requestAnimationFrame(up);else N.textContent=sc};up();
    later(function(){document.querySelectorAll('.hu-bar i[data-w]').forEach(function(e){e.style.width=e.dataset.w+'%'})},250)}
  var hl=$('huHl');if(hl)later(function(){hl.firstChild.style.transition='fill .5s';hl.firstChild.style.fill='#c3c9d6'},700);
  $('imO').onclick=function(){playBuf(G.snd.buf)};if($('imM'))$('imM').onclick=function(){playBuf(G.rec.buf)};
  $('imFg').onclick=function(){if(FLAGS.indexOf(G.sn.id)<0){FLAGS.push(G.sn.id);saveFlags()}$('imFg').textContent='Masqué ✔';$('imFg').disabled=true};
  var ag=$('imAgain');if(ag)ag.onclick=function(){G.tries++;listen()};
  $('imNext').onclick=function(){stopPlay();
    if(mode==='train'){G.sn=nextSound(G);G.tries=0;listen()}
    else if(mode==='surv'){if(G.lives<=0)return survOver();nextRound()}
    else{if(G.pi<G.pl.length-1)handoff();else roundEnd()}}}

/* ---------- Passe le téléphone ---------- */
function handoff(){
  var G=S.G,from=G.pi,to=G.pi+1;
  m3('handoff',{from:from,to:to});G.pi=to;
  setScr('<div class="hu-big" style="margin-top:6%">Passe le téléphone à '+esc(G.pl[to].name)+'</div><div class="hu-sub">Même son que '+esc(G.pl[from].name)+'. Tu l’entendras une fois en entier, puis ce sera à toi d’imiter.</div><div class="hu-act"><button class="hu-b p" id="imGoL">Écouter le son</button></div>');
  $('imGoL').onclick=function(){listen({walk:false})}}

/* ---------- Fin de manche, podium, survie ---------- */
function rankRows(list,key,sub){
  var o=list.map(function(p,i){return{p:p,i:i}}).sort(function(a,b){return b.p[key]-a.p[key]});
  return o.map(function(x,r){return '<div class="hu-rk'+(r===0?' first':'')+'"><span>'+(r===0?'🥇':r===1?'🥈':r===2?'🥉':(r+1))+'</span><span>'+esc(x.p.name)+'</span>'+(sub?'<small>+'+x.p[sub]+'</small>':'<span></span>')+'<span>'+x.p[key]+' <small>pts</small></span></div>'}).join('')}
function roundEnd(){
  var G=S.G,fin=G.n>=S.rounds;m3('menu');
  setScr('<div class="hu-card"><div class="hu-h" style="margin-top:0">Manche '+G.n+' sur '+S.rounds+' · C’était « '+esc(G.sn.titre)+' »</div>'+rankRows(G.pl,'total','last')+'</div>'+
    '<div class="hu-act"><button class="hu-b p" id="imNext">'+(fin?'Voir le podium ▸':'Manche suivante ▸')+'</button></div>');
  $('imNext').onclick=function(){fin?podium():nextRound()}}
function podium(){
  var G=S.G,o=G.pl.slice().sort(function(a,b){return b.total-a.total}),w=o[0],tie=o.length>1&&o[1].total===w.total;
  m3('podium',{list:o.map(function(p){return{i:G.pl.indexOf(p),name:p.name,score:p.total}})});
  setScr('<span class="hu-chip" style="background:var(--yl);color:var(--yt);margin-top:2%">Partie terminée · '+S.rounds+' manches</span><div class="hu-big">'+(tie?'Égalité !':esc(w.name)+' remporte la partie !')+'</div>'+
    '<div class="hu-act"><button class="hu-b p" id="imAg">Rejouer</button><button class="hu-b" id="imMn">Menu</button></div>');
  $('imAg').onclick=function(){newGame('turn')};$('imMn').onclick=menu}
function survOver(){
  var G=S.G,best=+lsGet('im_best_survie')||0,rec=G.passed>best;if(rec)lsSet('im_best_survie',String(G.passed));
  m3('result',{perf:0,kind:G.passed>=5?'great':G.passed>=2?'ok':'bad'});
  setScr('<span class="hu-chip" style="background:var(--kob);color:var(--ko);margin-top:2%">Plus de vies</span><div class="hu-big">'+G.passed+' manche'+(G.passed>1?'s':'')+' réussie'+(G.passed>1?'s':'')+'</div>'+
    '<div class="hu-sub">'+(rec&&G.passed>0?'🎉 Nouveau record ! ':'Record : '+Math.max(best,G.passed)+'. ')+'Moyenne : '+(G.cnt?Math.round(G.sum/G.cnt):0)+' / 100.</div>'+
    '<div class="hu-act"><button class="hu-b p" id="imAg">Rejouer</button><button class="hu-b" id="imMn">Menu</button></div>');
  $('imAg').onclick=function(){newGame('surv')};$('imMn').onclick=menu}

/* ============================ API ============================ */
window.IM={
  enter:function(){
    injectCss();var v=lsGet('im_vol');vol=v==null?35:clamp(+v||0,0,100);use3d=lsGet('im_3d')!=='0';
    var b=$('imBody');if(!b)return;body=null;
    b.innerHTML='<div class="im im-root" id="imRoot"><div class="im-stage" id="imStage"'+(use3d?'':' hidden')+'><div class="hu" id="imHud"></div></div><div class="im-vbar">'+volHtml()+'<button class="im-vb" id="imV3" type="button" aria-pressed="'+use3d+'" title="Afficher ou masquer le décor 3D" style="width:auto;padding:0 10px">🎭 3D</button></div><div id="imUi"><div class="im"><div class="im-state">Chargement…</div></div></div></div>';
    bindVol(b);
    var up3=function(){if(!use3d||!st3)return;cast3d();mountStage();if(last3)st3.mode(last3.m,last3.o)};
    $('imV3').onclick=function(){use3d=!use3d;lsSet('im_3d',use3d?'1':'0');this.setAttribute('aria-pressed',String(use3d));$('imStage').hidden=!use3d;
      if(!use3d){if(st3)st3.unmount()}else if(st3)up3();else load3d().then(function(a){st3=a;if(!a){$('imStage').hidden=true;return}up3()})};
    if(use3d){if(st3)up3();else load3d().then(function(a){st3=a;if(!a){var e=$('imStage');if(e&&!e.parentNode.classList.contains('full'))e.hidden=true;return}up3()})}
    loadDB().then(function(){menu()}).catch(function(){var u=$('imUi');if(u)u.innerHTML='<div class="im"><p class="im-err">Impossible de charger la liste des sons (imite/sons.json).</p></div>'})},
  leave:function(){tok++;clearLater();cancelAnimationFrame(anim);stopPlay();micStop();S.G=null;setFull(false);if(st3)st3.unmount()},
  _t:{analyse:analyse,score:score,toMono16k:toMono16k,envelope:envelope,pitchTrack:pitchTrack,get ctx(){return ensureCtx()},load:function(id){return loadDB().then(function(){return loadSound(DB.sons.filter(function(s){return s.id===id})[0])})},get state(){return S},get st3(){return st3},polish:polish,micKind:function(){return mic&&mic.node?mic.node.constructor.name:null}}
};
})();
