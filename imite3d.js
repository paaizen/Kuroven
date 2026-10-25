/* Imite-moi — scène 3D (théâtre, personnages, public, tomates, confettis, podium).
   Généré à partir du prototype scène 3D. Nécessite three.js r128 (chargé par imite.js). */
(function(){
'use strict';
window.IM3D={init:function(THREE){
const PLAYERS=[['lea','Léa','L','#f6b7a0'],['kenji','Kenji','K','#9ec3f2'],['sora','Sora','S','#f19ac0'],['mizuki','Mizuki','M','#ffd84a'],['ryo','Ryo','R','#8fe3a0'],['ren','Ren','R','#c9b8ff']];
const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);
/* ---------- Renderer ---------- */
const canvas=document.createElement('canvas');canvas.className='im3d-cv';let app=document.body;
const MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||Math.min(screen.width,screen.height)<700;
const renderer=new THREE.WebGLRenderer({canvas,antialias:!MOB,powerPreference:'high-performance',alpha:!!window.IM3D_DBG,preserveDrawingBuffer:!!window.IM3D_DBG});
let SOFT=false;try{const gl0=renderer.getContext(),ex0=gl0.getExtension('WEBGL_debug_renderer_info'),rn0=ex0?String(gl0.getParameter(ex0.UNMASKED_RENDERER_WEBGL)):'';SOFT=/swiftshader|llvmpipe|software|basic render|softpipe/i.test(rn0)}catch(e0){}
let PR=Math.min(devicePixelRatio||1,MOB?1.25:1.5);renderer.setPixelRatio(PR);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0e0716);scene.fog=new THREE.Fog(0x0e0716,16,34);
const camera=new THREE.PerspectiveCamera(44,1,.1,80);
let VW=1,VH=1;function resize(){const w=app.clientWidth||1,h=app.clientHeight||1;VW=w;VH=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.8?62:w/h<1.2?52:44;camera.updateProjectionMatrix()}


/* ---------- Textures ---------- */
function ctex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}return t}
const floorTex=ctex(512,512,(g,w,h)=>{g.fillStyle='#8a5a30';g.fillRect(0,0,w,h);for(let i=0;i<8;i++){g.fillStyle=`hsl(28,${40+Math.random()*10}%,${32+Math.random()*10}%)`;g.fillRect(0,i*64,w,62);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,i*64+62,w,2);for(let k=0;k<5;k++){g.fillStyle='rgba(60,30,10,.18)';g.fillRect(Math.random()*w,i*64+Math.random()*60,90+Math.random()*120,1.2)}const o=Math.random()*w;g.fillStyle='rgba(0,0,0,.4)';g.fillRect(o,i*64,2,62)}},[3,1.4]);
const wallTex=ctex(512,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#2d1a42');gr.addColorStop(1,'#55305f');g.fillStyle=gr;g.fillRect(0,0,w,h);for(let x=0;x<w;x+=64){g.fillStyle='rgba(255,255,255,.04)';g.fillRect(x,0,32,h)}},[2,1]);
const curtTex=ctex(256,64,(g,w,h)=>{for(let x=0;x<w;x++){const v=.5+.5*Math.sin(x/w*Math.PI*2*8);g.fillStyle=`rgb(${Math.round(120+90*v)},${Math.round(14+24*v)},${Math.round(24+28*v)})`;g.fillRect(x,0,1,h)}});
const seatTex=null;

/* ---------- Matériaux ---------- */
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:.7,metalness:0},o||{},{color:new THREE.Color(c).convertSRGBToLinear()}));
const matGold=M(0xd9a93a,{roughness:.35,metalness:.7});
const matDark=M(0x120b1c,{roughness:.9});

/* ---------- Lumières ---------- */
scene.add(new THREE.HemisphereLight(0xb8a6ff,0x2a1530,.4));
const amb=new THREE.AmbientLight(0x5a4a80,.28);scene.add(amb);
const foot=new THREE.PointLight(0xffc98a,.35,12,2);foot.position.set(0,.5,3.2);scene.add(foot);
const rimL=new THREE.DirectionalLight(0x7d9cff,.5);rimL.position.set(-6,5,-3);scene.add(rimL);
const rimR=new THREE.DirectionalLight(0xff7fb0,.45);rimR.position.set(6,5,-3);scene.add(rimR);
function mkSpot(color,intens,x){
  const s=new THREE.SpotLight(color,intens,30,.42,.55,1.2);s.position.set(x,9,5);s.castShadow=true;s.shadow.mapSize.set(512,512);s.shadow.bias=-.0005;
  const t=new THREE.Object3D();scene.add(t);s.target=t;scene.add(s);
  const h=13,r=h*Math.tan(.42);
  const geo=new THREE.ConeGeometry(r,h,24,1,true);geo.translate(0,-h/2,0);geo.rotateX(-Math.PI/2);
  const cone=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  const g=new THREE.Group();g.add(cone);scene.add(g);
  return {light:s,target:t,cone:g,mat:cone.material,aim(x,y,z){t.position.set(x,y,z);g.position.copy(s.position);g.lookAt(t.position)},setX(x){s.position.x=x}};
}
const spotA=mkSpot(0xfff0c8,1.9,0), spotB=mkSpot(0xffe2b0,1.1,3);spotB.light.castShadow=false;
function setSpot(sp,v,tx,ty,tz,col){sp.light.intensity=v*.5;sp.mat.opacity=v>0.01?.035+.018*v:0;sp.aim(tx,ty,tz);if(col){sp.light.color.set(col);sp.mat.color.set(col)}}

/* ---------- Théâtre ---------- */
const stage=new THREE.Group();scene.add(stage);
const floor=new THREE.Mesh(new THREE.BoxGeometry(13,.5,7.4),M(0xffffff,{map:floorTex,roughness:.55}));floor.position.set(0,-.25,-.2);floor.receiveShadow=true;stage.add(floor);
const lipM=new THREE.Mesh(new THREE.BoxGeometry(13,.9,.3),M(0x3a0f18,{roughness:.6}));lipM.position.set(0,-.45,3.65);stage.add(lipM);
const trim=new THREE.Mesh(new THREE.BoxGeometry(13.1,.08,.36),matGold);trim.position.set(0,.02,3.65);stage.add(trim);
const wall=new THREE.Mesh(new THREE.PlaneGeometry(14,9),M(0xffffff,{map:wallTex,roughness:.9}));wall.position.set(0,3.9,-3.8);wall.receiveShadow=true;stage.add(wall);
const lights=[];for(let i=0;i<17;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color:0xffe48a}));b.position.set(-6+i*.75,.1,3.6);stage.add(b);lights.push(b)}
// proscenium
const col=(x)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.9,9.2,.9),M(0x3a1018,{roughness:.6}));m.position.set(x,4.3,3.6);stage.add(m);const g=new THREE.Mesh(new THREE.BoxGeometry(1.05,.3,1.05),matGold);g.position.set(x,8.9,3.6);stage.add(g);const g2=g.clone();g2.position.set(x,.1,3.6);stage.add(g2)};col(-6.9);col(6.9);
const beam=new THREE.Mesh(new THREE.BoxGeometry(14.7,1.1,.9),M(0x3a1018,{roughness:.6}));beam.position.set(0,8.6,3.6);stage.add(beam);
const beamT=new THREE.Mesh(new THREE.BoxGeometry(14.7,.14,1),matGold);beamT.position.set(0,8.05,3.6);stage.add(beamT);
// pelmet (lambrequin) with scallops
const pel=new THREE.Group();for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.52,16,10,0,Math.PI*2,Math.PI/2,Math.PI/2),M(0xa8212b,{roughness:.8,side:THREE.DoubleSide}));m.scale.set(1,1,.5);m.position.set(-6.4+i*.85,7.75,3.2);pel.add(m)}stage.add(pel);
const pelBar=new THREE.Mesh(new THREE.BoxGeometry(14,.6,.5),M(0x8a1620));pelBar.position.set(0,8,3.2);stage.add(pelBar);
// curtains
function mkCurtain(side){
  const geo=new THREE.PlaneGeometry(6.6,8.2,60,2);geo.translate(side*3.3,0,0);
  const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)*side;p.setZ(i,Math.sin(x*3.4)*.2)}geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,M(0xffffff,{map:curtTex,roughness:.85,side:THREE.DoubleSide,emissive:new THREE.Color(0x3a0508)}));m.castShadow=true;m.position.set(side*6.6,4.1,3.1);stage.add(m);return m}
const curL=mkCurtain(1),curR=mkCurtain(-1); // curL pivot à gauche
curL.position.x=-6.6;curR.position.x=6.6;
let curtainOpen=1;function setCurtains(o){curtainOpen=o;const s=lerp(1,.3,ease(o));curL.scale.x=s;curR.scale.x=s}
// backstage dark
const back=new THREE.Mesh(new THREE.BoxGeometry(60,30,.2),matDark);back.position.set(0,0,-30);scene.add(back);
// ground / audience area
const aud=new THREE.Mesh(new THREE.PlaneGeometry(40,26),M(0x1a0f26,{roughness:1}));aud.rotation.x=-Math.PI/2;aud.position.set(0,-.95,13);aud.receiveShadow=true;scene.add(aud);
// seats rows + audience instances
const rows=[];const AUD=[];
const headG=new THREE.SphereGeometry(.2,12,10),bodyG=new THREE.CylinderGeometry(.22,.27,.5,10);
const seatMat=M(0x4a0f1c,{roughness:.8});
const rowsN=6,perRow=14;
const iHead=new THREE.InstancedMesh(headG,M(0xffffff,{roughness:.8}),rowsN*perRow),iBody=new THREE.InstancedMesh(bodyG,M(0xffffff,{roughness:.9}),rowsN*perRow);
iHead.castShadow=iBody.castShadow=false;scene.add(iHead,iBody);
const iSeat=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.18,.7),seatMat,rowsN*perRow),iBack=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.7,.12),seatMat,rowsN*perRow);scene.add(iSeat,iBack);
const tmpC=new THREE.Color(),dum=new THREE.Object3D();
let idx=0;
for(let r=0;r<rowsN;r++){for(let c=0;c<perRow;c++){
  const x=(c-(perRow-1)/2)*1.05+(Math.random()-.5)*.2,z=6.4+r*1.35,y=-.55+r*.28;
  AUD.push({x,y,z,ph:Math.random()*6.28,sp:1.2+Math.random()*1.2,r,c,hand:Math.random()<.4,skip:r===0&&(c===4||c===5||c===7||c===9)});
  dum.position.set(x,y-.05,z);dum.rotation.set(0,0,0);dum.scale.set(1,1,1);dum.updateMatrix();iSeat.setMatrixAt(idx,dum.matrix);dum.position.set(x,y+.3,z+.4);dum.updateMatrix();iBack.setMatrixAt(idx,dum.matrix);
  tmpC.setHSL(.72+Math.random()*.12,.3,.17+Math.random()*.1);iHead.setColorAt(idx,tmpC);iBody.setColorAt(idx,tmpC);idx++;
}}
iHead.instanceColor.needsUpdate=iBody.instanceColor.needsUpdate=true;iSeat.instanceMatrix.needsUpdate=iBack.instanceMatrix.needsUpdate=true;iSeat.frustumCulled=iBack.frustumCulled=false;
let applause=0;
function updAud(t){let i=0;for(const a of AUD){
  const k=a.skip?-5:0; // fauteuils des joueurs : personne dans l'instance
  const up=Math.max(0,Math.sin(t*a.sp*(1+applause*2)+a.ph))*(.05+.18*applause)+(a.hand&&applause>.4?.25*applause:0);
  dum.position.set(a.x,a.y+.25+up+k,a.z);dum.rotation.set(0,0,Math.sin(t*a.sp+a.ph)*.05);dum.scale.set(1,1,1);dum.updateMatrix();iBody.setMatrixAt(i,dum.matrix);
  dum.position.set(a.x,a.y+.7+up+k,a.z);dum.updateMatrix();iHead.setMatrixAt(i,dum.matrix);i++}
  iHead.instanceMatrix.needsUpdate=iBody.instanceMatrix.needsUpdate=true}

/* ---------- Bonhommes ---------- */
const SPEC={
 lea:{skin:'#eec2a0',blush:'#ff8f86',hair:'#8a3b1d',hs:'wavy',eye:'#3f6f5a',earr:1,top:{k:'blazer',c:'#7a2a3a',c2:'#f6e9e4'},bot:{k:'skirt',c:'#22222b'},shoe:'#3a1a1f',sole:'#2a1a22',sock:'#22222b'},
 kenji:{skin:'#c98a58',blush:'#c0605a',hair:'#6b4423',hs:'dreads',eye:'#14100e',acc:'glasses',kj:1,top:{k:'jersey',c:'#f6f6f8'},bot:{k:'baggy',c:'#b9962a'},shoe:'#17171f',sole:'#f6f6f8',sock:'#f6f6f8'},
 sora:{skin:'#ecc29a',blush:'#ff8f9a',hair:'#1c1517',hs:'bun',eye:'#2a1a12',acc:'clip',top:{k:'gi',c:'#2a2b36',c2:'#f1f1f6'},bot:{k:'long',c:'#2a2b36'},shoe:'#ecc29a',sole:'#d6a878',W:.9,H:.95},
 ren:{skin:'#e6b98c',blush:'#d9715a',hair:'#14110f',hs:'fade',eye:'#2a1a12',acc:'band',bandC:'#f4f4f4',top:{k:'gi',c:'#2a2b36',c2:'#f1f1f6'},bot:{k:'long',c:'#2a2b36'},shoe:'#e6b98c',sole:'#c99a70',W:1.06,H:1.02},
 mizuki:{skin:'#4a2c1f',blush:'#a24a46',hair:'#120c0a',hs:'afro',eye:'#1a0f0a',acc:'band',top:{k:'tee',c:'#f2b01e'},bot:{k:'shorts',c:'#4c7fb6'},shoe:'#ffffff',sole:'#2a2a33',sock:'#ffffff'},
 ryo:{skin:'#d4a070',blush:'#e0745c',hair:'#17171f',hs:'side',eye:'#2a1a12',acc:'cap',top:{k:'hoodie',c:'#2f9a62'},bot:{k:'long',c:'#5a606c'},shoe:'#f2f2f2',sole:'#3a3a44'}};
