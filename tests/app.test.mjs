import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
async function harness({deny=false,offline=false,stored=null}={}){
 const dom=new JSDOM(html,{url:'https://thrakasmm.github.io/Intervalles-chantes/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let timer=0;const timers=new Map(),requests=[],played=[],clicks=[],track={stopCount:0,stop(){this.stopCount++;}},state={deny,offline};
 w.setInterval=(fn,ms)=>{timers.set(++timer,{fn,ms});return timer;};w.clearInterval=id=>timers.delete(id);w.requestAnimationFrame=()=>++timer;w.cancelAnimationFrame=()=>{};
 w.AbortSignal=AbortSignal;w.__played=played;w.__clicks=clicks;
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{if(state.deny)throw Object.assign(new Error(),{name:'NotAllowedError'});return{getTracks:()=>[track]};}}});
 w.fetch=async(url,options={})=>{
  requests.push({url,options});if(state.offline)throw new w.TypeError('offline');
  const u=new URL(url),body=options.body?JSON.parse(options.body):null;
  return{ok:true,json:async()=>body?{ruleset:'singing-30-v2',name:body.name,playerId:'local-test',rows:[]}:{ruleset:'singing-30-v2',challenge:u.searchParams.get('challenge'),interval:Number(u.searchParams.get('interval')),direction:Number(u.searchParams.get('direction')),rows:[],participants:0}};
 };
 if(stored)w.localStorage.setItem('asmm.singing.result.v1',JSON.stringify(stored));
 const fakeAudio=`class SingingAudio {
 constructor(){this.ctx={currentTime:0,sampleRate:48000,state:'running',resume:async()=>{},createMediaStreamSource:()=>({connect(){},disconnect(){}}),createAnalyser:()=>({fftSize:4096,disconnect(){},getFloatTimeDomainData(){}})};}
 async init(){} async load(){return 0;} volumes(){} stop(){} stopVoice(){}
 note(midi,at,duration){window.__played.push({midi,at,duration});return{};}
 click(at){window.__clicks.push(at);}
 }`;
 const core=scripts.find(s=>s.includes('Pure musical rules')),score=scripts.find(s=>s.includes('const SingingScore =')),ui=scripts.find(s=>s.includes('class SingingTestUI')),tuner=scripts.find(s=>s.includes('const SingingPitch ='));
 const main=scripts.at(-1).replace('  renderConfig(); renderKeyboard(); save();','  renderConfig(); renderKeyboard(); save(); window.__app={audio,tuner,schedule,animate,getRun:()=>testRun,getCfg:()=>cfg,getDisplayed:()=>displayed};');
 w.eval([core,fakeAudio,score,scripts.find(s=>s.includes('const SingingChallenge =')),scripts.find(s=>s.includes('window.PinballTop =')),ui,tuner,main].join('\n'));
 const app=w.__app;
 app.tuner.detector.detect=()=>{const e=app.getDisplayed();return e?.midi==null?null:{frequency:440*2**((e.midi+app.getCfg().interval*app.getCfg().direction+12-69)/12)};};
 const $=id=>w.document.getElementById(id);
 const advance=async(end)=>{for(let t=app.audio.ctx.currentTime+.025;t<=end+.001;t+=.025){app.audio.ctx.currentTime=Math.round(t*1000)/1000;app.schedule();app.animate();if(Math.round(t*1000)%50===0)app.tuner.tick();}await flush();};
 await flush();return{dom,w,app,$,advance,requests,played,clicks,track,state,timers,close:()=>dom.window.close()};
}
test('whole test plays exactly 30 starting notes, accepts octaves, locks answers and saves once with a fixed pseudo',async()=>{
 const h=await harness();try{
  assert.equal(h.track.stopCount,0);h.$('test-start').click();await flush();assert(h.app.getRun(),h.$('status').textContent);
  for(const id of ['play-model','tempo','show-note','tuner-toggle','keyboard-lower'])assert(h.$(id).disabled,id);
  h.$('play-model').dispatchEvent(new h.w.Event('click'));h.$('piano-keyboard').firstElementChild.dispatchEvent(new h.w.Event('click'));
  h.$('tempo').value=200;h.$('tempo').dispatchEvent(new h.w.Event('input'));assert.equal(h.app.getCfg().tempo,80);
  await h.advance(5);assert(!h.$('tuner-target').textContent.includes('Note à chanter'));assert(!/[A-G][0-9]/.test(h.$('current-note').textContent));
  await h.advance(48.3);assert.equal(h.app.getRun(),null);assert.equal(h.played.length,30);assert.equal(h.clicks.length,64);
  assert.equal(h.$('test-result').hidden,false);assert.equal(h.$('test-grade').textContent,'20/20');assert.equal(h.$('test-note-results').children.length,30);assert.equal(h.track.stopCount,1);
  assert.equal(h.w.document.activeElement,h.$('test-result-title'));assert.equal(h.$('last-result').hidden,false);h.$('test-result').hidden=true;h.$('last-result').click();assert.equal(h.$('test-result').hidden,false);
  assert.equal(h.$('play-model').disabled,false);assert.equal(h.$('show-note').checked,true);
  const pending=JSON.parse(h.w.localStorage.getItem('asmm.singing.result.v1'));assert.equal(pending.payload.notes.length,30);assert(Math.abs(pending.payload.duration-48)<.001);
  h.$('test-name').value='Élève';h.$('test-save').click();await flush();assert.equal(h.requests.filter(r=>r.options.method==='POST').length,1);assert(h.$('test-name').readOnly);assert(h.$('test-save').disabled);
  h.$('test-save').click();await flush();assert.equal(h.requests.filter(r=>r.options.method==='POST').length,1);
 }finally{h.close();}
});
test('stop, lost microphone, hidden page and denied permission never produce a completed score',async()=>{
 for(const cause of ['stop','mic','hidden','denied']){
  const h=await harness({deny:cause==='denied'});try{
   h.$('test-start').click();await flush();
   if(cause!=='denied'){
    await h.advance(4);
    if(cause==='stop')h.$('stop').click();
    if(cause==='mic'){h.app.tuner.disable();h.app.schedule();}
    if(cause==='hidden'){Object.defineProperty(h.w.document,'hidden',{value:true,configurable:true});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));}
   }
   await flush();assert.equal(h.app.getRun(),null,cause);assert.equal(h.w.localStorage.getItem('asmm.singing.result.v1'),null,cause);assert.equal(h.$('test-result').hidden,true);
   assert.equal(h.$('test-start').disabled,false);assert.equal(h.requests.filter(r=>r.options.method==='POST').length,0);
  }finally{h.close();}
 }
});
test('offline result survives reload and retries with the same identity and attempt ID',async()=>{
 const h=await harness({offline:true});let stored;
 try{
  h.$('test-start').click();await flush();await h.advance(48.3);h.$('test-name').value='Élève';h.$('test-save').click();await flush();
  stored=JSON.parse(h.w.localStorage.getItem('asmm.singing.result.v1'));assert(stored.payload);assert.equal(stored.saved,false);assert.equal(h.$('test-save').disabled,false);
  h.state.offline=false;h.$('test-save').click();await flush();const posts=h.requests.filter(r=>r.options.method==='POST');assert.equal(posts.length,2);assert.equal(posts[0].options.body,posts[1].options.body);assert.equal(posts[0].options.headers.Authorization,posts[1].options.headers.Authorization);
 }finally{h.close();}
 const restored=await harness({stored});try{assert.equal(restored.$('test-result').hidden,false);assert.equal(restored.$('test-name').value,'Élève');assert.equal(restored.$('test-grade').textContent,'20/20');}finally{restored.close();}
});
test('personal settings never change the shared challenge, and are restored afterwards',async()=>{
 for(const tempo of [30,200]){
  const h=await harness();try{
   h.$('mode-training').click();assert.equal(h.$('training-settings').hidden,false);
   h.$('tempo-number').value=tempo;h.$('tempo-number').dispatchEvent(new h.w.Event('change'));
   h.$('interval').value=7;h.$('interval').dispatchEvent(new h.w.Event('change'));
   h.$('difficulty').value='free';h.$('difficulty').dispatchEvent(new h.w.Event('change'));
   h.$('low').value=48;h.$('low').dispatchEvent(new h.w.Event('change'));
   h.$('mode-challenge').click();assert.equal(h.$('training-settings').hidden,true);
   h.$('test-direction').value=-1;h.$('test-direction').dispatchEvent(new h.w.Event('change'));
   h.$('test-interval').value=1;h.$('test-interval').dispatchEvent(new h.w.Event('change'));
   h.$('test-start').click();await flush();assert(h.$('course-choices').disabled);assert(h.$('mode-training').disabled);
   h.$('mode-training').dispatchEvent(new h.w.Event('click'));assert.equal(h.$('training-settings').hidden,true);
   await h.advance(48.3);assert.equal(h.played.length,30);assert.equal(h.clicks.length,64);assert.equal(h.$('test-grade').textContent,'20/20');
   const payload=JSON.parse(h.w.localStorage.getItem('asmm.singing.result.v1')).payload;
   assert.equal(payload.challenge,'singing-course-001-seconds');
   assert.deepEqual(payload.config,{interval:1,direction:-1,tempo:80,difficulty:'close',low:60,high:72});
   assert.deepEqual(payload.notes.map(n=>n.midi),[60,62,65,64,67,69,66,65,68,72,71,67,64,62,61,65,68,66,69,72,70,67,65,62,64,68,71,69,66,63]);
   h.$('mode-training').click();assert.equal(h.$('tempo-number').value,String(tempo));assert.equal(h.$('interval').value,'7');assert.equal(h.$('low').value,'48');assert.equal(h.$('difficulty').value,'free');
   const saved=JSON.parse(h.w.localStorage.getItem('asmm.intervalles-chantes.v1'));assert.equal(saved.tempo,tempo);assert.equal(saved.interval,7);
  }finally{h.close();}
 }
});

