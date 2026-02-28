// ============================================
// CONTEXT-MENU.JS — Right-click context menu for tickers
// ============================================

const ContextMenu = (() => {
    function init() {
        document.addEventListener('contextmenu', (e) => {
            const ticker = findTickerFromElement(e.target);
            if (!ticker) return;
            e.preventDefault();
            showMenu(e.clientX, e.clientY, ticker);
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.bb-context-menu').forEach(m => m.remove());
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') document.querySelectorAll('.bb-context-menu').forEach(m => m.remove());
        });
    }

    function findTickerFromElement(el) {
        // Check for data attribute
        if (el.dataset && el.dataset.ticker) return el.dataset.ticker;
        // Check common classes/patterns
        const text = el.textContent.trim().toUpperCase();
        if (/^[A-Z]{1,5}$/.test(text)) {
            // Verify it looks like a ticker context
            const parent = el.closest('.ticker-item, .terminal-table, .wl-view, .port-view, .hmap-item, .des-similar-item, .news-item, .scan-view');
            if (parent) return text;
            // Check color patterns (amber = typically ticker)
            const style = window.getComputedStyle(el);
            if (style.color === 'rgb(255, 170, 0)' || el.classList.contains('amber') || el.style.color === 'var(--amber)') return text;
        }
        // Check parent
        if (el.parentElement) {
            const parentText = el.parentElement.dataset?.ticker;
            if (parentText) return parentText;
        }
        return null;
    }

    function showMenu(x, y, ticker) {
        document.querySelectorAll('.bb-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'bb-context-menu';

        const items = [
            { label: '📈 Chart (GP)', action: () => CommandBar.execute(ticker + ' GP') },
            { label: '📋 Description (DES)', action: () => CommandBar.execute(ticker + ' DES') },
            { label: '💰 Financials (FA)', action: () => CommandBar.execute(ticker + ' FA') },
            { label: '📊 Earnings (ERN)', action: () => CommandBar.execute(ticker + ' ERN') },
            { label: '💵 Dividends (DVD)', action: () => CommandBar.execute(ticker + ' DVD') },
            null, // separator
            { label: '⭐ Add to Watchlist', action: () => { if(typeof Watchlist!=='undefined'&&Watchlist.addTicker) Watchlist.addTicker(ticker); else Terminal.notify(ticker+' → Watchlist','success'); } },
            { label: '💼 Add to Portfolio', action: () => CommandBar.execute('PORT') },
            { label: '🔔 Set Alert', action: () => CommandBar.execute('ALERTS') },
            null,
            { label: '📰 News', action: () => CommandBar.execute(ticker + ' NEWS') },
        ];

        menu.innerHTML = '<div class="bb-ctx-header">' + ticker + '</div>' +
            items.map(item => {
                if (!item) return '<div class="bb-ctx-sep"></div>';
                return '<div class="bb-ctx-item">' + item.label + '</div>';
            }).join('');

        // Position
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        document.body.appendChild(menu);

        // Adjust if off-screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
        if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

        // Bind clicks
        const clickItems = menu.querySelectorAll('.bb-ctx-item');
        let idx = 0;
        items.forEach(item => {
            if (!item) return;
            clickItems[idx].addEventListener('click', () => { menu.remove(); item.action(); });
            idx++;
        });
    }

    return { init };
})();
