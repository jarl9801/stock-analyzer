// ============================================
// COMPARE.JS — Side-by-side security comparison
// ============================================

const Compare = (() => {
    const SECTOR_PRESETS = {
        'Tech Giants': ['AAPL','MSFT','GOOGL','AMZN','META'],
        'Chip Wars': ['NVDA','AMD','INTC','AVGO','QCOM'],
        'Banks': ['JPM','BAC','WFC','GS','MS'],
        'Energy': ['XOM','CVX','COP','EOG','SLB'],
        'Healthcare': ['JNJ','UNH','LLY','PFE','ABT'],
    };

    function render(container, ticker) {
        const tickers = ticker ? ticker.split(/[\s,]+/).filter(Boolean) : [];
        container.innerHTML = `
            <div class="comp-view">
                <div class="section-header">COMPARE SECURITIES</div>
                <div class="comp-inputs" style="display:flex;gap:6px;align-items:center;margin:8px 0;">
                    <input type="text" class="comp-ticker" placeholder="Ticker 1" value="${tickers[0]||''}">
                    <span class="comp-vs">vs</span>
                    <input type="text" class="comp-ticker" placeholder="Ticker 2" value="${tickers[1]||''}">
                    <input type="text" class="comp-ticker" placeholder="Ticker 3" value="${tickers[2]||''}">
                    <input type="text" class="comp-ticker" placeholder="Ticker 4" value="${tickers[3]||''}">
                    <input type="text" class="comp-ticker" placeholder="Ticker 5" value="${tickers[4]||''}">
                    <button class="btn-terminal" id="comp-run-btn">COMPARE</button>
                </div>
                <div class="comp-presets" style="display:flex;gap:4px;margin-bottom:8px;">
                    ${Object.keys(SECTOR_PRESETS).map(k => '<button class="btn-terminal btn-sm comp-preset" data-preset="'+k+'">'+k+'</button>').join('')}
                </div>
                <div class="comp-chart" id="comp-chart-area" style="min-height:350px;background:var(--bg-card);border:1px solid var(--border);"></div>
                <div id="comp-corr" style="margin-top:8px;"></div>
                <div class="comp-table" id="comp-table-area" style="margin-top:8px;"></div>
            </div>`;

        container.querySelector('#comp-run-btn').addEventListener('click', () => runFromInputs(container));
        container.querySelectorAll('.comp-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const syms = SECTOR_PRESETS[btn.dataset.preset];
                const inputs = container.querySelectorAll('.comp-ticker');
                syms.forEach((s,i) => { if(inputs[i]) inputs[i].value = s; });
                runFromInputs(container);
            });
        });

        if (tickers.length >= 2) setTimeout(() => runFromInputs(container), 50);
    }

    function runFromInputs(container) {
        const syms = [...container.querySelectorAll('.comp-ticker')].map(i=>i.value.toUpperCase().trim()).filter(Boolean);
        if (syms.length < 2) { Terminal.notify('Enter at least 2 tickers','error'); return; }
        runCompare(container, syms);
    }

    async function runCompare(container, tickers) {
        const chartArea = container.querySelector('#comp-chart-area');
        const tableArea = container.querySelector('#comp-table-area');
        const corrArea = container.querySelector('#comp-corr');
        chartArea.innerHTML = '';
        const colors = ['#ffaa00','#4488ff','#22c55e','#ff4444','#9b59b6'];

        const chart = LightweightCharts.createChart(chartArea, {
            width: chartArea.clientWidth, height: 350,
            layout:{background:{color:'#0a0a0a'},textColor:'#666',fontFamily:"'JetBrains Mono',monospace"},
            grid:{vertLines:{color:'#161616'},horzLines:{color:'#161616'}},
            rightPriceScale:{borderColor:'#222',mode:LightweightCharts.PriceScaleMode.Percentage},
            timeScale:{borderColor:'#222'},
        });

        const allData = [];
        tickers.forEach((ticker,i) => {
            const data = DataService.generateOHLCV(ticker, 252);
            allData.push(data);
            const base = data[0].close;
            const norm = data.map(d=>({time:d.time,value:((d.close-base)/base)*100}));
            chart.addLineSeries({color:colors[i%colors.length],lineWidth:2,title:ticker}).setData(norm);
        });
        chart.timeScale().fitContent();
        new ResizeObserver(()=>chart.applyOptions({width:chartArea.clientWidth})).observe(chartArea);

        // Correlation matrix
        if (allData.length >= 2 && corrArea) {
            let html = '<div class="section-header">CORRELATION MATRIX</div><table class="terminal-table"><thead><tr><th></th>'+tickers.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>';
            for (let i=0;i<tickers.length;i++) {
                html += '<tr><td style="color:var(--amber)">'+tickers[i]+'</td>';
                for (let j=0;j<tickers.length;j++) {
                    const corr = calcCorrelation(allData[i].map(d=>d.close), allData[j].map(d=>d.close));
                    const cls = corr > 0.7 ? 'positive' : corr < -0.3 ? 'negative' : '';
                    html += '<td class="'+cls+'">'+corr.toFixed(3)+'</td>';
                }
                html += '</tr>';
            }
            html += '</tbody></table>';
            corrArea.innerHTML = html;
        }

        // Comparison table
        const quotes = await DataService.getMultipleQuotes(tickers);
        let tableHtml = '<table class="terminal-table"><thead><tr><th>METRIC</th>'+tickers.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>';
        const metrics = [['price','Price'],['pe','P/E'],['pb','P/B'],['eps','EPS'],['dividend','Dividend'],['beta','Beta'],['marketCap','Market Cap']];
        for (const [m,label] of metrics) {
            tableHtml += '<tr><td style="color:var(--amber)">'+label+'</td>';
            for (const q of quotes) {
                let val = q ? q[m] : '--';
                if (m==='price'&&val) val='$'+val.toFixed(2);
                else if (m==='marketCap'&&val) val='$'+(val/1e9).toFixed(1)+'B';
                else if (val&&typeof val==='number') val=val.toFixed(2);
                tableHtml += '<td>'+(val||'--')+'</td>';
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        tableArea.innerHTML = tableHtml;
    }

    function calcCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n < 2) return 0;
        let sx=0,sy=0,sxy=0,sx2=0,sy2=0;
        for(let i=0;i<n;i++){sx+=x[i];sy+=y[i];sxy+=x[i]*y[i];sx2+=x[i]*x[i];sy2+=y[i]*y[i];}
        const num=n*sxy-sx*sy;
        const den=Math.sqrt((n*sx2-sx*sx)*(n*sy2-sy*sy));
        return den===0?0:num/den;
    }

    return { render };
})();