test('old 20-note result is readable after reload, with new submission disabled',async()=>{
 const h=await harness();let stored;
 try{h.$('test-start').click();await flush();await h.advance(48.3);stored=JSON.parse(h.w.localStorage.getItem('asmm.singing.result.v1'));}finally{h.close();}
 stored.payload.notes=stored.payload.notes.slice(0,20);stored.payload.ruleset='singing-20-v1';stored.payload.duration=33;
 const old=await harness({stored});try{assert.equal(old.$('test-note-results').children.length,20);assert.equal(old.$('test-grade').textContent,'20/20');assert(old.$('test-save').disabled);assert.match(old.$('test-save-status').textContent,/Ancien test de 20/);}finally{old.close();}
});


test('old 30-note results retain their score and explain the new scoring before another run',async()=>{
 const h=await harness();let stored;
 try{h.$('test-start').click();await flush();await h.advance(48.3);stored=JSON.parse(h.w.localStorage.getItem('asmm.singing.result.v1'));}finally{h.close();}
 stored.payload.ruleset='singing-30-v1';
 for(const note of stored.payload.notes)for(const frame of note.samples)frame.c=65;
 const old=await harness({stored});try{
  assert.equal(old.$('test-grade').textContent,'10/20');assert(old.$('test-save').disabled);
  assert.match(old.$('test-save-status').textContent,/barème d’origine/);
  assert.match(old.$('test-precision-label').textContent,/entendues/);
 }finally{old.close();}
});


