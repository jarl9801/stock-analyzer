// ============================================
// DIVIDENDS.JS — Dividend analysis view
// ============================================

const Dividends = (() => {
    async function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><span class="icon">💰</span><p>Enter a ticker for dividend analysis (DVD AAPL)</p></div>'; return; }
        const data = await DataService.getQuote(ticker);
        const divYield = data.dividend > 0 ? ((data.dividend / data.price) * 100).toFixed(2) : '0.00';
        const payoutRatio = data.eps > 0 ? ((data.dividend / data.eps) * 100).toFixed(1) : 'N/A';

        // Generate dividend history
        const divHistory = [];
        const annualDivs = [];
        for (let y = 0; y < 5; y++) {
            let annualTotal = 0;
            for (let q = 0; q < 4; q++) {
                const d = new Date(); d.setFullYear(d.getFullYear()-(4-y)); d.setMonth(q*3+1);
                const growth = 1 + y * 0.035 + (Math.random()-0.5)*0.02;
                const amt = (data.dividend/4) * growth;
                annualTotal += amt;
                divHistory.push({ date: d.toLocaleDateString('en-US',{month:'short',year:'numeric'}), amount: amt.toFixed(4), exDate: new Date(d.getTime()-14*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}), yieldEst: (amt*4/data.price*100).toFixed(2) });
            }
            annualDivs.push({ year: new Date().getFullYear()-(4-y), total: annualTotal });
        }

        container.innerHTML = `
            <div class="dvd-view">
                <div class="section-header">${ticker} — DIVIDEND ANALYSIS</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                    <div class="card">
                        <div class="section-header">DIVIDEND SUMMARY</div>
                        <div class="stat-item"><span class="stat-label">Annual Dividend</span><span class="stat-value">$${data.dividend.toFixed(2)}</span></div>
                        <div class="stat-item"><span class="stat-label">Dividend Yield</span><span class="stat-value ${parseFloat(divYield)>0?'positive':''}">${divYield}%</span></div>
                        <div class="stat-item"><span class="stat-label">Payout Ratio</span><span class="stat-value">${payoutRatio}${payoutRatio!=='N/A'?'%':''}</span></div>
                        <div class="stat-item"><span class="stat-label">Pay Frequency</span><span class="stat-value">Quarterly</span></div>
                        <div class="stat-item"><span class="stat-label">5Y Div Growth</span><span class="stat-value positive">${(annualDivs.length>=2?((annualDivs[4].total/annualDivs[0].total-1)*100).toFixed(1):'--')}%</span></div>
                        <div class="stat-item"><span class="stat-label">Consecutive Years</span><span class="stat-value">${Math.floor(5+Math.random()*20)}</span></div>
                    </div>
                    <div class="card">
                        <div class="section-header">ANNUAL DIVIDEND GROWTH</div>
                        <div id="dvd-growth-chart" style="height:180px;"></div>
                    </div>
                    <div class="card" style="grid-column:1/-1;">
                        <div class="section-header">DIVIDEND HISTORY</div>
                        <table class="terminal-table">
                            <thead><tr><th>DATE</th><th>EX-DATE</th><th>AMOUNT</th><th>YIELD (ANN.)</th></tr></thead>
                            <tbody>${divHistory.reverse().map(d =>
                                '<tr><td>'+d.date+'</td><td>'+d.exDate+'</td><td>$'+d.amount+'</td><td>'+d.yieldEst+'%</td></tr>'
                            ).join('')}</tbody>
                        </table>
                    </div>
                    <div class="card" style="grid-column:1/-1;">
                        <div class="section-header">PAYOUT RATIO TREND</div>
                        <div id="dvd-payout-chart" style="height:140px;"></div>
                    </div>
                </div>
            </div>`;

        // Growth chart
        if (typeof LightweightCharts !== 'undefined') {
            const el = container.querySelector('#dvd-growth-chart');
            const chart = LightweightCharts.createChart(el, {
                width:el.clientWidth, height:180,
                layout:{background:{color:'#0a0a0a'},textColor:'#555',fontFamily:"'JetBrains Mono',monospace",fontSize:9},
                grid:{vertLines:{color:'#111'},horzLines:{color:'#111'}}, rightPriceScale:{borderColor:'#222'}, timeScale:{borderColor:'#222'},
            });
            const s = chart.addHistogramSeries({color:'#22c55e'});
            s.setData(annualDivs.map(d => ({ time: d.year+'-06-15', value: +d.total.toFixed(4) })));
            chart.timeScale().fitContent();

            // Payout ratio chart
            const el2 = container.querySelector('#dvd-payout-chart');
            const chart2 = LightweightCharts.createChart(el2, {
                width:el2.clientWidth, height:140,
                layout:{background:{color:'#0a0a0a'},textColor:'#555',fontFamily:"'JetBrains Mono',monospace",fontSize:9},
                grid:{vertLines:{color:'#111'},horzLines:{color:'#111'}}, rightPriceScale:{borderColor:'#222'}, timeScale:{borderColor:'#222'},
            });
            const ps = chart2.addLineSeries({color:'#ffaa00',lineWidth:2});
            ps.setData(annualDivs.map(d => ({ time: d.year+'-06-15', value: +(d.total/data.eps*100).toFixed(1) })));
            chart2.timeScale().fitContent();
        }
    }

    return { render };
})();
