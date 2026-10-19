/* START-UP: manually reconstructed vector geometry in the original 1280×574 coordinate system.
 * No image, canvas pixel copy, traced raster paths, embedded bitmap or screenshot background.
 * Fixed coordinates are intentional: this is the original industrial screen, not a redesigned dashboard.
 */
(function(){
'use strict';
const svg=document.getElementById('hmi');
const NS='http://www.w3.org/2000/svg';
const P=24;
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let parts=[];
function add(s){parts.push(s);}
function rect(x,y,w,h,fill,stroke,sw=1,extra=''){add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''} ${extra}/>`);}
function path(d,fill='none',stroke,sw=1,extra=''){add(`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''} ${extra}/>`);}
function line(x,y,x2,y2,color='#ffffa0',sw=2,extra=''){path(`M${x} ${y}H${x2}`,'none',color,sw,extra);if(y!==y2){parts.pop();path(`M${x} ${y}L${x2} ${y2}`,'none',color,sw,extra);}}
function text(x,y,s,size=9,fill='#eee',anchor='start',weight='normal',extra=''){add(`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}" ${extra}>${escape(s)}</text>`);}
function bevel(x,y,w,h,fill='#c0c0c0',dark='#737373',light='#fff',sw=1){rect(x,y,w,h,fill);path(`M${x} ${y+h}V${y}H${x+w}`, 'none',light,sw);path(`M${x+w} ${y}V${y+h}H${x}`,'none',dark,sw);}
function panel(x,y,w,h,title,opts={}){rect(x+2,y+2,w,h,'#161616');bevel(x,y,w,h,opts.fill||'#4682b4','#090909','#eee');rect(x+2,y+2,w-4,h-4,'none','#8ca7b9',.5);if(title)text(x+w/2,y+13,title,opts.size||9,'#eee','middle');}
function field(x,y,w,h,k,u,fs=11){add(`<g class="measurement" data-measurement="${escape(k)}">`);bevel(x,y,w,h,'#fff','#e0e0e0','#777',1);text(x+w/2,y+h/2,'—',fs,'#000','middle','bold',`class="data-value" data-tag="${escape(k)}" data-unit="${escape(u||'')}"`);add('</g>');}
function valve(cx,cy,color='#fe0000',scale=1,vertical=false){add(`<g transform="translate(${cx} ${cy}) ${vertical?'rotate(90) ':''}scale(${scale})">`);path('M-9 -5L0 0L-9 5Z M9 -5L0 0L9 5Z',color);add('</g>');}
function arrow(x,y,dir='right',color='#ffffa0',size=5){const a={right:`M${x-size} ${y-size/2}L${x} ${y}L${x-size} ${y+size/2}Z`,left:`M${x+size} ${y-size/2}L${x} ${y}L${x+size} ${y+size/2}Z`,up:`M${x-size/2} ${y+size}L${x} ${y}L${x+size/2} ${y+size}Z`,down:`M${x-size/2} ${y-size}L${x} ${y}L${x+size/2} ${y-size}Z`};path(a[dir],color);}
function breaker(x,y,w,h,id){rect(x,y,w,h,'#fe0000','#000',1,`data-breaker="${id}"`);line(x+1,y+h/2,x+w-1,y+h/2,'#000',1.5);path(`M${x+w*.35} ${y+h*.35}l3 3 -3 1`, 'none','#000',1);}
function motor(cx,cy,r){add(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f1f1f1" stroke="#06067c" stroke-width="1"/>`);path(`M${cx} ${cy}V${cy-r}A${r} ${r} 0 0 1 ${cx+r} ${cy}H${cx}V${cy+r}A${r} ${r} 0 0 1 ${cx-r} ${cy}Z`,'#070778');add(`<circle cx="${cx}" cy="${cy}" r="1.7" fill="#222277"/>`);}
function button(b){
 const y=b.y+P,id='ctl-'+(b.motor||b.g||b.act)+'-'+(b.v||b.label).replace(/[^a-zA-Z0-9]/g,'');const readonly=['gtStatus','ffdStatus'].includes(b.g);
 add(`<g id="${id}" class="operator" ${readonly?'role="status" data-readonly="true"':'role="button" tabindex="0"'} aria-label="${escape((b.g?b.g+' ':'')+(b.label||'Load Set Value'))}" data-motor="${escape(b.motor||'')}" data-to="${escape(b.to||'')}" data-act="${escape(b.act)}" data-grp="${escape(b.g||'')}" data-val="${escape(b.v||'')}" data-selected="false">`);
 rect(b.x,y,b.w,b.h,'#c0c0c0',null,1,'class="button-face"');path(`M${b.x} ${y+b.h}V${y}H${b.x+b.w}`,'none','#fff',1);path(`M${b.x+b.w} ${y}V${y+b.h}H${b.x}`,'none','#777',1);
 text(b.x+b.w/2,y+b.h/2+0.3,b.label,b.fs||10,'#000','middle','normal','dominant-baseline="central"');
 rect(b.x+1,y+1,b.w-2,b.h-2,'none',null,1,'class="focus-ring"');add('</g>');
}
add(`<defs>
<linearGradient id="cylinder" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000075"/><stop offset=".15" stop-color="#0c1495"/><stop offset=".52" stop-color="#3d80be"/><stop offset=".72" stop-color="#15509c"/><stop offset="1" stop-color="#000079"/></linearGradient>
<linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#000078"/><stop offset=".45" stop-color="#3e86bd"/><stop offset=".64" stop-color="#286fa9"/><stop offset="1" stop-color="#000068"/></linearGradient>
<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#000080"/><stop offset=".45" stop-color="#215db5"/><stop offset=".65" stop-color="#1658ad"/><stop offset="1" stop-color="#000080"/></linearGradient>
<linearGradient id="turbine-cone" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#000080"/><stop offset=".5" stop-color="#376bbe"/><stop offset="1" stop-color="#000080"/></linearGradient>
<linearGradient id="endcap"><stop stop-color="#00127c"/><stop offset=".5" stop-color="#3582ba"/><stop offset="1" stop-color="#000073"/></linearGradient>
</defs>`);
rect(0,0,1280,574,'#a0a0a0');rect(1,0,2,574,'#1674d8');
rect(57,0,1172,24,'#000080');text(643,18,'H25 GAS TURBINE GENERATOR',19.2,'#fff','middle','bold');text(1200,18,'UNIT-20',19.2,'#fff','end','bold');
// Fuel panel, vent line, manifold and fuel valves.
panel(70,37,78,60,'Fuel Gas');
line(91,122,247,122);line(247,122,247,48);arrow(247,47,'up');text(247,43,'Vent',9,'#eee','middle');
line(265,48,265,122);line(247,122,427,122);
for(let i=0;i<5;i++){const y=49+i*18;line(265,y,431,y);valve(335,y);arrow(432,y,'right');text(278,y-6,['F1 GCV','F2-1 GCV','F2-2 GCV','F2-3 GCV','F2-4 GCV'][i],8,'#ededdd');}
valve(155,122);text(155,138,'SRV',8,'#eee','middle');
valve(246,83,'#208f10',1,true);rect(232,76,9,13,'#28991c');text(236.5,85,'S',7,'#146200','middle');text(179,74,'Gas Vent Vlv',8,'#eee');
// Combustor basket is constructed from four arc sectors and a central pilot.
const cx=468.5,cy=79.5,r=47.5;
window.H25_EXACT_VIEWS.drawBurner({add,line,text},cx,cy,r,{id:'basket'});
// Allowable spread and generator/turbine vibration instrument panels.
for(const [y,title]of [[32,'Allow Spread'],[66,'Spread #1'],[100,'Spread #2']]){bevel(535,y,72,16,'#4682b4','#646464','#d3d3d3');text(571,y+11,title,8,'#eee','middle');}
panel(720,31,218,49,'Gas Turbine Vibration');panel(720,83,218,49,'Generator Vibration');
['No.2 brg.-X','No.2 brg.-Y','No.1 brg.-X','No.1 brg.-Y'].forEach((s,i)=>text(751+i*52,55,s,7,'#eee','middle'));
['EE brg.-X','EE brg.-Y','TE brg.-X','TE brg.-Y'].forEach((s,i)=>text(751+i*52,107,s,7,'#eee','middle'));
panel(956,30,137,103,'');['Voltage','Current','VARS','PF','Freq.'].forEach((s,i)=>text(966,44+i*19,s,8,'#eee'));
// Left auxiliaries and reference labels.
panel(74,151,171,100,'');
['FFD','Lube Oil Header Temp.','Wheel space Max. Temp.','Inlet Air Temp.','IBH Position'].forEach((s,i)=>text(81,167+i*19,s,8,'#eee'));
panel(638,116,68,37,'Cpr Inlet', {size:8});
panel(966,144,78,60,'Exhaust');panel(966,210,78,59,'Speed');
// Native 3D-style generator and shaft train. Gradients are vector fills, not images.
line(268,209,294,209);line(324,209,370,209);breaker(294,199,30,19,'52G');
text(309,171,'Generator',10,'#eee','middle');text(309,182,'Breaker',10,'#eee','middle');text(309,193,'52G',10,'#eee','middle');
rect(347,178,24,17,'url(#shaft)');rect(360,166,11,36,'url(#endcap)');rect(369,158,116,56,'url(#cylinder)');rect(485,166,10,40,'url(#endcap)');rect(495,179,33,16,'url(#shaft)');
rect(384,171,37,14,'#3976a8','#124e8b',.5);rect(384,189,37,12,'#3976a8','#124e8b',.5);text(402,181,'Ref.',9,'#eee','middle');text(402,198,'Fdbk',9,'#eee','middle');
rect(527,157,49,68,'url(#cylinder)');rect(576,201,69,15,'url(#shaft)');rect(576,201,10,20,'url(#endcap)');
text(428,231,'Turning Gear Motor',8,'#eee','middle');rect(469,214,41,30,'#000080');rect(510,222,24,13,'url(#shaft)');motor(489,228,10);
rect(371,239,64,41,'#000080');rect(435,245,11,28,'#0b168c');motor(403,259,12);text(404,289,'Cranking Motor',8,'#eee','middle');
rect(446,256,87,11,'url(#shaft)');rect(468,249,40,25,'url(#cylinder)');rect(533,230,36,43,'url(#cylinder)');
rect(569,235,34,29,'#000080','#5584c7',1);rect(574,239,22,19,'#97a3b1','#ddd',1);
path('M577 250v-8h3v10h3v-8h3v10h3v-8h3v9h3','none','#080870',1.5);path('M596 240h5v19h-5','none','#b2beca',2);
// Compressor, combustion chamber and turbine casing.
path('M646 160H657L769 191V225L657 257H646Z','url(#cone)');
rect(769,156,28,102,'#fe0000');path('M797 156L810 166V249L797 259Z','#ff7900');path('M810 166L823 158V258L810 249Z','#ffb000');
rect(823,158,29,101,'url(#cylinder)');path('M852 156L886 177V241L852 260Z','url(#turbine-cone)');path('M886 177L935 156V261L886 241Z','url(#turbine-cone)');
for(let y=163;y<=249;y+=10){rect(852,y,5,6,'#b9b885','#1a2762',.8);}
rect(935,202,26,14,'url(#shaft)');
add('<g id="flame-symbols">');
for(const y of [186,208,230]){path(`M771 ${y-4}L777 ${y-8}L777 ${y-3}L782 ${y-8}L783 ${y-2}L789 ${y-8}L787 ${y}L792 ${y+5}L786 ${y+3}L784 ${y+8}L780 ${y+3}L777 ${y+8}L775 ${y+2}L771 ${y+4}Z`,'#ffff00');}
add('</g>');
line(602,171,622,171,'#eee',1.5);arrow(622,171,'right','#eee');breaker(623,161,19,19,'INLET');breaker(624,236,19,19,'BLEED');
line(935,172,960,172,'#eee',1.5);arrow(960,172,'right','#eee');
bevel(650,182,79,17,'#4682b4','#416984','#a3bac9');text(690,194,'Cpr Out',9,'#eee','middle');
// Inlet guide vane readout and compressor bleed valves.
rect(609,263,31,19,'#4682b4','#5c83a3');text(624,276,'IGV',9,'#eee','middle');
path('M709 246V252H760 M709 247V281H760','none','#eee',2);arrow(762,252,'right','#eee');arrow(762,281,'right','#eee');valve(735,252,'#268620');valve(735,281,'#268620');
text(713,268,'13th Stage Compr. Bleed Valve',7,'#eee');text(713,296,'6th Stage Compr. Bleed Valve',7,'#eee');
const commonMarkup=parts.join('');
// Duct purge and stage transition thresholds.
panel(71,296,191,46,'Duct Purge timer');text(120,318,'Final',9,'#eee','middle');text(215,318,'Current',9,'#eee','middle');
panel(351,306,473,39,'');['KC1L','KD1H','KC2L','KD2H','KC3L','KD3H','KC4L','KD4H'].forEach((s,i)=>text(389+i*58,319,s,9,'#eee','middle'));
// The original control panels, with the original positions and dimensions.
panel(72,354,191,172,'GT Status');panel(278,354,61,172,'FFD Status',{size:8});
function controlBox(x,y,w,h,title,titleH=27){bevel(x,y,w,h,'#c0c0c0','#777','#fff',2);rect(x+4,y+4,w-8,titleH,'#4682b4','#fff',1);const lines=title.split('|');lines.forEach((s,i)=>text(x+w/2,y+15+i*11,s,9,'#eee','middle'));}
controlBox(351,354,103,63,'Master Control|Location',27);controlBox(351,425,103,83,'Cooldown Control',24);
controlBox(467,354,104,134,'Master Control Mode',27);controlBox(583,354,104,85,'Master Control',27);
controlBox(699,354,104,135,'Speed / Load Control',27);controlBox(815,354,104,87,'Load Control',27);controlBox(815,452,104,53,'Load Set Value',24);
// Live fields cover no pre-existing text: each measurement is drawn once.
SCR_STARTUP.values.forEach(v=>field(v[1],v[2]+P,v[3],v[4],v[0],v[6],v[5]));
// Controls with no background-button copies beneath them.
SCR_STARTUP.buttons.filter(b=>b.act!=='edit-load').forEach(button);
const load=SCR_STARTUP.buttons.find(b=>b.act==='edit-load');
add(`<rect x="${load.x}" y="${load.y+P}" width="${load.w}" height="${load.h}" fill="transparent" class="operator" role="button" tabindex="0" aria-label="Edit Load Set Value" data-act="edit-load"/>`);
// Original right-hand screen selector: fixed grid, no layout reflow.
const nav=['START-UP','FFD CONTROL','SYNCHRO. &EXC. OPE.','FUEL GAS','LUBE OIL','GENERATOR','VENTILATION','IBH CONTROL','MOTORS','BEARING OIL','EXHAUST','VIBRATION','WHEEL SPACE','START CHECK','TIMERS','TRIP MONITOR','DATA REPORT 1','DATA REPORT 2','OVERSPEED'];
nav.forEach((s,i)=>{const y=30+i*21.5,fill=i===0?'#fff':i>=13?'#39baba':i>=9?'#000080':'#4682b4';add(`<g class="operator" role="button" tabindex="0" data-nav="${i}" aria-label="${escape(s)}">`);bevel(1115,y,94,21,fill,'#111','#eee',1);text(1162,y+13,s,i===2?7:9,i===0?'#222':'#e9eeee','middle');rect(1116,y+1,92,19,'none',null,1,'class="focus-ring"');add('</g>');});
const startupMarkup=parts.join('');
svg.innerHTML=startupMarkup;
// Original reference state is deliberate for the first visual acceptance frame.
// When an operator command starts the model, all values come from the corrected simulation core.
H25.init();for(const k in H25_TAGS){H25.tags[k]=typeof H25_TAGS[k]==='object'?H25_TAGS[k].v:H25_TAGS[k];}
let live=false,modelStarted=false,sound=false,audio=null,lastAlarm=0;
let noticeUntil=0,noticeTimer;
const msg=(s,error=false)=>{noticeUntil=performance.now()+6000;const el=document.getElementById('message');el.textContent=s;el.style.opacity='1';const box=document.getElementById('command-feedback');box.textContent=s;box.hidden=false;box.dataset.error=String(error);clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{box.hidden=true;},6000);};
function fit(){const holder=document.getElementById('screen-holder');svg.style.width=holder.clientWidth+'px';svg.style.height=holder.clientHeight+'px';}
function format(k,u){const v=H25.tags[k],d=H25_TAGS[k];if(typeof v==='string')return v;if(k==='NA_TAG'||v==null)return '—';if(!Number.isFinite(v))return 'BAD';let val=v.toFixed(d?.dp??1);return val+(u?' '+u:'');}
function refresh(){
 svg.querySelectorAll('[data-tag]').forEach(el=>{el.textContent=format(el.dataset.tag,el.dataset.unit);});
 svg.querySelectorAll('[data-grp]').forEach(el=>{const g=el.dataset.grp;const val=g==='gtStatus'?H25.seq:g==='ffdStatus'?H25.ctl.ffdStatus:g==='fieldClose'?(H25.ctl.field41?'CLOSED':'OPEN'):H25.ctl[g];const selected=val===el.dataset.val&&!['master'].includes(g);el.dataset.selected=String(selected);const r=el.querySelector('.button-face');if(r)r.setAttribute('fill',selected?'#ffa500':'#c0c0c0');});
 svg.querySelectorAll('[data-breaker]').forEach(el=>{const id=el.dataset.breaker;const closed=id==='52G'?H25.ctl.brk52G:id==='41'?H25.ctl.field41:true;el.setAttribute('fill',closed?'#fe0000':'#00be00');});
 if(live){const fire=H25.flameOn();svg.querySelector('#flame-symbols')?.setAttribute('visibility',fire?'visible':'hidden');if(performance.now()>noticeUntil)document.getElementById('message').textContent=((H25.tripped?'TRIP: '+H25.tripCause:H25.seq)+' · '+H25._simT.toFixed(1)+' s · учебная динамика');}
 window.H25_EXACT_VIEWS?.update(svg,current,H25);
 if(sound&&audio&&H25.tripped&&performance.now()-lastAlarm>600){lastAlarm=performance.now();const osc=audio.createOscillator(),g=audio.createGain();osc.frequency.value=800;g.gain.setValueAtTime(.05,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.25);osc.connect(g);g.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.26);}
}
function startLive(){if(!modelStarted){H25.derive();modelStarted=true;H25.onTick(refresh);H25.startLoop();}live=true;H25.paused=false;document.getElementById('live-button').textContent='Ⅱ ПАУЗА';}
function stopJog(){H25.raiseLower=H25.vRaiseLower=H25.iRaiseLower=0;}
const navIDs=['startup','ffd','sync','fuelgas','lube','gen','vent','ibh','motors','brg','exh','vib','ws','sc','tim','tripm','dr1','dr2','os'];
const screens={};Object.keys(window).filter(k=>k.startsWith('SCR_')).forEach(k=>{if(window[k]?.id)screens[window[k].id]=window[k];});
let current='startup';
function confirmAction(title,description,callback){const d=document.getElementById('action-dialog');document.getElementById('action-title').textContent=title;document.getElementById('action-text').textContent=description;d.onclose=()=>{if(d.returnValue==='ok'){callback();refresh();}};d.returnValue='cancel';d.showModal();}
function calibrate(v){H25.liftCal(v);const key={SRV:'SRV_POS',F1:'F1_GCV','F2-1':'F2_1_GCV','F2-2':'F2_2_GCV','F2-3':'F2_3_GCV','F2-4':'F2_4_GCV',IGV:'IGV_POS'}[v];const d=document.getElementById('cal-dialog'),input=document.getElementById('cal-input');const allowed=H25.tags.SPEED<50&&!H25.flameOn();document.getElementById('cal-title').textContent='LIFT CALIBRATION — '+v;document.getElementById('cal-note').textContent=allowed?'Перемещение учебного привода; топливо отсечено.':'Заблокировано: остановите ротор (SPEED < 50 min-1).';input.disabled=!allowed;input.value=H25.tags[key]||0;document.getElementById('cal-output').textContent=Number(input.value).toFixed(1)+' %';input.oninput=()=>{H25._calibration={key,value:Number(input.value)};H25.tags[key]=Number(input.value);document.getElementById('cal-output').textContent=Number(input.value).toFixed(1)+' %';refresh();};d.onclose=()=>{H25._calibration=null;refresh();};d.showModal();}
function act(el){
 const a=el.dataset.act,g=el.dataset.grp,v=el.dataset.val;
 if(el.dataset.readonly==='true'){msg('Это индикатор состояния, а не команда. Для пуска используйте MASTER CONTROL → START.');return;}
 if(a==='goto'){navigate(el.dataset.to);return;}
 if(a==='motor-open'){navigate('motors');msg('Управление приводом '+el.dataset.motor.toUpperCase()+': AUTO / MANUAL / START / STOP.');return;}
 if(a==='edit-load'){document.getElementById('load-input').value=H25.tags.LOAD_SET;document.getElementById('load-dialog').showModal();return;}
 if(a==='countreset'){confirmAction('COUNTER RESET','Обнулить сбрасываемые счётчики? Накопленные за весь срок службы значения сохранятся.',()=>{startLive();H25.counterReset();msg('Сбрасываемые счётчики обнулены.');});return;}
 if(a==='lift'){calibrate(v);return;}
 startLive();const previous=H25.events[0];
 if(a==='press'){
   // The original drawing uses 43L / 43G; the shared model uses s43L / s43G.
   const group={s43L:'s43L',s43G:'s43G',s43OPE:'s43OPE'}[g]||g;H25.press(group,v);
 }else if(a==='trip')H25.trip('EMERGENCY TRIP PUSHBUTTON','9EX');
 else if(a==='reset')H25.masterReset();
 else if(a==='release')H25.release52G();
 else if(a==='close41')H25.close41();else if(a==='open41')H25.open41();
 else if(a==='ibhrelease')H25.releaseIBH();
 else if(a==='motorauto'||a==='motormanual')H25.setMotorMode(el.dataset.motor,a==='motorauto');
 else if(a==='motorstart')H25.motorStart(el.dataset.motor);else if(a==='motorstop')H25.motorStop(el.dataset.motor);
 else if(a==='os-enable')H25.osEnable();else if(a==='os-disable')H25.osDisable();
 else if(a==='os-start-main'||a==='os-start-backup'){
   if(!H25.running()||H25.ctl.osTest!=='ENABLE'){msg('Испытание запрещено: турбина должна работать, селектор OVER SPEED TEST — ENABLE.',true);refresh();return;}
   if(a==='os-start-main')H25.osStartMain();else H25.osStartBackup();
 }else if(a==='os-abort-main')H25.osAbortMain();else if(a==='os-abort-backup')H25.osAbortBackup();
 else {msg('Неизвестная команда: '+a,true);return;}
 H25.derive();refresh();const event=H25.events[0];
 const reasons={'Rotor not stopped':'Ротор ещё вращается','52G closed':'Выключатель 52G замкнут','Select AUTO':'Выберите AUTO','Trip latched':'Авария зафиксирована: требуется MASTER RESET','Wait for coast-down below 500 rpm':'Сброс заблокирован: дождитесь выбега ниже 500 min-1','Remove instructor fault before MASTER RESET':'Устраните активную неисправность перед сбросом','Main lube pump stopped':'Не работает основной маслонасос','Ventilation stopped':'Не работает вентиляция','Hydraulic pump stopped':'Не работает гидронасос','Active instructor fault':'Активна учебная неисправность','Synchronism check not satisfied':'Условия синхронизации не выполнены'};
 if(event&&event!==previous){let message=event.message;Object.entries(reasons).forEach(([a,b])=>message=message.split(a).join(b));msg((event.type==='REJECT'?'Команда отклонена: ':'')+message,event.type==='REJECT');}
 else msg((el.getAttribute('aria-label')||a)+': '+(v||'команда выполнена'));
}
function bindControls(){
 svg.querySelectorAll('[data-act]').forEach(el=>{
  if(el.dataset.readonly==='true'){el.addEventListener('click',()=>act(el));const t=document.createElementNS(NS,'title');t.textContent='Индикатор, не кнопка управления';el.prepend(t);return;}
  const jogs={raise:['raiseLower',1],lower:['raiseLower',-1],vraise:['vRaiseLower',1],vlower:['vRaiseLower',-1],iraise:['iRaiseLower',1],ilower:['iRaiseLower',-1]};const jog=jogs[el.dataset.act];
  if(jog){const begin=()=>{startLive();H25[jog[0]]=jog[1];msg(jog[0]==='raiseLower'?'Изменение задания нагрузки: удерживайте кнопку.':jog[0]==='vRaiseLower'?'Изменение задания напряжения: удерживайте кнопку.':'Изменение задания реактивной мощности: удерживайте кнопку.');};el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);begin();});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>el.addEventListener(ev,stopJog));el.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)begin();}});el.addEventListener('keyup',stopJog);}
  else {el.addEventListener('click',()=>act(el));el.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();act(el);}});}
 });
 svg.querySelectorAll('[data-nav]').forEach(el=>{const action=()=>navigate(el.dataset.target||navIDs[Number(el.dataset.nav)]);el.addEventListener('click',action);el.addEventListener('keydown',e=>{if(e.code==='Space'||e.key==='Enter'){e.preventDefault();action();}});});

}
function navigate(id,fromHash=false){
 if(!screens[id])id='startup';stopJog();current=id;parts=[];
 if(id==='startup')svg.innerHTML=startupMarkup;
 else{window.H25_EXACT_VIEWS.draw({add,rect,path,line,text,bevel,panel,field,valve,arrow,breaker,motor,button,controlBox,commonMarkup,startupMarkup,metadata:screens[id],screens,nav,navIDs,P,escape},id);svg.innerHTML=parts.join('');}
 svg.dataset.screen=id;svg.setAttribute('aria-label','H25 UNIT-20 — '+screens[id].title);document.title='H25 UNIT-20 — '+screens[id].title;
 document.getElementById('screen-holder').setAttribute('aria-label',screens[id].title);bindControls();fit();refresh();
 if(!fromHash){try{location.hash=id;}catch(e){}msg(screens[id].title);}
}
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1)||'startup';if(id!==current)navigate(id,true);});
document.getElementById('live-button').onclick=function(){if(!live){startLive();refresh();}else{stopJog();live=false;H25.paused=true;this.textContent='▶ СИМУЛЯЦИЯ';msg('Учебная модель на паузе');}};
function applyLoad(){const input=document.getElementById('load-input');if(!input.checkValidity()){input.reportValidity();return;}const val=input.valueAsNumber;if(Number.isFinite(val)&&val>=0&&val<=32){H25.tags.LOAD_SET=val;H25.ctl.loadMode='PRE SELECT';document.getElementById('load-dialog').close();startLive();refresh();msg('Задание нагрузки: '+val.toFixed(1)+' MW');}}
// No native form submission: Arena's file viewer intentionally has no allow-forms.
document.getElementById('load-apply').onclick=applyLoad;
document.getElementById('load-form').onsubmit=e=>{e.preventDefault();applyLoad();};
document.getElementById('load-input').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();applyLoad();}};
document.getElementById('action-ok').onclick=()=>document.getElementById('action-dialog').close('ok');
document.getElementById('action-cancel').onclick=()=>document.getElementById('action-dialog').close('cancel');
document.getElementById('cal-close').onclick=()=>document.getElementById('cal-dialog').close('close');
document.getElementById('load-cancel').onclick=()=>document.getElementById('load-dialog').close();
document.getElementById('full-button').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen?.().catch(()=>msg('Полноэкранный режим недоступен.'));};
document.getElementById('sound-button').onclick=function(){sound=!sound;this.textContent=sound?'🔊':'🔇';this.setAttribute('aria-pressed',String(sound));if(sound){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch(e){msg('Звук недоступен');}}};
window.addEventListener('resize',fit);document.addEventListener('fullscreenchange',fit);window.addEventListener('blur',stopJog);document.addEventListener('visibilitychange',stopJog);document.addEventListener('pointerup',stopJog);document.addEventListener('pointercancel',stopJog);
// The engine is DOM-independent in this UI: exactly one formatter owns each SVG reading.
H25.push=()=>{};
navigate(location.hash.slice(1)||'startup',true);
window.EXACT_STARTUP={svg,refresh,fit,navigate,screens,startLive,reference:()=>!modelStarted,current:()=>current};
})();
