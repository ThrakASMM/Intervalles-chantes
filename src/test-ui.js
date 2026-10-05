class SingingTestUI {
  constructor(core, getConfig) {
    this.core=core;this.getConfig=getConfig;this.$=id=>document.getElementById(id);
    this.api='https://et3-scores-classe.asmm-1896.chatgpt.site';
    this.profileKey='asmm.singing.profile.v1';this.resultKey='asmm.singing.result.v1';this.version=0;this.publishing=false;
    for(const [value,label] of core.INTERVALS){const o=document.createElement('option');o.value=value;o.textContent=label;this.$('top-interval').append(o);}
    for(const id of ['top-interval','top-direction'])this.$(id).addEventListener('change',()=>void this.refresh());
    this.$('top-refresh').addEventListener('click',()=>void this.refresh());
    this.$('test-save').addEventListener('click',()=>void this.save());
    this.select(getConfig());
    const pending=this.read(this.resultKey);
    if(pending?.payload)try{this.show(pending.payload,SingingScore.evaluate(pending.payload.config,pending.payload.notes),!!pending.saved);}catch{}
  }
  read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  write(key,value){localStorage.setItem(key,JSON.stringify(value));}
  async request(path, options={}) {
    const response=await fetch(this.api+path,{...options,signal:AbortSignal.timeout(12000)});
    let body;try{body=await response.json();}catch{throw new Error('Le classement est temporairement indisponible.');}
    if(!response.ok)throw new Error(body.error||'Enregistrement impossible.');return body;
  }
  select(cfg){this.$('top-interval').value=cfg.interval;this.$('top-direction').value=cfg.direction;void this.refresh();}
  busy(value){this.$('test-start').disabled=value;if(value)this.$('test-result').hidden=true;}
  async refresh() {
    const id=++this.version,interval=Number(this.$('top-interval').value),direction=Number(this.$('top-direction').value);
    this.$('top-status').textContent='Chargement du Top 5…';this.$('top-list').replaceChildren();
    try {
      const data=await this.request(`/api/singing/leaderboard?interval=${interval}&direction=${direction}`);
      if(id!==this.version)return;
      if(data.ruleset!==SingingScore.ID||data.interval!==interval||data.direction!==direction||!Array.isArray(data.rows))throw new Error('Classement incompatible.');
      this.$('top-status').textContent=`${data.participants} participant${data.participants>1?'s':''} · meilleur score par pseudo`;
      for(const [i,row] of data.rows.entries()){
        const li=document.createElement('li'),rank=document.createElement('b'),name=document.createElement('strong'),score=document.createElement('strong'),detail=document.createElement('small');
        rank.textContent=String(i+1);name.textContent=row.name;score.textContent=`${row.score.toLocaleString('fr-FR')} pts`;
        detail.textContent=`${row.grade}/20 · ${row.config.tempo} bpm · écart moyen ${row.meanCents===null?'—':row.meanCents+' cents'} · réponse ${row.averageSeconds===null?'—':row.averageSeconds+' s'}`;
        li.append(rank,name,score,detail);this.$('top-list').append(li);
      }
      if(!data.rows.length){const li=document.createElement('li');li.className='top-empty';li.textContent='Pas encore de score pour cet intervalle dans ce sens.';this.$('top-list').append(li);}
    }catch{if(id===this.version)this.$('top-status').textContent='Top en ligne indisponible. Les tests restent utilisables et les résultats sont conservés sur cet appareil.';}
  }
  show(payload,metrics,saved=false) {
    this.pending={payload,saved};this.$('test-result').hidden=false;
    const label=this.core.INTERVALS.find(([n])=>n===payload.config.interval)[1];
    this.$('test-result-title').textContent=`${label} ${payload.config.direction===1?'↑':'↓'} · 20 notes terminées`;
    this.$('test-score').textContent=metrics.score.toLocaleString('fr-FR')+' pts';
    this.$('test-grade').textContent=metrics.grade+'/20';
    this.$('test-precision').textContent=metrics.meanCents===null?'Aucune note détectée':`${metrics.meanCents} cents · ${metrics.heard}/20 entendues`;
    this.$('test-speed').textContent=metrics.averageSeconds===null?'Aucune réponse stabilisée':`${metrics.averageSeconds} s depuis le piano`;
    this.$('test-breakdown').textContent=`Justesse : ${metrics.accuracy} pts · Rapidité : ${metrics.speed} pts · Écarts : ${metrics.gaps} pts`;
    const rows=this.$('test-note-results');rows.replaceChildren();
    metrics.results.forEach((n,i)=>{const li=document.createElement('li');li.textContent=`${i+1}. ${n.meanCents===null?'Non chantée / non détectée':`${Math.round(n.meanCents)} cents d’écart moyen`} · ${Math.round(n.quality*100)} %${n.seconds===null?'':` · ${n.seconds.toFixed(2)} s`}`;rows.append(li);});
    const profile=this.read(this.profileKey)||{};
    this.$('test-name').value=profile.name||payload.name||'';this.$('test-name').readOnly=!!profile.name;
    this.$('test-save').disabled=saved;this.$('test-save').textContent=saved?'Score enregistré':'Enregistrer mon score en ligne';
    this.$('test-save-status').textContent=saved?'Ton meilleur résultat occupe une seule place dans ce Top.':'Résultat conservé sur cet appareil. Choisis un pseudo pour le partager.';
    try{this.write(this.resultKey,this.pending);}catch{this.$('test-save-status').textContent='Résultat disponible ici. Le stockage local est bloqué : garde cette page ouverte.';}
    this.select(payload.config);
  }
  async save() {
    if(this.publishing||!this.pending||this.pending.saved)return;
    const pending=this.pending,profile=this.read(this.profileKey)||{};
    const name=(profile.name||this.$('test-name').value).normalize('NFKC').trim().replace(/\s+/g,' ');
    if([...name].length<2||[...name].length>16){this.$('test-save-status').textContent='Choisis un pseudo de 2 à 16 caractères.';return;}
    this.publishing=true;this.$('test-save').disabled=true;this.$('test-save-status').textContent='Enregistrement en ligne…';
    try {
      if(!/^[a-f0-9]{64}$/.test(profile.token||''))profile.token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
      this.write(this.profileKey,profile);pending.payload.name=name;this.write(this.resultKey,pending);
      const result=await this.request('/api/singing/scores',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+profile.token},body:JSON.stringify(pending.payload)});
      profile.name=result.name||name;profile.playerId=result.playerId;this.write(this.profileKey,profile);
      pending.saved=true;
      if(this.pending===pending){this.write(this.resultKey,pending);this.$('test-name').value=profile.name;this.$('test-name').readOnly=true;this.$('test-save').textContent='Score enregistré';this.$('test-save-status').textContent='Enregistré ! Seul ton meilleur score apparaît dans ce Top.';void this.refresh();}
    }catch(error){if(this.pending===pending)this.$('test-save-status').textContent=['TypeError','TimeoutError'].includes(error.name)?'Connexion indisponible. Le résultat est conservé ; clique de nouveau sur Enregistrer pour réessayer.':error.message;}
    finally{this.publishing=false;this.$('test-save').disabled=!!this.pending?.saved;}
  }
}
