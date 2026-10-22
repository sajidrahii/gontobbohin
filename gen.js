// Builds public/js/data.js from bd-geojson (geoBoundaries, CC BY 4.0): 64 merged district shapes + names + divisions.
const ts=require('topojson-server'),tc=require('topojson-client'),tsi=require('topojson-simplify'),fs=require('fs');
const B='node_modules/bd-geojson/src/data/',rd=f=>JSON.parse(fs.readFileSync(B+f));
const fc=rd('bangladesh.geojson'),ds=rd('bd-districts.json').districts,dv=Object.fromEntries(rd('bd-divisions.json').divisions.map(d=>[d.id,d.bn_name]));
const fix={'নারায়াণগঞ্জ':'নারায়ণগঞ্জ','নেত্রকোণা':'নেত্রকোনা','রাজবাড়ি':'রাজবাড়ী','কক্স বাজার':'কক্সবাজার','নবাবগঞ্জ':'চাঁপাইনবাবগঞ্জ','মুন্সিগঞ্জ':'মুন্সীগঞ্জ'};
const alias={Nawabganj:'Chapainawabganj Nawabganj',Sirajgonj:'Sirajganj',Khagrachari:'Khagrachhari',Maulvibazar:'Moulvibazar Maulvibazar',Cumilla:'Cumilla Comilla',Chattogram:'Chattogram Chittagong',Bogura:'Bogura Bogra',Jashore:'Jashore Jessore',Barishal:'Barishal Barisal',Jhalokati:'Jhalokati Jhalakati'};
const info=ds.map(d=>({id:d.id,en:alias[d.name]||d.name,key:d.name,bn:fix[d.bn_name]||d.bn_name,lat:+d.lat,lng:+d.long,div:dv[d.division_id]}));
const norm=s=>s.toLowerCase().replace(/[^a-z]/g,''),byKey=Object.fromEntries(info.map(d=>[norm(d.key),d.id]));
// unlabelled upazila / thana shapes → district (by name)
const MAN={Dhaka:'Adabor|Badda|Bangshal|Biman Bandar|Cantonment|Dakshinkhan|Darus Salam|Demra|Dhanmondi|Gendaria|Gulshan|Hazaribagh|Jatrabari|Kadamtali|Kafrul|Kalabagan|Kamrangir Char|Khilgaon|Khilkhet|Lalbagh|Motijheel|New Market|Pallabi|Paltan|Ramna|Rampura|Sabujbagh|Shah Ali|Shahbagh|Sher-e-bangla Nagar|Shyampur|Sutrapur|Tejgaon|Tejgaon Ind. Area|Turag|Uttar Khan|Uttara',
Chattogram:'Anowara|Bakalia|Bayejid Bostami|Chak Bazar|Chandgaon|Chittagong Port|Double Mooring|Halishahar|Khulshi|Pahartali|Panchlaish|Patenga',Khulna:'Khalishpur|Khan Jahan Ali|Sonadanga|Khulna Sadar',Rajshahi:'Boalia|Baghmara|Matihar|Rajpara|Shah Makhdum',
Kishoreganj:'Austagram',Rangamati:'Baghai Chhari|Naniarchar|Kawkhali (Betbunia)',Jamalpur:'Bakshiganj',Feni:'Chhagalnaiya|Fulgazi',Cumilla:'Comilla Adarsha Sadar|Comilla Sadar Dakshin|Manoharganj',Sunamganj:'Dakshin Sunamganj',
Sylhet:'Golabganj|Jaintiapur',Natore:'Gurudaspur|Singra',Chandpur:'Hajiganj|Matlab Dakshin',Noakhali:'Hatiya|Kabirhat|Senbagh|Subarnachar',Gazipur:'Kaliakair',Lakshmipur:'Kamalnagar|Roypur',Jhalokati:'Kanthalia',
Khagrachari:'Khagrachhari Sadar',Lalmonirhat:'Lalmonirhat Sadar',Naogaon:'Mahadebpur',Narsingdi:'Manohardi|Roypura',Maulvibazar:'Maulvi Bazar Sadar',Kurigram:'Raumari',Sirajgonj:'Royganj',Gaibandha:'Saghatta',Faridpur:'Saltha',
Munshiganj:'Serajdikhan',Bogura:'Sonatola',Panchagarh:'Tentulia',Shariatpur:'Zanjira',Pirojpur:'Kawkhali',Magura:'Sreepur'};
const man={};for(const[d,names]of Object.entries(MAN))names.split('|').forEach(n=>man[norm(n)]=byKey[norm(d)]);
const AMB={kotwali:['Dhaka','Chattogram','Khulna'],fulbari:['Dinajpur','Kurigram']};
const valid=id=>info.some(d=>d.id===id),ups=rd('bd-upazilas.json').upazilas,uidx={},F=fc.features;
ups.forEach(u=>(uidx[norm(u.name)]=uidx[norm(u.name)]||new Set()).add(u.district_id));
const cen=g=>{let a=[];(function w(z){typeof z[0]==='number'?a.push(z):z.forEach(w)})(g.coordinates);return[a.reduce((s,p)=>s+p[0],0)/a.length,a.reduce((s,p)=>s+p[1],0)/a.length]};
const cs=F.map(f=>cen(f.geometry)),kmd=(a,b)=>Math.hypot((a.lat-b[1])*111,(a.lng-b[0])*102),nearest=c=>info.reduce((b,d)=>kmd(d,c)<kmd(b,c)?d:b);
F.forEach(f=>{const p=f.properties;if(!valid(p.district_id)){p.district_id='';const m=man[norm(p.name)];if(m){p.district_id=m;p._m=1}else{const a=AMB[norm(p.name)];if(a)p._cand=a.map(n=>byKey[norm(n)])}}});
// repeated names: match shapes to the official upazila list by geography (nearest district centre, each district once per name)
const groups={};F.forEach((f,i)=>{const n=norm(f.properties.name);if(uidx[n]&&!f.properties._m)(groups[n]=groups[n]||[]).push(i)});
const matched=new Set();
for(const[n,idxs]of Object.entries(groups)){const C=[...uidx[n]].map(id=>info.find(d=>d.id===id)).filter(Boolean),pairs=[];idxs.forEach(i=>C.forEach(d=>pairs.push([kmd(d,cs[i]),i,d])));pairs.sort((x,y)=>x[0]-y[0]);const uf=new Set(),uc=new Set();
  for(const[dist,i,d]of pairs){if(uf.has(i)||uc.has(d.id)||dist>110)continue;uf.add(i);uc.add(d.id);const old=info.find(x=>x.id===F[i].properties.district_id);if(old&&old.id!==d.id)console.log('rematch',F[i].properties.name,old.key,'→',d.key);F[i].properties.district_id=d.id;matched.add(i)}}
