class MachineOfConsentApp {
  static STATES = {
    VIDEO_MODE: 'VIDEO_MODE',
    SURVEY_MODE: 'SURVEY_MODE',
    DATA_ART_MODE: 'DATA_ART_MODE'
  }

  constructor(root=document.getElementById('app')){
    this.root = root;
    this.state = MachineOfConsentApp.STATES.VIDEO_MODE;
    this.video = document.getElementById('bgVideo');
    this.placeholder = document.getElementById('videoPlaceholder');
    this.startBtn = document.getElementById('startSurvey');
    this.statsBtn = document.getElementById('openStats');
    this.surveyRoot = document.getElementById('surveyRoot');
    this.survey = null;
    this.charts = null;
    this.idleTimeoutMs = 60000;
    this._idleTimer = null;

    // create survey module if available
    if(window.SurveyModule){
      this.survey = new window.SurveyModule({
        root:this.surveyRoot,
        onFinish: (answers)=>this._onSurveyFinish(answers),
        onClose: () => this.resetToVideoMode()
      });
    }

    this._bind();
    this._initVideo();
  }

  _bind(){
    this._onStart = this._onStart.bind(this);
    this._onOpenStats = this._onOpenStats.bind(this);
    this._onVideoError = this._onVideoError.bind(this);
    this._onVideoLoaded = this._onVideoLoaded.bind(this);

    this.startBtn.addEventListener('click', this._onStart);
    if(this.statsBtn){ this.statsBtn.addEventListener('click', this._onOpenStats); }
    this.video.addEventListener('error', this._onVideoError);
    this.video.addEventListener('loadeddata', this._onVideoLoaded);
  }

  _onOpenStats(){
    this.startDataArt();
  }

  async _initVideo(){
    // Try a quick fetch to detect absence of the file (graceful fallback)
    try{
      const res = await fetch('assets/video.mp4', {method:'HEAD'});
      if(!res.ok) throw new Error('no video');
      // let the <video> element continue loading
    }catch(e){
      // if HEAD fails, rely on video error handler, but proactively show placeholder
      this._showPlaceholder();
    }
  }

  _onVideoLoaded(){
    this._hidePlaceholder();
  }

  _onVideoError(){
    this._showPlaceholder();
  }

  _showPlaceholder(){
    if(this.placeholder){
      this.placeholder.hidden = false;
      this.video.style.display = 'none';
    }
  }

  _hidePlaceholder(){
    if(this.placeholder){
      this.placeholder.hidden = true;
      this.video.style.display = '';
    }
  }

  _onStart(){
    // Start survey if module exists
    if(this.survey){
      this.startSurvey();
    }else{
      this._showSurveyStub();
    }
  }

  _showSurveyStub(){
    // Small, unobtrusive feedback that transition will happen here.
    const stub = document.createElement('div');
    stub.className = 'survey-stub';
    stub.textContent = 'Открывается опрос — (реализация следующем этапе)';
    Object.assign(stub.style,{
      position:'fixed',left:'50%',top:'84%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.45)',color:'#dfefff',padding:'10px 18px',borderRadius:'10px',backdropFilter:'blur(6px)',zIndex:999
    });
    document.body.appendChild(stub);
    setTimeout(()=>stub.remove(),3000);
    console.info('Transition to SURVEY_MODE (stub)');
  }

  startSurvey(){
    this._setState(MachineOfConsentApp.STATES.SURVEY_MODE);
    this._showBackdrop();
    // dim video
    const dim = document.getElementById('videoDim');
    if(dim){ dim.style.opacity = '0'; dim.hidden = true; }

    // render and start survey
    if(this.survey){
      this.survey.start();
    }

    // start idle timer and activity listeners
    this._attachActivityListeners();
    this._resetIdleTimer();
  }

  _onSurveyFinish(answers){
    // send answers to backend; expect server at /api/responses
    const payload = this._normalizeAnswers(answers);
    this._lastPayload = payload;
    this._submitResponses(payload).then(()=>{
      this._showThankYou();
    }).catch((err)=>{
      console.error('Failed to save responses', err);
      this._showSubmitError(err);
    });
  }

  _normalizeAnswers(raw){
    // raw: {1: '...', 2: ['..'], ...}
    const out = {timestamp: new Date().toISOString(), answers:{}};
    for(const key in raw){
      out.answers['q'+key] = raw[key];
    }
    return out;
  }

