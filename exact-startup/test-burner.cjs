/* Confirmed operator rule: FFD < KD4H makes ONLY F2-4 white immediately. */
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
const artifacts=require('node:path').resolve(__dirname,'../test-results/exact');fs.mkdirSync(artifacts,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1280,height:596}});const errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));await p.setContent('<iframe style="border:0;width:1280px;height:596px" sandbox="allow-scripts"></iframe>');await p.evaluate(html=>document.querySelector('iframe').srcdoc=html,fs.readFileSync('exact-startup/standalone.html','utf8'));const f=p.frameLocator('iframe');await f.locator('#basket').waitFor();const frame=p.frames().find(f=>f.parentFrame());
const red='#fe0000',white='#fff';
async function state(){return await f.locator('[data-burner-sector]').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.dataset.burnerSector,e.getAttribute('fill')])));}
for(const id of ['startup','ffd','brg','vib','ws','os','fuelgas']){
 await frame.evaluate(id=>{H25.paused=true;H25.seq='Base Load';H25.tripped=false;H25.tags.KD4H=50.8;H25.tags.KC4L=49.7;EXACT_STARTUP.navigate(id,true);},id);
 for(const ffd of [65.2,50.9,50.8,50.799,50.7,50.0,49.8,49.7,50.8,65.2]){
  await frame.evaluate(ffd=>{H25.tags.FOFFD=ffd;EXACT_STARTUP.refresh();},ffd);const colors=await state();assert.equal(colors.F24,ffd<50.8?white:red,id+' '+ffd);for(const key of ['F1','F21','F22','F23'])assert.equal(colors[key],red,id+' changed '+key+' at '+ffd);
 }
 // Live setpoint, not a hard-coded constant; KC4L must NOT retain red.
 await frame.evaluate(()=>{H25.tags.KD4H=52;H25.tags.FOFFD=51;EXACT_STARTUP.refresh();});assert.equal((await state()).F24,white);await frame.evaluate(()=>{H25.tags.KD4H=50.8;EXACT_STARTUP.refresh();});assert.equal((await state()).F24,red);
 console.log('PASS independent sectors / exact boundary / return / dynamic KD4H:',id);
}
await frame.evaluate(()=>{EXACT_STARTUP.navigate('startup',true);H25.tags.FOFFD=50.7;EXACT_STARTUP.refresh();document.getElementById('command-feedback').hidden=true;});await f.locator('#hmi').screenshot({path:require('node:path').join(artifacts,'H25-F24-below-KD4H.png')});
// The real simulation closes the F2-4 valve using the same live KD4H setting.
await frame.evaluate(()=>{H25.init();H25.paused=false;H25.tags.KD4H=80;const initial=H25.tags.F2_4_GCV;H25.tick(500);window._testClosing=H25.tags.F2_4_GCV<initial;});assert.equal(await frame.evaluate(()=>window._testClosing),true);
// Ordinary controls produce the threshold crossing, not just an injected display color.
await frame.evaluate(()=>{H25.init();EXACT_STARTUP.navigate('startup',true);});await f.locator('[data-act="edit-load"]').click();await f.locator('#load-input').fill('20');await f.locator('#load-apply').click();await frame.evaluate(()=>{H25.paused=true;for(let i=0;i<30;i++){H25.paused=false;H25.tick(500);H25.paused=true;}EXACT_STARTUP.refresh();});assert.ok(await frame.evaluate(()=>H25.tags.FOFFD<50.8&&H25.tags.FOFFD>44.8));assert.equal((await state()).F24,white);for(const key of ['F1','F21','F22','F23'])assert.equal((await state())[key],red);
await frame.evaluate(()=>{H25.tags.LOAD_SET=30;for(let i=0;i<30;i++){H25.paused=false;H25.tick(500);H25.paused=true;}EXACT_STARTUP.refresh();});assert.equal((await state()).F24,red);
// Trip overrides all stage-enable indications, even with residual valve feedback.
await f.locator('[data-act="trip"]').click();for(const color of Object.values(await state()))assert.equal(color,white);
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS valve command follows KD4H / ordinary load controls cross threshold / global trip / sandbox zero requests or page errors.');await b.close();})();
