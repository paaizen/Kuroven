/* Kuroven Combat : données (couleurs, cartes soutien, attaques emblématiques, construction des personnages).
   Chargé à la demande par index.html avec combat.js. */
(function(){
const COL=[
 {n:'Braise',k:'炎',c:'#e5483b',c2:'#7a1712'},
 {n:'Éclair',k:'雷',c:'#f2b81c',c2:'#7a5600'},
 {n:'Sève',k:'森',c:'#3dae5a',c2:'#145a2a'},
 {n:'Marée',k:'水',c:'#2f8fe0',c2:'#123f73'},
 {n:'Ombre',k:'闇',c:'#8a56d6',c2:'#34176a'},
 {n:'Éclat',k:'光',c:'#ec5fa0',c2:'#7a1f4c'}];
/* chaque couleur bat les 2 suivantes et perd contre les 2 précédentes */
const beats=(a,b)=>{const d=(b-a+6)%6;return d===1||d===2};
const factor=(a,b)=>beats(a,b)?1.2:beats(b,a)?0.8:1;

/* attaques emblématiques : [mot du nom, attaque, description] */
const SIG=[
['gojo','Vide Pourpre','Une sphère de vide détruit tout sur son passage.'],
['levi','Tourbillon de lames','Il tournoie et tranche, impossible à suivre.'],
['luffy','Gomu Gomu Pistol','Un coup de poing élastique qui part de très loin.'],
['eren','Titan Assaillant','Un coup de titan qui fracasse les murs.'],
['naruto','Rasengan','Une sphère de chakra tourbillonnante.'],
['goku','Kamehameha','Une vague d’énergie lancée à deux mains.'],
['vegeta','Final Flash','Un rayon doré chargé de toute sa fierté.'],
['zoro','Santoryu Oni Giri','Trois lames, un seul coup.'],
['light yagami','Page du Death Note','Un nom écrit, un adversaire de moins.'],
['lelouch','Geass','Un ordre auquel on ne peut pas désobéir.'],
['itachi','Tsukuyomi','Une illusion qui dure une nuit entière.'],
['ichigo','Getsuga Tenshô','Une lame de reiatsu lancée à distance.'],
['sasuke','Chidori','Mille oiseaux d’éclairs dans la main.'],
['kakashi','Raikiri','Un éclair qui tranche tout ce qu’il touche.'],
['tanjiro','Danse du Dieu du Feu','Un souffle de flammes en cercles.'],
['zenitsu','Souffle de la Foudre','Un éclair qui traverse le champ de bataille.'],
['mikasa','Lames jumelles','Deux lames, aucune pitié.'],
['edward','Alchimie','Il frappe la terre et le monde se plie.'],
['killua','Godspeed','Il court à la vitesse de l’éclair.'],
['gon','Jajanken','Un poing chargé de toute sa volonté.'],
['saitama','Coup sérieux','Un seul coup de poing.'],
['deku','Detroit Smash','Un coup de poing One For All.'],
['midoriya','Detroit Smash','Un coup de poing One For All.'],
['jotaro','ORA ORA','Une pluie de poings du Star Platinum.'],
['dio','ZA WARUDO','Il arrête le temps pour frapper.'],
['natsu','Poing du dragon de feu','Un poing enflammé qui brûle tout.'],
['asta','Tranchant anti-magie','Une épée qui annule la magie.'],
['denji','Tronçonneuse','Les lames sortent de son corps.'],
['makima','Contrôle absolu','Elle ordonne, tout le monde obéit.'],
['rem','Morgenstern','Un fléau de démon qui écrase tout.'],
['hisoka','Bungee Gum','Un fil élastique qui colle et tire.'],
['meliodas','Rancune','Il renvoie toute la force reçue.'],
['mob','Explosion psychique','Une vague psychique qui balaie tout.'],
['yuji','Poing divergent','Deux impacts pour un seul coup.'],
['sukuna','Démantèlement','Mille coupures invisibles.'],
['nobara','Marteau de paille','Un clou qui frappe à distance.'],
['aizen','Kyôka Suigetsu','Une illusion parfaite qui trompe tous les sens.'],
['all might','United States of Smash','Le coup de poing du symbole de la paix.'],
['erwin','Charge suicide','Il mène la charge, tout le monde suit.'],
['reiner','Titan cuirassé','Une armure dure comme le diamant.'],
['sanji','Diable Jambe','Un coup de pied qui brûle.'],
['nami','Thunder Tempo','Un orage tombe du ciel.'],
['usopp','Étoile de feu','Un tir précis qui surprend tout le monde.'],
['ace','Hiken','Un poing de feu qui carbonise.'],
['shanks','Haki des rois','Un regard qui fait trembler.'],
['mihawk','Coup de Yoru','Un trait de lame qui tranche la mer.'],
['robin','Mil Fleurs','Des bras qui poussent de partout.'],
['chopper','Rumble Ball','Il se transforme et frappe fort.'],
['boruto','Rasengan','Une sphère de chakra tourbillonnante.'],
['minato','Éclair jaune','Il apparaît derrière toi et frappe.'],
['madara','Susanoo','Un géant de chakra l’enveloppe.'],
['obito','Kamui','Il traverse l’espace.'],
['jiraiya','Rasengan géant','Une grosse sphère de chakra.'],
['gaara','Tombeau de sable','Une montagne de sable qui écrase.'],
['rock lee','Lotus primaire','Un enchaînement de coups à haute vitesse.'],
['hinata','Paume de douceur','Une frappe qui bloque le chakra.'],
['kurosaki','Getsuga Tenshô','Une lame de reiatsu lancée à distance.'],
['rukia','Danse de la neige','Un coup glacial.'],
['byakuya','Senbonzakura','Mille lames de pétales.'],
['toshiro','Hyôrinmaru','Un dragon de glace.'],
['spike','Jeet Kune Do','Un style de combat sans faille.'],
['guts','Dragon Slayer','Une épée énorme qui tranche tout.'],
['griffith','Chute du Faucon','Un éclair de lumière froide.'],
['alucard','Libération des sceaux','Il libère son pouvoir.'],
['anos','Éclat de ténèbres','Une magie qui efface tout.'],
['subaru','Retour par la mort','Il recommence encore et encore.'],
['violet','Lettre d’adieu','Des mots qui touchent le cœur.'],
['kaneki','Kagune','Des tentacules rouges qui frappent.'],
['yato','Lame sacrée','Une lame de dieu errant.'],
['lucy','Étoile de Régulus','Un esprit étoilé qui frappe.'],
['erza','Armure du Purgatoire','Une armure aux mille épées.'],
['gray','Création de glace','Une lance de glace.'],
['kirito','Starburst Stream','Seize coups d’affilée.'],
['asuna','Flash','Un coup d’épée à la vitesse de l’éclair.'],
['rimuru','Dévoration','Il avale tout ce qui l’attaque.'],
['megumin','Explosion','Une explosion qui détruit tout.'],
['shinobu','Danse de l’insecte','Une pointe de poison.'],
['rengoku','Neuvième forme','Une flamme qui brûle tout.'],
['muzan','Sang démoniaque','Un sang qui détruit.'],
['inosuke','Souffle de la Bête','Deux lames dentelées.'],
['nezuko','Sang explosif','Un sang qui brûle.'],
['giyu','Surface de l’eau','Une lame fluide et précise.'],
['tengen','Son et fureur','Une explosion sonore.'],
['goku black','Faux dieu','Une lame d’énergie noire.'],
['piccolo','Canon Makankosappo','Un rayon qui perce tout.'],
['gohan','Masenko','Un tir d’énergie à pleine puissance.'],
['trunks','Épée brisante','Une lame qui tranche l’ennemi.'],
['freezer','Mort subite','Un rayon violet qui perce.'],
['frieza','Mort subite','Un rayon violet qui perce.'],
['cell','Kamehameha parfait','Un rayon de puissance parfaite.']];
const GEN=[
['Poing ardent','Un coup brûlant qui ne laisse que des cendres.'],
['Éclair divin','Un éclair qui tombe sans prévenir.'],
['Lame de sève','Une lame de bois qui pousse du sol.'],
['Vague noire','Une vague qui emporte tout sur son passage.'],
['Coup d’ombre','Il frappe depuis l’obscurité.'],
['Pluie d’étoiles','Une averse de lumière.']];
const sigFor=(name,col)=>{const n=name.toLowerCase();const f=SIG.find(x=>n.includes(x[0]));return f?{n:f[1],d:f[2],sig:1}:{n:GEN[col][0],d:GEN[col][1],sig:0}};

/* cartes soutien : t = type, sub = sous-type, img = fichier dans combat/img */
const SUP=[
{id:'ramen',n:'Bol de ramen',t:'mag',sub:'Rapide',img:'ramen',col:2,txt:'Soigne 400 points de vie.'},
{id:'senzu',n:'Senzu',t:'mag',sub:'Rapide',img:'senzu',col:2,txt:'Soigne 750 points de vie. Un seul Senzu par tour.'},
{id:'examen',n:'Examen d’entrée',t:'mag',sub:'Normale',img:'examen',col:3,txt:'Pioche 2 cartes.'},
{id:'flashback',n:'Flashback',t:'mag',sub:'Normale',img:'flashback',col:4,txt:'Choisis un personnage de ton cimetière : ajoute-le à ta main.'},
{id:'entrainement',n:'Entraînement intense',t:'mag',sub:'Normale',img:'entrainement',col:1,txt:'Un de tes personnages gagne 150 ATK jusqu’à la fin du tour.'},
{id:'reunion',n:'Réunion de guilde',t:'mag',sub:'Normale',img:'reunion',col:0,txt:'Pose un personnage de niveau 5 ou 6 depuis ta main sans sacrifice.'},
{id:'pacte',n:'Pacte avec un démon',t:'mag',sub:'Normale',img:'pacte',col:4,txt:'Perds 350 points de vie : un de tes personnages gagne 250 ATK de façon permanente.'},
{id:'forgeron',n:'Forgeron',t:'eq',sub:'Équipement',img:'forgeron',col:1,txt:'Équipe un de tes personnages : il gagne 150 ATK. Si le personnage quitte le terrain, cette carte est détruite.'},
{id:'epee',n:'Épée légendaire',t:'eq',sub:'Équipement',img:'epee',col:3,txt:'Équipe un de tes personnages : il gagne 100 ATK et 100 DEF.'},
{id:'cape',n:'Cape d’invisibilité',t:'eq',sub:'Équipement',img:'cape',col:5,txt:'Équipe un de tes personnages : les pièges de l’adversaire ne peuvent pas le cibler.'},
{id:'arene',n:'Arène du tournoi',t:'field',sub:'Terrain',img:'arene',col:1,txt:'Tant que cette carte est sur le terrain, tous les personnages gagnent 75 ATK.'},
{id:'village',n:'Village caché',t:'field',sub:'Terrain',img:'village',col:2,txt:'Tant que cette carte est sur le terrain, tous les personnages gagnent 100 DEF.'},
{id:'lune',n:'Nuit de pleine lune',t:'field',sub:'Terrain',img:'lune',col:4,txt:'Tant que cette carte est sur le terrain, les personnages Ombre (闇) gagnent 100 ATK.'},
{id:'rival',n:'Rival jaloux',t:'trap',sub:'Normale',img:'rival',col:4,txt:'Quand un personnage de l’adversaire attaque : annule l’attaque et force-le à passer en position de défense.'},
{id:'embuscade',n:'Embuscade',t:'trap',sub:'Normale',img:'embuscade',col:0,txt:'Quand un personnage de l’adversaire attaque avec 500 ATK ou moins : détruis-le.'},
{id:'contre',n:'Contre-attaque',t:'trap',sub:'Normale',img:'contre',col:3,txt:'Quand un personnage de l’adversaire attaque : annule l’attaque et inflige à l’adversaire des dégâts égaux à l’ATK de l’attaquant.'},
{id:'rideau',n:'Rideau de fumée',t:'trap',sub:'Contre',img:'rideau',col:2,txt:'Quand l’adversaire active une carte Magie : annule son effet et détruis-la.'},
{id:'sacrifice',n:'Sacrifice héroïque',t:'trap',sub:'Normale',img:'sacrifice',col:2,txt:'Quand un de tes personnages va être détruit au combat : détruis un autre de tes personnages à la place. Le premier survit.'},
{id:'amitie',n:'Pouvoir de l’amitié',t:'trap',sub:'Continu',img:'amitie',col:5,txt:'Tant que tu contrôles 3 personnages, tous tes personnages gagnent 350 ATK. Si tu en contrôles moins, elle n’a aucun effet.'}];
SUP.forEach((s,i)=>{s.k='s';s.no=(s.t==='trap'?30000000:20000000)+i+1});

const hash=n=>{let h=(n*2654435761)>>>0;h^=h>>>13;h=Math.imul(h,0x5bd1e995)>>>0;return h^(h>>>15)};

/* personnage à partir d'une fiche AniList et de son rang de popularité (0 = le plus aimé) */
function mkChar(c,rank){
 const lvl=rank<10?6:rank<28?5:rank<60?4:rank<100?3:2;
 const h=hash(c.id);
 const base={2:300,3:450,4:550,5:750,6:950}[lvl];
 const atk=Math.round((base+(h%5)*15)/50)*50;
 const def=Math.round(atk*(0.45+((h>>3)%5)*0.1)/50)*50;
 const col=c.id%6;
 const s=sigFor(c.name.full,col);
 return {k:'c',id:'c'+c.id,n:c.name.full,img:c.image.large,series:(c.media&&c.media.nodes[0]&&c.media.nodes[0].title.romaji)||'',
  lvl,atk,def,col,ex:lvl===6,sn:s.n,sd:s.d,sig:s.sig,no:10000000+((h%80000)*10)+lvl};
}

/* évolutions (fusion) : mat = mots présents dans le nom des personnages à avoir sur le terrain.
   Si le fichier combat/img/evo-<id>.jpg existe, il remplace l'image par défaut (portrait du premier matériau). */
const EVO=[
{id:'gogeta',n:'Gogeta',mat:['goku','vegeta'],col:1,atk:3800,def:3000,sn:'Kamehameha de fusion',sd:'Le rayon des deux guerriers fusionnés.'},
{id:'naruto-sage',n:'Naruto Mode Sage',mat:['naruto','jiraiya'],col:2,atk:3400,def:2600,sn:'Rasengan géant',sd:'Un rasengan nourri d’énergie naturelle.'},
{id:'ichigo-bankai',cond:[{t:'trap'}],n:'Ichigo Kurosaki : Bankai',mat:['ichigo kurosaki'],col:4,atk:3700,def:2700,sn:'Getsuga Tenshô',sd:'Toute sa force dans une seule lame noire.'},
{id:'luffy-gear5',cond:[{t:'ally'}],n:'Luffy Gear 5',mat:['luffy'],col:5,atk:3900,def:3000,sn:'Bajrang Gun',sd:'Un poing géant qui écrase tout, dans un éclat de rire.'},
{id:'naruto-six-chemins',cond:[{t:'field',id:'village'}],n:'Naruto : Sage des Six Chemins',mat:['naruto'],col:1,atk:3700,def:2900,sn:'Rasengan des Six Chemins',sd:'Des sphères de vérité et le chakra des six chemins.'},
{id:'goku-ssj',cond:[{t:'lp',max:4000},{t:'card',id:'entrainement'}],n:'Gokuu Son : Super Saiyan',mat:['goku'],col:1,atk:3800,def:2800,sn:'Kamehameha doré',sd:'Une vague d’énergie dorée lancée à deux mains.'},
{id:'eren-titan',cond:[{t:'lp',max:4000}],n:'Eren Yeager : Titan d’Attaque',mat:['eren yeager'],col:0,atk:3800,def:2900,sn:'Rugissement du Titan',sd:'Un coup de titan qui fracasse les murs.'},
{id:'zoro-enma',cond:[{t:'eq',id:'epee'}],n:'Zoro Roronoa : Style Enma',mat:['zoro roronoa'],col:2,atk:3700,def:2800,sn:'Ashura : Roi de l’Enfer',sd:'Trois lames et une aura verte : le roi de l’enfer.'},
{id:'sasuke-susanoo',cond:[{t:'trap'}],n:'Sasuke Uchiha : Susanoo',mat:['sasuke uchiha'],col:4,atk:3700,def:3000,sn:'Amaterasu',sd:'Des flammes noires qui ne s’éteignent jamais, sous la garde du Susanoo.'},
{id:'gojo-vide-infini',cond:[{t:'eq',id:'cape'}],n:'Satoru Gojou : Vide Infini',mat:['satoru gojou'],col:3,atk:3900,def:3300,sn:'Vide Infini',sd:'Un espace sans fin que rien ne peut traverser.'},
{id:'sukuna-20-doigts',cond:[{t:'field',id:'lune'}],n:'Sukuna : Forme à 20 doigts',mat:['sukuna'],col:0,atk:3900,def:2900,sn:'Démantèlement',sd:'Mille coupures invisibles, sans le moindre répit.'},
{id:'megumi-mahoraga',cond:[{t:'grave',n:3}],n:'Megumi Fushiguro : Mahoraga',mat:['megumi fushiguro'],col:4,atk:3600,def:3400,sn:'Adaptation',sd:'Le dieu qui s’adapte à tout ce qui l’a déjà frappé.'},
{id:'tanjirou-danse-feu',cond:[{t:'eq',id:'forgeron'}],n:'Tanjirou Kamado : Danse du Dieu du Feu',mat:['tanjirou kamado'],col:0,atk:3600,def:2700,sn:'Danse du Dieu du Feu',sd:'Une danse sacrée qui enflamme chaque coup.'},
{id:'killua-godspeed',cond:[{t:'ally'}],n:'Killua Zoldyck : Godspeed',mat:['killua zoldyck'],col:1,atk:3500,def:2400,sn:'Godspeed',sd:'Il court à la vitesse de l’éclair et frappe avant qu’on le voie.'},
{id:'gon-adulte',cond:[{t:'grave',n:3}],n:'Gon Freecss : Forme adulte',mat:['gon freecss'],col:2,atk:4000,def:2200,sn:'Jajanken : Rock',sd:'Un poing chargé de toute sa colère, au prix de son avenir.'},
{id:'deku-ofa',cond:[{t:'eq'}],n:'Izuku Midoriya : One For All 100 %',mat:['izuku midoriya'],col:2,atk:3700,def:2500,sn:'Detroit Smash 100 %',sd:'Tout le pouvoir transmis, libéré dans un seul coup de poing.'},
{id:'asta-demon',cond:[{t:'grave',n:2}],n:'Asta : Mode démon',mat:['asta'],col:4,atk:3800,def:2600,sn:'Tranchant anti-magie',sd:'Une épée démoniaque qui annule toute la magie.'},
{id:'kaneki-kagune',cond:[{t:'lp',max:5000}],n:'Ken Kaneki : Kagune complet',mat:['ken kaneki'],col:4,atk:3700,def:2600,sn:'Kagune Rinkaku',sd:'Des tentacules rouges qui transpercent tout.'},{id:'saitama-serieux',cond:[{t:'field',id:'arene'}],n:'Saitama : Coup sérieux',mat:['saitama'],col:1,atk:4200,def:3000,sn:'Coup sérieux',sd:'Un seul coup de poing, sans aucune retenue.'}];

window.CBD={COL,beats,factor,SUP,mkChar,sigFor,EVO};
})();