  async _submitResponses(payload){
    const res = await fetch('/api/responses',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('server error');
    return res.json();
  }

  _showThankYou(){
    // clear survey UI, show thanks panel with options
    if(this.survey) this.survey.reset();
    this._showBackdrop();
    const panel = document.createElement('div');
    panel.className = 'survey-panel visible';
    panel.style.position = 'fixed';
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.zIndex = '999';
    panel.style.width = 'auto';
    panel.style.maxWidth = '520px';
    panel.innerHTML = `
      <div class="survey-inner" style="max-width:520px; width:min(520px, 86vw); margin:0 auto; box-sizing:border-box;">
        <h2 style="font-size:28px;margin:6px 0 14px">СПАСИБО</h2>
        <p style="margin:0 0 18px;opacity:0.9">Ваш ответ стал частью коллективного портрета.</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:10px;flex-wrap:wrap">
          <button id="viewStatsAfterSubmit" class="glass-btn secondary">ПОСМОТРЕТЬ СТАТИСТИКУ</button>
          <button id="backToVideoAfterSubmit" class="glass-btn">ВЕРНУТЬСЯ К ВИДЕО</button>
        </div>
      </div>`;
    document.body.appendChild(panel);

    document.getElementById('viewStatsAfterSubmit').addEventListener('click',()=>{
      panel.remove(); this.startDataArt();
    });
    document.getElementById('backToVideoAfterSubmit').addEventListener('click',()=>{
      panel.remove(); this.resetToVideoMode();
    });
  }

  _showSubmitError(err){
    const box = document.createElement('div'); box.className = 'survey-stub';
    box.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center"><strong>Ошибка сохранения</strong><div>Не удалось отправить ответ${err?': '+(err.message||err):''}</div></div>`;
    Object.assign(box.style,{position:'fixed',left:'50%',top:'78%',transform:'translateX(-50%)',background:'rgba(12,12,16,0.9)',color:'#ffdfe0',padding:'12px 16px',borderRadius:'10px',zIndex:999});
    const controls = document.createElement('div'); controls.style.marginTop='8px'; controls.style.display='flex'; controls.style.gap='8px'; controls.style.justifyContent='center';
    const retry = document.createElement('button'); retry.textContent='Повторить'; retry.className='glass-btn';
    const cancel = document.createElement('button'); cancel.textContent='Отмена'; cancel.className='glass-btn secondary';
    controls.appendChild(retry); controls.appendChild(cancel); box.appendChild(controls);
    document.body.appendChild(box);
    retry.addEventListener('click', ()=>{
      box.remove(); if(this._lastPayload) this._submitResponses(this._lastPayload).then(()=>{ this._showThankYou(); }).catch(e=>this._showSubmitError(e));
    });
    cancel.addEventListener('click', ()=>{ box.remove(); this.resetToVideoMode(); });
    // remove after timeout to avoid sticking
    setTimeout(()=>{ if(box.parentNode) box.remove(); },12000);
  }

  startDataArt(){
    this._setState(MachineOfConsentApp.STATES.DATA_ART_MODE);
    this._showBackdrop();
    if(window.ChartsModule){
      if(!this.charts) this.charts = new window.ChartsModule({root:this.surveyRoot, onClose: ()=>this.resetToVideoMode()});
      this.charts.start();
    }
    this._attachActivityListeners(); this._resetIdleTimer();
  }

  resetToVideoMode(){
    // clear survey UI and answers
    if(this.survey){ this.survey.reset(); }
    if(this.charts){ this.charts.reset(); }
    this._hideBackdrop();
    const dim = document.getElementById('videoDim');
    if(dim){ dim.style.opacity = '0'; setTimeout(()=>dim.hidden = true,600); }
    this._setState(MachineOfConsentApp.STATES.VIDEO_MODE);
    this._detachActivityListeners();
    this._clearIdleTimer();
  }

  _attachActivityListeners(){
    if(this._boundActivity) return;
    this._boundActivity = (e)=>this._resetIdleTimer();
    ['mousemove','click','mousedown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,this._boundActivity,{passive:true}));
  }

  _detachActivityListeners(){
    if(!this._boundActivity) return;
    ['mousemove','click','mousedown','touchstart','keydown'].forEach(ev=>document.removeEventListener(ev,this._boundActivity));
    this._boundActivity = null;
  }

  _resetIdleTimer(){
    this._clearIdleTimer();
    this._idleTimer = setTimeout(()=>{
      // on idle timeout: cancel survey and return to VIDEO_MODE
      console.info('Idle timeout: resetting to VIDEO_MODE');
      this.resetToVideoMode();
    }, this.idleTimeoutMs);
  }

  _clearIdleTimer(){ if(this._idleTimer){ clearTimeout(this._idleTimer); this._idleTimer = null; } }

  _setState(next){
    this.state = next;
    this.root.dataset.state = next;
  }

  _getBackdrop(){
    let backdrop = document.getElementById('modalBackdrop');
    if(!backdrop){
      backdrop = document.createElement('div');
      backdrop.id = 'modalBackdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  _showBackdrop(){
    const backdrop = this._getBackdrop();
    backdrop.hidden = false;
    requestAnimationFrame(()=>{
      backdrop.style.opacity = '1';
    });
  }

  _hideBackdrop(){
    const backdrop = document.getElementById('modalBackdrop');
    if(!backdrop) return;
    backdrop.style.opacity = '0';
    setTimeout(()=>{ backdrop.hidden = true; },260);
  }
}

window.addEventListener('DOMContentLoaded',()=>{
  // initialize app
  window.MachineOfConsent = new MachineOfConsentApp();
});