function capsule(r,len,mat){const g=new THREE.Group();const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,16),mat);g.add(c);const a=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),mat);a.position.y=len/2;g.add(a);const b=a.clone();b.position.y=-len/2;g.add(b);return g}
const stripeTex=(a,b)=>ctex(8,64,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?b:a;g.fillRect(0,i*8,w,8)}});

const prof2=(tab,y)=>{if(y>=tab[0][0])return tab[0][1];for(let i=1;i<tab.length;i++){if(y>=tab[i][0]){const a=tab[i-1],b=tab[i],t=(y-a[0])/(b[0]-a[0]),s=t*t*(3-2*t);return a[1]+(b[1]-a[1])*s}}return tab[tab.length-1][1]};
const sstep=(y,a,b)=>{const t=Math.max(0,Math.min(1,(y-a)/(b-a)));return t*t*(3-2*t)};
function tube(rings,seg,wf,cf){
  const pos=[],col=[],si=[],sw=[],idx=[],n=rings.length;
  const vert=(x,y,z,w,c)=>{pos.push(x,y,z);col.push(c.r,c.g,c.b);si.push(...w.i);sw.push(...w.w)};
  rings.forEach(r=>{const w=wf(r.y),c=cf(r.y);for(let j=0;j<seg;j++){const a=j/seg*Math.PI*2;vert(r.cx+Math.sin(a)*r.rx,r.y,r.cz+Math.cos(a)*r.rz,w,c)}});
  for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*seg+j,b=i*seg+(j+1)%seg,c2=(i+1)*seg+j,d=(i+1)*seg+(j+1)%seg;idx.push(a,b,c2,b,d,c2)}
  const cap=(r,i,top)=>{const base=pos.length/3;vert(r.cx,r.y,r.cz,wf(r.y),cf(r.y));for(let j=0;j<seg;j++){const a=i*seg+j,b=i*seg+(j+1)%seg;top?idx.push(base,a,b):idx.push(base,b,a)}};
  cap(rings[0],0,false);cap(rings[n-1],n-1,true);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));g.setIndex(idx);g.computeVertexNormals();return g}
const LINc=c=>new THREE.Color(c).convertSRGBToLinear();
const snakeTex=ctex(512,512,(g,w,h)=>{g.clearRect(0,0,w,h);g.save();g.scale(2.56,2.56);g.lineCap='round';g.lineJoin='round';
  const G='#f0c030',GD='#8a6410',P=s=>new Path2D(s);
  g.fillStyle=GD;g.beginPath();g.arc(100,100,92,0,7);g.fill();g.fillStyle='#16161c';g.beginPath();g.arc(100,100,86,0,7);g.fill();
  const bp=P('M52 168 C100 176 130 150 104 126 C82 108 106 92 114 76');g.strokeStyle=GD;g.lineWidth=26;g.stroke(bp);g.strokeStyle=G;g.lineWidth=18;g.stroke(bp);
  g.fillStyle=GD;g.fill(P('M112 84 C70 76 62 36 108 26 C150 30 158 72 118 88Z'));g.fillStyle=G;g.fill(P('M112 80 C78 72 72 40 108 32 C142 36 148 68 118 82Z'));
  const hd=P('M114 36 C136 36 160 44 168 56 C158 66 136 66 120 58Z');g.fillStyle=G;g.fill(hd);g.strokeStyle=GD;g.lineWidth=3;g.stroke(hd);
  g.fillStyle='#fff';g.fill(P('M146 60 L152 76 L140 62Z'));g.fillStyle='#16161c';g.beginPath();g.arc(144,49,3.5,0,7);g.fill();
  g.strokeStyle='#d8342c';g.lineWidth=3;g.stroke(P('M168 58 L184 54 M184 54 L190 48 M184 54 L190 60'));
  g.strokeStyle=GD;g.lineWidth=3;g.stroke(P('M94 56 Q104 70 100 84 M86 60 Q96 74 92 88'));g.restore()});
function makeMizuki(){
  const root=new THREE.Group(),HIP=.68,SX=.74,SZ=.66,AX=.27;
  const SKIN='#4a2c1f';
  const mk=(c,o)=>M(c,Object.assign({roughness:.6},o||{}));
  const skin=mk(SKIN,{roughness:.5}),hairM=mk('#0a0a0f',{roughness:.5}),black=mk('#08080b',{roughness:.25}),white=mk('#f4f4f6',{roughness:.3});
  const add=(g,m,x,y,z)=>{m.position.set(x,y,z);g.add(m);return m};
  const sph=(r,mat,sx,sy,sz)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,22,16),mat);m.scale.set(sx||1,sy||1,sz||1);return m};
  const skinned=[],P={hip:HIP},skinC=LINc(SKIN),pantsC=LINc('#1d1512'),hemC=LINc('#2a1d17');
  // ---- jambes évasées
  const leg=(x)=>{const p=new THREE.Bone();p.position.set(x,HIP,0);
    const LGt=[[.1,.01],[.09,.07],[.06,.105],[0,.115],[-.15,.112],[-.3,.118],[-.42,.14],[-.52,.168],[-.6,.196],[-.64,.205],[-.655,.19],[-.662,.01]];
    const rr=[];for(let dy=-.662;dy<=.1001;dy+=.02){const r=prof2(LGt.slice().sort((a,b)=>b[0]-a[0]),dy);rr.push({y:HIP+dy,cx:x,cz:0,rx:r,rz:r*.92})}
    skinned.push({g:tube(rr,24,y=>({i:[0,0,0,0],w:[1,0,0,0]}),y=>(y-HIP)<-.62?hemC:pantsC),bones:[p]});
    const shM=mk('#6b4529',{roughness:.45}),soM=mk('#1c120c',{roughness:.7});
    const sh=sph(.13,shM,1.05,.62,1.75);add(p,sh,0,-.6,.17);add(p,new THREE.Mesh(new THREE.BoxGeometry(.25,.045,.5),soM),0,-.655,.15);
    const toe=sph(.09,shM,1,.7,1.1);add(p,toe,0,-.6,.36);
    root.add(p);return p};
  P.legL=leg(-.12);P.legR=leg(.12);
  // ---- corps
  const body=new THREE.Group();body.position.y=HIP;root.add(body);P.body=body;
  const hipC=new THREE.Mesh(new THREE.CylinderGeometry(.205,.2,.26,28),mk('#1d1512',{roughness:.75}));hipC.position.y=.03;hipC.scale.z=.9;body.add(hipC);
  const TP=[[-.06,.001],[-.055,.2],[0,.255],[.12,.28],[.32,.29],[.52,.275],[.66,.22],[.76,.12],[.79,.095]];
  const prof=TP.map(p=>new THREE.Vector2(p[1],p[0]));
  const torso=new THREE.Mesh(new THREE.LatheGeometry(prof,36),skin);torso.scale.set(SX,1,SZ);body.add(torso);
  const rAt=y=>{if(y<=TP[0][0])return TP[0][1];for(let i=1;i<TP.length;i++){if(y<=TP[i][0]){const a=TP[i-1],b=TP[i],t=(y-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t}}return TP[TP.length-1][1]};
  const zAt=(x,y,off,back)=>{const r=rAt(y);const q=Math.sqrt(Math.max(r*r-(x/SX)*(x/SX),0));const z=SZ*q+off;return back?-z:z};
  add(body,new THREE.Mesh(new THREE.CylinderGeometry(.062,.075,.3,16),skin),0,.86,0);
  // belt
  const bl=new THREE.Mesh(new THREE.TorusGeometry(.212,.026,8,32),mk('#0d0b0c',{roughness:.5}));bl.rotation.x=Math.PI/2;bl.position.y=.13;bl.scale.set(1,.92,1);body.add(bl);
  add(body,new THREE.Mesh(new THREE.BoxGeometry(.085,.06,.02),mk('#c8aa5a',{roughness:.3,metalness:.5})),0,.13,.205);
  // rubans conformes à la peau (côtes, clavicules, sangle)
  const rib=(pts,w,col,op,off,lay,back,dbl)=>{const rows=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(i-1,0)],b=pts[Math.min(i+1,pts.length-1)];const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,px=-dy/L,py=dx/L;rows.push([pts[i][0]-px*w/2,pts[i][0]+px*w/2,pts[i][1]-py*w/2,pts[i][1]+py*w/2])}
    const pos=[],idx=[];rows.forEach((r,k)=>{pos.push(r[0],r[2],zAt(r[0],r[2],off,back),r[1],r[3],zAt(r[1],r[3],off,back))});for(let k=0;k<rows.length-1;k++){const a=2*k;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    const m=op<1?new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:THREE.DoubleSide,depthWrite:false}):new THREE.MeshStandardMaterial({color:col,roughness:.7,side:THREE.DoubleSide});m.polygonOffset=true;m.polygonOffsetFactor=-lay;m.polygonOffsetUnits=-lay;body.add(new THREE.Mesh(g,m))};
  const arc=(x0,y0,x1,y1,bend,n)=>{const o=[];for(let i=0;i<=(n||8);i++){const t=i/(n||8);o.push([x0+(x1-x0)*t,y0+(y1-y0)*t+Math.sin(t*Math.PI)*bend])}return o};
  const DK=0x1b0e09;
  // côtes (de chaque côté du sternum)
  [-1,1].forEach(s=>{for(let i=0;i<6;i++){const y=.5-i*.062;rib(arc(s*.025,y,s*(.17-i*.004),y-.045,.012,8),.014,DK,.5,.004,2,false)}
    rib([[s*.02,.7],[s*.07,.72],[s*.13,.71],[s*.165,.68]],.016,DK,.55,.004,2,false);                       // clavicule
    rib(arc(s*.04,.62,s*.15,.55,.02,7),.012,DK,.3,.004,2,false);                                           // bas du pectoral
    rib([[s*.07,.1],[s*.07,.2],[s*.075,.28]],.012,DK,.25,.004,2,false)});                                  // abdos
  rib([[0,.72],[0,.55],[0,.35],[0,.16]],.014,DK,.45,.004,2,false);                                          // sternum
  rib([[-.12,.52],[-.13,.28],[-.12,.1]],.01,DK,.2,.004,2,true);
  // dos : colonne et omoplates
  rib([[0,.74],[0,.5],[0,.25],[0,.1]],.014,DK,.45,.004,2,true);
  [-1,1].forEach(s=>{rib(arc(s*.03,.64,s*.15,.5,.02,7),.014,DK,.4,.004,2,true);rib(arc(s*.04,.6,s*.14,.36,-.015,7),.012,DK,.3,.004,2,true)});
  // sangle
  rib([[-.1,.68],[-.02,.52],[.06,.36],[.14,.22],[.2,.1]],.062,0x0d0d12,1,.008,3,false);
  rib([[.2,.1],[.17,.0]],.05,0x0d0d12,1,.008,3,false);
  // ---- bras fins
  const AT=[[.1,.01],[.09,.05],[.06,.075],[0,.082],[-.08,.074],[-.15,.066],[-.25,.058],[-.3,.056],[-.38,.052],[-.5,.047],[-.56,.046],[-.585,.056],[-.6,.062],[-.66,.058],[-.7,.04],[-.72,.01]];
  const arm=(sg)=>{const sh=new THREE.Bone();sh.position.set(sg*AX,.62,0);const el=new THREE.Bone();el.position.y=-.3;sh.add(el);body.add(sh);
    const SY=HIP+.62,rr=[];for(let dy=-.72;dy<=.1001;dy+=.02){const r=prof2(AT.slice().sort((a,b)=>b[0]-a[0]),dy);rr.push({y:SY+dy,cx:sg*AX,cz:0,rx:r,rz:r})}
    skinned.push({g:tube(rr,18,y=>{const dy=y-SY;return dy>-.22?{i:[0,0,0,0],w:[1,0,0,0]}:dy>-.38?{i:[0,1,0,0],w:[1-sstep(dy,-.22,-.38),sstep(dy,-.22,-.38),0,0]}:{i:[1,0,0,0],w:[1,0,0,0]}},y=>skinC),bones:[sh,el]});
    return {sh,el,sgn:sg}};
  P.armR=arm(1);P.armL=arm(-1);
  // ---- guitare dans le dos
  const SC=.0023,GRED=mk('#d8232b',{roughness:.35}),GBLK=mk('#14141a',{roughness:.4}),GOUT=mk('#16080a',{roughness:.5});
  const gp=(x,y)=>[(x-130)*SC,-(y-300)*SC];
  const gshape=(pts)=>{const s=new THREE.Shape();pts.forEach((p,i)=>{const q=gp(p[0],p[1]);i?s.lineTo(q[0],q[1]):s.moveTo(q[0],q[1])});s.closePath();return s};
  const gex=(pts,mat,depth,z,bev)=>{const g=new THREE.ExtrudeGeometry(gshape(pts),{depth,bevelEnabled:true,bevelThickness:bev||.006,bevelSize:bev||.006,bevelSegments:1});const m=new THREE.Mesh(g,mat);m.position.z=z;m.castShadow=true;return m};
  const gt=new THREE.Group();
  const bodyPts=[[104,318],[158,308],[182,356],[318,250],[252,418],[262,560],[214,534],[52,700],[128,520],[104,456],[92,372]];
  gt.add(gex(bodyPts.map(p=>[160+(p[0]-160)*1.045,450+(p[1]-450)*1.03]),GOUT,.04,-.02,.004));
  gt.add(gex(bodyPts,GRED,.05,-.025,.006));
  // manche + frettes
  const nk=new THREE.Mesh(new THREE.BoxGeometry(.075,(330-72)*SC,.04),GBLK);nk.position.set(...gp(136,201),0).setZ?0:0;{const q=gp(136,201);nk.position.set(q[0],q[1],0)}gt.add(nk);
  for(let i=0;i<17;i++){const y=82+i*14.4,q=gp(136,y),w=.065+(i/17)*.02;const f=new THREE.Mesh(new THREE.BoxGeometry(w,.0035,.006),mk('#d9d9de',{roughness:.3}));f.position.set(q[0],q[1],.022);gt.add(f)}
  [3,5,7,9,12].forEach(i=>{const q=gp(136,82+i*14.4+7);const d=new THREE.Mesh(new THREE.CylinderGeometry(.0045,.0045,.004,10),mk('#8d8d96'));d.rotation.x=Math.PI/2;d.position.set(q[0],q[1],.023);gt.add(d)});
  // tête de manche
  gt.add(gex([[122,14],[150,0],[164,30],[142,78],[120,70]],GRED,.036,-.018,.004));
  [[128,24],[133,40],[138,55],[150,26],[154,38]].forEach(([x,y])=>{const q=gp(x,y);const t=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.05,8),GBLK);t.rotation.x=Math.PI/2;t.position.set(q[0],q[1],0);gt.add(t)});
  // micros, chevalet, boutons
  [[112,368,50,22],[108,410,58,26],[104,448,64,40]].forEach(([x,y,w,h],i)=>{const q=gp(x+w/2,y+h/2);const b=new THREE.Mesh(new THREE.BoxGeometry(w*SC,h*SC,.016),mk(i<2?'#15151a':'#1b1b22',{roughness:.3,metalness:.4}));b.position.set(q[0],q[1],.036);gt.add(b)});
  [[196,456],[204,484],[210,512],[214,540]].forEach(([x,y])=>{const q=gp(x,y);const k=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.02,14),mk('#15151a',{roughness:.3}));k.rotation.x=Math.PI/2;k.position.set(q[0],q[1],.036);gt.add(k)});
  // cordes
  const sm=new THREE.LineBasicMaterial({color:0xe9e9ee});for(let i=0;i<6;i++){const a=gp(130+i*3.2,74),b=gp(112+i*9.6,462);gt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0],a[1],.026),new THREE.Vector3(b[0],b[1],.04)]),sm))}
  gt.position.set(.03,.37,-.255);gt.rotation.z=-.3;body.add(gt);
  // ---- tête allongée
  const head=new THREE.Group();head.position.set(0,1.15,0);body.add(head);P.head=head;
  const skull=sph(.31,skin,.84,1.2,.94);head.add(skull);
  add(head,sph(.12,skin,.85,1.1,.9),0,-.31,.07);
  [-1,1].forEach(s=>add(head,sph(.055,skin,.6,1.1,.8),s*.255,-.02,0));
  add(head,sph(.036,mk('#5a3626',{roughness:.5}),.8,2.4,1),0,-.08,.27);add(head,sph(.042,mk('#5a3626',{roughness:.5}),1.1,.8,1),0,-.17,.29);
  [-1,1].forEach(s=>{const ch=new THREE.Mesh(new THREE.CircleGeometry(.07,16),new THREE.MeshBasicMaterial({color:0x140806,transparent:true,opacity:.28,depthWrite:false}));ch.position.set(s*.15,-.12,.235);ch.lookAt(s*.55,-.12,1.3);head.add(ch)});
  // visière (monture blanche, verres noirs)
  const rr=(w,h,r)=>{const s=new THREE.Shape();const x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.absarc(x+w-r,y+r,r,-Math.PI/2,0);s.lineTo(x+w,y+h-r);s.absarc(x+w-r,y+h-r,r,0,Math.PI/2);s.lineTo(x+r,y+h);s.absarc(x+r,y+h-r,r,Math.PI/2,Math.PI);s.lineTo(x,y+r);s.absarc(x+r,y+r,r,Math.PI,Math.PI*1.5);return s};
  const fr=new THREE.Mesh(new THREE.ExtrudeGeometry(rr(.62,.13,.062),{depth:.06,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2}),white);fr.position.set(0,.07,.285);fr.scale.set(.75,.75,1);head.add(fr);
  const ls=new THREE.Mesh(new THREE.ExtrudeGeometry(rr(.54,.082,.04),{depth:.02,bevelEnabled:false}),mk('#050507',{roughness:.12,metalness:.3}));ls.position.set(0,.07,.352);ls.scale.set(.75,.75,1);head.add(ls);
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(.26,.012),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.28,depthWrite:false}));gl.position.set(-.075,.0885,.374);gl.scale.set(.75,.75,1);head.add(gl);
  // yeux cachés (pour le clignement)
  P.eyes=[new THREE.Group(),new THREE.Group()];
  // moustache fine + bouche neutre
  const mu=new THREE.Mesh(new THREE.TorusGeometry(.08,.011,6,18,Math.PI),mk('#050506',{roughness:.6}));mu.scale.set(1.2,.36,1);mu.position.set(0,-.226,.268);head.add(mu);
  const lips=new THREE.Group();lips.position.set(0,-.252,.272);
  const lipM=mk('#3b1814',{roughness:.45}),lipL=mk('#4a201a',{roughness:.45});
  const up=sph(.05,lipM,1.15,.2,.34);up.position.y=.004;lips.add(up);const lo=sph(.044,lipL,1.1,.22,.36);lo.position.y=-.014;lo.position.z=-.002;lips.add(lo);
  const ln=new THREE.Mesh(new THREE.BoxGeometry(.088,.004,.006),mk('#120505'));ln.position.set(0,-.004,.012);lips.add(ln);
  head.add(lips);const smile=lips;P.smile=smile;
  const mouth=new THREE.Group();mouth.position.set(0,-.27,.262);mouth.add(sph(.055,mk('#3a0b14'),1.1,1,.5));const tg=sph(.03,mk('#c25a68'),1.2,.5,.6);tg.position.set(0,-.02,.01);mouth.add(tg);mouth.visible=false;head.add(mouth);P.mouth=mouth;
  // coupe en étoile
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.335,32,18,0,Math.PI*2,0,Math.PI*.5),hairM);cap.rotation.x=-.5;cap.position.set(0,.14,-.02);cap.scale.set(.92,1,.98);head.add(cap);
  const dirs=[[0,88,.58],[180,70,.5],[-60,62,.5],[60,62,.52],[-120,58,.44],[120,58,.46],[-90,32,.6],[90,32,.6],[-145,28,.46],[145,28,.48],[-70,6,.5],[70,6,.52],[180,24,.44],[-110,-18,.4],[110,-18,.42],[0,64,.4]];
  dirs.forEach(([az,el,L])=>{const a=az*Math.PI/180,e=el*Math.PI/180;const d=new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).normalize();
    const g=new THREE.ConeGeometry(.092,L,6,1);g.translate(0,L/2,0);const m=new THREE.Mesh(g,hairM);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);m.position.copy(d.clone().multiplyScalar(.27)).add(new THREE.Vector3(0,.1,-.02));head.add(m)});
  head.traverse(o=>{if(o.isMesh)o.castShadow=true});
  // squelette
  root.updateMatrixWorld(true);
  const vm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:0,skinning:true});
  skinned.forEach(s=>{const m=new THREE.SkinnedMesh(s.g,vm);m.frustumCulled=false;m.castShadow=true;root.add(m);m.bind(new THREE.Skeleton(s.bones))});
  root.userData={P,key:'mizuki',pose:'idle',ph:Math.random()*6,t0:0,blend:{},tagY:3.0};
  scene.add(root);return root}

