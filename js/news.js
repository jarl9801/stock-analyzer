// ============================================
// NEWS.JS — Financial News Feed
// ============================================

const News = (() => {
    let newsCache = [];
    let lastFetch = 0;

    function render(container, ticker) {
        container.innerHTML = `
            <div class="news-view">
                <div class="news-header">
                    <h2>${ticker ? ticker + ' — NEWS' : 'MARKET NEWS'}</h2>
                    <div class="news-filters">
                        <input type="text" class="news-filter-input" id="news-filter" placeholder="Filter headlines..." value="${ticker || ''}">
                        <select class="news-filter-sector" id="news-sector-filter">
                            <option value="">All Sectors</option>
                            <option value="technology">Technology</option>
                            <option value="finance">Finance</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="energy">Energy</option>
                            <option value="consumer">Consumer</option>
                        </select>
                        <button class="btn-terminal btn-sm" onclick="News.refresh()">↻ REFRESH</button>
                    </div>
                </div>
                <div class="news-breaking" id="news-breaking">
                    ⚡ BREAKING: Loading latest market news...
                </div>
                <div id="news-list" style="margin-top:8px;">
                    <div style="text-align:center;padding:20px"><div class="loading-spinner"></div></div>
                </div>
            </div>`;

        fetchNews(container, ticker);

        container.querySelector('#news-filter').addEventListener('input', function() {
            filterNews(container);
        });
        container.querySelector('#news-sector-filter').addEventListener('change', function() {
            filterNews(container);
        });
    }

    async function fetchNews(container, ticker) {
        const listEl = container.querySelector('#news-list');
        const breakingEl = container.querySelector('#news-breaking');

        try {
            // Try Finnhub API
            let url = 'https://finnhub.io/api/v1/news?category=general&token=demo';
            if (ticker) {
                url = 'https://finnhub.io/api/v1/company-news?symbol=' + ticker + '&from=' +
                    getDateStr(-30) + '&to=' + getDateStr(0) + '&token=demo';
            }

            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    newsCache = data.slice(0, 50).map(item => ({
                        time: new Date(item.datetime * 1000),
                        headline: item.headline,
                        source: item.source,
                        url: item.url,
                        summary: item.summary || '',
                        related: item.related || ticker || '',
                        sentiment: guessSentiment(item.headline),
                    }));
                    renderNewsList(listEl, newsCache);
                    // Show breaking if recent
                    if (newsCache.length > 0) {
                        const latest = newsCache[0];
                        const ageMin = (Date.now() - latest.time.getTime()) / 60000;
                        if (ageMin < 60) {
                            breakingEl.textContent = '⚡ BREAKING: ' + latest.headline;
                            breakingEl.classList.add('active');
                        } else {
                            breakingEl.classList.remove('active');
                        }
                    }
                    return;
                }
            }
        } catch (e) {
            // Fallback to synthetic
        }

        // Synthetic news fallback
        newsCache = generateSyntheticNews(ticker);
        renderNewsList(listEl, newsCache);
        breakingEl.textContent = '⚡ ' + newsCache[0].headline;
        breakingEl.classList.add('active');
    }

    function renderNewsList(el, items) {
        if (!items.length) {
            el.innerHTML = '<div class="empty-state"><p>No news found</p></div>';
            return;
        }

        el.innerHTML = items.map(function(item) {
            const timeStr = item.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const dateStr = item.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const sentIcon = item.sentiment === 'bullish' ? '▲' : item.sentiment === 'bearish' ? '▼' : '●';

            return '<div class="news-item" onclick="window.open(\'' + (item.url || '#') + '\', \'_blank\')">' +
                '<span class="news-time">' + dateStr + '<br>' + timeStr + '</span>' +
                '<span class="news-sentiment ' + item.sentiment + '">' + sentIcon + '</span>' +
                '<span class="news-headline">' + escapeHtml(item.headline) + '</span>' +
                '<span class="news-source">' + escapeHtml(item.source || '') + '</span>' +
                '</div>';
        }).join('');
    }

    function filterNews(container) {
        const query = (container.querySelector('#news-filter').value || '').toLowerCase();
        const sector = container.querySelector('#news-sector-filter').value;
        const filtered = newsCache.filter(function(n) {
            const matchQ = !query || n.headline.toLowerCase().includes(query) || (n.related || '').toLowerCase().includes(query);
            return matchQ;
        });
        renderNewsList(container.querySelector('#news-list'), filtered);
    }

    function guessSentiment(headline) {
        const h = headline.toLowerCase();
        const bullish = ['surge','rally','gain','rise','jump','soar','beat','record','upgrade','bullish','growth','profit'];
        const bearish = ['fall','drop','crash','decline','cut','loss','miss','downgrade','bearish','warn','fear','sell'];
        if (bullish.some(function(w) { return h.includes(w); })) return 'bullish';
        if (bearish.some(function(w) { return h.includes(w); })) return 'bearish';
        return 'neutral';
    }

    function generateSyntheticNews(ticker) {
        const headlines = [
            { h: 'Fed Signals Rate Cut Timeline, Markets Rally on Dovish Tone', s: 'Reuters', sent: 'bullish' },
            { h: 'Tech Sector Leads Market Higher Amid Strong Earnings Season', s: 'Bloomberg', sent: 'bullish' },
            { h: 'Oil Prices Drop as OPEC+ Debates Production Increase', s: 'CNBC', sent: 'bearish' },
            { h: 'Semiconductor Stocks Surge on AI Demand Forecasts', s: 'WSJ', sent: 'bullish' },
            { h: 'European Markets Mixed as ECB Holds Rates Steady', s: 'FT', sent: 'neutral' },
            { h: 'Treasury Yields Fall as Economic Data Shows Cooling Inflation', s: 'Reuters', sent: 'bullish' },
            { h: 'Bitcoin Breaks Through Key Resistance Level', s: 'CoinDesk', sent: 'bullish' },
            { h: 'Retail Sales Miss Expectations, Consumer Spending Weakens', s: 'CNBC', sent: 'bearish' },
            { h: 'Major Banks Report Better-Than-Expected Q4 Earnings', s: 'Bloomberg', sent: 'bullish' },
            { h: 'China Trade Data Disappoints, Global Growth Concerns Rise', s: 'FT', sent: 'bearish' },
            { h: 'Healthcare Stocks Under Pressure From New Regulation Proposals', s: 'WSJ', sent: 'bearish' },
            { h: 'Industrial Production Rises for Third Consecutive Month', s: 'Reuters', sent: 'bullish' },
            { h: 'VIX Drops to Multi-Month Low as Market Calm Prevails', s: 'Bloomberg', sent: 'neutral' },
            { h: 'Defense Stocks Rally on Increased Government Spending Plan', s: 'CNBC', sent: 'bullish' },
            { h: 'Dollar Weakens Against Major Currencies on Policy Uncertainty', s: 'FT', sent: 'neutral' },
        ];

        if (ticker) {
            const db = typeof STOCK_DATABASE !== 'undefined' ? STOCK_DATABASE[ticker] : null;
            const name = db ? db.name : ticker;
            headlines.unshift(
                { h: name + ' Reports Strong Quarterly Results, Beats Estimates', s: 'Bloomberg', sent: 'bullish' },
                { h: 'Analysts Upgrade ' + ticker + ' Price Target Following Guidance Raise', s: 'WSJ', sent: 'bullish' },
                { h: ticker + ' Announces New Strategic Partnership in Key Market', s: 'Reuters', sent: 'neutral' }
            );
        }

        return headlines.map(function(item, i) {
            const d = new Date();
            d.setHours(d.getHours() - i * 2);
            return {
                time: d,
                headline: item.h,
                source: item.s,
                url: '#',
                summary: '',
                related: ticker || '',
                sentiment: item.sent
            };
        });
    }

    function getDateStr(offsetDays) {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function refresh() {
        const panel = document.querySelector('.news-view');
        if (panel) {
            const container = panel.closest('.panel-content');
            const filter = panel.querySelector('#news-filter');
            const ticker = filter ? filter.value.trim().toUpperCase() : null;
            if (container) render(container, ticker || null);
        }
    }

    return { render, refresh };
})();
