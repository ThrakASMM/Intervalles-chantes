import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const source=scripts.find(s=>s.includes('const SingingPitch ='));
const {Pitch,Tuner}=runInNewContext(source+'\n({Pitch:SingingPitch,Tuner:SingingTuner})');
const hz=m=>440*2**((m-69)/12);
function signal(f,rate,{harmonics=[1],noise=0,level=.2,dc=0}={}){
 let seed=321;return Float32Array.from({length:Math.max(2048,2**Math.ceil(Math.log2(rate*.085)))},(_,i)=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return dc+level*harmonics.reduce((s,a,h)=>s+a*Math.sin(2*Math.PI*f*(h+1)*i/rate+.17),0)+noise*(seed/2**31-1);
 });
}
test('detects sung-range fundamentals across device sample rates, not their louder harmonics',()=>{
 const detector=new Pitch.Detector();
 for(const rate of [22050,44100,48000,96000])for(const midi of [28,36,43,48,60,69,76,84,90]){
  const f=hz(midi),result=detector.detect(signal(f,rate,{harmonics:[.35,1,.3,.15],noise:.004,dc:.02}),rate);
  assert(result,`No pitch at MIDI ${midi}/${rate}`);
  assert(Math.abs(Pitch.cents(result.frequency,midi))<12,`${midi}/${rate}: ${result.frequency}`);
 }
 for(const midi of [48,60,69]){
  const result=detector.detect(signal(hz(midi),48000,{harmonics:[0,1,.7,.3]}),48000);
  assert(result);assert(Math.abs(Pitch.cents(result.frequency,midi))<8,'Missing fundamental inferred from periodicity');
 }
});
test('silence, quiet input, noise and a click do not turn the tuner green',()=>{
 const detector=new Pitch.Detector();
 assert.equal(detector.detect(new Float32Array(4096),48000),null);
 assert.equal(detector.detect(signal(440,48000,{level:.001}),48000),null);
 assert.equal(detector.detect(signal(0,48000,{level:0,noise:.2}),48000),null);
 const click=signal(1750,48000);for(let i=0;i<click.length;i++)click[i]*=Math.exp(-i/(48000*.0024));
 assert.equal(detector.detect(click,48000),null);
});
test('cents follow the expected pitch class and accept every octave',()=>{
 assert.equal(Pitch.cents(440,69),0);
 assert(Math.abs(Pitch.cents(880,69))<1e-8);
 assert(Math.abs(Pitch.cents(220,69))<1e-8);
 for(const offset of [-120,-35,-8,8,35,120])assert(Math.abs(Pitch.cents(hz(64)*2**(offset/1200),64)-offset)<1e-7);
});
test('measures only the response beat, after the click, for ascending/descending intervals',()=>{
 const state={running:true,playMode:'sing',displayed:{phase:'sing',midi:60,at:2,duration:.75},cfg:{interval:4,direction:1}};
 assert.equal(Pitch.target(state,2.2,.085),64);
 state.cfg.direction=-1;assert.equal(Pitch.target(state,2.2,.085),56);
 for(const time of [1.9,2.01,2.12,2.75,2.8])assert.equal(Pitch.target(state,time,.085),null);
 state.displayed.duration=.3;assert.equal(Pitch.target(state,2.15,.085),56,'Fast tempo still has a measurement window');
 for(const phase of ['piano','count']){state.displayed.phase=phase;assert.equal(Pitch.target(state,2.2,.085),null);}
 state.displayed.phase='sing';state.playMode='model';assert.equal(Pitch.target(state,2.2,.085),null);
 state.playMode='sing';state.running=false;assert.equal(Pitch.target(state,2.2,.085),null);
});
test('pitch smoothing requires stable frames and does not pass through green on an octave jump',()=>{
 const smooth=new Pitch.Smoother();assert.equal(smooth.push(-20),null);assert.equal(smooth.push(-18),-18);
 assert.equal(smooth.push(1200),null);assert(smooth.push(1204)>1190);
 smooth.reset();assert.equal(smooth.push(0),null);assert.equal(smooth.push(2),2);
});
test('a forgiving green zone and stable graduated lights show direction and distance',()=>{
 const feedback=new Pitch.Feedback();
 assert.equal(feedback.push(27,27,.15).step,0,'First reliable reading appears immediately, with wider tolerance');
 assert.equal(feedback.push(36,36,.2).step,0,'Small fluctuations keep the centre lit');
 assert.equal(feedback.push(42,42,.25).step,0);
 assert.equal(feedback.push(35,35,.3).step,0,'Brief boundary crossing is ignored');
 assert.equal(feedback.push(45,45,.35).step,0);
 assert.equal(feedback.push(45,45,.45).step,0);
 assert.equal(feedback.push(45,45,.5).step,1,'Persistent sharpness moves one light right');
 assert.equal(feedback.push(63,63,.55).step,1,'Neighbouring light has hysteresis');
 assert.equal(feedback.push(75,75,.6).step,1);
 assert.equal(feedback.push(75,75,.75).step,2,'Larger error moves farther right, with same near colour');
 assert.equal(feedback.push(-75,-75,.8).step,2);
 assert.equal(feedback.push(-75,-75,.95).step,-2,'A confirmed correction to the other side moves left');
 feedback.reset();assert.equal(feedback.push(0,0,1).step,0);
 assert.equal(feedback.push(0,-150,1.05).step,-3,'Large raw error clears stale green before smoothing catches up');
 feedback.reset();assert.equal(feedback.push(0,45,2).step,1,'Raw guard does not falsely show green');
 for(const [offset,step] of [[-500,-4],[-150,-3],[-80,-2],[-45,-1],[0,0],[45,1],[80,2],[150,3],[500,4]]){
  feedback.reset();assert.equal(feedback.push(offset,offset,3).step,step);
 }
 feedback.reset();assert.equal(feedback.current,null);
});
test('all embedded scripts parse and tuner controls have unique DOM IDs',()=>{
 scripts.forEach(s=>new Script(s));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const match of source.matchAll(/this\.\$\('([^']+)'\)/g))assert(ids.includes(match[1]),match[1]);
 for(const removed of ['tuner-needle','tuner-dial','tuner-reading','tuner-note'])assert(!html.includes(removed),removed+' is removed');
 assert(!source.includes('fetch('));assert(!source.includes('MediaRecorder'));
});