function makeChar(key){
  if(key==='mizuki')return makeMizuki();
  const sp=SPEC[key],T=sp.top,B=sp.bot;const root=new THREE.Group();const HIP=.68;
  const mk=(c,o)=>M(c,Object.assign({roughness:.6},o||{}));
  const skin=mk(sp.skin,{roughness:.5}),hair=mk(sp.hair,{roughness:.55}),top=mk(T.c),top2=T.c2?mk(T.c2):top,pants=mk(B.c,{roughness:.75}),shoe=mk(sp.shoe,{roughness:.45}),sole=mk(sp.sole,{roughness:.7}),dark=mk('#17171f',{roughness:.4}),white=mk('#ffffff',{roughness:.3});
  const P={hip:HIP};
  const add=(g,m,x,y,z)=>{m.position.set(x,y,z);g.add(m);return m};
  const sph=(r,mat,sx,sy,sz)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),mat);m.scale.set(sx||1,sy||1,sz||1);return m};
  // ---- jambes
  const skinned=[];
  const leg=(x)=>{const p=new THREE.Bone();p.position.set(x,HIP,0);
    const LGt=B.k==='long'?[[.1,.01],[.09,.07],[.06,.11],[0,.125],[-.1,.118],[-.3,.108],[-.5,.1],[-.6,.096],[-.64,.06],[-.655,.01]]
      :B.k==='baggy'?[[.1,.01],[.09,.07],[.08,.13],[0,.155],[-.15,.165],[-.28,.168],[-.31,.155],[-.325,.09],[-.45,.082],[-.5,.085],[-.6,.09],[-.64,.06],[-.655,.01]]
      :B.k==='shorts'?[[.1,.01],[.09,.07],[.06,.115],[0,.13],[-.15,.128],[-.3,.1],[-.34,.088],[-.45,.082],[-.55,.088],[-.62,.09],[-.65,.06],[-.665,.01]]
      :[[.1,.01],[.09,.06],[.06,.085],[0,.09],[-.2,.085],[-.4,.082],[-.5,.088],[-.6,.092],[-.64,.06],[-.655,.01]];
    const pantsC=LINc(B.c),skinC=LINc(sp.skin),sockC=LINc(sp.sock||'#ffffff');
    const rr=[];for(let dy=-.655;dy<=.1001;dy+=.02){const r=prof2(LGt.slice().sort((a,b)=>b[0]-a[0]),dy);rr.push({y:HIP+dy,cx:x,cz:0,rx:r,rz:r})}
    const g=tube(rr,20,y=>({i:[0,0,0,0],w:[1,0,0,0]}),y=>{const dy=y-HIP;if(B.k==='baggy'){if(dy>-.322)return pantsC;if((dy<-.455&&dy>-.47)||(dy<-.49&&dy>-.505))return LINc('#17171f');return dy<-.44?sockC:skinC}if(B.k==='long')return pantsC;if(B.k==='shorts'){if(dy>-.3)return pantsC;return dy<-.5?sockC:skinC}return dy<-.5?sockC:skinC});
    skinned.push({g,bones:[p]});
    // chaussure
    const sh=sph(.125,shoe,1,.66,1.55);add(p,sh,0,-.615,.075);add(p,new THREE.Mesh(new THREE.BoxGeometry(.235,.05,.4),sole),0,-.655,.07);
    const lc=new THREE.Mesh(new THREE.BoxGeometry(.2,.01,.02),white);add(p,lc,0,-.57,.2);
    root.add(p);return p};
  P.legL=leg(-.13);P.legR=leg(.13);
  // ---- corps
  const body=new THREE.Group();body.position.y=HIP;root.add(body);P.body=body;
  add(body,new THREE.Mesh(new THREE.CylinderGeometry(.255,.24,.24,26),T.k==='dress'?top:pants),0,.04,0).scale.z=.82;
  const prof=[[.001,-.06],[.2,-.055],[.255,.0],[.28,.12],[.29,.32],[.275,.52],[.22,.66],[.12,.76],[.095,.79]].map(p=>new THREE.Vector2(p[0],p[1]));
  let tmat=top;if(T.k==='stripes'){const tx=stripeTex(T.c,T.c2);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(1,1);tmat=M(0xffffff,{map:tx,roughness:.7})}
  const torso=new THREE.Mesh(new THREE.LatheGeometry(prof,32),tmat);torso.scale.z=.8;body.add(torso);
  // col
  const col=new THREE.Mesh(new THREE.TorusGeometry(.1,.03,10,24),T.k==='jacket'?top2:T.k==='blazer'?top:T.k==='stripes'?top:top);col.rotation.x=Math.PI/2;col.position.y=.78;col.scale.set(1,.9,1);body.add(col);if(T.k==='jersey')col.material=dark;
  if(T.k==='gi'){const tr=mk('#3b3c4a',{roughness:.7,side:THREE.DoubleSide}),belt=mk(T.c2||'#f4f4f4',{roughness:.6}),und=mk('#f4f1ea',{roughness:.6,side:THREE.DoubleSide}),fold=mk('#4a4b5e',{roughness:.8,side:THREE.DoubleSide});
    const TP=[[-.06,.001],[-.055,.2],[0,.255],[.12,.28],[.32,.29],[.52,.275],[.66,.22],[.76,.12],[.79,.095]];
    const rAt=y=>{if(y<=TP[0][0])return TP[0][1];for(let i=1;i<TP.length;i++){if(y<=TP[i][0]){const a=TP[i-1],b=TP[i],t=(y-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t}}return TP[TP.length-1][1]};
    const zAt=(x,y,off,back)=>{const r=rAt(y);const z=.8*Math.sqrt(Math.max(r*r-x*x,0))+off;return back?-z:z};
    const ribbon=(rows,mat,off,lay)=>{const pos=[],idx=[],uv=[];rows.forEach((r,k)=>{[r[0],r[1]].forEach((x,s)=>{pos.push(x,r[2],zAt(x,r[2],off,false));uv.push(s,k/(rows.length-1))})});for(let k=0;k<rows.length-1;k++){const a=2*k;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=mat.clone();m.polygonOffset=true;m.polygonOffsetFactor=-(lay||1);m.polygonOffsetUnits=-(lay||1);const me=new THREE.Mesh(g,m);me.castShadow=false;body.add(me);return me};
    const band=(p0,p1,w,mat,off,lay)=>{const n=16,rows=[];const dx=p1[0]-p0[0],dy=p1[1]-p0[1],L=Math.hypot(dx,dy),px=-dy/L,py=dx/L;for(let k=0;k<=n;k++){const t=k/n,cx=p0[0]+dx*t,cy=p0[1]+dy*t;rows.push([cx-px*w/2,cx+px*w/2,cy])}return ribbon(rows,mat,off,lay)};
    const decal=(cx,cy,w,h,back,lay)=>{const nx=8,ny=8,pos=[],uv=[],idx=[];for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const x=cx+(i/nx-.5)*w,y=cy+(.5-j/ny)*h;pos.push(back?-x:x,y,zAt(back?-x:x,y,.006,back));uv.push(i/nx,1-j/ny)}
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;idx.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1)}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
      const m=new THREE.MeshBasicMaterial({map:snakeTex,transparent:true,alphaTest:.1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-(lay||4),polygonOffsetUnits:-(lay||4)});body.add(new THREE.Mesh(g,m))};
    // col en V : T-shirt blanc, puis deux revers qui se croisent
    const nT=.75,ap=.43;
    ribbon(Array.from({length:10},(_,k)=>{const t=k/9,y=nT+(ap-nT)*t,hw=.118*(1-t);return [-hw,hw,y]}),und,.004,1);
    band([-.108,.74],[.1,.13],.062,tr,.008,2);
    band([.108,.74],[-.1,.13],.062,tr,.012,3);
    // plis (collés à la surface)
    [[[-.17,.45],[-.13,.28]],[[.15,.3],[.19,.16]],[[-.08,.2],[-.09,.1]],[[.16,.58],[.2,.44]]].forEach(([p,q])=>band(p,q,.012,fold,.004,2));
    const bt=new THREE.Mesh(new THREE.TorusGeometry(.282,.04,10,32),belt);bt.rotation.x=Math.PI/2;bt.position.y=.08;bt.scale.set(1,.82,1);body.add(bt);
    add(body,new THREE.Mesh(new THREE.BoxGeometry(.1,.08,.034),belt),.02,.08,.235);[-1,1].forEach(s=>{const t=new THREE.Mesh(new THREE.BoxGeometry(.045,.28,.014),belt);t.position.set(.02+s*.04,-.08,.238);t.rotation.z=s*.12;body.add(t)});
    decal(.175,.4,.13,.13,false,4);decal(0,.4,.38,.38,true,4)}
  if(T.k==='jersey'){
    const TP=[[-.06,.001],[-.055,.2],[0,.255],[.12,.28],[.32,.29],[.52,.275],[.66,.22],[.76,.12],[.79,.095]];
    const rAt=y=>{if(y<=TP[0][0])return TP[0][1];for(let i=1;i<TP.length;i++){if(y<=TP[i][0]){const a=TP[i-1],b=TP[i],t=(y-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t}}return TP[TP.length-1][1]};
    const zAt=(x,y,off,back)=>{const r=rAt(y);const z=.8*Math.sqrt(Math.max(r*r-x*x,0))+off;return back?-z:z};
    const jdec=(tex,cx,cy,w,h,back)=>{const nx=10,ny=6,pos=[],uv=[],idx=[];for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const x=cx+(i/nx-.5)*w,y=cy+(.5-j/ny)*h;pos.push(back?-x:x,y,zAt(back?-x:x,y,.006,back));uv.push(i/nx,1-j/ny)}
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;idx.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1)}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
      body.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4})))};
    const txF=ctex(512,160,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#23232b';g.font='800 104px Arial, Helvetica, sans-serif';g.textAlign='center';g.fillText('KUROVEN',w/2,100);g.fillStyle='#d9302a';g.fillRect(w*.2,124,w*.6,12)});
    const txB=ctex(512,512,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#23232b';g.textAlign='center';g.font='800 84px Arial, Helvetica, sans-serif';g.fillText('KENJI',w/2,110);g.font='900 380px Arial Black, Arial, sans-serif';g.fillText('7',w/2,470)});
    jdec(txF,0,.38,.34,.106,false);jdec(txB,0,.4,.34,.34,true);
    const chain=new THREE.Mesh(new THREE.TorusGeometry(.12,.008,6,28),mk('#f0c030',{roughness:.25,metalness:.5}));chain.rotation.x=Math.PI/2-.5;chain.position.set(0,.67,.05);body.add(chain);
    add(body,sph(.02,mk('#f0c030',{roughness:.25,metalness:.5})),0,.56,.225)}
  if(T.k==='blazer'){const sh=new THREE.Shape();sh.moveTo(-.085,.04);sh.lineTo(.085,.04);sh.lineTo(0,-.2);sh.lineTo(-.085,.04);const v=new THREE.Mesh(new THREE.ShapeGeometry(sh),mk(T.c2));v.position.set(0,.66,.185);v.rotation.x=-.3;body.add(v);
    const dk=new THREE.Color(T.c).multiplyScalar(.72).getStyle();[-1,1].forEach(s=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.03,.3,.02),mk(dk));l.position.set(s*.098,.57,.205);l.rotation.z=s*.33;l.rotation.x=-.28;body.add(l)});
    add(body,new THREE.Mesh(new THREE.BoxGeometry(.01,.34,.02),mk(dk)),0,.27,.238);[.2,.07].forEach(y=>add(body,sph(.018,mk('#e8c95a',{roughness:.3})),.035,y,.244));add(body,new THREE.Mesh(new THREE.TorusGeometry(.285,.016,8,28),mk(dk)),0,.0,0).rotation.x=Math.PI/2;body.children[body.children.length-1].scale.set(1,.82,1)}
  if(T.k==='jacket'){add(body,new THREE.Mesh(new THREE.BoxGeometry(.012,.62,.02),dark),0,.34,.226);const v=new THREE.Mesh(new THREE.PlaneGeometry(.2,.26),mk(T.c2));v.position.set(0,.56,.222);v.scale.set(1,1,1);body.add(v);add(body,new THREE.Mesh(new THREE.TorusGeometry(.285,.018,8,28),mk('#12304f')),0,.0,0).rotation.x=Math.PI/2;body.children[body.children.length-1].scale.set(1,.82,1)}
  if(T.k==='hoodie'){const hd=new THREE.Mesh(new THREE.TorusGeometry(.16,.07,12,24),top);hd.rotation.x=1.2;hd.position.set(0,.76,-.1);body.add(hd);const po=new THREE.Mesh(new THREE.BoxGeometry(.3,.12,.04),mk(new THREE.Color(T.c).multiplyScalar(.85).getStyle()));po.position.set(0,.14,.215);body.add(po);[-.05,.05].forEach(x=>{const d=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.2,6),white);d.position.set(x,.62,.225);body.add(d)})}
  if(T.k==='dress'){const sk=new THREE.Mesh(new THREE.CylinderGeometry(.26,.5,.46,34,1,true),mk(T.c,{side:THREE.DoubleSide}));sk.position.y=-.14;sk.scale.z=.9;body.add(sk);const hem=new THREE.Mesh(new THREE.TorusGeometry(.5,.016,8,40),top2);hem.rotation.x=Math.PI/2;hem.position.y=-.37;hem.scale.set(1,.9,1);body.add(hem);const bw=new THREE.Mesh(new THREE.TorusGeometry(.272,.022,8,28),top2);bw.rotation.x=Math.PI/2;bw.position.y=.1;bw.scale.set(1,.8,1);body.add(bw)}
  if(T.k==='tee'||T.k==='stripes'){/* rien de plus */}
  if(B.k==='long'||B.k==='shorts'){const bl=new THREE.Mesh(new THREE.TorusGeometry(.252,.016,8,28),dark);bl.rotation.x=Math.PI/2;bl.position.y=.12;bl.scale.set(1,.82,1);body.add(bl)}
  // ---- bras
  const longSl=(T.k==='jacket'||T.k==='blazer'||T.k==='gi'||T.k==='hoodie'||T.k==='stripes');
  const arm=(x,sgn)=>{const sh=new THREE.Bone();sh.position.set(x,.62,0);const el=new THREE.Bone();el.position.y=-.3;sh.add(el);body.add(sh);
    const AT=[[.1,.01],[.09,.06],[.06,.095],[0,.105],[-.08,.098],[-.15,.09],[-.25,.084],[-.3,.083],[-.38,.078],[-.5,.072],[-.56,.07],[-.585,.082],[-.6,.088],[-.66,.086],[-.7,.06],[-.72,.01]];
    const topC=LINc(T.c),top2C=LINc(T.c2||T.c),skinC=LINc(sp.skin),cuffC=T.k==='gi'?LINc(T.c):T.k==='jacket'?LINc('#12304f'):T.k==='blazer'?new THREE.Color(T.c).multiplyScalar(.72).convertSRGBToLinear():top2C;
    const SY=HIP+.62,rr=[];for(let dy=-.72;dy<=.1001;dy+=.02){const r=prof2(AT.slice().sort((a,b)=>b[0]-a[0]),dy);rr.push({y:SY+dy,cx:x,cz:0,rx:r,rz:r})}
    const g=tube(rr,20,y=>{const dy=y-SY;return dy>-.22?{i:[0,0,0,0],w:[1,0,0,0]}:dy>-.38?{i:[0,1,0,0],w:[1-sstep(dy,-.22,-.38),sstep(dy,-.22,-.38),0,0]}:{i:[1,0,0,0],w:[1,0,0,0]}},y=>{const dy=y-SY;
      if(longSl){if(dy<-.555)return skinC;if(dy<-.53)return cuffC;return topC}
      if(T.k==='jersey')return dy>-.19?topC:dy>-.205?LINc('#17171f'):skinC;
      return dy>-.3?topC:skinC});
    skinned.push({g,bones:[sh,el]});
    add(el,sph(.04,skin),sgn*-.07,-.285,.04);
    if(T.k==='jersey'){[-.014,.014].forEach(dz=>{const st=new THREE.Mesh(new THREE.BoxGeometry(.01,.2,.012),dark);st.position.set(sgn*.099,-.1,dz);st.rotation.z=sgn*.03;sh.add(st)})}
    return {sh,el,sgn}};
  P.armR=arm(.35,1);P.armL=arm(-.35,-1);
  // ---- tête
  const head=new THREE.Group();head.position.y=.98;body.add(head);P.head=head;
  add(body,new THREE.Mesh(new THREE.CylinderGeometry(.085,.1,.22,16),skin),0,.74,0);
  const skull=sph(.31,skin,1,1.08,1);head.add(skull);
  // oreilles
  [-1,1].forEach(s=>{add(head,sph(.058,skin,.6,1,.8),s*.3,-.01,0);add(head,sph(.03,mk(new THREE.Color(sp.skin).multiplyScalar(.82).getStyle()),.5,.9,.5),s*.315,-.01,.01)});
  // nez
  add(head,sph(.042,mk(new THREE.Color(sp.skin).multiplyScalar(1.04).getStyle()),1,.9,.9),0,-.025,.3);
  // yeux
  P.eyes=[];[-1,1].forEach(s=>{const g=new THREE.Group();g.position.set(s*.105,.045,.272);const w=sph(.058,white,1,1.15,.5);g.add(w);const ir=sph(.036,mk(sp.eye,{roughness:.3}),1,1.05,.4);ir.position.z=.022;g.add(ir);const pu=sph(.02,dark,1,1,.4);pu.position.z=.034;g.add(pu);const hl=sph(.009,white,1,1,1);hl.position.set(.012,.014,.045);g.add(hl);head.add(g);P.eyes.push(g);
    const br=new THREE.Mesh(new THREE.BoxGeometry(.105,.02,.022),hair);br.position.set(s*.105,.125,.282);br.rotation.z=-s*.12;head.add(br);
    const ch=new THREE.Mesh(new THREE.CircleGeometry(.05,16),new THREE.MeshBasicMaterial({color:new THREE.Color(sp.blush),transparent:true,opacity:.35}));ch.position.set(s*.16,-.07,.268);ch.lookAt(s*.5,-.07,1.2);head.add(ch)});
  // bouche
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.07,.012,8,22,Math.PI),mk(new THREE.Color(sp.skin).multiplyScalar(.45).getStyle(),{roughness:.5}));smile.position.set(0,-.07,.292);smile.rotation.z=Math.PI;head.add(smile);P.smile=smile;
  const mouth=new THREE.Group();mouth.position.set(0,-.115,.275);const mo=sph(.07,mk('#4a0f1c'),1,1,.55);mouth.add(mo);const tg=sph(.04,mk('#d96a78'),1.2,.55,.6);tg.position.set(0,-.03,.012);mouth.add(tg);const tt=new THREE.Mesh(new THREE.BoxGeometry(.09,.02,.02),white);tt.position.set(0,.04,.034);mouth.add(tt);mouth.visible=false;head.add(mouth);P.mouth=mouth;
  if(sp.kj){
    P.eyes.forEach(g=>{[1,2,3].forEach(i=>{if(g.children[i])g.children[i].position.x+=.017});
      const lid=new THREE.Mesh(new THREE.SphereGeometry(.066,16,10,0,Math.PI*2,0,Math.PI/2),skin);lid.scale.set(1.04,.8,.8);lid.position.set(0,.002,.012);g.add(lid);
      const ln=new THREE.Mesh(new THREE.BoxGeometry(.135,.009,.012),dark);ln.position.set(0,.002,.034);g.add(ln)});
    head.children.filter(c=>c.geometry&&c.geometry.type==='BoxGeometry'&&Math.abs(c.position.y-.125)<.001).forEach(c=>c.visible=false);
    const flat=new THREE.Mesh(new THREE.BoxGeometry(.085,.012,.012),mk('#3a1c10'));flat.position.set(0,-.1,.298);head.add(flat);head.remove(smile);P.smile=flat;
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(.034,.006,8,18),mk('#e4e4ea',{roughness:.2,metalness:.7}));hoop.position.set(.318,-.07,.02);hoop.rotation.y=Math.PI/2;head.add(hoop)}
  // cheveux
  const cap=(r,rot,ph)=>{const c=new THREE.Mesh(new THREE.SphereGeometry(r,32,18,0,Math.PI*2,0,ph||Math.PI*.54),hair);c.rotation.x=rot;c.position.y=.02;c.scale.y=1.02;head.add(c);return c};
  const hs=sp.hs;
  if(hs==='long'){cap(.335,-.5);add(head,sph(.36,hair,.98,1.32,.62),0,-.2,-.17);[-1,1].forEach(s=>{const l=capsule(.06,.3,hair);add(head,l,s*.285,-.16,.06)});const bn=new THREE.Mesh(new THREE.SphereGeometry(.34,24,12,0,Math.PI*2,.15,.5),hair);bn.rotation.x=-.5;bn.position.set(0,.03,.05);head.add(bn)}
  else if(hs==='bob'){cap(.335,-.45);add(head,sph(.36,hair,1.03,.88,.9),0,-.07,-.13);[-1,1].forEach(s=>add(head,sph(.09,hair,.8,2.1,1.5),s*.31,-.17,-.04));const fr=new THREE.Mesh(new THREE.SphereGeometry(.335,28,10,Math.PI*.12,Math.PI*.76,.42,.38),hair);fr.rotation.x=-.12;fr.position.set(0,.01,.03);head.add(fr)}
  else if(hs==='wavy'){cap(.335,-.5);add(head,sph(.36,hair,1.0,1.25,.6),0,-.22,-.17);[-1,1].forEach(s=>{[0,1,2].forEach(i=>add(head,sph(.085-i*.008,hair,.9,1,.9),s*(.3+(i%2)*.025),.0-i*.15,.02-i*.035))});const sw=new THREE.Mesh(new THREE.SphereGeometry(.34,24,10,Math.PI*.1,Math.PI*.6,.2,.55),hair);sw.rotation.x=-.2;sw.rotation.z=.18;sw.position.set(-.02,.04,.04);head.add(sw)}
  else if(hs==='ponytail'){cap(.335,-.48);const tail=new THREE.Group();tail.position.set(0,.16,-.3);tail.rotation.x=.35;head.add(tail);add(tail,sph(.09,hair,1,1,1),0,0,0);const t1=capsule(.075,.3,hair);t1.position.set(0,-.24,-.03);tail.add(t1);const t2=sph(.07,hair,1,1.6,1);t2.position.set(0,-.5,-.05);tail.add(t2);add(head,new THREE.Mesh(new THREE.TorusGeometry(.075,.018,8,16),mk('#e0b84a')),0,.15,-.3).rotation.x=Math.PI/2-.55;const fr=new THREE.Mesh(new THREE.SphereGeometry(.335,24,10,Math.PI*.25,Math.PI*.5,.4,.42),hair);fr.rotation.x=-.2;fr.position.set(0,.02,.03);head.add(fr);[-1,1].forEach(s=>add(head,sph(.06,hair,.6,1.5,.7),s*.3,.04,.0))}
  else if(hs==='pixie'){cap(.33,-.42,Math.PI*.52);add(head,sph(.33,hair,1.0,.62,.98),0,.1,-.04);const sw=new THREE.Mesh(new THREE.SphereGeometry(.335,24,10,Math.PI*.05,Math.PI*.55,.2,.5),hair);sw.rotation.x=-.2;sw.rotation.z=-.3;sw.position.set(.03,.04,.045);head.add(sw);add(head,sph(.1,hair,1.3,.7,.9),.2,.22,.2);[-1,1].forEach(s=>add(head,sph(.05,hair,.6,1.3,.8),s*.3,.05,-.03))}
  else if(hs==='dreads'){
    const hm=mk('#4a2c14',{roughness:.7});add(head,sph(.315,hm,.95,.95,.96),0,.0,-.06);
    const cols=['#5a3418','#6e4524','#46280f'].map(c=>mk(c,{roughness:.6}));
    const A=[54,62,70,80,90,99,108,117,126,135,144,153,162,171,180].map(d=>d*Math.PI/180);
    A.forEach((a0,k)=>{[1,-1].forEach(sg=>{if(a0>Math.PI*.999&&sg<0)return;const a=a0*sg;
      const front=a0<=Math.PI*80.5/180;const back=!front&&Math.cos(a)<-.1;
      const len=(front?.5:back?.46:.46)+((k*37)%5)*.02;
      const R=front?.345:.335,Rz=front?.31:.325,rad=front?.037:.036;
      const g=new THREE.Group();g.position.set(Math.sin(a)*R,.16,Math.cos(a)*Rz-.02);g.rotation.z=Math.sin(a)*(front?.05:.07);g.rotation.x=-Math.cos(a)*(front?.0:.08);head.add(g);
      const m=cols[k%3];const c=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*.8,len,8),m);c.position.y=-len/2;g.add(c);const e=new THREE.Mesh(new THREE.SphereGeometry(rad*.8,8,6),m);e.position.y=-len;g.add(e)})})}
  else if(hs==='fade'){cap(.322,-.38,Math.PI*.5);const t=sph(.3,hair,1,.5,.95);t.position.set(0,.2,-.02);head.add(t)}
  else if(hs==='bun'){cap(.34,-.42);add(head,sph(.15,hair),0,.4,-.06);const fr=new THREE.Mesh(new THREE.SphereGeometry(.335,24,10,Math.PI*.2,Math.PI*.6,.45,.45),hair);fr.rotation.x=-.2;fr.position.set(0,.01,.02);head.add(fr);[-1,1].forEach(s=>add(head,sph(.09,hair,.7,1.7,.7),s*.3,-.04,.02));}
  else if(hs==='afro'){add(head,sph(.43,hair,1.02,.96,.86),0,.1,-.1);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;add(head,sph(.13,hair),Math.sin(a)*.34,.12+Math.cos(a*3)*.05,Math.cos(a)*.3-.14)}}
  else {cap(.335,-.45);add(head,sph(.18,hair,1.25,.75,1),-.17,.2,.17);add(head,sph(.1,hair),.25,.18,.08)}
  // accessoires
  if(sp.acc==='glasses'){[-1,1].forEach(s=>{const r=new THREE.Mesh(new THREE.TorusGeometry(.082,.012,8,24),dark);r.position.set(s*.105,.045,.3);head.add(r);const gl=new THREE.Mesh(new THREE.CircleGeometry(.08,20),new THREE.MeshBasicMaterial({color:0xaed4ff,transparent:true,opacity:.14}));gl.position.set(s*.105,.045,.302);head.add(gl);const t=new THREE.Mesh(new THREE.BoxGeometry(.01,.01,.26),dark);t.position.set(s*.19,.045,.18);head.add(t)});add(head,new THREE.Mesh(new THREE.BoxGeometry(.05,.01,.01),dark),0,.055,.3)}
  if(sp.earr){[-1,1].forEach(s=>add(head,sph(.028,mk('#f0c24a',{roughness:.25}),1,1.4,1),s*.3,-.09,.01))}
  if(sp.acc==='band'){const b=new THREE.Mesh(new THREE.TorusGeometry(.315,.035,10,32),mk(sp.bandC||'#2fb36e'));b.rotation.x=Math.PI/2-.25;b.position.set(0,.12,-.02);b.scale.set(1,1,.98);head.add(b)}
  if(sp.acc==='clip'){const c=new THREE.Mesh(new THREE.BoxGeometry(.06,.025,.02),mk('#ffd84a'));c.position.set(.2,.2,.27);c.rotation.z=-.5;head.add(c);const c2=c.clone();c2.position.set(.23,.17,.26);head.add(c2)}
  if(sp.acc==='cap'){const cp=new THREE.Mesh(new THREE.SphereGeometry(.345,28,14,0,Math.PI*2,0,Math.PI*.5),mk('#1c1c24'));cp.rotation.x=-.22;cp.position.set(0,.04,-.01);head.add(cp);const br=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.025,28,1,false,-Math.PI/2,Math.PI),mk('#1c1c24'));br.position.set(0,.115,.25);br.scale.set(1.05,1,1.15);br.rotation.x=.12;head.add(br);add(head,new THREE.Mesh(new THREE.BoxGeometry(.07,.04,.01),mk('#2f9a62')),0,.22,.33)}
  if(sp.kj){const red=mk('#d9302a',{roughness:.8}),redD=mk('#b32420',{roughness:.8});
    const bn=new THREE.Group();bn.position.set(0,.215,-.005);bn.rotation.x=.04;head.add(bn);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.338,32,16,0,Math.PI*2,0,Math.PI/2),red);dome.scale.set(1,1.1,1.02);dome.position.y=.04;bn.add(dome);
    bn.add(new THREE.Mesh(new THREE.CylinderGeometry(.345,.336,.13,32),redD));
    [.065,-.065].forEach(y=>{const t=new THREE.Mesh(new THREE.TorusGeometry(.34,.012,8,32),redD);t.rotation.x=Math.PI/2;t.position.y=y;bn.add(t)});
    [-.022,.022].forEach(y=>{const t=new THREE.Mesh(new THREE.TorusGeometry(.3455,.004,6,32),mk('#8e1a17',{roughness:.9}));t.rotation.x=Math.PI/2;t.position.y=y;bn.add(t)});
    const tip=sph(.13,red,1,1.25,1);tip.position.set(.06,.3,-.13);tip.rotation.z=-.5;bn.add(tip);
    const tf=new THREE.Mesh(new THREE.ConeGeometry(.05,.14,8),red);tf.position.set(.17,.39,-.13);tf.rotation.z=-1.1;bn.add(tf);
    const lt=ctex(256,192,(g,w,h)=>{g.clearRect(0,0,w,h);g.font='900 150px Impact, Arial Black, sans-serif';g.textAlign='center';g.lineJoin='round';g.lineWidth=16;g.strokeStyle='#14100e';g.strokeText('M',w/2,150);g.fillStyle='#e8e8ee';g.fillText('M',w/2,150)});
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(.15,.113),new THREE.MeshBasicMaterial({map:lt,transparent:true,alphaTest:.1}));pl.position.set(-.04,0,.352);bn.add(pl);
    const tg=new THREE.Mesh(new THREE.BoxGeometry(.09,.065,.01),mk('#f0c030',{roughness:.5}));tg.position.set(.17,0,.305);tg.rotation.y=.5;tg.rotation.z=-.08;bn.add(tg)}
  root.traverse(o=>{if(o.isMesh)o.castShadow=true});
  root.updateMatrixWorld(true);
  const vm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:0,skinning:true});
  skinned.forEach(s=>{const m=new THREE.SkinnedMesh(s.g,vm);m.frustumCulled=false;m.castShadow=true;root.add(m);m.bind(new THREE.Skeleton(s.bones))});
  root.userData={P,key,pose:'idle',ph:Math.random()*6,t0:0,blend:{}};
  scene.add(root);return root}
