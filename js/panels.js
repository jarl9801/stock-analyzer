// ============================================
// PANELS.JS — Multi-panel layout manager
// ============================================

const Panels = (() => {
    let layout = 'single'; // single, split-2, split-4
    let activePanel = 1;
    let panelCount = 1;

    function init() {
        const saved = localStorage.getItem('bb_layout');
        if (saved) {
            try {
                const cfg = JSON.parse(saved);
                if (cfg.layout === 'split-2') split(2);
                else if (cfg.layout === 'split-4') split(4);
            } catch(e) {}
        }
        setActive(1);
    }

    function split(count) {
        const container = document.getElementById('panel-container');
        if (!count) {
            // Cycle: single → 2 → 4 → single
            if (layout === 'single') count = 2;
            else if (layout === 'split-2') count = 4;
            else count = 1;
        }

        if (count === 1) {
            layout = 'single';
            container.className = 'panel-container';
            // Remove extra panels
            for (let i = 2; i <= 4; i++) {
                const p = document.getElementById(`panel-${i}`);
                if (p) p.remove();
            }
            panelCount = 1;
        } else {
            layout = count === 4 ? 'split-4' : 'split-2';
            container.className = `panel-container ${layout}`;
            for (let i = 2; i <= count; i++) {
                if (!document.getElementById(`panel-${i}`)) {
                    createPanel(i);
                }
            }
            // Remove excess
            for (let i = count + 1; i <= 4; i++) {
                const p = document.getElementById(`panel-${i}`);
                if (p) p.remove();
            }
            panelCount = count;
        }

        document.getElementById('status-panel-count').textContent = panelCount;
        localStorage.setItem('bb_layout', JSON.stringify({ layout }));
        setActive(1);
    }

    function createPanel(id) {
        const container = document.getElementById('panel-container');
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = `panel-${id}`;
        panel.dataset.panel = id;
        panel.innerHTML = `
            <div class="panel-header">
                <div class="panel-tabs" id="panel-${id}-tabs">
                    <span class="panel-tab active" data-view="home">HOME</span>
                </div>
                <div class="panel-controls">
                    <button class="panel-btn" onclick="Panels.split()" title="Split">⊞</button>
                    <button class="panel-btn" onclick="Panels.maximize(${id})" title="Maximize">⬜</button>
                </div>
            </div>
            <div class="panel-content" id="panel-${id}-content"></div>
        `;
        panel.addEventListener('click', () => setActive(id));
        container.appendChild(panel);
        Terminal.renderHome(document.getElementById(`panel-${id}-content`));
    }

    function setActive(id) {
        activePanel = id;
        document.querySelectorAll('.panel').forEach(p => {
            p.classList.toggle('active-panel', p.dataset.panel == id);
        });
    }

    function maximize(id) {
        if (layout === 'single') {
            split(2);
        } else {
            split(1);
        }
    }

    function getActivePanel() {
        return document.getElementById(`panel-${activePanel}-content`);
    }

    return { init, split, maximize, setActive, getActivePanel };
})();
