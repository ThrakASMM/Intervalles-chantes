/* Shared course assignment. Renew ID and settings only for a new assignment,
   never for a calendar week, a visual update or an audio fix. */
const SingingChallenge = (() => {
  const ID='singing-course-001-seconds',TITLE='Secondes mineures et majeures';
  const INTERVALS=Object.freeze([1,2]);
  const SETTINGS=Object.freeze({tempo:80,difficulty:'close',low:60,high:72});
  // The same route and gap bonus for everyone; free practice stays random.
  const NOTES=Object.freeze([60,62,65,64,67,69,66,65,68,72,71,67,64,62,61,65,68,66,69,72,70,67,65,62,64,68,71,69,66,63]);
  function config(interval=2,direction=1) {
    if(!INTERVALS.includes(interval)||![1,-1].includes(direction))throw new Error('Ce défi porte sur les secondes mineures et majeures, dans les deux sens.');
    return {...SETTINGS,interval,direction};
  }
  function isConfig(raw) {
    return !!raw && INTERVALS.includes(raw.interval) && [1,-1].includes(raw.direction) &&
      Object.entries(SETTINGS).every(([key,value])=>raw[key]===value);
  }
  function validate(payload) {
    if(payload?.challenge!==ID)throw new Error('Lance le Défi du cours actuel pour participer au classement.');
    if(!isConfig(payload.config))throw new Error('Le défi impose 80 BPM, les petits écarts et un piano de Do3 à Do4.');
    if(!Array.isArray(payload.notes)||payload.notes.length!==NOTES.length||payload.notes.some((note,i)=>note?.midi!==NOTES[i]))throw new Error('Le défi doit suivre la même série de 30 notes pour tous.');
    return config(payload.config.interval,payload.config.direction);
  }
  class Sequence {
    constructor(){this.beat=0;}
    next(){
      const beat=this.beat++;
      if(beat<4)return {phase:'count',count:beat+1,midi:null,pairs:0};
      const index=Math.floor((beat-4)/2);
      return {phase:(beat-4)%2===0?'piano':'sing',midi:NOTES[index]??NOTES[0],pairs:index+1};
    }
  }
  return {ID,TITLE,INTERVALS,SETTINGS,NOTES,config,isConfig,validate,Sequence};
})();