const CH={};PLAYERS.forEach(p=>{CH[p[0]]=makeChar(p[0])});

// Poses : angles cibles (z épaule +x, z coude, x épaule) par bras
const POSES={
 idle:{aR:[.1,-.1,0],aL:[.1,-.1,0]},
 sing:{aR:[1.15,-.3,0],aL:[1.15,-.3,0]},
 cheer:{aR:[2.9,-.15,0],aL:[2.9,-.15,0]},
 clap:{aR:[-.25,-.7,-1.25],aL:[-.25,-.7,-1.25]},
 hear:{aR:[1.7,-1.8,0],aL:[.1,-.1,0]},
 wave:{aR:[2.55,-.5,0],aL:[.1,-.1,0]},
 shrug:{aR:[.95,-1.2,0],aL:[.95,-1.2,0]},
 bow:{aR:[.15,-.1,.1],aL:[.15,-.1,.1]},
 walk:{aR:[.1,-.2,0],aL:[.1,-.2,0]}
};
function animChar(c,t,dt){
  const u=c.userData,P=u.P,pose=POSES[u.pose]||POSES.idle,time=t+u.ph;
  let tgR=pose.aR.slice(),tgL=pose.aL.slice(),bodyX=0,bodyZ=0,bodyY=0,headX=0,headY=0,headZ=0,mouth=0,legA=0;
  const s=Math.sin;
  switch(u.pose){
   case 'idle':bodyY=s(time*2)*.012;tgR[0]+=s(time*1.6)*.05;tgL[0]-=s(time*1.6)*.05;break;
   case 'sing':bodyZ=s(time*3.2)*.07;bodyY=Math.abs(s(time*6.4))*.02;tgR[0]+=s(time*5)*.28;tgL[0]+=s(time*5+1)*.28;headX=-.18+s(time*3.2)*.1;headZ=s(time*3.2)*.1;mouth=.25+.75*Math.abs(s(time*9));if(u.live!=null)mouth=.08+u.live*.92;break;
   case 'cheer':bodyY=Math.abs(s(time*7))*.1;tgR[0]+=s(time*7)*.2;tgL[0]+=s(time*7+1.6)*.2;headX=-.15;mouth=.7;break;
   case 'clap':bodyY=Math.abs(s(time*5))*.03;{const k=.5+.5*s(time*9);tgR[0]=-.05-.35*k;tgL[0]=-.05-.35*k}break;
   case 'hear':headZ=-.18+s(time*1.5)*.05;headY=.25;bodyZ=-.05;tgR[1]=-1.75+s(time*3)*.06;bodyY=s(time*2)*.01;break;
   case 'wave':tgR[1]=-.5+s(time*7)*.5;bodyY=s(time*2)*.012;mouth=.2;break;
   case 'shrug':headY=s(time*5)*.35;bodyY=s(time*10)*.006;tgR[0]+=s(time*3)*.08;tgL[0]+=s(time*3)*.08;break;
   case 'bow':{const ph=(time*.5)%1;const b=ph<.2?0:ph<.4?ease((ph-.2)/.2):ph<.7?1:1-ease((ph-.7)/.3);bodyX=b*.95;headX=b*.25;mouth=0}break;
   case 'walk':legA=s(time*9)*.7;bodyY=Math.abs(s(time*9))*.04;bodyZ=s(time*9)*.04;tgR[0]=.1+s(time*9)*.1;tgL[0]=.1+s(time*9)*.1;break;
  }
  const k=1-Math.exp(-dt*12);
  const L=(o,key,v)=>{o[key]=(o[key]===undefined?v:o[key]);o[key]+=(v-o[key])*k;return o[key]};
  const b=u.blend;
  P.armR.sh.rotation.z=L(b,'rz',tgR[0]);P.armR.el.rotation.z=L(b,'re',tgR[1]);P.armR.sh.rotation.x=L(b,'rx',tgR[2]);
  P.armL.sh.rotation.z=-L(b,'lz',tgL[0]);P.armL.el.rotation.z=-L(b,'le',tgL[1]);P.armL.sh.rotation.x=L(b,'lx',tgL[2]);
  P.body.rotation.x=L(b,'bx',bodyX);P.body.rotation.z=L(b,'bz',bodyZ);P.body.position.y=P.hip+bodyY;
  P.head.rotation.x=L(b,'hx',headX);P.head.rotation.y=L(b,'hy',headY);P.head.rotation.z=L(b,'hz',headZ);
  P.legL.rotation.x=L(b,'ll',legA);P.legR.rotation.x=L(b,'lr',-legA);
  const m=L(b,'m',mouth);P.mouth.visible=m>.08;P.smile.visible=m<=.08;P.mouth.scale.y=.2+m*.9;const bl=((time*.42)%1)>.95?.12:1;P.eyes.forEach(e=>e.scale.y=bl);
}
function put(key,x,y,z,ry,pose){const c=CH[key];c.visible=true;c.position.set(x,y,z);c.rotation.y=ry||0;c.userData.pose=pose||'idle'}
function hide(key){CH[key].visible=false}

