class SingingTestUI {
  constructor(core, getConfig) {
    this.core=core;this.getConfig=getConfig;this.$=id=>document.getElementById(id);
    this.api='https://et3-scores-classe.asmm-1896.chatgpt.site';
    this.pinball=window.PinballTop.mount(this.$('top-list'),{title:'TOP 10 · INTERVALLES'});
    this.$('last-result').addEventListener('click',()=>this.reveal());
    this.profileKey='asmm.singing.profile.v1';this.resultKey='asmm.singing.result.v1';this.version=0;this.publishing=false;
    for(const [value,label] of core.INTERVALS.filter(([n])=>SingingChallenge.INTERVALS.includes(n))){const o=document.createElement('option');o.value=value;o.textContent=label;this.$('test-interval').append(o);}
    this.$('test-interval').value=2;
    this.$('course-title').textContent=SingingChallenge.TITLE;
    this.$('top-scope').addEventListener('change',()=>{this.populateTop();void this.refresh();});
    for(const id of ['test-interval','test-direction'])this.$(id).addEventListener('change',()=>{this.select(this.selection());this.onChange?.();});
    for(const id of ['top-interval','top-direction'])this.$(id).addEventListener('change',()=>void this.refresh());
    this.$('top-refresh').addEventListener('click',()=>void this.refresh());
    this.$('test-save').addEventListener('click',()=>void this.save());
    this.select(this.selection());
    const pending=this.read(this.resultKey);
    if(pending?.payload)try{this.show(pending.payload,SingingScore.restore(pending.payload),!!pending.saved);}catch{}
  }
  read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  write(key,value){localStorage.setItem(key,JSON.stringify(value));}
  async request(path, options={}) {
    const response=await fetch(this.api+path,{...options,signal:AbortSignal.timeout(12000)});
    let body;try{body=await response.json();}catch{throw new Error('Le classement est temporairement indisponible.');}
    if(!response.ok)throw new Error(body.error||'Enregistrement impossible.');return body;
  }
  selection(){return SingingChallenge.config(Number(this.$('test-interval').value),Number(this.$('test-direction').value));}
  populateTop(){
    const previous=Number(this.$('top-interval').value),archive=this.$('top-scope').value==='archive';
    this.$('top-interval').replaceChildren();
    for(const [value,label] of this.core.INTERVALS.filter(([n])=>archive||SingingChallenge.INTERVALS.includes(n))){const o=document.createElement('option');o.value=value;o.textContent=label;this.$('top-interval').append(o);}
    this.$('top-interval').value=archive||SingingChallenge.INTERVALS.includes(previous)?previous:2;
    if(!this.$('top-interval').value)this.$('top-interval').value=2;
    this.$('test-top-title').textContent=archive?'Top 10 · Archives':'Top 10 · Défi du cours';
  }
  select(cfg){this.$('top-scope').value='course';this.populateTop();this.$('top-interval').value=cfg.interval;this.$('top-direction').value=cfg.direction;void this.refresh();}
  isCurrent(payload){try{SingingChallenge.validate(payload);return payload.ruleset===SingingScore.ID;}catch{return false;}}
  busy(value){this.$('test-start').disabled=value;this.$('last-result').disabled=value;if(value)this.$('test-result').hidden=true;}
  reveal(){if(!this.pending)return;this.$('test-result').hidden=false;this.$('test-result-title').focus({preventScroll:true});this.$('test-result').scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
  async refresh() {
    const archive=this.$('top-scope').value==='archive',challenge=archive?null:SingingChallenge.ID;
    const id=++this.version,interval=Number(this.$('top-interval').value),direction=Number(this.$('top-direction').value);
    this.$('top-status').textContent='Chargement du Top 10…';this.pinball.setMessage('CHARGEMENT','Le Top 10 arrive…');
    try {
      const data=await this.request(`/api/singing/leaderboard?interval=${interval}&direction=${direction}${challenge?'&challenge='+encodeURIComponent(challenge):''}`);
      if(id!==this.version)return;
      if(data.ruleset!==SingingScore.ID||data.challenge!==challenge||data.interval!==interval||data.direction!==direction||!Array.isArray(data.rows))throw new Error('Classement incompatible.');
      this.$('top-status').textContent=`${data.participants} participant${data.participants>1?'s':''} · meilleur score par pseudo`;
      this.pinball.setRows(data.rows.map(row=>({name:row.name,score:row.score,
        detail:`${row.grade}/20 · ${row.questions||30} notes · ${row.config.tempo} bpm · écart ${row.meanCents===null?'—':row.meanCents+' cents'} · réponse ${row.averageSeconds===null?'—':row.averageSeconds+' s'}`})));

    }catch{if(id===this.version){this.$('top-status').textContent='Top en ligne indisponible. Les tests restent utilisables et les résultats sont conservés sur cet appareil.';this.pinball.setMessage('INDISPONIBLE','Actualise pour réessayer.');}}
  }
  show(payload,metrics,saved=false) {
    const legacy=payload.ruleset!==SingingScore.ID,current=this.isCurrent(payload);
    this.pending={payload,saved};this.$('last-result').hidden=false;this.$('test-result').hidden=false;
    const label=this.core.INTERVALS.find(([n])=>n===payload.config.interval)[1];
    this.$('test-result-title').textContent=`${label} ${payload.config.direction===1?'↑':'↓'} · ${metrics.total} notes terminées`;
    this.$('test-score').textContent=metrics.score.toLocaleString('fr-FR')+' pts';
    this.$('test-grade').textContent=metrics.grade+'/20';
    this.$('test-precision-label').textContent=legacy?'Écart moyen des notes entendues':'Écart moyen des notes posées';
    this.$('test-precision').textContent=metrics.meanCents===null?'Aucune note détectée':`${metrics.meanCents} cents · ${metrics.heard}/${metrics.total} entendues`;
    this.$('test-speed').textContent=metrics.averageSeconds===null?'Aucune réponse stabilisée':`${metrics.averageSeconds} s depuis le piano`;
    this.$('test-breakdown').textContent=`Justesse : ${metrics.accuracy} pts · Rapidité : ${metrics.speed} pts · Écarts : ${metrics.gaps} pts`;
    const rows=this.$('test-note-results');rows.replaceChildren();
    metrics.results.forEach((n,i)=>{const li=document.createElement('li');li.textContent=`${i+1}. ${n.meanCents===null?'Non chantée / non détectée':`${Math.round(n.meanCents)} cents d’écart moyen${!legacy && !n.settled?' · note non stabilisée':''}`} · ${Math.round(n.quality*100)} %${n.seconds===null?'':` · ${n.seconds.toFixed(2)} s`}`;rows.append(li);});
    const profile=this.read(this.profileKey)||{};
    this.$('test-name').value=profile.name||payload.name||'';this.$('test-name').readOnly=!!profile.name;
    this.$('test-save').disabled=saved||!current;this.$('test-save').textContent=saved?'Score enregistré':'Enregistrer mon score en ligne';
    this.$('test-save-status').textContent=legacy?`Ancien test de ${metrics.total} notes conservé avec son barème d’origine. Lance un nouveau test pour profiter de la notation plus souple.`:!current?'Ancien essai conservé. Pour participer au Top actuel, lance le Défi du cours avec ses réglages communs.':saved?'Ton meilleur résultat occupe une seule place dans ce Top.':'Résultat conservé sur cet appareil. Choisis un pseudo pour le partager.';
    try{this.write(this.resultKey,this.pending);}catch{this.$('test-save-status').textContent='Résultat disponible ici. Le stockage local est bloqué : garde cette page ouverte.';}
    if(current)this.select(payload.config);
  }
  async save() {
    if(this.publishing||!this.pending||this.pending.saved||!this.isCurrent(this.pending.payload))return;
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
    finally{this.publishing=false;this.$('test-save').disabled=!!this.pending?.saved||!this.isCurrent(this.pending?.payload);}
  }
}
