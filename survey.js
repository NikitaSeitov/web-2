/* survey.js — modular survey UI for MACHINE OF CONSENT
   - Renders questions into a provided root
   - Handles single and multiple choice (Q2) with limits
   - Calls onFinish callback with collected answers
*/
(function(){
  const QUESTIONS = [
    {id:1,type:'single',text:'Как часто вы пользуетесь ИИ?', options:[
      'Несколько раз в день','Каждый день','Несколько раз в неделю','Несколько раз в месяц','Редко','Не пользуюсь'
    ]},
    {id:2,type:'multiple',max:3,text:'Для чего вы чаще всего используете ИИ?', options:[
      'Поиск информации','Работа','Учёба','Создание текстов','Решение повседневных задач','Развлечение','Общение'
    ]},
    {id:3,type:'single',text:'Насколько важную роль ИИ играет в вашей повседневной жизни?', options:[
      'Практически никакую','Небольшую','Умеренную','Значительную','Очень значительную'
    ]},
    {id:4,type:'single',text:'Как вы обычно относитесь к ответам ИИ?', options:[
      'Обычно доверяю','Скорее доверяю','Доверяю, но проверяю','Скорее не доверяю','Не доверяю'
    ]},
    {id:5,type:'single',text:'Как часто вы проверяете информацию, полученную от искусственного интеллекта?', options:[
      'Всегда','Часто (в большинстве случаев)','Иногда','Редко','Никогда'
    ]},
    {id:6,type:'single',text:'Случается ли вам обращаться к ИИ не только за информацией, но и за мнением или советом?', options:[
      'Часто','Иногда','Редко','Никогда'
    ]},
    {id:7,type:'single',text:'Насколько вам комфортно обсуждать с ИИ личные или эмоциональные темы?', options:[
      'Очень комфортно','Скорее комфортно','Нейтрально','Скорее некомфортно','Совсем некомфортно','Я не обсуждаю с ИИ личные темы'
    ]},
    {id:8,type:'single',text:'Как вы оцениваете способность искусственного интеллекта понимать эмоции и переживания человека?', options:[
      'Хорошо понимает и учитывает эмоции','Иногда понимает, но часто ошибается','Плохо понимает эмоции','Совсем не способен понимать эмоции','Затрудняюсь ответить'
    ]},
    {id:9,type:'single',text:'Что для вас важнее всего в общении с ИИ?', options:[
      'Получить точный ответ','Быстро решить задачу','Получить понятное объяснение','Получить поддержку','Возможность свободно высказать свои мысли','Другое'
    ]},
    {id:10,type:'single',text:'Считаете ли вы, что в будущем искусственный интеллект сможет оказывать эмоциональную поддержку людям на уровне, сопоставимом с человеком?', options:[
      'Да, сможет','Скорее сможет','Скорее не сможет','Нет, не сможет','Затрудняюсь ответить'
    ]}
  ];

  class SurveyModule {
    constructor({root=document.body, onFinish=null, onClose=null}={}){
      this.root = root || document.body;
      this.onFinish = onFinish;
      this.onClose = onClose;
      this.current = 0;
      this.answers = {};
      this.panel = null;
    }

    start(){
      this.current = 0; this.answers = {};
      this._renderPanel();
      requestAnimationFrame(()=>this.panel.classList.add('visible'));
      this._renderQuestion();
    }

    reset(){
      if(this.panel){ this.panel.classList.remove('visible'); setTimeout(()=>{ this.panel.remove(); this.panel=null },400); }
      this.current = 0; this.answers = {};
    }

    _renderPanel(){
      if(this.panel) return;
      const p = document.createElement('div'); p.className = 'survey-panel'; p.setAttribute('role','dialog'); p.setAttribute('aria-modal','true');

      p.innerHTML = `
        <div class="survey-inner">
          <button class="modal-close" aria-label="Закрыть" title="Закрыть">×</button>
          <header class="survey-header">
            <div class="progress-text"></div>
            <div class="progress-bar"><div class="progress-fill"/></div>
          </header>
          <section class="survey-body">
            <h2 class="q-text"></h2>
            <p class="question-hint" aria-live="polite"></p>
            <div class="options"></div>
          </section>
          <footer class="survey-footer">
            <button class="continue-btn" disabled>ПРОДОЛЖИТЬ</button>
          </footer>
        </div>`;

      this.root.appendChild(p);
      this.panel = p;

      // references
      this.qText = p.querySelector('.q-text');
      this.hintEl = p.querySelector('.question-hint');
      this.optionsEl = p.querySelector('.options');
      this.progressText = p.querySelector('.progress-text');
      this.progressFill = p.querySelector('.progress-fill');
      this.continueBtn = p.querySelector('.continue-btn');
      this.closeBtn = p.querySelector('.modal-close');

      // handlers
      this.optionsEl.addEventListener('click', (e)=>this._onOptionClick(e));
      this.continueBtn.addEventListener('click', ()=>this._onContinue());
      this.closeBtn.addEventListener('click', ()=>{
        this.reset();
        if (this.onClose) this.onClose();
      });
    }

    _renderQuestion(){
      const q = QUESTIONS[this.current];
      if(!q){ return this._finish(); }
      // header
      this.progressText.textContent = `Вопрос ${this.current+1} из ${QUESTIONS.length}`;
      const pct = ((this.current)/ (QUESTIONS.length))*100;
      this.progressFill.style.width = pct + '%';

      // body
      this.qText.textContent = q.text;
      this.hintEl.textContent = q.type === 'single' ? 'Выберите 1 вариант ответа' : 'Выберите от 1 до 3 вариантов ответа';
      this.optionsEl.innerHTML = '';
      q.options.forEach((opt,idx)=>{
        const b = document.createElement('button');
        b.className = 'option';
        b.type = 'button';
        b.dataset.index = idx;
        b.textContent = opt;
        this.optionsEl.appendChild(b);
      });

      // footer
      this.continueBtn.disabled = true;
      this.continueBtn.style.display = '';
    }

    _onOptionClick(e){
      const btn = e.target.closest('.option');
      if(!btn) return;
      const q = QUESTIONS[this.current];
      const idx = Number(btn.dataset.index);

      if(q.type === 'single'){
        this._markSelected(btn);
        this.answers[q.id] = q.options[idx];
        this.continueBtn.disabled = false;
        return;
      }

      if(q.type === 'multiple'){
        const sel = btn.classList.toggle('selected');
        const selected = Array.from(this.optionsEl.querySelectorAll('.option.selected'));
        if(selected.length > (q.max||3)){
          btn.classList.remove('selected');
          btn.animate([{transform:'scale(1)'},{transform:'scale(0.98)'},{transform:'scale(1)'}],{duration:220});
          return;
        }
        this.answers[q.id] = selected.map(s=>s.textContent);
        this.continueBtn.disabled = selected.length === 0;
      }
    }

    _markSelected(btn){
      // subtle highlight animation
      const prev = this.optionsEl.querySelector('.option.selected');
      if(prev) prev.classList.remove('selected');
      btn.classList.add('selected');
      btn.animate([{opacity:0.9,transform:'scale(0.98)'},{opacity:1,transform:'scale(1)'}],{duration:260});
    }

    _onContinue(){
      const q = QUESTIONS[this.current];
      if(!q) return;

      if(q.type === 'single'){
        if(!this.answers[q.id]) return;
        this._nextQuestion();
        return;
      }

      const selected = Array.from(this.optionsEl.querySelectorAll('.option.selected'));
      if(selected.length === 0) return;
      this.answers[q.id] = selected.map(s=>s.textContent);
      this._nextQuestion();
    }

    _nextQuestion(){
      this.current += 1;
      if(this.current >= QUESTIONS.length){ return this._finish(); }
      // smooth transition
      this.panel.classList.remove('enter');
      this.panel.classList.add('enter');
      this._renderQuestion();
    }

    _finish(){
      if(this.onFinish) this.onFinish(this.answers);
      this.reset();
    }
  }

  // expose globally
  window.SurveyModule = SurveyModule;

  // Minimal styles injected for survey (keeps it modular)
  const css = `
  .survey-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.98);width:auto;max-width:min(860px,80vw);max-height:86vh;z-index:999;opacity:0;transition:opacity .35s ease,transform .35s cubic-bezier(.2,.9,.2,1);backdrop-filter:none}
  .survey-panel.visible{opacity:1;transform:translate(-50%,-50%) scale(1)}
  .survey-inner{position:relative;background:linear-gradient(180deg,rgba(8,10,14,0.62),rgba(3,5,8,0.6));border:1px solid rgba(255,255,255,0.06);padding:28px 36px 28px 36px;border-radius:16px;color:#e9f4ff;box-shadow:0 30px 80px rgba(10,20,40,0.6);background-clip:padding-box;width:min(860px,80vw);margin:0 auto;box-sizing:border-box}
  .modal-close {
    position:absolute; top:12px; right:12px; width:30px; height:30px; border-radius:50%;
    border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:rgba(232,240,255,0.85);
    font-size:22px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:background .2s ease, border-color .2s ease;
  }
  .modal-close:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); }
  .survey-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-right:36px}
  .progress-text{font-size:14px;color:rgba(200,220,255,0.9)}
  .progress-bar{flex:1;height:6px;background:rgba(255,255,255,0.04);border-radius:4px;margin-left:18px;overflow:hidden}
  .progress-fill{height:100%;width:0;background:linear-gradient(90deg,rgba(120,170,255,0.9),rgba(160,200,255,0.9));transition:width .38s ease}
  .survey-body{display:block;padding:6px 2px}
  .q-text{margin:6px 0 18px 0;font-size:24px;line-height:1.1}
  .question-hint{margin:-8px 0 12px;font-size:12px;font-style:italic;color:rgba(200,220,255,0.72);letter-spacing:0.02em}
  /* vertical list: one option per row */
  .options{display:flex;flex-direction:column;gap:12px}
  .option{appearance:none;border-radius:12px;padding:18px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:inherit;font-size:18px;text-align:left;cursor:pointer;transition:box-shadow .18s ease, border-color .18s ease, background .18s ease;box-shadow:0 6px 18px rgba(40,60,100,0.06)}
  .option:hover{box-shadow:0 12px 22px rgba(40,60,120,0.08);border-color:rgba(255,255,255,0.09)}
  .option.selected{background:rgba(186,214,255,0.14);outline:2px solid rgba(200,220,255,0.28);box-shadow:0 18px 40px rgba(80,140,220,0.12);border-color:rgba(200,220,255,0.28)}
  .survey-footer{display:flex;justify-content:center;margin-top:18px}
  .continue-btn{padding:14px 22px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,rgba(120,170,255,0.12),rgba(120,170,255,0.08));color:var(--accent);font-weight:700;cursor:pointer;min-width:220px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);font-size:15px;letter-spacing:0.06em}
  .continue-btn[disabled]{opacity:0.45;cursor:not-allowed}
  @media (max-width:900px){.q-text{font-size:18px}.option{font-size:16px;padding:14px}}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

})();
