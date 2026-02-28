// ============================================
// TICKER-BAR.JS — Scrolling price ticker
// ============================================

const TickerBar = (() => {
    function init() {
        render();
        setInterval(render, 30000);
    }

    function render() {
        const indices = DataService.getMarketIndices();
        const container = document.getElementById('ticker-scroll');
        if (!container) return;

        // Duplicate for seamless scroll
        const items = indices.map(idx => {
            const cls = idx.change >= 0 ? 'positive' : 'negative';
            const arrow = idx.change >= 0 ? '▲' : '▼';
            return `<span class="ticker-item" onclick="CommandBar.execute('${idx.symbol} DES')">
                <span class="ticker-sym">${idx.symbol}</span>
                <span class="ticker-price">${idx.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span class="ticker-chg ${cls}">${arrow} ${Math.abs(idx.change).toFixed(2)} (${Math.abs(idx.pct).toFixed(2)}%)</span>
            </span>`;
        }).join('');

        container.innerHTML = items + items; // duplicate for loop
    }

    return { init, render };
})();