F.forEach((f,i)=>{const p=f.properties,L=info.find(d=>d.id===p.district_id);if(!L||matched.has(i)||p._m)return;const b=nearest(cs[i]);if(b.id!==L.id&&kmd(L,cs[i])>60&&kmd(b,cs[i])<.6*kmd(L,cs[i])){console.log('relabel',p.name,L.key,'→',b.key);p.district_id=b.id}});
let topo=ts.topology({u:fc},1e5);topo=tsi.presimplify(topo);topo=tsi.simplify(topo,tsi.quantile(topo,.3));
const geoms=topo.objects.u.geometries,nb=tc.neighbors(geoms),vote=(i,only)=>{const c={};nb[i].forEach(j=>{const id=geoms[j].properties.district_id;if(id&&(!only||only.includes(id)))c[id]=(c[id]||0)+1});return Object.entries(c).sort((x,y)=>y[1]-x[1])[0]};
console.log('left after name match:',geoms.filter(g=>!g.properties.district_id).length);
for(let pass=0;pass<30;pass++){let ch=0;geoms.forEach((g,i)=>{const p=g.properties;if(p.district_id)return;const v=vote(i,p._cand);if(v){p.district_id=v[0];ch++}else if(p._cand&&pass>5){p.district_id=p._cand[0];ch++}});if(!ch)break}
geoms.forEach((g,i)=>{if(!g.properties.district_id){const[x,y]=cs[i];g.properties.district_id=info.reduce((b,d)=>Math.hypot(d.lng-x,d.lat-y)<Math.hypot(b.lng-x,b.lat-y)?d:b).id;console.log('nearest-centre fallback:',g.properties.name)}});
const cnt={};geoms.forEach(g=>cnt[g.properties.district_id]=(cnt[g.properties.district_id]||0)+1);
const want={};ups.forEach(u=>want[u.district_id]=(want[u.district_id]||0)+1);
console.log('shape-count vs official upazila count (differences only):',info.filter(d=>Math.abs((cnt[d.id]||0)-(want[d.id]||0))>=2).map(d=>`${d.key} ${cnt[d.id]}/${want[d.id]}`).join(', '));
if(process.env.DBG)for(const k of process.env.DBG.split(','))console.log(k,'→',geoms.filter(g=>g.properties.district_id===byKey[norm(k)]).map(g=>g.properties.name).join(', '));
const P=([lo,la])=>[((lo-88)*91.64).toFixed(1),((26.7-la)*100).toFixed(1)];
const paths=info.map(d=>{const m=tc.merge(topo,geoms.filter(g=>g.properties.district_id===d.id));let s='';
  for(const poly of m.coordinates)for(const ring of poly){let last='',k=0;ring.forEach(p=>{const[x,y]=P(p),key=x+' '+y;if(key===last)return;last=key;s+=(k++?'L':'M')+x+' '+y});s+='Z'}return s});
const order=info.map((d,i)=>i).sort((a,b)=>info[a].bn.localeCompare(info[b].bn,'bn'));
const D=order.map(i=>[info[i].bn,+info[i].lat.toFixed(4),+info[i].lng.toFixed(4),info[i].en,info[i].div]),M=order.map(i=>[info[i].bn,paths[i]]);
fs.writeFileSync('public/js/data.js',`// Generated by gen.js — DISTRICTS [bn, lat, lng, english, division]; MAP = 64 district shapes (x=(lng-88)*91.64, y=(26.7-lat)*100).\n// District boundaries © geoBoundaries (CC BY 4.0)\nconst DISTRICTS=${JSON.stringify(D)};\nconst DIVISIONS=${JSON.stringify(Object.values(dv))};\nconst MAP={w:431,h:612,sx:1,sy:1,tx:0,ty:0,districts:${JSON.stringify(M)}};\n`);
console.log('districts',D.length,'| bytes',fs.statSync('public/js/data.js').size,'| per division',JSON.stringify(D.reduce((a,d)=>(a[d[4]]=(a[d[4]]||0)+1,a),{})));
fs.writeFileSync('geo.json',JSON.stringify({D,M}));