test('course selectors, archives and free practice have distinct scopes',async()=>{
 const h=await harness();try{
  assert.deepEqual([...h.$('test-interval').options].map(o=>o.value),['1','2']);
  assert.deepEqual([...h.$('top-interval').options].map(o=>o.value),['1','2']);
  assert.equal(h.$('training-settings').hidden,true);assert.equal(h.$('play-model').hidden,true);
  h.$('test-interval').value=1;h.$('test-interval').dispatchEvent(new h.w.Event('change'));await flush();
  assert.equal(h.$('top-interval').value,'1');assert.match(h.requests.at(-1).url,/challenge=singing-course-001-seconds/);
  h.$('top-scope').value='archive';h.$('top-scope').dispatchEvent(new h.w.Event('change'));await flush();
  assert.equal(h.$('top-interval').options.length,12);assert(!h.requests.at(-1).url.includes('challenge='));
  assert.equal(h.$('test-interval').value,'1');
  h.$('mode-training').click();assert.equal(h.$('play-model').hidden,false);assert.equal(h.$('interval').options.length,12);
  h.$('start').click();await flush();await h.advance(5);assert.equal(h.app.getRun(),null);assert(h.played.length>0);h.$('stop').click();
  assert.equal(h.w.localStorage.getItem('asmm.singing.result.v1'),null);
 }finally{h.close();}
});

test('a previous free-settings result stays readable but cannot enter the common Top',async()=>{
 const h=await harness();let stored;
 try{h.$('test-start').click();await flush();await h.advance(48.3);stored=JSON.parse(h.w.localStorage.getItem('asmm.singing.result.v1'));}finally{h.close();}
 delete stored.payload.challenge;
 const old=await harness({stored});try{
  assert.equal(old.$('test-grade').textContent,'20/20');assert(old.$('test-save').disabled);
  assert.match(old.$('test-save-status').textContent,/réglages communs/);
  assert.equal(old.$('top-scope').value,'course');
 }finally{old.close();}
});
