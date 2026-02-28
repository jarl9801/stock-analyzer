// ============================================
// FINANCIALS.JS — FA (Financial Analysis)
// ============================================

const Financials = (() => {
    async function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><p>Enter a ticker for financials</p></div>'; return; }

        const data = await DataService.getQuote(ticker);
        const rev = data.revenue || 0;

        container.innerHTML = `
            <div class="fa-view">
                <div class="fa-header">
                    <h2 class="fa-title" style="color:var(--white);font-size:14px;">${ticker} — FINANCIAL ANALYSIS</h2>
                    <div class="fa-tabs" id="fa-tabs">
                        <button class="fa-tab active" data-stmt="income">Income Statement</button>
                        <button class="fa-tab" data-stmt="balance">Balance Sheet</button>
                        <button class="fa-tab" data-stmt="cashflow">Cash Flow</button>
                        <button class="fa-tab" data-stmt="ratios">Key Ratios</button>
                    </div>
                </div>
                <div class="fa-content" id="fa-content"></div>
            </div>`;

        // Tab switching
        container.querySelectorAll('.fa-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.fa-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderStatement(container.querySelector('#fa-content'), data, tab.dataset.stmt);
            });
        });

        renderStatement(container.querySelector('#fa-content'), data, 'income');
    }

    function renderStatement(contentEl, data, type) {
        const years = [2022, 2023, 2024, 2025];
        const rev = data.revenue || 100e9;

        if (type === 'income') {
            const rows = generateIncomeData(rev, years);
            contentEl.innerHTML = renderTable('INCOME STATEMENT ($ Millions)', years, rows);
        } else if (type === 'balance') {
            const rows = generateBalanceData(data, years);
            contentEl.innerHTML = renderTable('BALANCE SHEET ($ Millions)', years, rows);
        } else if (type === 'cashflow') {
            const rows = generateCashFlowData(data, years);
            contentEl.innerHTML = renderTable('CASH FLOW STATEMENT ($ Millions)', years, rows);
        } else if (type === 'ratios') {
            contentEl.innerHTML = renderRatios(data);
        }
    }

    function generateIncomeData(rev, years) {
        return years.map((y, i) => {
            const growth = 1 + i * 0.08;
            const r = rev * growth;
            const cogs = r * 0.58;
            const gross = r - cogs;
            const opex = r * 0.22;
            const ebit = gross - opex;
            const interest = r * 0.01;
            const ebt = ebit - interest;
            const tax = ebt * 0.21;
            const net = ebt - tax;
            return {
                year: y,
                'Revenue': r, 'COGS': -cogs, 'Gross Profit': gross,
                'Operating Expenses': -opex, 'EBIT': ebit,
                'Interest': -interest, 'EBT': ebt,
                'Tax': -tax, 'Net Income': net,
                'Gross Margin': (gross/r*100), 'Operating Margin': (ebit/r*100), 'Net Margin': (net/r*100)
            };
        });
    }

    function generateBalanceData(data, years) {
        return years.map((y, i) => {
            const g = 1 + i * 0.06;
            return {
                year: y,
                'Cash & Equivalents': (data.cash||50e9)*g, 'Total Current Assets': (data.cash||50e9)*g*1.8,
                'PP&E': (data.marketCap||100e9)*0.1*g, 'Total Assets': (data.marketCap||100e9)*0.4*g,
                'Current Liabilities': (data.debt||20e9)*0.3*g, 'Long-Term Debt': (data.debt||20e9)*g,
                'Total Liabilities': (data.debt||20e9)*1.5*g,
                'Shareholders Equity': ((data.bookValue||20)*(data.shares||1e9))*g,
            };
        });
    }

    function generateCashFlowData(data, years) {
        return years.map((y, i) => {
            const g = 1 + i * 0.07;
            const fcf = (data.fcf || 10e9) * g;
            return {
                year: y,
                'Net Income': (data.eps||5)*(data.shares||1e9)*g*0.9,
                'Depreciation': (data.revenue||100e9)*0.04*g,
                'Cash from Operations': fcf * 1.3,
                'CapEx': -fcf * 0.3,
                'Free Cash Flow': fcf,
                'Dividends Paid': -(data.dividend||0)*(data.shares||1e9)*g,
                'Stock Buybacks': -fcf * 0.4,
            };
        });
    }

    function renderTable(title, years, rows) {
        const keys = Object.keys(rows[0]).filter(k => k !== 'year');
        const pctKeys = ['Gross Margin', 'Operating Margin', 'Net Margin'];

        let html = `<div class="section-header">${title}</div>
            <table class="terminal-table"><thead><tr><th>ITEM</th>${years.map(y => `<th style="text-align:right">${y}</th>`).join('')}<th style="text-align:right">YoY%</th></tr></thead><tbody>`;

        keys.forEach(key => {
            const isPct = pctKeys.includes(key);
            const isNeg = rows[0][key] < 0;
            html += `<tr><td style="color:${isNeg ? 'var(--red-dim)' : 'var(--gray-light)'}">${key}</td>`;
            rows.forEach((r, i) => {
                const val = r[key];
                if (isPct) {
                    html += `<td style="text-align:right;color:var(--cyan)">${val.toFixed(1)}%</td>`;
                } else {
                    const formatted = val < 0 ? `(${Math.abs(val/1e6).toFixed(0)})` : (val/1e6).toFixed(0);
                    html += `<td style="text-align:right;color:${val < 0 ? 'var(--red)' : 'var(--white)'}">${formatted}</td>`;
                }
            });
            // YoY growth
            if (!isPct && rows.length >= 2) {
                const last = rows[rows.length-1][key];
                const prev = rows[rows.length-2][key];
                const yoy = prev !== 0 ? ((last - prev) / Math.abs(prev) * 100).toFixed(1) : '--';
                const cls = parseFloat(yoy) >= 0 ? 'positive' : 'negative';
                html += `<td style="text-align:right" class="${cls}">${yoy !== '--' ? (parseFloat(yoy)>=0?'+':'') + yoy + '%' : '--'}</td>`;
            } else {
                html += '<td></td>';
            }
            html += '</tr>';
        });

        html += '</tbody></table>';
        return html;
    }

    function renderRatios(data) {
        const ratios = [
            { category: 'VALUATION', items: [
                ['P/E Ratio', data.pe ? data.pe.toFixed(1) : 'N/A'],
                ['P/B Ratio', data.pb ? data.pb.toFixed(1) : 'N/A'],
                ['P/FCF', data.fcf > 0 ? (data.marketCap/data.fcf).toFixed(1) : 'N/A'],
                ['EV/Revenue', data.revenue > 0 ? (((data.marketCap+(data.debt||0)-(data.cash||0))/data.revenue)).toFixed(1) : 'N/A'],
                ['EV/EBITDA', data.revenue > 0 ? (((data.marketCap+(data.debt||0)-(data.cash||0))/(data.revenue*0.2))).toFixed(1) : 'N/A'],
            ]},
            { category: 'PROFITABILITY', items: [
                ['ROE', data.bookValue > 0 ? ((data.eps/data.bookValue)*100).toFixed(1)+'%' : 'N/A'],
                ['ROA', ((data.eps*(data.shares||1e9))/(data.marketCap*0.4)*100).toFixed(1)+'%'],
                ['Net Margin', data.revenue > 0 ? ((data.eps*(data.shares||1e9))/data.revenue*100).toFixed(1)+'%' : 'N/A'],
                ['FCF Margin', data.revenue > 0 && data.fcf > 0 ? ((data.fcf/data.revenue)*100).toFixed(1)+'%' : 'N/A'],
            ]},
            { category: 'LEVERAGE', items: [
                ['Debt/Equity', data.bookValue > 0 ? ((data.debt||0)/((data.bookValue)*(data.shares||1e9))).toFixed(2) : 'N/A'],
                ['Current Ratio', ((data.cash||0)/((data.debt||1)*0.3)).toFixed(2)],
                ['Interest Coverage', 'N/A'],
            ]},
        ];

        let html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">';
        ratios.forEach(cat => {
            html += `<div class="card"><div class="section-header">${cat.category}</div>`;
            cat.items.forEach(([label, val]) => {
                html += `<div class="stat-item"><span class="stat-label">${label}</span><span class="stat-value">${val}</span></div>`;
            });
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    return { render };
})();