function harness(getUserMedia) {
 const nodes=new Map(),connections=[],timers=new Map();let timerId=0;
 function element(id){if(!nodes.has(id))nodes.set(id,{textContent:'',style:{},dataset:{},attributes:{},classList:{toggle(){}},addEventListener(){},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(id);}
 const state={running:true,playMode:'sing',displayed:{phase:'sing',midi:65,at:0,duration:2},cfg:{interval:4,direction:1,showNote:true}};
 let samples=signal(440,48000);
 const analyser={fftSize:4096,disconnect(){this.disconnected=true;},getFloatTimeDomainData(data){data.set(samples);}};
 const src={connect(node){connections.push(node);},disconnect(){this.disconnected=true;}};
 const audio={microphoneActive:false,ctx:{currentTime:.2,sampleRate:48000,state:'running',destination:{},resume:async()=>{},createMediaStreamSource:()=>src,createAnalyser:()=>analyser},init:async()=>{}};
 const navigator={mediaDevices:{getUserMedia},audioSession:{type:'auto'}};
 const document={hidden:false,getElementById:element};
 const Klass=runInNewContext(source+'\nSingingTuner',{document,window:{isSecureContext:true},navigator,SingingCore:{name:n=>'note-'+n},setInterval:fn=>{timers.set(++timerId,fn);return timerId;},clearInterval:id=>timers.delete(id)});
 const tuner=new Klass(audio,()=>state);
 return {tuner,audio,state,navigator,document,element,connections,timers,src,analyser,setSignal:value=>samples=value};
}
function stream(){const track={stops:0,stop(){this.stops++;},onended:null};return {track,getTracks:()=>[track]};}
const flush=()=>new Promise(r=>setTimeout(r,0));
test('microphone is opt-in, never monitored to speakers; accurate, flat, sharp and silence states render',async()=>{
 const mic=stream();let requests=0;const h=harness(async options=>{requests++;assert.equal(options.video,false);return mic;});
 assert.equal(requests,0);assert.equal(h.audio.microphoneActive,false);
 await h.tuner.enable();assert.equal(requests,1);assert.equal(h.audio.microphoneActive,true);assert.equal(h.connections.length,1);assert.equal(h.connections[0],h.analyser);assert.equal(h.timers.size,1);
 h.tuner.tick();assert.equal(h.element('tuner-panel').dataset.pitch,'just');assert.equal(h.element('tuner-verdict').textContent,'Juste');assert.equal(h.element('tuner-panel').dataset.side,'center');assert.equal(h.element('tuner-panel').dataset.step,'0');
 for(const [offset,direction] of [[-150,'Trop grave'],[150,'Trop aigu'],[500,'Trop aigu']]){
  h.setSignal(signal(440*2**(offset/1200),48000));for(let frame=0;frame<7;frame++){h.audio.ctx.currentTime+=.05;h.tuner.tick();}
  assert.equal(h.element('tuner-verdict').textContent,direction);assert.equal(h.element('tuner-panel').dataset.pitch,'far');assert.equal(h.element('tuner-panel').dataset.side,offset<0?'flat':'sharp');
 }
 h.setSignal(new Float32Array(4096));h.audio.ctx.currentTime+=.2;h.tuner.tick();assert.equal(h.element('tuner-verdict').textContent,'En attente');assert.equal(h.element('tuner-panel').dataset.pitch,'waiting');assert.equal(h.element('tuner-panel').dataset.side,'none');assert.equal(h.element('tuner-panel').dataset.step,'none');
 h.tuner.disable();assert.equal(mic.track.stops,1);assert.equal(h.timers.size,0);assert.equal(h.src.disconnected,true);assert.equal(h.analyser.disconnected,true);assert.equal(h.audio.microphoneActive,false);
 assert.equal(h.navigator.audioSession.type,'playback');
});
test('tuner pauses for the model, piano beat, reference keyboard and respects hidden note names',async()=>{
 const h=harness(async()=>stream());await h.tuner.enable();h.tuner.tick();
 h.state.playMode='model';h.tuner.tick();assert.equal(h.element('tuner-verdict').textContent,'En attente');assert.match(h.element('tuner-status').textContent,/modèle/);
 h.state.playMode='sing';h.state.displayed.phase='piano';h.tuner.tick();assert.equal(h.element('tuner-verdict').textContent,'En attente');
 h.state.displayed.phase='sing';h.state.cfg.showNote=false;h.tuner.tick();h.tuner.tick();assert.equal(h.element('tuner-verdict').textContent,'Juste');assert(!h.element('tuner-target').textContent.includes('note-'));
 h.tuner.pauseFor(1.6);h.tuner.tick();assert.equal(h.element('tuner-verdict').textContent,'En attente');assert.match(h.element('tuner-status').textContent,/clavier/);
 h.document.hidden=true;h.tuner.tick();assert.equal(h.tuner.enabled,false);assert.equal(h.timers.size,0);
});
test('permission denied or missing microphone leaves music usable and lets the user retry',async()=>{
 for(const name of ['NotAllowedError','NotFoundError','NotReadableError']){
  const h=harness(async()=>{throw Object.assign(new Error('failure'),{name});});await h.tuner.enable();
  assert.equal(h.tuner.pending,false);assert.equal(h.tuner.enabled,false);assert.equal(h.audio.microphoneActive,false);assert.equal(h.timers.size,0);
  assert.notEqual(h.element('tuner-status').textContent,'Accordeur désactivé');
  h.navigator.mediaDevices.getUserMedia=async()=>stream();await h.tuner.enable();assert.equal(h.tuner.enabled,true);h.tuner.disable();
 }
 const h=harness(undefined);await h.tuner.enable();assert.match(h.element('tuner-status').textContent,/indisponible/);assert.equal(h.audio.microphoneActive,false);
});
test('cancelling a permission request stops its late stream without disrupting a newer activation',async()=>{
 const resolves=[];const h=harness(()=>new Promise(r=>resolves.push(r)));
 const first=h.tuner.enable();await flush();h.tuner.disable();
 const second=h.tuner.enable();await flush();const old=stream(),fresh=stream();
 resolves[1](fresh);await second;assert.equal(h.tuner.enabled,true);
 resolves[0](old);await first;assert.equal(old.track.stops,1);assert.equal(fresh.track.stops,0);assert.equal(h.audio.microphoneActive,true);assert.equal(h.timers.size,1);
 fresh.track.onended();assert.equal(h.tuner.enabled,false);assert.equal(fresh.track.stops,1);assert.equal(h.timers.size,0);
});
test('an error during graph setup releases the acquired microphone',async()=>{
 const mic=stream(),h=harness(async()=>mic);h.audio.ctx.createAnalyser=()=>{throw new Error('graph failure');};
 await h.tuner.enable();assert.equal(mic.track.stops,1);assert.equal(h.src.disconnected,true);assert.equal(h.tuner.enabled,false);assert.equal(h.timers.size,0);
});
