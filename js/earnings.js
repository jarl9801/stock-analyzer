// ============================================
// EARNINGS.JS — Earnings analysis view
// ============================================

const Earnings = (() => {
    async function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><span class="icon">📊</span><p>Enter a ticker for earnings data (ERN AAPL)</p></div>'; return; }
        const data = await DataService.getQuote(ticker);

        // Generate earnings history
        const quarters = [];
        for (let i = 7; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i*3);
            const qLabel = 'Q'+Math.ceil((d.getMonth()+1)/3)+' '+d.getFullYear();
            const estEPS = data.eps/4 * (0.9 + Math.random()*0.2);
            const actEPS = estEPS * (0.95 + Math.random()*0.15);
            const surprise = ((actEPS - estEPS) / Math.abs(estEPS)) * 100;
            const estRev = (data.price * 1e6) * (0.9 + Math.random()*0.2);
            const actRev = estRev * (0.97 + Math.random()*0.08);
            quarters.push({ quarter:qLabel, estEPS:estEPS.toFixed(2), actEPS:actEPS.toFixed(2), surprise:surprise.toFixed(1),
                estRev:(estRev/1e9).toFixed(2), actRev:(actRev/1e9).toFixed(2), revSurprise:(((actRev-estRev)/estRev)*100).toFixed(1), date:new Date(d) });
        }

        // Upcoming earnings (simulated)
        const upcoming = [];
        for (let i = 1; i <= 5; i++) {
            const d = new Date(); d.setDate(d.getDate()+i*7+Math.floor(Math.random()*5));
            const tickers = ['AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','JPM'];
            upcoming.push({ ticker: tickers[i%tickers.length], date: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), time: Math.random()>0.5?'BMO':'AMC' });
        }

        container.innerHTML = `
            <div class="ern-view">
                <div class="section-header">${ticker} — EARNINGS</div>
                <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:8px;">
                    <div class="card">
                        <div class="section-header">EARNINGS HISTORY — EPS</div>
                        <table class="terminal-table">
                            <thead><tr><th>QUARTER</th><th>EST EPS</th><th>ACT EPS</th><th>SURPRISE</th><th>EST REV</th><th>ACT REV</th><th>REV SURP</th></tr></thead>
                            <tbody>${quarters.map(q => {
                                const epsCls = parseFloat(q.surprise)>=0?'positive':'negative';
                                const revCls = parseFloat(q.revSurprise)>=0?'positive':'negative';
                                return '<tr><td>'+q.quarter+'</td><td>$'+q.estEPS+'</td><td>$'+q.actEPS+'</td><td class="'+epsCls+'">'+(parseFloat(q.surprise)>=0?'+':'')+q.surprise+'%</td><td>$'+q.estRev+'B</td><td>$'+q.actRev+'B</td><td class="'+revCls+'">'+(parseFloat(q.revSurprise)>=0?'+':'')+q.revSurprise+'%</td></tr>';
                            }).join('')}</tbody>
                        </table>
                    </div>
                    <div class="card">
                        <div class="section-header">UPCOMING EARNINGS</div>
                        <table class="terminal-table">
                            <thead><tr><th>TICKER</th><th>DATE</th><th>TIME</th></tr></thead>
                            <tbody>${upcoming.map(u =>
                                '<tr><td style="color:var(--amber);cursor:pointer" onclick="CommandBar.execute(\''+u.ticker+' ERN\')">'+u.ticker+'</td><td>'+u.date+'</td><td>'+u.time+'</td></tr>'
                            ).join('')}</tbody>
                        </table>
                    </div>
                    <div class="card">
                        <div class="section-header">EPS TREND</div>
                        <div id="ern-eps-chart" style="height:180px;"></div>
                    </div>
                    <div class="card">
                        <div class="section-header">PRICE REACTION (±5 DAYS)</div>
                        <div id="ern-reaction-chart" style="height:180px;"></div>
                    </div>
                </div>
            </div>`;

        if (typeof LightweightCharts !== 'undefined') {
            // EPS chart
            const el = container.querySelector('#ern-eps-chart');
            const chart = LightweightCharts.createChart(el, {
                width:el.clientWidth, height:180,
                layout:{background:{color:'#0a0a0a'},textColor:'#555',fontFamily:"'JetBrains Mono',monospace",fontSize:9},
                grid:{vertLines:{color:'#111'},horzLines:{color:'#111'}}, rightPriceScale:{borderColor:'#222'}, timeScale:{borderColor:'#222'},
            });
            // Estimate bars
            const estS = chart.addHistogramSeries({color:'rgba(255,170,0,0.3)',priceScaleId:'eps'});
            const actS = chart.addHistogramSeries({color:'#22c55e',priceScaleId:'eps'});
            estS.setData(quarters.map((q,i)=>{const d=new Date(q.date);return{time:Math.floor(d.getTime()/1000)-86400,value:parseFloat(q.estEPS)};}));
            actS.setData(quarters.map(q=>({time:Math.floor(q.date.getTime()/1000),value:parseFloat(q.actEPS),color:parseFloat(q.surprise)>=0?'#22c55e':'#ff4444'})));
            chart.timeScale().fitContent();

            // Price reaction chart
            const el2 = container.querySelector('#ern-reaction-chart');
            const chart2 = LightweightCharts.createChart(el2, {
                width:el2.clientWidth, height:180,
                layout:{background:{color:'#0a0a0a'},textColor:'#555',fontFamily:"'JetBrains Mono',monospace",fontSize:9},
                grid:{vertLines:{color:'#111'},horzLines:{color:'#111'}}, rightPriceScale:{borderColor:'#222'}, timeScale:{borderColor:'#222'},
            });
            // Simulated ±5 day price reaction around last earnings
            const reactionData = [];
            let rPrice = data.price * 0.98;
            for (let d = -5; d <= 5; d++) {
                const dt = new Date(); dt.setDate(dt.getDate()+d-30);
                const change = d === 0 ? (Math.random()-0.3)*0.05 : (Math.random()-0.5)*0.015;
                rPrice *= (1+change);
                reactionData.push({time:Math.floor(dt.getTime()/1000), value:+rPrice.toFixed(2)});
            }
            const rs = chart2.addAreaSeries({topColor:'rgba(34,197,94,0.2)',bottomColor:'rgba(34,197,94,0.0)',lineColor:'#22c55e',lineWidth:2});
            rs.setData(reactionData);
            chart2.timeScale().fitContent();
        }
    }

    return { render };
})();