/* ---------- Props : haut-parleur, notes, confettis, podium, couronne, tomate ---------- */
const spk=new THREE.Group();{const b=new THREE.Mesh(new THREE.BoxGeometry(.9,1.45,.7),M(0x2a2a3a,{roughness:.5}));b.position.y=.73;b.castShadow=true;spk.add(b);
 const w=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.08,32),M(0x12121a,{roughness:.4}));w.rotation.x=Math.PI/2;w.position.set(0,.5,.36);spk.add(w);spk.userData.w=w;
 const c=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.1,24),M(0xe0561f,{roughness:.4,emissive:0x802000}));c.rotation.x=Math.PI/2;c.position.set(0,.5,.4);spk.add(c);spk.userData.c=c;
 const t=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.06,20),M(0x12121a));t.rotation.x=Math.PI/2;t.position.set(0,1.05,.36);spk.add(t);
 spk.userData.rings=[0,1,2].map(i=>{const r=new THREE.Mesh(new THREE.TorusGeometry(.4,.025,8,40),new THREE.MeshBasicMaterial({color:0xffb27a,transparent:true,opacity:0}));r.position.set(0,.55,.5);spk.add(r);return r})}
spk.visible=false;scene.add(spk);
function noteTex(col){return ctex(64,64,(g,w,h)=>{g.fillStyle=col;g.beginPath();g.ellipse(22,46,11,8,-.4,0,7);g.fill();g.fillRect(30,12,5,34);g.beginPath();g.moveTo(34,12);g.quadraticCurveTo(52,18,48,34);g.quadraticCurveTo(46,22,34,22);g.fill()})}
const noteTexs=['#ffd84a','#ffffff','#ff7a3a'].map(noteTex);
const notes=[];for(let i=0;i<9;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:noteTexs[i%3],transparent:true,depthWrite:false}));sp.userData={off:i/9,sx:(Math.random()-.5)*1.4,sz:Math.random()};sp.visible=false;scene.add(sp);notes.push(sp)}
let noteSrc=null,noteOn=false;
function updNotes(t){notes.forEach((sp,i)=>{if(!noteOn||!noteSrc){sp.visible=false;return}const u=sp.userData,ph=((t*.45+u.off)%1);sp.visible=true;const a=Math.sin(Math.PI*clamp(ph*1.1,0,1));sp.material.opacity=a;const s=.2+.2*a;sp.scale.set(s,s,s);sp.position.set(noteSrc.x+u.sx*ph*1.5+Math.sin(ph*9+i)*.12,noteSrc.y+ph*1.7,noteSrc.z+.3+u.sz*.5)})}
// confettis
const NC=260;const conf=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,.015,.05),M(0xffffff,{roughness:.6}),NC);conf.frustumCulled=false;scene.add(conf);
const CF=[];const cc=['#ffd84a','#e0561f','#2f6fd8','#1f9d63','#f19ac0','#ffffff'];
for(let i=0;i<NC;i++){CF.push({x:0,y:-9,z:0,vx:0,vy:0,vz:0,rx:Math.random()*6,ry:Math.random()*6,sx:Math.random()*8,sy:Math.random()*8,live:false});conf.setColorAt(i,tmpC.set(cc[i%6]))}
conf.instanceColor.needsUpdate=true;
function burst(n,x,y,z,spread){let k=0;for(const p of CF){if(p.live)continue;p.live=true;p.x=x+(Math.random()-.5)*spread;p.y=y+Math.random()*.6;p.z=z+(Math.random()-.5)*2;p.vx=(Math.random()-.5)*2.4;p.vy=Math.random()*2.5+1;p.vz=(Math.random()-.3)*1.8;if(++k>=n)break}}
let confN=0;function updConf(dt){if(!confN&&!CF.some(p=>p.live))return;confN=0;let i=0;for(const p of CF){if(p.live){p.vy-=4.2*dt;p.vx*=.995;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rx+=p.sx*dt;p.ry+=p.sy*dt;if(p.y<0&&p.z<3.5&&p.z>-3.5&&Math.abs(p.x)<6.4){p.y=0;p.vy=0;p.vx*=.5;p.vz*=.5;p.sx=p.sy=0}if(p.y<-1.5)p.live=false}
 dum.position.set(p.x,p.live?p.y:-20,p.z);dum.rotation.set(p.rx,p.ry,0);dum.scale.setScalar(1);dum.updateMatrix();conf.setMatrixAt(i++,dum.matrix)}conf.instanceMatrix.needsUpdate=true}
