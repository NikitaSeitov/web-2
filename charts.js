/* charts.js — fetches /api/statistics and renders an artistic visualization
   Crafted for the exhibition aesthetic: stacked question graphs, custom labels, tooltip, and empty state.
*/
(function(){
  class ChartsModule {
    constructor({root=document.body, onClose=null}={}){
      this.root = root || document.body;
      this.onClose = onClose;
      this.panel = null;
      this.tooltip = null;
    }

    async start(){
      this._renderPanel();
      try{
        const res = await fetch('/api/statistics');
        if(!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        this._renderStats(json);
      }catch(e){
        this._renderEmpty();
      }
    }

    _renderPanel(){
      if(this.panel) return;

      const p = document.createElement('div');
      p.className = 'charts-panel';
      p.innerHTML = `
        <div class="data-art-shell">
          <button class="modal-close" aria-label="Закрыть" title="Закрыть">×</button>
          <header class="charts-header">
            <div>
              <div class="eyebrow">КОЛЛЕКТИВНЫЙ ПОРТРЕТ</div>
              <h2>СТАТИСТИКА</h2>
            </div>
          </header>
          <div class="charts-body"></div>
          <footer class="charts-footer">
            <button type="button" class="glass-btn secondary return-video-btn">ВЕРНУТЬСЯ К ВИДЕО</button>
          </footer>
        </div>
      `;

      this.root.appendChild(p);
      this.panel = p;
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'chart-tooltip';
      document.body.appendChild(this.tooltip);

      p.querySelector('.modal-close').addEventListener('click', () => {
        this.reset();
        if (this.onClose) this.onClose();
      });

      const returnBtn = p.querySelector('.return-video-btn');
      if (returnBtn) {
        returnBtn.addEventListener('click', () => {
          this.reset();
          if (this.onClose) this.onClose();
        });
      }
    }

    _renderStats(data){
      const body = this.panel.querySelector('.charts-body');
      body.innerHTML = '';

      if(!data || !data.questions || data.total === 0){
        this._renderEmpty();
        return;
      }

      data.questions.forEach((q) => {
        const card = document.createElement('article');
        card.className = 'chart-card';

        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = q.text;
        card.appendChild(title);

        const chart = document.createElement('div');
        chart.className = 'chart-chart';

        const grid = document.createElement('div');
        grid.className = 'chart-grid';
        chart.appendChild(grid);

        q.options.forEach((opt) => {
          const row = document.createElement('div');
          row.className = 'chart-row';

          const label = document.createElement('div');
          label.className = 'chart-label';
          label.textContent = opt.text;

          const barWrap = document.createElement('div');
          barWrap.className = 'chart-bar-wrap';

          const bar = document.createElement('div');
          bar.className = 'chart-bar';
          const width = Math.max(opt.percent || 0, 4);
          bar.style.width = `${Math.min(width, 100)}%`;

          const value = document.createElement('span');
          value.className = 'chart-value';
          value.textContent = `${opt.count}`;
          bar.appendChild(value);

          barWrap.appendChild(bar);

          const percent = document.createElement('div');
          percent.className = 'chart-percent';
          percent.textContent = `${(opt.percent || 0).toFixed(1)}%`;

          row.appendChild(label);
          row.appendChild(barWrap);
          row.appendChild(percent);

          const tooltipContent = `${opt.text}: ${opt.count} ответов (${(opt.percent || 0).toFixed(1)}%)`;
          row.addEventListener('mouseenter', (event) => this._showTooltip(event, tooltipContent));
          row.addEventListener('mousemove', (event) => this._showTooltip(event, tooltipContent));
          row.addEventListener('mouseleave', () => this._hideTooltip());

          chart.appendChild(row);
        });

        card.appendChild(chart);
        body.appendChild(card);
      });
    }

    _renderEmpty(){
      const body = this.panel.querySelector('.charts-body');
      body.innerHTML = '<div class="empty-state">ДАННЫХ ПОКА НЕДОСТАТОЧНО</div>';
    }

    _showTooltip(event, text){
      if(!this.tooltip) return;
      this.tooltip.textContent = text;
      this.tooltip.style.opacity = '1';
      this.tooltip.style.visibility = 'visible';
      this.tooltip.style.left = `${event.clientX + 16}px`;
      this.tooltip.style.top = `${event.clientY + 16}px`;
    }

    _hideTooltip(){
      if(!this.tooltip) return;
      this.tooltip.style.opacity = '0';
      this.tooltip.style.visibility = 'hidden';
    }

    reset(){
      if(this.panel){ this.panel.remove(); this.panel = null; }
      if(this.tooltip){ this.tooltip.remove(); this.tooltip = null; }
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .charts-panel {
      position: fixed;
      left: 50%;
      top: 50%;
      width: auto;
      height: auto;
      transform: translate(-50%, -50%);
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    .data-art-shell {
      position: relative;
      display: block;
      width: min(860px, 62vw);
      max-height: min(82vh, 860px);
      overflow-y: auto;
      overflow-x: hidden;
      margin: 0 auto;
      padding: 28px 22px 18px 28px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.08);
      background: linear-gradient(180deg, rgba(7, 10, 16, 0.74), rgba(7, 10, 16, 0.58));
      box-shadow: 0 30px 80px rgba(0,0,0,0.45);
      color: rgba(232, 240, 255, 0.95);
      scrollbar-width: thin;
      scrollbar-color: rgba(150, 180, 255, 0.6) transparent;
      background-clip: padding-box;
      box-sizing: border-box;
      scrollbar-gutter: stable;
    }
    .modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 50%;
      background: rgba(255,255,255,0.03);
      color: rgba(232,240,255,0.86);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .modal-close:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.12);
    }
    .data-art-shell::-webkit-scrollbar {
      width: 12px;
      height: 12px;
      background: transparent;
    }
    .data-art-shell::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 999px;
      margin: 8px 4px 8px 4px;
    }
    .data-art-shell::-webkit-scrollbar-thumb {
      background: rgba(170, 195, 255, 0.72);
      border-radius: 999px;
      border: 2px solid rgba(7,10,16,0.2);
      margin: 0 2px;
    }
    .data-art-shell::-webkit-scrollbar-button {
      display: none;
      width: 0;
      height: 0;
    }
    .charts-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.18em;
      opacity: 0.7;
      margin-bottom: 6px;
    }
    .charts-header h2 {
      margin: 0;
      letter-spacing: 0.12em;
      font-size: clamp(24px, 2vw, 38px);
      text-transform: uppercase;
    }
    .charts-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding-top: 8px;
    }
    .charts-footer {
      display: flex;
      justify-content: center;
      padding-top: 20px;
      margin-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .return-video-btn {
      min-width: min(360px, 80vw);
      justify-content: center;
    }
    .chart-card {
      padding: 22px 18px 18px;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      background: rgba(255,255,255,0.02);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .chart-title {
      font-size: 16px;
      line-height: 1.4;
      margin-bottom: 16px;
      opacity: 0.95;
      font-weight: 500;
    }
    .chart-chart {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .chart-grid {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to top, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 18.5% 100%;
      pointer-events: none;
      opacity: 0.7;
    }
    .chart-row {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(200px, 280px) minmax(260px, 1fr) 80px;
      align-items: center;
      gap: 14px;
      min-height: 34px;
      cursor: default;
    }
    .chart-label {
      font-size: 14px;
      line-height: 1.35;
      color: rgba(235, 245, 255, 0.9);
    }
    .chart-bar-wrap {
      position: relative;
      height: 22px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .chart-bar {
      position: absolute;
      inset: 0 auto 0 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(116,149,255,0.78), rgba(170,210,255,0.72), rgba(255,255,255,0.48));
      box-shadow: inset 0 0 20px rgba(255,255,255,0.12);
      transition: width 0.35s ease;
      min-width: 32px;
    }
    .chart-value {
      font-size: 11px;
      font-weight: 600;
      color: rgba(5, 8, 14, 0.9);
    }
    .chart-percent {
      font-size: 12px;
      opacity: 0.8;
      text-align: right;
    }
    .empty-state {
      padding: 42px 20px;
      text-align: center;
      font-size: 20px;
      letter-spacing: 0.12em;
      color: rgba(225,236,255,0.9);
      text-transform: uppercase;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 18px;
      background: rgba(255,255,255,0.02);
    }
    .chart-tooltip {
      position: fixed;
      z-index: 120;
      pointer-events: none;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(8, 12, 18, 0.9);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(232,240,255,0.96);
      font-size: 12px;
      box-shadow: 0 18px 34px rgba(0,0,0,0.4);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.18s ease;
      white-space: nowrap;
    }
    @media (max-width: 900px) {
      .chart-row {
        grid-template-columns: 1fr;
        gap: 6px;
      }
      .chart-bar-wrap {
        min-height: 18px;
      }
      .chart-percent {
        text-align: left;
      }
      .charts-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `;
  document.head.appendChild(style);

  window.ChartsModule = ChartsModule;
})();
