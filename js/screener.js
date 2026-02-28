// ============================================
// SCREENER.JS — Enhanced Stock Screener
// ============================================

const Screener = (() => {
    const presets = {
        'most-active': { label: 'MOST ACTIVE', sort: 'volume', desc: true },
        'gainers': { label: 'TOP GAINERS', sort: 'change', desc: true },
        'losers': { label: 'TOP LOSERS', sort: 'change', desc: false },
        '52w-high': { label: '52W HIGHS', sort: 'nearHigh', desc: true },
        '52w-low': { label: '52W LOWS', sort: 'nearLow', desc: true },
        'custom': { label: 'CUSTOM SCREEN', sort: 'marketCap', desc: true },
    };

    function render(container, preset) {
        preset = preset || 'custom';

        container.innerHTML = `
            <div class="scan-view">
                <div class="scan-header">
                    <h2>STOCK SCREENER</h2>
                </div>
                <div class="scan-presets">
                    ${Object.entries(presets).map(function(entry) {
                        return '<button class="btn-terminal btn-sm' + (entry[0] === preset ? ' active' : '') + '" data-preset="' + entry[0] + '">' + entry[1].label + '</button>';
                    }).join('')}
                </div>
                <div class="scan-filters" id="scan-filters" ${preset !== 'custom' ? 'style="display:none"' : ''}>
                    <div class="scan-filter-row">
                        <div class="filter-item">
                            <label>Sector</label>
                            <select id="scan-sector">
                                <option value="">All</option>
                                <option value="Technology">Technology</option>
                                <option value="Finance">Finance</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Consumer">Consumer</option>
                                <option value="Energy">Energy</option>
                                <option value="Industrial">Industrial</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label>Min P/E</label>
                            <input type="number" id="scan-pe-min" value="0" step="1">
                        </div>
                        <div class="filter-item">
                            <label>Max P/E</label>
                            <input type="number" id="scan-pe-max" value="100" step="1">
                        </div>
                        <div class="filter-item">
                            <label>Min Mkt Cap ($B)</label>
                            <input type="number" id="scan-mcap-min" value="0" step="1">
                        </div>
                        <div class="filter-item">
                            <label>Min Div Yield %</label>
                            <input type="number" id="scan-div-min" value="0" step="0.1">
                        </div>
                        <div class="filter-item" style="align-self:flex-end;">
                            <button class="btn-terminal" onclick="Screener.runCustom()">RUN SCREEN</button>
                        </div>
                    </div>
                </div>
                <div class="scan-results" id="scan-results">
                    <div style="text-align:center;padding:20px"><div class="loading-spinner"></div></div>
                </div>
            </div>`;

        // Preset buttons
        container.querySelectorAll('.scan-presets .btn-terminal').forEach(function(btn) {
            btn.addEventListener('click', function() {
                container.querySelectorAll('.scan-presets .btn-terminal').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var p = btn.dataset.preset;
                var filters = container.querySelector('#scan-filters');
                if (filters) filters.style.display = p === 'custom' ? '' : 'none';
                runPreset(container, p);
            });
        });

        runPreset(container, preset);
    }

    async function runPreset(container, preset) {
        var resultsEl = container.querySelector('#scan-results');
        resultsEl.innerHTML = '<div style="text-align:center;padding:20px"><div class="loading-spinner"></div></div>';

        var tickers = DataService.ALL_TICKERS;
        var quotes = await DataService.getMultipleQuotes(tickers);
        var results = quotes.filter(function(q) { return q != null; });

        // Add synthetic data for sorting
        results.forEach(function(q) {
            q.volume = q.marketCap ? Math.floor(q.marketCap * 0.001 * (0.5 + Math.random())) : Math.floor(Math.random() * 50000000);
            q.changePercent = q.changePercent || (Math.random() - 0.45) * 8;
            q.change = q.change || q.price * q.changePercent / 100;
            q.nearHigh = 100 - Math.random() * 15;
            q.nearLow = Math.random() * 15;
        });

        var cfg = presets[preset] || presets['custom'];

        if (preset === 'gainers') {
            results.sort(function(a, b) { return b.changePercent - a.changePercent; });
        } else if (preset === 'losers') {
            results.sort(function(a, b) { return a.changePercent - b.changePercent; });
        } else if (preset === 'most-active') {
            results.sort(function(a, b) { return b.volume - a.volume; });
        } else if (preset === '52w-high') {
            results.sort(function(a, b) { return b.nearHigh - a.nearHigh; });
        } else if (preset === '52w-low') {
            results.sort(function(a, b) { return b.nearLow - a.nearLow; });
        } else {
            results.sort(function(a, b) { return (b.marketCap || 0) - (a.marketCap || 0); });
        }

        renderResults(resultsEl, results.slice(0, 30), preset);
    }

    function runCustom() {
        var container = document.querySelector('.scan-view').closest('.panel-content');
        var sector = document.getElementById('scan-sector').value;
        var peMin = parseFloat(document.getElementById('scan-pe-min').value) || 0;
        var peMax = parseFloat(document.getElementById('scan-pe-max').value) || 999;
        var mcapMin = parseFloat(document.getElementById('scan-mcap-min').value) || 0;
        var divMin = parseFloat(document.getElementById('scan-div-min').value) || 0;

        var resultsEl = container.querySelector('#scan-results');
        resultsEl.innerHTML = '<div style="text-align:center;padding:20px"><div class="loading-spinner"></div></div>';

        DataService.getMultipleQuotes(DataService.ALL_TICKERS).then(function(quotes) {
            var results = quotes.filter(function(q) {
                if (!q) return false;
                if (sector && DataService.getSectorForTicker(q.ticker) !== sector) return false;
                if (q.pe && (q.pe < peMin || q.pe > peMax)) return false;
                if (mcapMin > 0 && q.marketCap < mcapMin * 1e9) return false;
                if (divMin > 0 && q.dividend > 0 && (q.dividend / q.price * 100) < divMin) return false;
                return true;
            });

            results.forEach(function(q) {
                q.changePercent = q.changePercent || (Math.random() - 0.45) * 8;
                q.change = q.change || q.price * q.changePercent / 100;
                q.volume = q.marketCap ? Math.floor(q.marketCap * 0.001 * (0.5 + Math.random())) : 0;
            });

            results.sort(function(a, b) { return (b.marketCap || 0) - (a.marketCap || 0); });
            renderResults(resultsEl, results.slice(0, 30), 'custom');
        });
    }

    function renderResults(el, results, preset) {
        if (!results.length) {
            el.innerHTML = '<div class="empty-state"><p>No results found</p></div>';
            return;
        }

        var label = presets[preset] ? presets[preset].label : 'RESULTS';

        var html = '<div class="section-header">' + label + ' (' + results.length + ')</div>' +
            '<table class="terminal-table"><thead><tr>' +
            '<th>#</th><th>TICKER</th><th>NAME</th><th>LAST</th><th>CHG</th><th>CHG%</th>' +
            '<th>VOLUME</th><th>MKT CAP</th><th>P/E</th><th>SECTOR</th>' +
            '</tr></thead><tbody>';

        results.forEach(function(q, i) {
            var cls = (q.changePercent || 0) >= 0 ? 'positive' : 'negative';
            var vol = q.volume > 1e6 ? (q.volume / 1e6).toFixed(1) + 'M' : q.volume > 1e3 ? (q.volume / 1e3).toFixed(0) + 'K' : q.volume;

            html += '<tr onclick="CommandBar.execute(\'' + q.ticker + ' DES\')" style="cursor:pointer">' +
                '<td style="color:var(--gray)">' + (i + 1) + '</td>' +
                '<td style="color:var(--amber);font-weight:600">' + q.ticker + '</td>' +
                '<td>' + (q.name || '--') + '</td>' +
                '<td>$' + q.price.toFixed(2) + '</td>' +
                '<td class="' + cls + '">' + ((q.change || 0) >= 0 ? '+' : '') + (q.change || 0).toFixed(2) + '</td>' +
                '<td class="' + cls + '">' + ((q.changePercent || 0) >= 0 ? '+' : '') + (q.changePercent || 0).toFixed(2) + '%</td>' +
                '<td>' + vol + '</td>' +
                '<td>' + (q.marketCap ? '$' + (q.marketCap / 1e9).toFixed(1) + 'B' : '--') + '</td>' +
                '<td>' + (q.pe ? q.pe.toFixed(1) : '--') + '</td>' +
                '<td style="color:var(--gray-light)">' + DataService.getSectorForTicker(q.ticker) + '</td>' +
                '</tr>';
        });

        html += '</tbody></table>';
        el.innerHTML = html;
    }

    return { render, runCustom };
})();