function clearConf(){CF.forEach(p=>p.live=false)}
// podium
function numTex(n,c){return ctex(128,128,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.92)';g.font='800 90px Plus Jakarta Sans, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,64,70)})}
const POD=[];[[0,1.5,0xd9a93a,'1','#d9a93a'],[-1.9,1.05,0x98a3b8,'2','#98a3b8'],[1.9,.72,0xd0885a,'3','#d0885a']].forEach(([x,h,c,n,hc])=>{const g=new THREE.Group();g.position.set(x,0,.2);const m=new THREE.Mesh(new THREE.BoxGeometry(1.6,h,1.5),[M(c),M(c),M(c),M(c),M(0xffffff,{map:numTex(n,hc)}),M(c)]);m.position.y=h/2;m.castShadow=m.receiveShadow=true;g.add(m);g.userData={h,m};g.visible=false;scene.add(g);POD.push(g)});
// couronne
const crown=new THREE.Group();{const r=new THREE.Mesh(new THREE.CylinderGeometry(.2,.17,.12,20,1,true),matGold);r.material.side=THREE.DoubleSide;crown.add(r);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const s=new THREE.Mesh(new THREE.ConeGeometry(.045,.16,8),matGold);s.position.set(Math.sin(a)*.19,.12,Math.cos(a)*.19);crown.add(s);const b=new THREE.Mesh(new THREE.SphereGeometry(.03,8,6),M(0xff4f6a,{emissive:0x551020}));b.position.set(Math.sin(a)*.19,.21,Math.cos(a)*.19);crown.add(b)}}
crown.visible=false;scene.add(crown);
// tomate + éclaboussure
const tom=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),M(0xd63a2a,{roughness:.4}));tom.visible=false;tom.castShadow=true;scene.add(tom);
const splatTex=ctex(256,256,(g,w,h)=>{g.fillStyle='#c4271f';for(let i=0;i<26;i++){const a=Math.random()*6.28,r=Math.random()*70;g.beginPath();g.arc(128+Math.cos(a)*r,128+Math.sin(a)*r,10+Math.random()*28,0,7);g.fill()}g.beginPath();g.arc(128,128,50,0,7);g.fill();for(let i=0;i<5;i++){g.fillRect(80+i*24+Math.random()*10,130,7,40+Math.random()*60)}});
const splat=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),new THREE.MeshBasicMaterial({map:splatTex,transparent:true,opacity:0,depthWrite:false}));splat.position.set(-2.9,2.3,-3.72);scene.add(splat);
// pluie de tomates
const NT=38,NS=240,NF=40,JN=1500,TM=[],SP=[],FL=[],CSP=[];
{const bg=new THREE.SphereGeometry(.16,14,10),bm=M(0xd63a2a,{roughness:.35}),sm=M(0x3f8f3a,{roughness:.6});
 for(let i=0;i<NT;i++){const g=new THREE.Group();const b=new THREE.Mesh(bg,bm);b.scale.set(1,.92,1);b.castShadow=true;g.add(b);const s=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),sm);s.scale.set(1.3,.4,1.3);s.position.y=.15;g.add(s);g.visible=false;scene.add(g);TM.push(g)}
 for(let i=0;i<NF;i++){const m=new THREE.MeshBasicMaterial({map:splatTex,transparent:true,depthWrite:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-2});const f=new THREE.Mesh(new THREE.PlaneGeometry(1,1),m);f.rotation.x=-Math.PI/2;f.visible=false;scene.add(f);FL.push(f)}
 for(let i=0;i<NS;i++){const m=new THREE.SpriteMaterial({map:splatTex,transparent:true,depthWrite:false,opacity:0});const sp=new THREE.Sprite(m);sp.visible=false;scene.add(sp);SP.push(sp)}}
const jGeo=new THREE.BufferGeometry();jGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(JN*3),3));
const jPts=new THREE.Points(jGeo,new THREE.PointsMaterial({color:0xb81f18,size:.09,map:ctex(32,32,(g,w,h)=>{g.fillStyle='#fff';g.beginPath();g.arc(16,16,14,0,7);g.fill()}),alphaTest:.3,transparent:true,opacity:.95,depthWrite:false}));jPts.frustumCulled=false;jPts.visible=false;scene.add(jPts);
const J=[];for(let i=0;i<JN;i++)J.push({t0:-9,p:[0,0,0],v:[0,0,0]});let jIdx=0,sIdx=0;
function juice(t0,p,n,sp){for(let i=0;i<n;i++){const j=J[jIdx++%JN];j.t0=t0;j.p=p.slice();const a=Math.random()*6.28,u=Math.random();j.v=[Math.cos(a)*sp*u,Math.random()*sp*.9+.4,(Math.random()-.3)*sp*.7]}}
function juiceUpdate(t){if(!jPts.visible)return;const pos=jGeo.attributes.position.array;J.forEach((j,i)=>{const a=t-j.t0;if(a<0||a>1.1){pos[i*3]=pos[i*3+1]=pos[i*3+2]=-99;return}pos[i*3]=j.p[0]+j.v[0]*a;pos[i*3+1]=Math.max(.02,j.p[1]+j.v[1]*a-4.5*a*a);pos[i*3+2]=j.p[2]+j.v[2]*a});jGeo.attributes.position.needsUpdate=true}
function splatAt(p,sz){const sp=SP[sIdx++%NS];sp.position.set(p[0],p[1],p[2]);sp.scale.set(sz,sz,1);sp.material.rotation=Math.random()*6.28;sp.material.opacity=.9;sp.material.color.setRGB(.62+Math.random()*.2,.34+Math.random()*.18,.34+Math.random()*.18);sp.visible=true;return sp}
let fIdx=0;function floorAt(x,z,sz){const f=FL[fIdx++%NF];f.position.set(x,.025+(fIdx%7)*.002,z);f.scale.set(sz,sz*(.7+Math.random()*.5),1);f.rotation.z=Math.random()*6.28;f.material.opacity=.9;f.material.color.setRGB(.6+Math.random()*.2,.3+Math.random()*.15,.3+Math.random()*.15);f.visible=true}
function satellites(p,sz,n,flat){for(let i=0;i<n;i++){const a=Math.random()*6.28,r=sz*(.55+Math.random()*.8),s=sz*(.14+Math.random()*.26);if(flat)floorAt(p[0]+Math.cos(a)*r,p[2]+Math.sin(a)*r,s);else splatAt([p[0]+Math.cos(a)*r,Math.max(.05,p[1]+Math.sin(a)*r*.8),p[2]],s)}}
function tomatoPlan(){const pl=[];let t=.9;const rr=Math.random;
  const kinds=['wall','lea','floor','wall','wall','floor','lea','wall','floor','wall','wall','cam','floor'];
  for(let i=0;i<NT;i++){const kind=kinds[(i*7+3)%kinds.length];
    const side=(rr()<.5?-1:1),s=kind==='cam'?[(rr()-.5)*6,.4+rr()*.6,-.5]:[side*(3.6+rr()*3.2),.3+rr()*1.1,2.6+rr()*2.6];
    let e,sz,h;
    if(kind==='lea'){e=[(rr()-.5)*1.3,.3+rr()*1.7,1.3];sz=.38+rr()*.34;h=.8+rr()*1.1}
    else if(kind==='wall'){e=[(rr()-.5)*13.5,.2+rr()*4.4,-3.62];sz=1.2+rr()*1.3;h=1.4+rr()*1.4}
    else if(kind==='floor'){e=[(rr()-.5)*8,.05,-2.4+rr()*6.4];sz=1.5+rr()*1.1;h=.8+rr()*.8}
    else{e=[-.5+(rr()-.5)*2.2,1.7+(rr()-.5)*1.4,5.2];sz=.55+rr()*.45;h=.9+rr()*.8}
    pl.push({t0:t,dur:.5+rr()*.35,s,e,kind,h,sz,sp:rr()*8,done:false,ox:(rr()-.5)*1.2,oy:(rr()-.5)*.6});
    t+=Math.max(.06,.32-i*.011)}return pl}



