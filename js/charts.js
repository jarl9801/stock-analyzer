// ============================================
// CHARTS.JS — Advanced Bloomberg charting system
// Phase 3 — Complete rewrite with lightweight-charts
// ============================================

const Charts = (() => {
    const instances = new Map();
    const COLORS = {
        sma20: '#4488ff', sma50: '#ffaa00', sma200: '#ff4444',
        ema12: '#00cccc', ema26: '#e879f9',
        bbUpper: 'rgba(100,149,237,0.5)', bbLower: 'rgba(100,149,237,0.5)',
        vwap: '#a855f7',
        compare: ['#ffaa00','#4488ff','#22c55e','#ff4444','#9b59b6','#00cccc','#e879f9','#f97316']
    };
    const TF_DAYS = { '1D':1, '5D':5, '1M':22, '3M':66, '6M':132, 'YTD':null, '1Y':252, '5Y':1260, 'MAX':2520 };

    function getPrefs() { try { return JSON.parse(localStorage.getItem('bb_chart_prefs') || '{}'); } catch { return {}; } }
    function savePrefs(p) { localStorage.setItem('bb_chart_prefs', JSON.stringify(p)); }
    function savePref(k,v) { const p = getPrefs(); p[k]=v; savePrefs(p); }

    function getTFDays(tf) {
        if (tf === 'YTD') { const n=new Date(); return Math.ceil((n - new Date(n.getFullYear(),0,1))/86400000); }
        return TF_DAYS[tf] || 252;
    }

    function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><span class="icon">📈</span><p>Enter a ticker to view chart</p></div>'; return; }
        const prefs = getPrefs();
        const defaultTF = prefs.timeframe || '1Y';
        const defaultType = prefs.chartType || 'candlestick';
        const defaultOverlays = prefs.overlays || [];
        const defaultInds = prefs.indicators || ['volume'];

        container.innerHTML = `
            <div class="gp-view" id="gp-root">
                <div class="gp-header">
                    <div class="gp-header-left">
                        <span class="gp-ticker-name">${ticker}</span>
                        <span class="gp-price-info" id="gp-price-info">Loading...</span>
                    </div>
                    <div class="gp-header-right">
                        <button class="btn-terminal btn-sm" id="gp-fullscreen-btn" title="Fullscreen">⬜</button>
                        <button class="btn-terminal btn-sm" id="gp-compare-btn" title="Compare">COMP</button>
                    </div>
                </div>
                <div class="gp-controls-row">
                    <div class="gp-timeframes">
                        ${['1D','5D','1M','3M','6M','YTD','1Y','5Y','MAX'].map(tf =>
                            '<button class="tf-btn'+(tf===defaultTF?' active':'')+'" data-tf="'+tf+'">'+tf+'</button>'
                        ).join('')}
                    </div>
                    <div class="gp-chart-type">
                        ${[['candlestick','🕯'],['line','📈'],['area','▦'],['bar','▥']].map(([t,icon]) =>
                            '<button class="ct-btn'+(t===defaultType?' active':'')+'" data-type="'+t+'" title="'+t+'">'+icon+'</button>'
                        ).join('')}
                    </div>
                </div>
                <div class="gp-overlays">
                    ${[['sma20','SMA 20','#4488ff'],['sma50','SMA 50','#ffaa00'],['sma200','SMA 200','#ff4444'],
                       ['ema12','EMA 12','#00cccc'],['ema26','EMA 26','#e879f9'],
                       ['bb','Bollinger','#6495ed'],['vwap','VWAP','#a855f7']
                    ].map(([id,label,color]) =>
                        '<label class="overlay-pill"><input type="checkbox" data-overlay="'+id+'" '+(defaultOverlays.includes(id)?'checked':'')+'><span class="pill-dot" style="background:'+color+'"></span>'+label+'</label>'
                    ).join('')}
                </div>
                <div class="gp-main-area">
                    <div class="gp-drawing-tools" id="gp-drawing-tools">
                        <button class="draw-btn" data-tool="trendline" title="Trendline">╱</button>
                        <button class="draw-btn" data-tool="hline" title="Horizontal Line">─</button>
                        <button class="draw-btn" data-tool="fib" title="Fibonacci">⊿</button>
                        <button class="draw-btn" data-tool="rect" title="Rectangle">▭</button>
                        <button class="draw-btn" data-tool="text" title="Text">T</button>
                        <div class="draw-sep"></div>
                        <button class="draw-btn draw-clear" data-tool="clear" title="Clear All">✕</button>
                    </div>
                    <div class="gp-chart-container">
                        <div class="gp-chart" id="gp-main-chart"></div>
                        <div class="gp-crosshair-info" id="gp-crosshair-info"></div>
                    </div>
                </div>
                <div class="gp-indicator-controls">
                    ${[['volume','VOL',true],['rsi','RSI(14)',false],['macd','MACD',false],['stoch','STOCH',false]].map(([id,label,def]) =>
                        '<label class="ind-pill"><input type="checkbox" data-ind="'+id+'" '+(defaultInds.includes(id)||def?'checked':'')+'> '+label+'</label>'
                    ).join('')}
                </div>
                <div class="gp-indicator-charts" id="gp-indicator-area"></div>
                <div class="gp-compare-bar" id="gp-compare-bar" style="display:none;">
                    <span style="color:var(--gray-light);font-size:10px;">COMPARE:</span>
                    <input type="text" class="gp-compare-input" id="gp-compare-input" placeholder="Add ticker...">
                    <div class="gp-compare-tags" id="gp-compare-tags"></div>
                </div>
            </div>`;

        const state = {
            ticker, chartType: defaultType, timeframe: defaultTF,
            ohlcv: null, chart: null, mainSeries: null,
            overlays: [], compareSeries: [], compareSymbols: [],
            indicatorCharts: [], activeTool: null, isFullscreen: false
        };

        state.ohlcv = DataService.generateOHLCV(ticker, getTFDays(defaultTF));
        buildMainChart(container, state);

        DataService.getQuote(ticker).then(data => {
            const info = container.querySelector('#gp-price-info');
            if (info && data) {
                const cls = (data.change||0) >= 0 ? 'positive' : 'negative';
                const arrow = (data.change||0) >= 0 ? '▲' : '▼';
                info.innerHTML = '<span style="font-size:16px;font-weight:700;color:var(--white)">$'+data.price.toFixed(2)+'</span> <span class="'+cls+'">'+arrow+' '+Math.abs(data.change||0).toFixed(2)+' ('+Math.abs(data.changePercent||0).toFixed(2)+'%)</span>';
            }
        });

        container.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.timeframe = btn.dataset.tf;
                state.ohlcv = DataService.generateOHLCV(ticker, getTFDays(btn.dataset.tf));
                buildMainChart(container, state);
                buildIndicators(container, state);
                savePref('timeframe', state.timeframe);
            });
        });

        container.querySelectorAll('.ct-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.ct-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.chartType = btn.dataset.type;
                buildMainChart(container, state);
                savePref('chartType', state.chartType);
            });
        });

        container.querySelectorAll('[data-overlay]').forEach(cb => {
            cb.addEventListener('change', () => {
                applyOverlays(container, state);
                savePref('overlays', [...container.querySelectorAll('[data-overlay]:checked')].map(c=>c.dataset.overlay));
            });
        });

        container.querySelectorAll('[data-ind]').forEach(cb => {
            cb.addEventListener('change', () => {
                buildIndicators(container, state);
                savePref('indicators', [...container.querySelectorAll('[data-ind]:checked')].map(c=>c.dataset.ind));
            });
        });

        container.querySelector('#gp-fullscreen-btn').addEventListener('click', () => toggleFullscreen(container, state));
        container.querySelector('#gp-main-chart').addEventListener('dblclick', () => toggleFullscreen(container, state));

        container.querySelector('#gp-compare-btn').addEventListener('click', () => {
            const bar = container.querySelector('#gp-compare-bar');
            bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
        });

        const compInput = container.querySelector('#gp-compare-input');
        compInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const sym = compInput.value.trim().toUpperCase();
                if (sym && !state.compareSymbols.includes(sym) && sym !== ticker) {
                    state.compareSymbols.push(sym);
                    addCompareOverlay(state, sym);
                    compInput.value = '';
                    updateCompareTags(container, state);
                }
            }
        });

        container.querySelectorAll('.draw-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tool === 'clear') {
                    container.querySelectorAll('.draw-btn').forEach(b => b.classList.remove('active'));
                    state.activeTool = null;
                    Terminal.notify('Drawings cleared', 'info');
                    return;
                }
                container.querySelectorAll('.draw-btn').forEach(b => b.classList.remove('active'));
                if (state.activeTool === btn.dataset.tool) { state.activeTool = null; }
                else { state.activeTool = btn.dataset.tool; btn.classList.add('active'); }
            });
        });

        buildIndicators(container, state);
        instances.set(ticker, state);
    }

    function buildMainChart(container, state) {
        const chartEl = container.querySelector('#gp-main-chart');
        if (!chartEl || typeof LightweightCharts === 'undefined') return;
        chartEl.innerHTML = '';
        const height = Math.max(300, Math.floor(chartEl.parentElement.clientHeight) || 400);
        const chart = LightweightCharts.createChart(chartEl, {
            width: chartEl.clientWidth, height: height,
            layout: { background: { color: '#0a0a0a' }, textColor: '#666', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 },
            grid: { vertLines: { color: '#161616' }, horzLines: { color: '#161616' } },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: '#ffaa0044', width: 1 }, horzLine: { color: '#ffaa0044', width: 1 } },
            rightPriceScale: { borderColor: '#222', scaleMargins: { top: 0.05, bottom: 0.05 } },
            timeScale: { borderColor: '#222', timeVisible: state.timeframe==='1D'||state.timeframe==='5D' },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        });

        let series;
        const data = state.ohlcv;
        switch (state.chartType) {
            case 'candlestick':
                series = chart.addCandlestickSeries({ upColor:'#22c55e', downColor:'#ff4444', borderUpColor:'#22c55e', borderDownColor:'#ff4444', wickUpColor:'#22c55e', wickDownColor:'#ff4444' });
                series.setData(data); break;
            case 'line':
                series = chart.addLineSeries({ color:'#ffaa00', lineWidth:2 });
                series.setData(data.map(d=>({time:d.time,value:d.close}))); break;
            case 'area':
                series = chart.addAreaSeries({ topColor:'rgba(255,170,0,0.25)', bottomColor:'rgba(255,170,0,0.0)', lineColor:'#ffaa00', lineWidth:2 });
                series.setData(data.map(d=>({time:d.time,value:d.close}))); break;
            case 'bar':
                series = chart.addBarSeries({ upColor:'#22c55e', downColor:'#ff4444' });
                series.setData(data); break;
            default:
                series = chart.addCandlestickSeries({ upColor:'#22c55e', downColor:'#ff4444', borderUpColor:'#22c55e', borderDownColor:'#ff4444', wickUpColor:'#22c55e', wickDownColor:'#ff4444' });
                series.setData(data);
        }
        chart.timeScale().fitContent();

        const crosshairInfo = container.querySelector('#gp-crosshair-info');
        chart.subscribeCrosshairMove(param => {
            if (!param.time || !crosshairInfo) { if(crosshairInfo) crosshairInfo.style.display='none'; return; }
            const bar = data.find(d => d.time === param.time);
            if (!bar) { crosshairInfo.style.display='none'; return; }
            const dt = new Date(bar.time * 1000);
            crosshairInfo.style.display = 'flex';
            crosshairInfo.innerHTML = '<span>'+dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+'</span>' +
                '<span>O <span style="color:var(--white)">'+bar.open.toFixed(2)+'</span></span>' +
                '<span>H <span style="color:var(--green)">'+bar.high.toFixed(2)+'</span></span>' +
                '<span>L <span style="color:var(--red)">'+bar.low.toFixed(2)+'</span></span>' +
                '<span>C <span style="color:var(--amber)">'+bar.close.toFixed(2)+'</span></span>' +
                '<span>V <span style="color:var(--cyan)">'+(bar.volume/1e6).toFixed(1)+'M</span></span>';
        });

        state.chart = chart; state.mainSeries = series; state.overlays = []; state.compareSeries = [];
        new ResizeObserver(() => { if(chartEl.clientWidth>0) chart.applyOptions({width:chartEl.clientWidth}); }).observe(chartEl);
        applyOverlays(container, state);
        state.compareSymbols.forEach(sym => addCompareOverlay(state, sym));
    }

    function applyOverlays(container, state) {
        if (!state.chart) return;
        state.overlays.forEach(s => { try{state.chart.removeSeries(s);}catch(e){} });
        state.overlays = [];
        const checked = [...container.querySelectorAll('[data-overlay]:checked')].map(c=>c.dataset.overlay);
        const data = state.ohlcv;
        checked.forEach(ov => {
            switch(ov) {
                case 'sma20': addOvLine(state, DataService.calcSMA(data,20), '#4488ff'); break;
                case 'sma50': addOvLine(state, DataService.calcSMA(data,50), '#ffaa00'); break;
                case 'sma200': addOvLine(state, DataService.calcSMA(data,200), '#ff4444'); break;
                case 'ema12': addOvLine(state, DataService.calcEMA(data,12), '#00cccc'); break;
                case 'ema26': addOvLine(state, DataService.calcEMA(data,26), '#e879f9'); break;
                case 'bb': {
                    const bb = DataService.calcBollingerBands(data);
                    addOvLine(state, bb.upper, 'rgba(100,149,237,0.5)');
                    addOvLine(state, bb.lower, 'rgba(100,149,237,0.5)');
                    addOvLine(state, bb.middle, 'rgba(100,149,237,0.3)');
                    break;
                }
                case 'vwap': addOvLine(state, calcVWAP(data), '#a855f7'); break;
            }
        });
    }

    function addOvLine(state, data, color) {
        const s = state.chart.addLineSeries({ color, lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        s.setData(data); state.overlays.push(s);
    }

    function calcVWAP(data) {
        const r=[]; let cv=0,ct=0;
        for(let i=0;i<data.length;i++){const tp=(data[i].high+data[i].low+data[i].close)/3;cv+=data[i].volume;ct+=tp*data[i].volume;r.push({time:data[i].time,value:+(ct/cv).toFixed(2)});}
        return r;
    }

    function calcStochastic(data, kP=14, dP=3, sm=3) {
        const kRaw=[];
        for(let i=kP-1;i<data.length;i++){let hi=-Infinity,lo=Infinity;for(let j=0;j<kP;j++){hi=Math.max(hi,data[i-j].high);lo=Math.min(lo,data[i-j].low);}
        kRaw.push({time:data[i].time,value:+(hi===lo?50:((data[i].close-lo)/(hi-lo))*100).toFixed(2)});}
        const kS=smaArr(kRaw,sm),dS=smaArr(kS,dP);return{k:kS,d:dS};
    }

    function smaArr(arr,p){const r=[];for(let i=p-1;i<arr.length;i++){let s=0;for(let j=0;j<p;j++)s+=arr[i-j].value;r.push({time:arr[i].time,value:+(s/p).toFixed(2)});}return r;}

    function addCompareOverlay(state, symbol) {
        if (!state.chart) return;
        const compData = DataService.generateOHLCV(symbol, getTFDays(state.timeframe));
        const basePrice = state.ohlcv[0]?.close||1, compBase = compData[0]?.close||1;
        const normalized = compData.map(d=>({time:d.time,value:+((d.close/compBase)*basePrice).toFixed(2)}));
        const ci = state.compareSeries.length % COLORS.compare.length;
        const s = state.chart.addLineSeries({ color:COLORS.compare[ci], lineWidth:2, priceLineVisible:false, lastValueVisible:true, title:symbol });
        s.setData(normalized);
        state.compareSeries.push({symbol, series:s});
    }

    function updateCompareTags(container, state) {
        const el = container.querySelector('#gp-compare-tags'); if(!el) return;
        el.innerHTML = state.compareSymbols.map((s,i)=>
            '<span class="compare-tag" style="color:'+COLORS.compare[i%COLORS.compare.length]+'">'+s+' <span class="compare-tag-x" data-sym="'+s+'">×</span></span>'
        ).join('');
        el.querySelectorAll('.compare-tag-x').forEach(x=>{
            x.addEventListener('click',()=>{
                const sym=x.dataset.sym;
                state.compareSymbols=state.compareSymbols.filter(s=>s!==sym);
                const cs=state.compareSeries.find(c=>c.symbol===sym);
                if(cs){try{state.chart.removeSeries(cs.series);}catch(e){}}
                state.compareSeries=state.compareSeries.filter(c=>c.symbol!==sym);
                updateCompareTags(container,state);
            });
        });
    }

    function buildIndicators(container, state) {
        const area = container.querySelector('#gp-indicator-area'); if(!area) return;
        area.innerHTML = '';
        const checked = [...container.querySelectorAll('[data-ind]:checked')].map(c=>c.dataset.ind);
        const data = state.ohlcv;
        state.indicatorCharts = [];

        if (checked.includes('volume')) {
            mkIndChart(area, 'VOLUME', 80, (chart)=>{
                const vs = chart.addHistogramSeries({color:'#26a69a',priceFormat:{type:'volume'},priceScaleId:''});
                vs.setData(data.map(d=>({time:d.time,value:d.volume,color:d.close>=d.open?'rgba(34,197,94,0.5)':'rgba(255,68,68,0.5)'})));
            }, state);
        }
        if (checked.includes('rsi')) {
            const rsi = DataService.calcRSI(data, 14);
            mkIndChart(area, 'RSI(14)', 80, (chart)=>{
                chart.addLineSeries({color:'#9b59b6',lineWidth:1.5,priceScaleId:'rsi'}).setData(rsi);
                chart.addLineSeries({color:'#ff444444',lineWidth:1,lineStyle:2,priceScaleId:'rsi',priceLineVisible:false,lastValueVisible:false}).setData(rsi.map(d=>({time:d.time,value:70})));
                chart.addLineSeries({color:'#22c55e44',lineWidth:1,lineStyle:2,priceScaleId:'rsi',priceLineVisible:false,lastValueVisible:false}).setData(rsi.map(d=>({time:d.time,value:30})));
            }, state);
        }
        if (checked.includes('macd')) {
            const m = DataService.calcMACD(data);
            mkIndChart(area, 'MACD(12,26,9)', 80, (chart)=>{
                chart.addHistogramSeries({priceFormat:{type:'price'},priceScaleId:'macd'}).setData(m.histogram);
                chart.addLineSeries({color:'#4488ff',lineWidth:1.5,priceScaleId:'macd'}).setData(m.macd);
                chart.addLineSeries({color:'#ff8800',lineWidth:1,priceScaleId:'macd'}).setData(m.signal);
            }, state);
        }
        if (checked.includes('stoch')) {
            const st = calcStochastic(data);
            mkIndChart(area, 'STOCH(14,3,3)', 80, (chart)=>{
                chart.addLineSeries({color:'#4488ff',lineWidth:1.5,priceScaleId:'st'}).setData(st.k);
                chart.addLineSeries({color:'#ff8800',lineWidth:1,priceScaleId:'st'}).setData(st.d);
                chart.addLineSeries({color:'#ff444444',lineWidth:1,lineStyle:2,priceScaleId:'st',priceLineVisible:false,lastValueVisible:false}).setData(st.k.map(d=>({time:d.time,value:80})));
                chart.addLineSeries({color:'#22c55e44',lineWidth:1,lineStyle:2,priceScaleId:'st',priceLineVisible:false,lastValueVisible:false}).setData(st.k.map(d=>({time:d.time,value:20})));
            }, state);
        }
    }

    function mkIndChart(area, label, height, setupFn, state) {
        const wrap = document.createElement('div');
        wrap.className = 'gp-ind-panel';
        wrap.innerHTML = '<div class="gp-ind-label">'+label+'</div><div class="gp-ind-chart"></div>';
        area.appendChild(wrap);
        const div = wrap.querySelector('.gp-ind-chart');
        div.style.height = height+'px';
        const chart = LightweightCharts.createChart(div, {
            width: div.clientWidth||area.clientWidth, height: height,
            layout:{background:{color:'#0a0a0a'},textColor:'#555',fontFamily:"'JetBrains Mono',monospace",fontSize:9},
            grid:{vertLines:{color:'#111'},horzLines:{color:'#111'}},
            rightPriceScale:{borderColor:'#222'},timeScale:{visible:false},
            handleScroll:false, handleScale:false,
        });
        setupFn(chart);
        chart.timeScale().fitContent();
        if(state.chart){state.chart.timeScale().subscribeVisibleLogicalRangeChange(range=>{if(range)chart.timeScale().setVisibleLogicalRange(range);});}
        new ResizeObserver(()=>{if(div.clientWidth>0)chart.applyOptions({width:div.clientWidth});}).observe(div);
        state.indicatorCharts.push(chart);
    }

    function toggleFullscreen(container, state) {
        const root = container.querySelector('#gp-root'); if(!root) return;
        state.isFullscreen = !state.isFullscreen;
        root.classList.toggle('gp-fullscreen', state.isFullscreen);
        setTimeout(()=>{
            if(state.chart){const el=container.querySelector('#gp-main-chart');if(el)state.chart.applyOptions({width:el.clientWidth});}
        },100);
    }

    return { render, instances };
})();
