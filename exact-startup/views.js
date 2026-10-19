/* Additional native SVG pages. Reuses original measurement/control coordinates.
 * All navigation is in-document, including in the self-contained offline HTML.
 * START-UP remains the separately approved drawing, not the previous redesign. */
(function(){'use strict';
const names={SPEED:'Turbine Speed',SPEED_PCT:'Turbine Speed',GEN_POWER:'Generator Watts',EXH_T:'Exhaust Temp.',WHEEL_MAX_T:'W.S. Max. Temp',VIB_2BX:'Max. Vibration',LUBE_HDR_T:'Lube Oil Header Temp.',GEN_KV:'Voltage',GEN_A:'Current',GEN_MVAR:'Reactive Power',GEN_PF:'Power Factor',GEN_HZ:'Frequency',GEN_MWH:'Gen. MWH',EXC_V:'Voltage',EXC_A:'Current',FOFFD:'FFD',F20RATIO:'F20RATIO',CPR_IN_T:'Cpr Inlet Temp',CPR_OUT_P:'Cpr Out Press',CPR_OUT_T:'Cpr Out Temp',AMB_T:'Amb. Temperature',IGV_POS:'IGV Position',IBH_POS:'IBH Position',ALLOW_SPREAD:'Allowable Spread',SPREAD_1:'Spread 1',SPREAD_2:'Spread 2',EXH_SPREAD_3:'Spread 3',EXH_REF_T:'Exhaust Ref. Temp.',FUEL_FLOW:'Fuel Flow',FUEL_GAS_T:'Fuel Gas Temp',FUEL_GAS_P:'Fuel Gas Press',P1_PRESS:'P1 Press',P2_PRESS:'P2 Press',FG_CT:'Fuel Gas Temp',SRV_POS:'SRV',F1_GCV:'F1 GCV',F2_1_GCV:'F2-1 GCV',F2_2_GCV:'F2-2 GCV',F2_3_GCV:'F2-3 GCV',F2_4_GCV:'F2-4 GCV',LO_HDR_P:'Lube Oil Press',LO_HDR_P2:'Lube Oil Press 2',HYD_OIL_P:'Hydraulic Press',MW_REF:'Ref.',MW_FDBK:'Fdbk',IBH_OUT_T:'IBH Outlet Temp',IBH_OUT_P:'IBH Outlet Press',IBH_IN_P:'IBH Inlet Press',SC_FILT_DP:'Self Cleaning Filter DP',HEPA_DP:'HEPA Filter DP',INLET_T1:'Inlet Temperature 1',INLET_T2:'Inlet Temperature 2',EOH_L:'Equivalent Operating Hours',EOH_R:'Equivalent Operating Hours',AOH_L:'Actual Operating Hours',AOH_R:'Actual Operating Hours',GAS_L:'Gas Firing Hours',GAS_R:'Gas Firing Hours',FS_N:'Fired Starts',ET_NT:'Emergency Trips',TOT_ST:'Total Starts',TOT_ET:'Total Trips',FS_N_R:'Fired Starts',ET_NT_R:'Emergency Trips',TOT_ST_R:'Total Starts',TOT_ET_R:'Total Trips',RST_DATE:'Reset Date',RST_TIME:'Reset Time'};
const motorNames={eop:'Emergency Lube Oil Pump',mop1:'Main Lube Oil Pump No.1',mop2:'Main Lube Oil Pump No.2',mist1:'Lube Oil Mist Separator No.1',mist2:'Lube Oil Mist Separator No.2',hop1:'Hydraulic Supply Pump No.1',hop2:'Hydraulic Supply Pump No.2',jop:'Gen. Jacking Oil Pump',tgm:'Turning Gear Motor',ven1:'Turbine Compt Vent Fan No.1',ven2:'Turbine Compt Vent Fan No.2',bc1:'Bearing Cooling Fan No.1',bc2:'Bearing Cooling Fan No.2',evac1:'Inlet Air Filter Dust Evacuation',gfc1:'Generator Cooling Fan No.1',gfc2:'Generator Cooling Fan No.2',gfc3:'Generator Cooling Fan No.3',crank:'Cranking Motor'};
// Every quadrant is a separate SVG fill; changing one never repaints the others.
function drawBurner(c,x,y,r,options={}){
 const {add,line,text}=c,small=!!options.small,id=options.id;
 add(`<g data-burner${id?' id="'+id+'"':''}>`);
 const sectors=[['F21',135,225],['F23',225,315],['F22',315,405],['F24',45,135]];
 for(const [key,start,end]of sectors){const a=start*Math.PI/180,b=end*Math.PI/180;
  add(`<path data-burner-sector="${key}" d="M${x} ${y}L${x+r*Math.cos(a)} ${y+r*Math.sin(a)}A${r} ${r} 0 0 1 ${x+r*Math.cos(b)} ${y+r*Math.sin(b)}Z" fill="#fe0000"/>`);
 }
 add(`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-width="${small?1:1.5}"/>`);
 for(const a of [45,135,225,315])line(x,y,x+r*Math.cos(a*Math.PI/180),y+r*Math.sin(a*Math.PI/180),'#000',1);
 add(`<circle data-burner-sector="F1" cx="${x}" cy="${y}" r="17" fill="#fe0000" stroke="#fff" stroke-width="${small?2:3}"/>`);
 const outer=small?9:10,weight=small?'normal':'bold';
 text(x,y+4,'F1',small?11:13,'#fff','middle','bold','data-burner-label="F1"');
 text(x,y-(small?28:29),'F2-3',outer,'#fff','middle',weight,'data-burner-label="F23"');
 text(x,y+33,'F2-4',outer,'#fff','middle',weight,'data-burner-label="F24"');
 text(x-(small?32:34),y+4,'F2-1',outer,'#fff','middle',weight,'data-burner-label="F21"');
 text(x+(small?32:33),y+4,'F2-2',outer,'#fff','middle',weight,'data-burner-label="F22"');
 add('</g>');
}
function draw(c,id){
const{add,rect,path,line,text,bevel,panel,field,valve,arrow,breaker,motor,button,controlBox,metadata:s,screens,P,escape}=c;
const shared=['ffd','brg','vib','ws','os'].includes(id);
if(shared)add(c.commonMarkup);else{add(c.startupMarkup.match(/<defs>[\s\S]*?<\/defs>/)[0]);rect(0,0,1280,574,'#a0a0a0');rect(1,0,2,574,'#1674d8');rect(57,0,1172,24,'#000080');text(643,18,'H25 GAS TURBINE GENERATOR',19.2,'#fff','middle','bold');text(1200,18,'UNIT-20',19.2,'#fff','end','bold');}
const label=k=>names[k]||k.replace(/_/g,' ');
const nativePanel=(x,y,w,h,title)=>panel(x,y,w,h,title);
function pipe(d,col='#ffffa0',w=2){path(d,'none',col,w);}
function circle(x,y,r,fill='none',stroke='#000',sw=1){add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);}
function boxFields(values,x,y,w,h,title){nativePanel(x,y,w,h,title);values.forEach(v=>text(v[1]-7,v[2]+P+v[4]/2+3,label(v[0]),9,'#eee','end'));}
if(id==='ffd'){
 rect(204,317,527,215,'none','#000',1.5);for(let n=0;n<=100;n+=20){const y=502-n*1.46;line(250,y,682,y,n===0?'#111':'#808080',.8);text(239,y+3,n,10,'#222','end');text(692,y+3,n,10,'#222');}line(250,355,250,502,'#111',1);line(682,355,682,502,'#111',1);
 (s.bars||[]).forEach((b,i)=>{text(b.cx,347,['FFD','FFDMIN','SU','ACC','SPD','LLM','TEMP','SD'][i],10,'#0000ff','middle');bevel(b.cx-5,355,10,147,'#ddd','#111','#fff');rect(b.cx-4,502,8,0,'#000080',null,1,`data-bar="${b.tag}" data-baseline="502" data-span="146" data-max="100"`);});controlBox(749,318,104,84,'Governor Function',27);
}
if(['brg','vib','ws'].includes(id)){
 const vals=(s.values||[]).filter(v=>v[2]>270);const max=id==='vib'?200:id==='brg'?120:900;const x1=Math.min(...vals.map(v=>v[1]))-15,x2=Math.max(...vals.map(v=>v[1]+v[3]))+15,base=vals[0]?.[2]+P-5||480;rect(x1-25,316,x2-x1+40,base-299,'none','#111');for(let i=0;i<=5;i++){const y=base-i*(base-348)/5;line(x1,y,x2,y,'#777',.7);text(x1-9,y+3,Math.round(max*i/5),8,'#111','end');}
 vals.forEach(v=>{const x=v[1]+v[3]/2;const span=base-348;text(x,337,v[0].replace('VIB_','').replace('DRN_',''),8,'#000080','middle');bevel(x-5,348,10,span,'#ddd','#111','#fff');rect(x-4,base,8,0,'#000080',null,1,`data-bar="${v[0]}" data-baseline="${base}" data-span="${span}" data-max="${max}"`);});
}
if(id==='fuelgas'){
 rect(134,73,694,416,'url(#steel-panel)','#444');
 add('<defs><linearGradient id="steel-panel" x2="1" y2="1"><stop stop-color="#dedede"/><stop offset="1" stop-color="#8a8a8a"/></linearGradient></defs>');text(279,85,'Gas Valve Compartment',10,'#111','start','bold');
 boxFields(s.values.slice(0,6),63,73,191,144,'Turbine info.');boxFields(s.values.slice(-6),881,330,181,144,'Combustor Info.');
 rect(147,253,95,182,'none','#333');text(195,247,'Gas Flow Meter',10,'#111','middle');
 for(const idx of [6,7,8,9,12,13]){const v=s.values[idx];panel(v[1]-3,v[2]+P-15,v[3]+6,v[4]+18,label(v[0]),{size:9});}
 pipe('M103 415H853V147H630V415 M630 207H840V257H915 M630 269H828V280H915 M630 330H815V293H915 M853 245H915 M630 415H903');
 for(const[y,k]of [[147,'F2-4 GCV'],[207,'F2-3 GCV'],[269,'F2-2 GCV'],[330,'F2-1 GCV'],[415,'F1 GCV']]){valve(682,y);text(682,y-16,k,9,'#111','middle');arrow(915,y===147?245:y===207?257:y===269?280:y===330?293:305,'right');}
 valve(449,415);text(449,387,'SRV',10,'#111','middle');pipe('M586 415V62Q577 43 566 61');valve(586,210,'#168d1b',1,true);text(555,65,'VENT GAS',10,'#eee','end');text(574,198,'Fuel Gas Vent Valve',9,'#111','end');
 text(96,415,'Fuel',10,'#fff','end','bold');text(96,427,'Gas',10,'#fff','end','bold');
 for(const i of [10,11,14,15,16,17,18,19,20,21,22,23]){const v=s.values[i];rect(v[1]-29,v[2]+P-1,v[3]+32,v[4]+2,'#4682b4','#333');text(v[1]-5,v[2]+P+10,i%2?'Fdbk':'Ref.',9,'#fff','end');}
 const b=s.basket;drawBurner(c,b.x+b.d/2,b.y+P+b.d/2,b.d/2,{small:true});
}
if(id==='sync'){
 boxFields(s.values.slice(0,7),89,31,239,171,'Generator Info.');boxFields(s.values.slice(7,9),89,207,239,68,'Exciter Info.');boxFields(s.values.slice(9,15),89,281,239,153,'Turbine Info.');boxFields(s.values.slice(15),89,434,239,116,'Combustor Info.');
 rect(609,72,487,108,'#c0c0c0','#111',2);rect(610,73,485,13,'#4682b4','#fff');text(852,83,'Synchronizing Operation',10,'#fff','middle');
 ['GT RUNNING SEQ. COMPLETE (3)','FIELD SWITCH CLOSED (41XC)','RUNNING VOLTAGE NORMAL (84R)','INCOMING VOLTAGE NORMAL (84I)'].forEach((t,i)=>text(632,97+i*16,t,9,'#111'));
 controlBox(796,88,70,87,'43-25L',24);controlBox(870,88,70,87,'43-25G',24);controlBox(944,88,70,87,'43-OPE',24);controlBox(1018,88,73,87,'Circuit Breaker|Close',24);
 rect(609,209,487,142,'#c0c0c0','#111',2);rect(610,210,485,13,'#4682b4','#fff');text(852,220,'Exciter Control',10,'#fff','middle');
 [[656,'AVR Mode'],[736,'Voltage Control'],[816,'Current Control'],[896,'Field Switch'],[976,'PSS']].forEach(([x,t])=>controlBox(x,232,70,t==='Field Switch'?105:93,t,25));
 pipe('M402 74V328 M402 328V344H425V326H480V344H500V259H556V344H480','#111');circle(402,344,15,'#a0a0a0');circle(480,344,12,'#a0a0a0');circle(556,344,12,'#a0a0a0');text(402,348,'GEN',9,'#111','middle');text(480,348,'AC',9,'#111','middle');text(556,348,'PMG',8,'#111','middle');text(380,88,'52L',9,'#111','end');text(380,217,'52G',9,'#111','end');text(580,284,'41',10,'#111');
}
if(id==='motors'){
 const groups=[['eop'],['mop1','mop2'],['mist1','mist2'],['jop'],['tgm'],['hop1','hop2'],['ven1','ven2'],['bc1','bc2'],['evac1'],['gfc1','gfc2','gfc3']];
 const groupNames={mop1:'Main Lube Oil Pump Motor',mist1:'Lube Oil Mist Separator Fan Motor',hop1:'Main Hydraulic Supply Pump Motor',ven1:'Turbine Compt Vent Fan Motor',bc1:'No.1 Bearing Cooling Fan Motor',gfc1:'Gen. Cooling Fan Motor'};
 for(const group of groups){
  const first=s.mcells.find(m=>m.motor===group[0]);if(!first)continue;
  const last=s.mcells.find(m=>m.motor===group[group.length-1]),top=first.y+P-57,x=first.x-(group.length>1?8:23),w=group.length>1?last.x+last.w+7-x:124;
  panel(x,top,w,165,'');const title=groupNames[group[0]]||motorNames[group[0]],maxChars=Math.floor((w-8)/4.6);let lines=[title];if(title.length>maxChars){const split=title.lastIndexOf(' ',maxChars);lines=[title.slice(0,split),title.slice(split+1)];}lines.forEach((t,i)=>text(x+w/2,top+14+i*11,t,9,'#fff','middle'));if(group.length>1)group.forEach((id,i)=>{const m=s.mcells.find(m=>m.motor===id);text(m.x+m.w/2,top+31,'No.'+(i+1),9,'#eee','middle');});
  for(const id of group){const rows=s.mcells.filter(m=>m.motor===id),r=rows[0],yy=r.y+P;
   if(group.length>1){rect(r.x,yy-15,r.w,13,'#c0c0c0','#333',1,`data-standby="${id}"`);text(r.x+r.w/2,yy-5,'NOT STANDBY',9,'#111','middle','normal',`data-standby-text="${id}"`);}
   rect(r.x,yy+15,r.w,13,'#c0c0c0','#333');text(r.x+r.w/2,yy+25,'NORMAL',10,'#111','middle');rect(r.x,yy+30,r.w,13,'#00ff00','#333');text(r.x+r.w/2,yy+40,'AVAILABLE',10,'#111','middle');
   for(const m of rows){if(m.kind==='run'){rect(m.x,m.y+P,m.w,m.h,'#00ff00','#333',1,`data-motor-state="${id}"`);text(m.x+m.w/2,m.y+P+10,'STOPPED',10,'#111','middle','normal',`data-motor-text="${id}"`);}else button({...m,label:m.kind.toUpperCase(),g:'motor-'+id,v:m.kind,act:'motor'+m.kind,motor:id});}
  }
 }
 panel(94,400,125,99,'Cranking Motor');rect(118,450,78,13,'#00ff00','#333',1,'data-motor-state="crank"');text(157,460,'STOPPED',10,'#111','middle','normal','data-motor-text="crank"');text(156,478,'NORMAL / AVAILABLE',9,'#111','middle');
}
if(id==='sc'||id==='tripm'){
 for(const h of s.headers||[]){bevel(h.x,h.y+P,h.w,h.h,'#4682b4','#333','#fff');text(h.x+h.w/2,h.y+P+h.h/2+3,h.text,h.fs,'#fff','middle');}
 for(const r of s.scrows||s.tripitems||[]){rect(r.x,r.y+P,r.w,r.h,'#c0c0c0','#333',1,`data-${id==='sc'?'permissive':'trip-item'}="${r.id}"`);text(r.x+r.w/2,r.y+P+r.h/2-1,r.l1,r.fs,'#111','middle');text(r.x+r.w/2,r.y+P+r.h/2+9,r.l2,8,'#111','middle');}
 if(s.ready){const r=s.ready;rect(r.x,r.y+P,r.w,r.h,'#00ff00','#111',1,'data-ready="start"');text(r.x+r.w/2,r.y+P+r.h/2+3,'READY TO START',9,'#111','middle');}
}
if(id==='tim'){
 for(const[x,title]of [[100,'TOTAL / LIFETIME'],[528,'SINCE COUNTER RESET']]){panel(x,68,454,323,'');rect(x,68,454,20,'#000080');text(x+227,82,title,12,'#fff','middle');}
 for(const v of s.values){text(v[1]-10,v[2]+P+v[4]/2+4,label(v[0]),10,'#eee','end');}
 panel(790,425,295,52,'Counter Reset Date / Time');
}
if(id==='dr1'||id==='dr2'){
 for(const t of s.drtables||[]){rect(t.x,t.y+P,t.w,t.h,'#4682b4','#111');t.rows.forEach((row,i)=>{const y=t.y+P+i*t.rh;line(t.x,y,t.x+t.w,y,'#bad3e7',.5);text(t.x+4,y+t.rh/2+3,row[0],t.fs,'#eee');field(t.x+t.w-94,y+2,91,t.rh-4,row[1],row[2],9);});}
}
if(id==='exh'){
 const p=s.polar,x=p.x+p.c,y=p.y+p.c+P,r=p.r;for(let t=200;t<=800;t+=200){circle(x,y,r*t/800,'none','#5e5e5e',.7);text(x+4,y-r*t/800+10,t,8,'#333');}for(let i=0;i<18;i++){const a=(-90+i*20)*Math.PI/180;line(x,y,x+r*Math.cos(a),y+r*Math.sin(a),'#777',.6);}
 add(`<polygon data-polar="exhaust" data-cx="${x}" data-cy="${y}" data-radius="${r}" fill="#00008018" stroke="#000080" stroke-width="1.8"/>`);
 for(const v of s.values.filter(v=>/^TC\d/.test(v[0])))text(v[1]+v[3]/2,v[2]+P-3,v[0],9,'#111','middle');boxFields(s.values.filter(v=>!/^TC\d/.test(v[0])&&v[2]<240),753,57,332,207,'Turbine / Generator Info.');boxFields(s.values.filter(v=>v[2]>=240&&!/^TC\d/.test(v[0])),753,264,332,153,'Exhaust Temperature / Spread');
}
if(id==='os'){
 boxFields(s.values.filter(v=>v[0].startsWith('OS_')),301,316,257,130,'Over Speed Test Monitor');controlBox(647,299,80,79,'Test Select',27);controlBox(571,414,73,81,'MAIN',27);controlBox(646,414,73,81,'BACKUP',27);text(523,467,'Speed / Load',9,'#eee','middle');
 const b=s.osbar;rect(b.x,b.y+P,b.w,b.h,'none','#111');text(b.x+b.w/2,b.y+P-7,'TURBINE SPEED / OVERSPEED',9,'#000080','middle');for(let i=0;i<=4;i++){const y=b.y+P+b.h-20-i*(b.h-30)/4;line(b.x+30,y,b.x+b.w-10,y,'#777',.8);text(b.x+25,y+3,i*30,8,'#111','end');}rect(b.x+75,b.y+P+b.h-20,25,0,'#000080',null,1,`data-bar="SPEED_PCT" data-baseline="${b.y+P+b.h-20}" data-span="${b.h-30}" data-max="120"`);
}
if(id==='menu'){
 for(const h of s.headers||[])text(h.x+h.w/2,h.y+P+h.h/2+5,h.text,h.fs,'#000080','middle','bold');for(const v of s.values)text(v[1]-10,v[2]+P+14,label(v[0]),11,'#111','end');
}
if(['lube','gen','vent','ibh'].includes(id)){
 // Native engineering drawings retain the original field and device anchors.
 if(id==='gen'){
  rect(279,185,352,130,'url(#cylinder)','#000080');rect(257,207,22,85,'url(#endcap)');rect(631,207,22,85,'url(#endcap)');rect(227,240,460,16,'url(#shaft)');text(455,237,'GENERATOR',14,'#fff','middle');pipe('M161 118H775V198H705 M200 198V154H320V103 M455 103V155 M596 103V155H705 M200 327V421H712V327','#38e4ee',3);boxFields(s.values.filter(v=>v[1]>900),866,142,237,145,'Generator Info.');
 }else if(id==='ibh'){
  rect(323,247,290,100,'#c0c0c0','#333');rect(361,256,197,75,'url(#cylinder)');text(454,316,'GENERATOR',12,'#fff','middle');path('M616 274L756 306V330L616 367Z','url(#cone)');rect(756,278,35,86,'#fe0000');path('M791 278L882 299L935 278V365L882 345L791 365Z','url(#turbine-cone)');rect(936,314,28,14,'url(#shaft)');rect(339,144,250,88,'#c0c0c0','#111');text(464,167,'INLET AIR FILTER',12,'#000080','middle');pipe('M117 111H339 M117 186H339 M589 188H658V270 M658 350V399H230V297','#ffffa0',3);valve(401,399,'#148314');text(620,465,'IBH LOCKOUT',9,'#111');
 }else if(id==='vent'){
  rect(378,214,200,126,'url(#cylinder)','#111');text(478,267,'GENERATOR',13,'#fff','middle');rect(654,215,300,132,'none','#111');text(804,279,'GAS TURBINE COMPARTMENT',11,'#000080','middle');pipe('M253 182H355V213 M729 167V215 M829 167V215 M705 428V347 M797 428V347','#9feafa',3);
 }else{
  rect(86,380,360,123,'#b4b4b4','#111',2);text(266,487,'LUBE OIL TANK',12,'#111','middle');line(88,454,444,454,'#ffff00',2);pipe('M124 454V214H628V125H935 M229 454V254H628 M336 454V288H628 M628 125V370H1049 M628 212H1030V370','#ffff00',3);rect(566,150,116,55,'#c0c0c0','#111');text(624,182,'OIL FILTER',11,'#111','middle');
 }
 for(const m of s.motors||[]){add(`<g role="button" tabindex="0" class="operator" data-act="motor-open" data-motor="${m.id}" aria-label="${escape(motorNames[m.id]||m.id)}">`);circle(m.x+m.d/2,m.y+P+m.d/2,m.d/2,'#00ff00','#111');text(m.x+m.d/2,m.y+P+m.d/2+4,'M',11,'#111','middle','bold',`data-motor-icon="${m.id}"`);text(m.x+m.d/2,m.y+P-5,m.id.toUpperCase(),8,'#111','middle');add('</g>');}
 // Avoid drawing a second value: label and vector housing only, then shared fields below.
 for(const v of s.values){const prev=s.values.some(o=>o!==v&&Math.abs(o[1]-v[1])<12&&o[2]<v[2]&&v[2]-o[2]<24);if(!prev){rect(v[1]-3,v[2]+P-15,v[3]+6,v[4]+18,'#4682b4','#666');text(v[1]+v[3]/2,v[2]+P-4,label(v[0]),8,'#eee','middle');}else text(v[1]-5,v[2]+P+v[4]/2+3,label(v[0]),8,'#111','end');}
}
// Measurements are added once, after backgrounds. Shared upper mimic fields are identical to START-UP.
const vals=(s.values||[]).slice();if(shared){for(const v of screens.startup.values.filter(v=>v[2]<273)){if(!vals.some(o=>o[0]===v[0]&&Math.abs(o[1]-v[1])<3&&Math.abs(o[2]-v[2])<3))vals.push(v);}}
for(const v of vals)field(v[1],v[2]+P,v[3],v[4],v[0],v[6],v[5]);
for(const b of s.buttons||[])button(b);
for(const a of s.lamps||[]){rect(a.x,a.y+P,a.w,a.h,'#00ff00','#333',1,`data-lamp="${a.id}"`);}
for(const a of s.lamptexts||[]){rect(a.x,a.y+P,a.w,a.h,'#c0c0c0','#333',1,`data-ready="${a.id}"`);text(a.x+a.w/2,a.y+P+8,'SYNCHRO.',8,'#111','middle');text(a.x+a.w/2,a.y+P+16,'READY',8,'#111','middle');}
for(const a of s.syms||[])breaker(a.x,a.y+P,a.w,a.h,a.id==='sym41'?'41':a.id==='sym52G'?'52G':'52L');
// Secondary views use their original shorter selectors; MENU exposes every page.
(s.navList||[]).forEach((name,i)=>{const key=Object.keys(screens).find(k=>screens[k].nav.replace(/\s/g,'')===name.replace(/\s/g,''))||'menu';const y=(id==='os'?271:30)+i*21.5;const fill=key===id?'#fff':key==='menu'?'#000080':['sc','tim','tripm','dr1','dr2','os'].includes(key)?'#39baba':'#4682b4';add(`<g class="operator" role="button" tabindex="0" data-nav="${i}" data-target="${key}" aria-label="${escape(name)}">`);bevel(1115,y,94,21,fill,'#111','#eee');text(1162,y+13,name,name.length>15?7:9,key===id?'#111':'#eee','middle');rect(1116,y+1,92,19,'none',null,1,'class="focus-ring"');add('</g>');});
// Bottom screen-tab strip removed at the operator's request.
}
function update(svg,id,H){
 svg.querySelectorAll('[data-bar]').forEach(el=>{const max=Number(el.dataset.max),span=Number(el.dataset.span),height=Math.min(span,Math.max(0,Number(H.tags[el.dataset.bar])||0)/max*span);el.setAttribute('height',height);el.setAttribute('y',Number(el.dataset.baseline)-height);});
 svg.querySelectorAll('[data-polar]').forEach(el=>{const x=+el.dataset.cx,y=+el.dataset.cy,r=+el.dataset.radius;const points=Array.from({length:18},(_,i)=>{const a=(-90+i*20)*Math.PI/180,rad=Math.max(0,Math.min(1.1,H.tags['TC'+String(i+1).padStart(2,'0')]/800))*r;return(x+rad*Math.cos(a))+','+(y+rad*Math.sin(a));});el.setAttribute('points',points.join(' '));});
 svg.querySelectorAll('[data-motor-state]').forEach(el=>el.setAttribute('fill',H.motors[el.dataset.motorState]?.run?'#fe0000':'#00ff00'));
 svg.querySelectorAll('[data-motor-text]').forEach(el=>el.textContent=H.motors[el.dataset.motorText]?.run?'RUNNING':'STOPPED');
 svg.querySelectorAll('[data-standby]').forEach(el=>el.setAttribute('fill',H.motors[el.dataset.standby]?.standby?'#ffa500':'#c0c0c0'));
 svg.querySelectorAll('[data-standby-text]').forEach(el=>el.textContent=H.motors[el.dataset.standbyText]?.standby?'STANDBY':'NOT STANDBY');
 svg.querySelectorAll('[data-motor-icon]').forEach(el=>el.previousElementSibling?.setAttribute('fill',H.motors[el.dataset.motorIcon]?.run?'#fe0000':'#00ff00'));
 svg.querySelectorAll('[data-act^="motor"][data-grp]').forEach(el=>{const m=H.motors[el.dataset.motor];if(!m)return;const kind=el.dataset.val;const on=kind==='auto'?m.auto:kind==='manual'?!m.auto:kind==='start'?m.run:!m.run;el.dataset.selected=String(on);el.querySelector('.button-face')?.setAttribute('fill',on?'#ffa500':'#c0c0c0');});
 svg.querySelectorAll('[data-permissive]').forEach(el=>el.setAttribute('fill',H.scColor(el.dataset.permissive)));
 svg.querySelectorAll('[data-trip-item]').forEach(el=>el.setAttribute('fill',H.tripItems[el.dataset.tripItem]?'#fe0000':'#c0c0c0'));
 svg.querySelectorAll('[data-ready]').forEach(el=>el.setAttribute('fill',(el.dataset.ready==='start'?H.startCheckOk():H.syncReady())?'#00ff00':'#c0c0c0'));
 svg.querySelectorAll('[data-lamp]').forEach(el=>{const on=el.dataset.lamp==='ibhlock'?H.ctl.ibhLock:el.dataset.lamp==='sync1'?H.running()||H.seq==='Seq. Complete':el.dataset.lamp==='sync2'?H.ctl.field41:Math.abs(H.tags.GEN_KV-10.92)<.5;el.setAttribute('fill',on?'#00ff00':'#fe0000');});
 const open=H.burnerOpen();
 svg.querySelectorAll('[data-burner-sector]').forEach(el=>{const off=open[el.dataset.burnerSector];el.setAttribute('fill',off?'#fff':'#fe0000');el.setAttribute('data-active',String(!off));if(el.dataset.burnerSector==='F1')el.setAttribute('stroke',off?'#000':'#fff');});
 svg.querySelectorAll('[data-burner-label]').forEach(el=>el.setAttribute('fill',open[el.dataset.burnerLabel]?'#000':'#fff'));
}
window.H25_EXACT_VIEWS={draw,update,drawBurner};
})();