/* ---------- Étiquettes de noms ---------- */
const tagsEl=document.createElement('div');tagsEl.className='im3d-tags';const tagMap={};
PLAYERS.forEach(p=>{const d=document.createElement('div');d.className='tag';d.style.opacity=0;tagsEl.appendChild(d);tagMap[p[0]]=d});
const v3=new THREE.Vector3();
function updTags(){const w=VW,h=VH;for(const k in CH){const c=CH[k],d=tagMap[k],u=c.userData;const show=c.visible&&u.tag!==false&&u.label;if(!show){d.style.opacity=0;continue}
 c.updateWorldMatrix(true,false);v3.set(0,u.tagY||2.35,0).applyMatrix4(c.matrixWorld).project(camera);if(v3.z>1||v3.z<-1){d.style.opacity=0;continue}
 d.style.opacity=1;d.style.left=((v3.x*.5+.5)*w)+'px';d.style.top=((-v3.y*.5+.5)*h)+'px';if(d._l!==u.label){d.innerHTML=u.label;d._l=u.label}}}

/* ---------- Caméra ---------- */
const cam={pos:new THREE.Vector3(0,2.6,10.5),look:new THREE.Vector3(0,1.5,0),tp:new THREE.Vector3(0,2.6,10.5),tl:new THREE.Vector3(0,1.5,0),yaw:0,pitch:0,shake:0};
function camTo(px,py,pz,lx,ly,lz,snap){cam.tp.set(px,py,pz);cam.tl.set(lx,ly,lz);if(snap){cam.pos.copy(cam.tp);cam.look.copy(cam.tl)}}
let drag=null;
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:cam.yaw,pitch:cam.pitch};try{canvas.setPointerCapture(e.pointerId)}catch(x){}});
canvas.addEventListener('pointermove',e=>{if(!drag)return;cam.yaw=clamp(drag.yaw-(e.clientX-drag.x)*.004,-.9,.9);cam.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.003,-.25,.4)});
const endDrag=()=>{drag=null};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);

/* ====================== PILOTAGE PAR LE JEU ====================== */
const KEYS=['lea','kenji','sora','mizuki','ryo','ren'];
const SEATS=[[-2.625,-1.1,6.35],[-1.575,-1.1,6.35],[.525,-1.1,6.35],[2.625,-1.1,6.35]];
let cast=[{name:'',key:'lea'}],perf=0,mode='',mt=0,S={},running=false,last=0,gt=0,curtT=1,curtCur=1,mic=0,micS=0,isPlaying=false,rafId=0,ro=null;
const keyOf=i=>cast[Math.max(0,Math.min(i,cast.length-1))].key;
const nameOf=i=>cast[Math.max(0,Math.min(i,cast.length-1))].name;
const escH=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function resetFx(){clearConf();noteOn=false;applause=0;spk.visible=false;POD.forEach(p=>p.visible=false);crown.visible=false;tom.visible=false;splat.material.opacity=0;TM.forEach(g=>g.visible=false);SP.forEach(s=>{s.visible=false;s.material.opacity=0});jPts.visible=false;FL.forEach(f=>{f.visible=false;f.material.opacity=0});J.forEach(j=>j.t0=-9);CSP.length=0;
  for(const k in CH){hide(k);const u=CH[k].userData;u.label=null;u.tag=true;u.live=null;CH[k].rotation.z=0;CH[k].position.y=0}
  setSpot(spotB,0,0,0,0);spotA.setX(0);spotB.setX(3);spotA.light.color.set(0xfff0c8);spotA.mat.color.set(0xfff0c8)}
const SEATK={ryo:0,kenji:1,sora:2,mizuki:3};
function seatList(keys,pose,max){const free=[0,1,2,3];
  keys.slice(0,max).forEach(k=>{let i=SEATK[k];if(i===undefined||free.indexOf(i)<0)i=free[0];if(i===undefined)return;free.splice(free.indexOf(i),1);const s=SEATS[i];put(k,s[0],s[1],s[2],Math.PI,pose);CH[k].userData.tag=false})}
function seatOthers0(pose,except){const ex=[].concat(except);const ks=[];cast.forEach(c=>{if(ex.indexOf(c.key)<0&&ks.indexOf(c.key)<0)ks.push(c.key)});['kenji','sora','mizuki','ryo','lea','ren'].forEach(k=>{if(ex.indexOf(k)<0&&ks.indexOf(k)<0)ks.push(k)});
  seatList(ks,pose,3)}
