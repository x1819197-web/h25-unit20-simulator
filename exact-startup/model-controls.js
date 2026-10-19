/* UI-local training extensions; protection checks remain in the shared core. */
(function(){'use strict';
const basePress=H25.press,baseAdvance=H25.advanceStartup,baseDerive=H25.derive;
H25.press=function(g,v){
 if(g==='master'&&v==='START'&&['CRANK','FIRE'].includes(this.ctl.masterMode)){
  const mode=this.ctl.masterMode,s=this._startup;
  if(mode==='FIRE'){
   if(this.tripped||!s?.manual||s.t<7||this.tags.SPEED<650){this.log('REJECT','FIRE: сначала CRANK / START и завершение продувки (7 s учебного времени).');return;}
   const sel=this.ctl.masterMode;this.ctl.masterMode='AUTO';const reasons=this.startReasons().filter(r=>r!=='Rotor not stopped');this.ctl.masterMode=sel;
   if(reasons.length){this.log('REJECT',reasons.join('; '));return;}
   this._startup={manual:'FIRE',t:0,exh:280};this.seq='GT Firing';this.log('START','FIRE: учебный розжиг, скорость удерживается на 700 min-1.');
  }else{
   const sel=this.ctl.masterMode;this.ctl.masterMode='AUTO';const reasons=this.startReasons();this.ctl.masterMode=sel;
   if(reasons.length){this.log('REJECT',reasons.join('; '));return;}
   this._startup={manual:'CRANK',t:0,exh:25};this.seq='Cranking';this.bumpStarts();this.log('START','CRANK: прокрутка и продувка; FIRE разрешается после 7 s.');
  }
  this.ctl.master='START';this.ctl.brk52G=false;this.derive();this.publish();return;
 }
 if(g==='masterMode'&&v==='AUTO'&&this._startup?.manual==='FIRE'){
  this.ctl.masterMode='AUTO';this._startup={index:3,t:0,exh:460};this.seq='Warming up';this.log('SEQUENCE','AUTO: продолжение прогрева и автоматического набора скорости.');this.derive();this.publish();return;
 }
 basePress.call(this,g,v);
};
H25.advanceStartup=function(dt){const s=this._startup;if(!s?.manual){baseAdvance.call(this,dt);return;}s.t+=dt;this.tags.SPEED=H25_EXM.lagStep(this.tags.SPEED,700,1,dt);if(s.manual==='CRANK'){this.seq=s.t<3?'Cranking':'Purge';this.tags.FOFFD=0;this.tags.FUEL_FLOW=0;s.exh=25;}else{this.seq='GT Firing';this.tags.FOFFD=20;this.tags.FUEL_FLOW=2000;s.exh=280;}this.motors.crank.run=true;};
H25.derive=function(){baseDerive.call(this);if(this.motors.crank&&(this.tripped||this.ctl.master==='STOP'||this.tags.SPEED>1200))this.motors.crank.run=false;if(this._startup&&!this._startup.manual&&this._startup.index<3)this.motors.crank.run=true;if(this._calibration&&this.tags.SPEED<50&&!this.flameOn())this.tags[this._calibration.key]=this._calibration.value;};
})();
