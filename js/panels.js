// ============================================
// PANELS.JS — Multi-panel layout with drag-resize
// ============================================

const Panels = (() => {
    let layout = 'single';
    let activePanel = 1;
    let panelCount = 1;
    let splitRatio = 0.5; // For 2-panel horizontal split

    function init() {
        const saved = localStorage.getItem('bb_layout');
        if (saved) {
            try {
                const cfg = JSON.parse(saved);
                if (cfg.layout === 'split-2') split(2);
                else if (cfg.layout === 'split-4') split(4);
                if (cfg.ratio) splitRatio = cfg.ratio;
            } catch(e) {}
        }
        setActive(1);
    }

    function split(count) {
        const container = document.getElementById('panel-container');
        if (!count) {
            if (layout === 'single') count = 2;
            else if (layout === 'split-2') count = 4;
            else count = 1;
        }

        // Remove resize handles
        container.querySelectorAll('.panel-resize-handle').forEach(h => h.remove());

        if (count === 1) {
            layout = 'single';
            container.className = 'panel-container';
            for (let i = 2; i <= 4; i++) { const p = document.getElementById('panel-'+i); if(p) p.remove(); }
            panelCount = 1;
            // Reset flex
            const p1 = document.getElementById('panel-1');
            if (p1) { p1.style.flex = ''; p1.style.width = ''; }
        } else {
            layout = count === 4 ? 'split-4' : 'split-2';
            container.className = 'panel-container ' + layout;
            for (let i = 2; i <= count; i++) {
                if (!document.getElementById('panel-'+i)) createPanel(i);
            }
            for (let i = count + 1; i <= 4; i++) { const p = document.getElementById('panel-'+i); if(p) p.remove(); }
            panelCount = count;

            // Add resize handle for split-2
            if (count === 2) {
                const handle = document.createElement('div');
                handle.className = 'panel-resize-handle horizontal';
                handle.style.left = (splitRatio * 100) + '%';
                container.appendChild(handle);
                applyRatio();
                initDragResize(handle, container);
            }
        }

        document.getElementById('status-panel-count').textContent = panelCount;
        localStorage.setItem('bb_layout', JSON.stringify({ layout, ratio: splitRatio }));
        setActive(1);
    }

    function applyRatio() {
        const p1 = document.getElementById('panel-1');
        const p2 = document.getElementById('panel-2');
        if (p1 && p2 && layout === 'split-2') {
            p1.style.flex = '0 0 ' + (splitRatio * 100) + '%';
            p2.style.flex = '0 0 ' + ((1 - splitRatio) * 100) + '%';
        }
    }

    function initDragResize(handle, container) {
        let dragging = false;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            dragging = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        handle.addEventListener('dblclick', () => {
            splitRatio = 0.5;
            applyRatio();
            handle.style.left = '50%';
            localStorage.setItem('bb_layout', JSON.stringify({ layout, ratio: splitRatio }));
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const rect = container.getBoundingClientRect();
            let ratio = (e.clientX - rect.left) / rect.width;
            const minW = 300 / rect.width;
            ratio = Math.max(minW, Math.min(1 - minW, ratio));
            splitRatio = ratio;
            handle.style.left = (ratio * 100) + '%';
            applyRatio();
        });

        document.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                localStorage.setItem('bb_layout', JSON.stringify({ layout, ratio: splitRatio }));
            }
        });
    }

    function createPanel(id) {
        const container = document.getElementById('panel-container');
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'panel-' + id;
        panel.dataset.panel = id;
        panel.innerHTML = '<div class="panel-header"><div class="panel-tabs" id="panel-'+id+'-tabs"><span class="panel-tab active" data-view="home">HOME</span></div><div class="panel-controls"><button class="panel-btn" onclick="Panels.split()" title="Split">⊞</button><button class="panel-btn" onclick="Panels.maximize('+id+')" title="Maximize">⬜</button></div></div><div class="panel-content" id="panel-'+id+'-content"></div>';
        panel.addEventListener('click', () => setActive(id));
        container.appendChild(panel);
        Terminal.renderHome(document.getElementById('panel-'+id+'-content'));
    }

    function setActive(id) {
        activePanel = id;
        document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active-panel', p.dataset.panel == id));
    }

    function maximize(id) { split(layout === 'single' ? 2 : 1); }
    function getActivePanel() { return document.getElementById('panel-'+activePanel+'-content'); }

    return { init, split, maximize, setActive, getActivePanel };
})();