const seatOthers=seatOthers0;
const lineX=(i,n)=>(i-(n-1)/2)*Math.min(1.5,7.4/Math.max(1,n));
function lineOthers(pose,exi){const n=cast.length;cast.forEach((c,i)=>{if(i===exi)return;put(c.key,lineX(i,n),0,-.5,0,pose);const u=CH[c.key].userData;u.tag=!!c.name;u.label=escH(c.name||'')})}
function showName(k,i){const u=CH[k].userData;u.tag=cast.length>1&&!!nameOf(i);u.label=escH(nameOf(i))}
const MODES={
 menu:{enter(){curtT=curtCur=1;camTo(0,2.7,10.8,0,1.6,0,true);put('lea',-1.5,0,1.1,.35,'wave');put('sora',.1,0,-.6,0,'cheer');put('kenji',1.9,0,.8,-.4,'clap');put('ren',3.9,0,-.4,-.5,'wave');put('mizuki',-3.4,0,-.2,.5,'cheer');put('ryo',5.7,0,.2,-.6,'clap');KEYS.forEach(k=>CH[k].userData.tag=false)},
  tick(t){camTo(Math.sin(t*.35)*2.2,2.5,10.5,0,1.6,0);setSpot(spotA,1.9,-1.5,1,1.1);setSpot(spotB,1.1,1.9,1,.8,0xffd2a0);spotB.setX(4);spotA.setX(-3);noteSrc={x:-1.5,y:2.3,z:1.1};noteOn=t>.5;applause=.2}},
 listen:{enter(o){const k=keyOf(perf);S={k:k,walk:!!(o&&o.walk)};curtT=1;camTo(1.2,2.3,8.6,.5,1.35,.4,!!(o&&o.snap));spk.visible=true;spk.position.set(1.7,0,.4);spk.rotation.y=-.4;put(k,S.walk?-8:-1.3,0,1.2,.55,S.walk?'walk':'hear');showName(k,perf);seatOthers('idle',k)},
  tick(t){const c=CH[S.k];if(S.walk&&t<1.7){const u=ease(t/1.7);c.position.x=lerp(-8,-1.3,u);c.rotation.y=lerp(Math.PI/2,.55,ease(seg(t,1.2,1.7)));c.userData.pose='walk'}else{c.userData.pose='hear';if(S.walk){c.position.x=-1.3;c.rotation.y=.55}}
   camTo(1.2+Math.sin(t*.4)*.8,2.3,8.2,.4,1.35,.4);setSpot(spotA,1.8,1.7,.8,.4);setSpot(spotB,.9,-1.3,1,1.2,0xffe2c0);spotA.setX(2);spotB.setX(-3);
   spk.userData.w.scale.setScalar(1+(isPlaying?.07*Math.sin(t*14):0));spk.userData.rings.forEach((r,i)=>{const p=((t*.55+i/3)%1);r.scale.setScalar(.6+p*2.2);r.material.opacity=isPlaying?.7*(1-p):0});
   noteSrc={x:1.7,y:1.5,z:.5};noteOn=isPlaying}},
 countdown:{enter(){const k=keyOf(perf);S={k:k};curtT=0;camTo(0,2,9.4,0,2.2,0);put(k,-2.6,0,1.1,0,'idle');showName(k,perf);seatOthers('idle',k)},
  tick(t){setSpot(spotA,1.9,0,1,1.2);setSpot(spotB,0,0,0,0);camTo(0,2,9.4-seg(t,0,2)*1,0,2-seg(t,0,2)*.4,0)}},
 record:{enter(o){const k=keyOf(perf);S={k:k};curtT=1;camTo(.3,1.3,8.8,0,1.5,1);S.fr=(o&&o.from)?-2.6:0;put(k,S.fr,0,1.1,0,S.fr?'walk':'sing');showName(k,perf);CH[k].userData.live=0},
  tick(t){camTo(.3-t*.05+Math.sin(t*.7)*.25,1.3+t*.03,8.8-t*.2,0,1.5,1);setSpot(spotA,2.3,0,1,1.1);setSpot(spotB,.8,0,1,1.1,0xff9a6a);spotA.setX(0);spotB.setX(-4);{const c=CH[S.k],w=S.fr?seg(t,0,.9):1;c.position.x=lerp(S.fr,0,ease(w));c.rotation.y=S.fr&&w<1?Math.PI/2*(1-ease(seg(t,.6,.9))):0;c.userData.pose=w<1?'walk':'sing'}noteOn=micS>.06;noteSrc={x:0,y:1.75,z:1.1};applause=.1;CH[S.k].userData.live=micS}},
 result:{enter(o){const k=keyOf(perf),kind=(o&&o.kind)||'ok';S={k:k,kind:kind,b:0,pl:null,line:!!(o&&o.line)};const seatOthers=(p,x)=>S.line?lineOthers(p,perf):seatOthers0(p,x);curtT=1;
   if(kind==='bad'){camTo(-.5,1.8,6.4,0,1.45,.6,true);put(k,0,0,1,0,'shrug');showName(k,perf);seatOthers('shrug',k);S.pl=tomatoPlan();S.lh=-9;sIdx=0;fIdx=0;jPts.visible=true}
   else if(kind==='silent'){camTo(0,2.2,8.9,0,1.4,0.6);put(k,0,0,1.1,0,'shrug');showName(k,perf);seatOthers('idle',k)}
   else{camTo(0,2.7,10.4,0,1.15,1.2);put(k,0,0,1.4,0,'bow');showName(k,perf);seatOthers(kind==='great'?'cheer':'clap',k)}},
  tick(t){const k=S.k,kind=S.kind;
   if(kind==='great'||kind==='ok'){camTo(Math.sin(t*.4)*1.2,2.7,10.4,0,1.15,1.2);setSpot(spotA,2.2,0,1,1.4,0xfff4d0);setSpot(spotB,1.3,2.4,1,.4,0xffe6a8);spotA.setX(0);spotB.setX(4);
     if(kind==='great'){if(t>.5&&S.b===0){S.b=1;burst(150,0,6,.5,9)}if(t>2.8&&S.b===1){S.b=2;burst(90,0,6,.5,9)}applause=ease(seg(t,.3,1.3))*.85}
     else{if(t>.5&&S.b===0){S.b=1;burst(45,0,6,.5,9)}applause=ease(seg(t,.3,1.3))*.45}}
   else if(kind==='silent'){setSpot(spotA,1.4,0,1,1.1,0xd8dcef);applause=0}
   else{camTo(-.5+Math.sin(t*.5)*.3,1.8,6.4,0,1.45,.6);setSpot(spotA,2,0,1,1,0xff9a90);setSpot(spotB,.7,0,1,1,0xff5a5a);spotA.setX(0);spotB.setX(-3);applause=0;
    S.pl.forEach((o,i)=>{const g=TM[i],f=(t-o.t0)/o.dur;
      if(f>=0&&f<1){g.visible=true;g.position.set(lerp(o.s[0],o.e[0],f),lerp(o.s[1],o.e[1],f)+Math.sin(Math.PI*f)*o.h,lerp(o.s[2],o.e[2],f));g.rotation.set(f*o.sp,f*o.sp*.7,0)}else g.visible=false;
      if(f>=1&&!o.done){o.done=true;const ti=o.t0+o.dur;
        if(o.kind==='lea'){splatAt([o.e[0],o.e[1],1.34],o.sz);satellites([o.e[0],o.e[1],1.34],o.sz,2);juice(ti,[o.e[0],o.e[1],1.3],30,3);S.lh=Math.max(S.lh,ti);cam.shake=Math.max(cam.shake,.07)}
        else if(o.kind==='wall'){splatAt(o.e,o.sz);satellites(o.e,o.sz,4);juice(ti,[o.e[0],o.e[1],-3.5],34,3.6)}
        else if(o.kind==='floor'){floorAt(o.e[0],o.e[2],o.sz);satellites(o.e,o.sz,4,true);juice(ti,[o.e[0],.1,o.e[2]],30,3.2)}
        else{const sp=splatAt([0,0,0],o.sz);CSP.push({sp:sp,ox:o.ox,oy:o.oy,t0:ti,sz:o.sz});[1,2,3].forEach(()=>{const s2=splatAt([0,0,0],o.sz*(.25+Math.random()*.3));CSP.push({sp:s2,ox:o.ox+(Math.random()-.5)*o.sz*1.4,oy:o.oy+(Math.random()-.5)*o.sz*1,t0:ti,sz:o.sz*.3})});cam.shake=Math.max(cam.shake,.1)}}
      if(f<0&&o.done)o.done=false});
    CSP.forEach(c=>{const v=new THREE.Vector3(c.ox,c.oy,-1.6).applyMatrix4(camera.matrixWorld);c.sp.position.copy(v);const age=t-c.t0;c.sp.material.opacity=age<0?0:Math.max(0,.92-Math.max(0,age-1.2)*.45)});juiceUpdate(t);
    const w=Math.max(0,1-(t-S.lh)/.22);CH[k].rotation.z=Math.sin(t*55)*.07*w}}},
 lineup:{enter(o){o=o||{};S={sp:!!o.spk};curtT=o.closed?0:1;if(o.closed)camTo(0,2,9.3,0,2.2,0,!!o.snap);else camTo(0,2.4,10.2,0,1.5,0,!!o.snap);spk.visible=S.sp;if(S.sp){spk.position.set(5.3,0,1.1);spk.rotation.y=-.7}
   const n=cast.length,P=o.poses||{};cast.forEach((c,i)=>{put(c.key,lineX(i,n),0,0,0,P[c.key]||o.pose||'idle');const u=CH[c.key].userData;u.tag=!!c.name&&!o.closed;u.label=escH(c.name||'')+(o.marks&&o.marks[c.key]?' '+o.marks[c.key]:'')})},
  tick(t){camTo(Math.sin(t*.3)*1.1,2.4,10.2,0,1.5,0);if(curtT===0)camTo(0,2,9.3,0,2.2,0);setSpot(spotA,1.9,0,1,.2);spotA.setX(0);setSpot(spotB,1,0,1,0,0xffe2b0);spotB.setX(3);applause=.12;
   if(S.sp){spk.userData.w.scale.setScalar(1+(isPlaying?.07*Math.sin(t*14):0));spk.userData.rings.forEach((r,i)=>{const p=((t*.55+i/3)%1);r.scale.setScalar(.6+p*2.2);r.material.opacity=isPlaying?.7*(1-p):0});noteSrc={x:5.3,y:1.5,z:1.1};noteOn=isPlaying}}},
 step:{enter(o){const n=cast.length,i=perf,k=keyOf(i);S={k:k,fx:lineX(i,n)};curtT=1;camTo(0,2.2,8.6,0,1.45,.4,true);lineOthers('hear',i);put(k,S.fx,0,0,0,'walk');const u=CH[k].userData;u.tag=true;u.label=escH(nameOf(i));u.live=0},
  tick(t){const c=CH[S.k],w=ease(seg(t,0,1.1));c.position.x=lerp(S.fx,0,w);c.position.z=lerp(0,1.1,w);c.userData.pose=w<1?'walk':'sing';c.rotation.y=0;c.userData.live=micS;
   noteOn=micS>.06;noteSrc={x:0,y:1.75,z:1.1};camTo(Math.sin(t*.4)*.5,2.2,8.4,0,1.45,.4);setSpot(spotA,2.2,0,1,1.1);spotA.setX(0);setSpot(spotB,.9,0,1,0,0xff9a6a);spotB.setX(-4);applause=.1}},
 handoff:{enter(o){const a=keyOf(o.from),b=keyOf(o.to);S={a:a,b:b};curtT=1;camTo(0,2.2,8.9,0,1.4,0,true);put(a,0,0,.9,0,'bow');put(b,7.5,0,.8,-Math.PI/2,'walk');showName(a,o.from);showName(b,o.to);seatOthers('idle',[a,b])},
  tick(t){const A=CH[S.a],Bc=CH[S.b];const ex=seg(t,1.2,3.4),lx=lerp(0,-8.5,ease(ex));A.position.x=lx;A.rotation.y=lerp(0,-Math.PI/2,ease(seg(t,1,1.6)));A.userData.pose=t<1.1?'bow':'walk';
   const en=seg(t,1.8,4.4),kx=lerp(7.5,.2,ease(en));Bc.position.x=kx;Bc.rotation.y=lerp(-Math.PI/2,0,ease(seg(t,4,4.6)));Bc.userData.pose=en<1?'walk':'wave';
   camTo(Math.sin(t*.3)*1,2.2,8.9,0,1.4,0);setSpot(spotA,2,lx<-1?-1.5:0,1,1,0xfff0c8);spotA.setX(0);setSpot(spotB,en>0?1.6:0,kx,.8,.8,0xffe0a0);spotB.setX(3);applause=t<1.5?.6:0}},
 podium:{enter(o){const L=(o&&o.list)||[];S={used:[],ks:[]};curtT=1;camTo(0,3.0,11.2,0,1.75,0,true);POD.forEach((p,i)=>p.visible=i<L.length);
   const used={};const pickKey=(i)=>{let k=KEYS[i%6];const want=cast[L[i].i]&&cast[L[i].i].key;if(want&&!used[want])k=want;if(used[k]){k=KEYS.filter(x=>!used[x])[0]}used[k]=1;return k};
   const xs=[0,-1.9,1.9],ps=['cheer','clap','clap'];L.slice(0,3).forEach((r,i)=>{const k=pickKey(i);S.ks.push(k);put(k,xs[i],0,.2,i===1?.15:i===2?-.15:0,ps[i]);const u=CH[k].userData;u.tag=true;u.label=escH(r.name)+' <b>'+r.score+'</b>'});
   seatList(cast.map(c=>c.key).concat(['kenji','sora','mizuki','ryo','lea','ren']).filter((k,i,a)=>!used[k]&&a.indexOf(k)===i),'cheer',3);S.k=0},
  tick(t){POD.forEach((p,i)=>{const k=ease(seg(t,.3+i*.35,1.5+i*.35));p.userData.m.scale.y=Math.max(.001,k);p.userData.m.position.y=p.userData.h*k/2});
   const hs=[1.5,1.05,.72];S.ks.forEach((key,i)=>{const k=ease(seg(t,.3+i*.35,1.5+i*.35));CH[key].position.y=hs[i]*k});
   const cd=seg(t,2.4,3.1);crown.visible=t>2.4&&S.ks.length>0;crown.position.set(0,hs[0]+2.18+(1-ease(cd))*2.4,.2);crown.rotation.y=t*2;crown.rotation.z=(1-cd)*.6;
   setSpot(spotA,2.2,0,1.6,.2,0xfff0c8);spotA.setX(0);setSpot(spotB,1.2,-1.9,1.2,.2,0xc8d8ff);spotB.setX(-5);
   if(t>1.8&&S.k<5&&t>1.8+S.k*1.4){S.k++;burst(80,(Math.random()-.5)*6,6.5,0,6)}
   applause=.7;const a=t*.28;camTo(Math.sin(a)*3.4,3.0+Math.sin(a*.7)*.25,11.2-Math.cos(a)*.3,0,1.75,0)}}
};
function setMode(m,o){mode=m;mt=0;resetFx();cam.yaw*=.3;cam.pitch*=.3;MODES[m].enter(o||{})}
let onSlow=null;const PRS=[1.5,1.25,1,.8,.6,.5],TS=.7;let lite=false;
function goLite(){if(lite)return;lite=true;const cache=new Map();
  const cv=m=>{if(!m||!m.isMeshStandardMaterial)return m;let n=cache.get(m);if(!n){n=new THREE.MeshLambertMaterial({color:m.color,map:m.map,vertexColors:m.vertexColors,skinning:m.skinning,side:m.side,transparent:m.transparent,opacity:m.opacity,emissive:m.emissive,emissiveMap:m.emissiveMap,alphaTest:m.alphaTest,polygonOffset:m.polygonOffset,polygonOffsetFactor:m.polygonOffsetFactor,polygonOffsetUnits:m.polygonOffsetUnits});cache.set(m,n)}return n};
  scene.traverse(o=>{if(o.isMesh&&o.material){o.material=Array.isArray(o.material)?o.material.map(cv):cv(o.material)}});
  foot.visible=false}let qL=0,ftA=0,ftN=0,warm=0;
renderer.shadowMap.autoUpdate=false;let fc=0;
function applyQ(){const p=Math.min(PR,PRS[qL]);renderer.setPixelRatio(p);resize();if(qL>=3)goLite();if(qL>=2&&spotA.light.castShadow){spotA.light.castShadow=false;scene.traverse(o=>{if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.needsUpdate=true);else o.material.needsUpdate=true}})}}
function frame(now){
  if(!running)return;rafId=requestAnimationFrame(frame);
  if(now-last<14.5)return; /* 60 images/s maximum, même sur écran 120 Hz */
  const raw=(now-last)/1000,dt=Math.min(.08,raw);last=now;mt+=dt*TS;gt+=dt;
  if(++warm>90){ftA+=raw;if(++ftN>=40){const avg=ftA/ftN;ftA=0;ftN=0;if(avg>.027&&qL<PRS.length-1){qL++;applyQ()}else if(avg>.07&&qL>=PRS.length-1&&onSlow){const f=onSlow;onSlow=null;f()}}}
  if(mode)MODES[mode].tick(mt);
  curtCur+=(curtT-curtCur)*(1-Math.exp(-dt*1.5));setCurtains(curtCur);
  micS+=(mic-micS)*(1-Math.exp(-dt*14));
  lights.forEach((b,i)=>{b.material.color.setHex((Math.floor(gt*2+i)%2)?0xffe48a:0xffc24a)});
  for(const k in CH){const c=CH[k];if(c.visible)animChar(c,gt,dt)}
  if(qL<4&&((fc&1)===0||qL<1))updAud(gt);updNotes(gt);updConf(dt);
  const kk=1-Math.exp(-dt*1.6);cam.pos.lerp(cam.tp,kk);cam.look.lerp(cam.tl,kk);
  const off=cam.pos.clone().sub(cam.look);const r=off.length();const a=Math.atan2(off.x,off.z)+cam.yaw,p=Math.asin(clamp(off.y/r,-1,1))+cam.pitch;
  camera.position.set(cam.look.x+Math.sin(a)*Math.cos(p)*r,cam.look.y+Math.sin(p)*r,cam.look.z+Math.cos(a)*Math.cos(p)*r);
  if(cam.shake>0){camera.position.x+=(Math.random()-.5)*cam.shake;camera.position.y+=(Math.random()-.5)*cam.shake;cam.shake*=.9}
  camera.lookAt(cam.look.x,cam.look.y+(camera.aspect<.8?.9:0),cam.look.z);
  if(!drag){cam.yaw*=.985;cam.pitch*=.985}
  fc++;renderer.shadowMap.needsUpdate=(fc%(qL>=1?3:2))===0;
  renderer.render(scene,camera);updTags()}
return{
 mount(el){app=el;if(SOFT&&qL<4&&!lite){qL=4;applyQ()}el.appendChild(canvas);el.appendChild(tagsEl);if(ro)ro.disconnect();if(window.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(el)}resize();if(!running){running=true;last=performance.now();rafId=requestAnimationFrame(frame)}},
 unmount(){running=false;cancelAnimationFrame(rafId);if(ro){ro.disconnect();ro=null}},
 cast(list){cast=list&&list.length?list:[{name:'',key:'lea'}]},
 mode(m,o){if(m==='listen'||m==='record'||m==='countdown'||m==='result'||m==='step')perf=(o&&o.perf!=null)?o.perf:perf;if(m==='handoff')perf=o.to;setMode(m,o)},
 setPerf(i){perf=i},
 setSlow(f){onSlow=f},
 labels(m){for(const k in m){if(CH[k]){CH[k].userData.label=m[k];CH[k].userData.tag=true}}},
 mic(v){mic=clamp(v,0,1)},
 playing(b){isPlaying=!!b},
 stats(){const i=renderer.info;return{soft:SOFT,lite:lite,calls:i.render.calls,tri:i.render.triangles,geo:i.memory.geometries,tex:i.memory.textures,pr:renderer.getPixelRatio(),q:qL,meshes:(()=>{let n=0,v=0;scene.traverse(o=>{if(o.isMesh){n++;if(o.visible)v++}});return[n,v]})()}},
 dbg:window.IM3D_DBG?{curL,curR,notes,TM,SP,FL,jPts,tom,CH,scene,camera,renderer,animChar,put,hide,setSpot,spotA,spotB,cam,POSES,setCurtains,crown,POD,spk,get cast(){return cast}}:null,
 keys:KEYS,
 names:{lea:'Léa',kenji:'Kenji',sora:'Sora',mizuki:'Mizuki',ryo:'Ryo',ren:'Ren'}
};
}};
})();
