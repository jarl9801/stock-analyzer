// ============================================
// COMMAND-BAR.JS — Bloomberg command input
// ============================================

const CommandBar = (() => {
    let history = JSON.parse(localStorage.getItem('bb_cmd_history') || '[]');
    let histIdx = -1;
    let activeTicker = null;

    const COMMANDS = {
        'DES': 'Security Description',
        'GP': 'Price Chart',
        'FA': 'Financial Analysis',
        'PORT': 'Portfolio',
        'WL': 'Watchlist',
        'SCAN': 'Stock Screener',
        'MOST': 'Most Active',
        'NEWS': 'News Feed',
        'HMAP': 'Market Heatmap',
        'COMP': 'Compare Securities',
        'DVD': 'Dividend Analysis',
        'ERN': 'Earnings',
        'RV': 'Relative Value',
        'SPLC': 'Supply Chain',
        'ALERTS': 'Alerts Manager',
        'HELP': 'Help / Commands',
        'HOME': 'Home Screen',
    };

    function init() {
        const input = document.getElementById('command-input');
        const goBtn = document.getElementById('go-btn');
        const dropdown = document.getElementById('autocomplete-dropdown');

        input.addEventListener('keydown', handleKeydown);
        input.addEventListener('input', handleInput);
        input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('show'), 150));
        goBtn.addEventListener('click', () => executeFromInput());

        // Fn key bar
        document.querySelectorAll('.fn-key[data-cmd]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                if (activeTicker && !['PORT','WL','SCAN','MOST','NEWS','HMAP','COMP','ALERTS','HELP','HOME'].includes(cmd)) {
                    execute(`${activeTicker} ${cmd}`);
                } else {
                    execute(cmd);
                }
            });
        });
    }

    function handleKeydown(e) {
        const dropdown = document.getElementById('autocomplete-dropdown');
        const items = dropdown.querySelectorAll('.ac-item');

        if (e.key === 'Enter') {
            e.preventDefault();
            const selected = dropdown.querySelector('.ac-item.selected');
            if (selected) {
                e.target.value = selected.dataset.value;
                dropdown.classList.remove('show');
            }
            executeFromInput();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateDropdown(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (dropdown.classList.contains('show') && items.length) {
                navigateDropdown(-1);
            } else {
                // History navigation
                if (history.length && histIdx < history.length - 1) {
                    histIdx++;
                    e.target.value = history[history.length - 1 - histIdx];
                }
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
            e.target.blur();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const selected = dropdown.querySelector('.ac-item.selected') || dropdown.querySelector('.ac-item');
            if (selected) {
                e.target.value = selected.dataset.value;
                dropdown.classList.remove('show');
            }
        }
    }

    function navigateDropdown(dir) {
        const dropdown = document.getElementById('autocomplete-dropdown');
        const items = [...dropdown.querySelectorAll('.ac-item')];
        if (!items.length) return;
        const current = items.findIndex(i => i.classList.contains('selected'));
        items.forEach(i => i.classList.remove('selected'));
        let next = current + dir;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        items[next].classList.add('selected');
    }

    function handleInput(e) {
        const val = e.target.value.toUpperCase().trim();
        const dropdown = document.getElementById('autocomplete-dropdown');
        histIdx = -1;

        if (!val) { dropdown.classList.remove('show'); return; }

        const parts = val.split(/\s+/);
        let suggestions = [];

        // Ticker suggestions
        if (typeof STOCK_DATABASE !== 'undefined') {
            const query = parts[0];
            const tickerMatches = Object.entries(STOCK_DATABASE)
                .filter(([t, d]) => t.includes(query) || (d.name && d.name.toUpperCase().includes(query)))
                .slice(0, 6)
                .map(([t, d]) => ({ type: 'ticker', ticker: t, name: d.name, value: t }));
            suggestions.push(...tickerMatches);
        }

        // Command suggestions
        if (parts.length <= 1) {
            const cmdMatches = Object.entries(COMMANDS)
                .filter(([cmd]) => cmd.includes(val))
                .slice(0, 4)
                .map(([cmd, desc]) => ({ type: 'cmd', ticker: cmd, name: desc, value: cmd }));
            suggestions.push(...cmdMatches);
        } else if (parts.length === 2) {
            const cmdQuery = parts[1];
            const cmdMatches = Object.entries(COMMANDS)
                .filter(([cmd]) => cmd.startsWith(cmdQuery))
                .slice(0, 4)
                .map(([cmd, desc]) => ({ type: 'cmd', ticker: `${parts[0]} ${cmd}`, name: desc, value: `${parts[0]} ${cmd}` }));
            suggestions.push(...cmdMatches);
        }

        if (suggestions.length === 0) { dropdown.classList.remove('show'); return; }

        dropdown.innerHTML = suggestions.map((s, i) =>
            `<div class="ac-item${i === 0 ? ' selected' : ''}" data-value="${s.value}" onmousedown="CommandBar.selectSuggestion('${s.value}')">
                <span class="ac-ticker">${s.ticker}</span>
                <span class="ac-name">${s.name}</span>
                ${s.type === 'cmd' ? '<span class="ac-cmd">CMD</span>' : ''}
            </div>`
        ).join('');
        dropdown.classList.add('show');
    }

    function selectSuggestion(val) {
        const input = document.getElementById('command-input');
        input.value = val;
        document.getElementById('autocomplete-dropdown').classList.remove('show');
        executeFromInput();
    }

    function executeFromInput() {
        const input = document.getElementById('command-input');
        const val = input.value.trim().toUpperCase();
        if (!val) return;

        // Add to history
        if (history[history.length - 1] !== val) {
            history.push(val);
            if (history.length > 50) history.shift();
            localStorage.setItem('bb_cmd_history', JSON.stringify(history));
        }
        histIdx = -1;

        execute(val);
        input.value = '';
        document.getElementById('autocomplete-dropdown').classList.remove('show');
    }

    function execute(rawCmd) {
        let cmd = rawCmd.replace(/\s*<?\s*GO\s*>?\s*$/i, '').trim().toUpperCase();
        const parts = cmd.split(/\s+/);

        // Standalone commands (no ticker needed)
        const standaloneCommands = ['PORT','WL','SCAN','MOST','NEWS','HMAP','COMP','ALERTS','HELP','HOME'];
        if (parts.length === 1 && standaloneCommands.includes(parts[0])) {
            return routeCommand(null, parts[0]);
        }

        // "TICKER EQUITY GO" pattern
        if (parts.length >= 2 && parts[parts.length - 1] === 'EQUITY') {
            parts.pop();
        }

        if (parts.length === 1) {
            // Just a ticker → default to DES
            const ticker = parts[0];
            if (COMMANDS[ticker]) {
                return routeCommand(null, ticker);
            }
            activeTicker = ticker;
            updateActiveTicker(ticker);
            return routeCommand(ticker, 'DES');
        }

        if (parts.length >= 2) {
            const ticker = parts[0];
            const command = parts[1];
            activeTicker = ticker;
            updateActiveTicker(ticker);
            return routeCommand(ticker, command);
        }
    }

    function routeCommand(ticker, command) {
        const panelContent = document.querySelector('.active-panel .panel-content') || document.getElementById('panel-1-content');
        const panelTabs = document.querySelector('.active-panel .panel-tabs') || document.getElementById('panel-1-tabs');

        // Update tab
        if (panelTabs) {
            const label = ticker ? `${ticker} ${command}` : command;
            addTab(panelTabs, label, command);
        }

        switch (command) {
            case 'DES': Security.render(panelContent, ticker); break;
            case 'GP': Charts.render(panelContent, ticker); break;
            case 'FA': Financials.render(panelContent, ticker); break;
            case 'PORT': Portfolio.render(panelContent); break;
            case 'WL': Watchlist.render(panelContent); break;
            case 'SCAN': Screener.render(panelContent); break;
            case 'MOST': Screener.render(panelContent, 'most-active'); break;
            case 'NEWS': News.render(panelContent, ticker); break;
            case 'HMAP': Heatmap.render(panelContent); break;
            case 'COMP': Compare.render(panelContent, ticker); break;
            case 'DVD': Dividends.render(panelContent, ticker); break;
            case 'ERN': Earnings.render(panelContent, ticker); break;
            case 'ALERTS': Alerts.render(panelContent); break;
            case 'HELP': renderHelp(panelContent); break;
            case 'HOME': Terminal.renderHome(panelContent); break;
            default:
                Terminal.notify(`Unknown command: ${command}`, 'error');
        }

        // Update fn-key active state
        document.querySelectorAll('.fn-key').forEach(k => {
            k.classList.toggle('active', k.dataset.cmd === command);
        });
    }

    function addTab(tabsEl, label, cmd) {
        // Remove existing active
        tabsEl.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        // Check if tab exists
        let existing = tabsEl.querySelector(`.panel-tab[data-cmd="${cmd}"]`);
        if (existing) {
            existing.classList.add('active');
            existing.textContent = label;
            return;
        }
        const tab = document.createElement('span');
        tab.className = 'panel-tab active';
        tab.dataset.cmd = cmd;
        tab.dataset.view = cmd.toLowerCase();
        tab.textContent = label;
        tab.onclick = () => execute(label);
        tabsEl.appendChild(tab);
    }

    function renderHelp(container) {
        container.innerHTML = `
            <div class="help-view">
                <div class="section-header">BLOOMBERG TERMINAL — COMMAND REFERENCE</div>
                <div class="help-grid">
                    <div class="help-section">
                        <h3>SECURITY COMMANDS</h3>
                        ${Object.entries(COMMANDS).filter(([k]) => !['PORT','WL','SCAN','MOST','NEWS','HMAP','COMP','ALERTS','HELP','HOME'].includes(k)).map(([k,v]) => `<div class="help-cmd"><span class="help-key">AAPL ${k} &lt;GO&gt;</span><span class="help-desc">${v}</span></div>`).join('')}
                    </div>
                    <div class="help-section">
                        <h3>MARKET COMMANDS</h3>
                        ${['PORT','WL','SCAN','MOST','NEWS','HMAP','COMP','ALERTS','HELP','HOME'].map(k => `<div class="help-cmd"><span class="help-key">${k} &lt;GO&gt;</span><span class="help-desc">${COMMANDS[k]||k}</span></div>`).join('')}
                    </div>
                    <div class="help-section">
                        <h3>KEYBOARD SHORTCUTS</h3>
                        <div class="help-cmd"><span class="help-key">/</span><span class="help-desc">Focus command bar</span></div>
                        <div class="help-cmd"><span class="help-key">Esc</span><span class="help-desc">Close overlays / blur</span></div>
                        <div class="help-cmd"><span class="help-key">Ctrl+1-4</span><span class="help-desc">Focus panel</span></div>
                        <div class="help-cmd"><span class="help-key">F1-F12</span><span class="help-desc">Function commands</span></div>
                        <div class="help-cmd"><span class="help-key">↑ / ↓</span><span class="help-desc">History / navigate</span></div>
                        <div class="help-cmd"><span class="help-key">Tab</span><span class="help-desc">Autocomplete</span></div>
                    </div>
                </div>
            </div>`;
    }

    function updateActiveTicker(ticker) {
        const el = document.getElementById('status-active-ticker');
        if (el) el.textContent = ticker || 'NO SECURITY';
    }

    function getActiveTicker() { return activeTicker; }

    return { init, execute, executeFromInput, selectSuggestion, getActiveTicker, COMMANDS };
})();
