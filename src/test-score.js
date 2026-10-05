/* Shared scoring rules: browser and server use this exact module. No audio is uploaded. */
const SingingScore = (() => {
  const ID = 'singing-30-v1', LEGACY_ID = 'singing-20-v1', TOTAL = 30;
  const gaps = {close:[1,4],medium:[5,9],wide:[10,24],free:[1,60]};
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const octaveCents = value => ((value + 600) % 1200 + 1200) % 1200 - 600;
  function config(raw) {
    if (!raw || !Number.isInteger(raw.interval) || raw.interval<1 || raw.interval>12 || ![1,-1].includes(raw.direction) ||
      !Number.isInteger(raw.tempo) || raw.tempo<30 || raw.tempo>200 || !Object.hasOwn(gaps,raw.difficulty) ||
      !Number.isInteger(raw.low) || !Number.isInteger(raw.high) || raw.low<36 || raw.high>96 || raw.low>=raw.high || raw.high-raw.low<gaps[raw.difficulty][0]) throw new Error('Réglages du test invalides.');
    return {interval:raw.interval,direction:raw.direction,tempo:raw.tempo,difficulty:raw.difficulty,low:raw.low,high:raw.high};
  }
  function noteResult(note, cfg, previous, total) {
    const duration=60000/cfg.tempo, frames=note.samples;
    if (!Number.isInteger(note.midi) || note.midi<cfg.low || note.midi>cfg.high || !Array.isArray(frames) || frames.length>Math.ceil(duration/35)) throw new Error('Mesures du test invalides.');
    if (previous!==null) {const gap=Math.abs(note.midi-previous);if(gap<gaps[cfg.difficulty][0] || gap>gaps[cfg.difficulty][1])throw new Error('Écarts du test invalides.');}
    let previousTime=-100, sum=0, stable=[], found=null;
    for (const frame of frames) {
      if (!frame || !Number.isInteger(frame.t) || frame.t<120 || frame.t>=duration || frame.t-previousTime<35 ||
        !Number.isFinite(frame.c) || Math.abs(frame.c)>600) throw new Error('Mesures du test invalides.');
      sum+=Math.abs(frame.c);
      if (Math.abs(frame.c)<=30) {
        if (frame.t-previousTime>85) stable=[];
        stable.push(frame.t);
        if (found===null && stable.length>=3 && frame.t-stable[0]>=90) found=stable[0];
      } else stable=[];
      previousTime=frame.t;
    }
    const meanCents=frames.length?sum/frames.length:null;
    const coverage=Math.min(1,frames.length/3);
    const quality=meanCents===null?0:clamp((100-meanCents)/70,0,1)*coverage;
    // Speed starts at the piano note, including the listening beat. It only
    // earns a bonus for a stable correct response, never for singing early/wrong.
    const seconds=found===null?null:(duration+found)/1000;
    const speed=seconds===null?0:clamp((2.5-seconds)/2.1,0,1);
    // Octaves are free: an octave-only change must not earn a difficulty bonus.
    const rawGap=previous===null?0:Math.abs(note.midi-previous)%12;
    const effectiveGap=Math.min(rawGap,12-rawGap);
    return {midi:note.midi,meanCents,quality,seconds,effectiveGap,
      accuracyPoints:quality*(10000/total),speedPoints:quality*speed*(2000/total),gapPoints:quality*effectiveGap/6*(1000/(total-1))};
  }
  function evaluateForTotal(rawConfig, notes, total) {
    const cfg=config(rawConfig);
    if (!Array.isArray(notes) || notes.length!==total) throw new Error(`Le test doit comporter ${total} notes terminées.`);
    const results=notes.map((note,i)=>noteResult(note,cfg,i?notes[i-1].midi:null,total));
    const sum=key=>results.reduce((n,r)=>n+(r[key]||0),0);
    const accuracy=Math.round(sum('accuracyPoints')),speed=Math.round(sum('speedPoints')),gaps=Math.round(sum('gapPoints'));
    const voiced=results.filter(n=>n.meanCents!==null),timed=results.filter(n=>n.seconds!==null);
    return {score:accuracy+speed+gaps,accuracy,speed,gaps,grade:Math.round(sum('quality')/total*200)/10,
      meanCents:voiced.length?Math.round(voiced.reduce((s,n)=>s+n.meanCents,0)/voiced.length*10)/10:null,
      averageSeconds:timed.length?Math.round(timed.reduce((s,n)=>s+n.seconds,0)/timed.length*100)/100:null,
      correct:results.filter(n=>n.quality===1).length,heard:voiced.length,total,results};
  }
  const evaluate = (cfg, notes) => evaluateForTotal(cfg, notes, TOTAL);
  function restore(payload) {
    if(payload.ruleset===LEGACY_ID)return evaluateForTotal(payload.config,payload.notes,20);
    if(payload.ruleset!==ID)throw new Error('Ancien barème incompatible.');
    return evaluate(payload.config,payload.notes);
  }
  class Capture {
    constructor(cfg) {this.cfg=config(cfg);this.notes=[];this.endAt=null;}
    register(event) {if(event.phase==='piano' && event.pairs<=TOTAL)this.notes[event.pairs-1]={midi:event.midi,samples:[]};}
    sample(event,cents,now) {
      const note=this.notes[event?.pairs-1];if(!note || event.phase!=='sing')return;
      const t=Math.round((now-event.at)*1000),last=note.samples.at(-1);
      if(t<120 || t>=60000/this.cfg.tempo || (last && t-last.t<35) || !Number.isFinite(cents))return;
      note.samples.push({t,c:Math.round(octaveCents(cents)*10)/10});
    }
    result() {return evaluate(this.cfg,this.notes);}
  }
  return {ID,LEGACY_ID,TOTAL,config,evaluate,restore,Capture,octaveCents};
})();
