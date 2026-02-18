// ============================================
// APP.JS - Lógica Principal
// ============================================

// Variables globales
let currentView = 'analyzer';

// ============================================
// Inicialización
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Stock Analyzer Pro initialized');
    
    // Setup navigation
    setupNavigation();
    
    // Setup market status
    updateMarketStatus();
    
    // Load saved data
    if (typeof loadPortfolio === 'function') loadPortfolio();
    if (typeof loadWatchlist === 'function') loadWatchlist();
    
    // Check URL params for ticker
    const urlParams = new URLSearchParams(window.location.search);
    const ticker = urlParams.get('ticker');
    if (ticker) {
        document.getElementById('ticker-search').value = ticker;
        searchStock();
    }
});

// ============================================
// Navegación
// ============================================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const view = this.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    currentView = view;
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `view-${view}`);
    });
    
    // Refresh portfolio if switching to portfolio view
    if (view === 'portfolio' && typeof updatePortfolioUI === 'function') {
        updatePortfolioUI();
    }
}

// ============================================
// Estado del Mercado
// ============================================
function updateMarketStatus() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // NYSE: 9:30 AM - 4:00 PM ET, Monday-Friday
    // Simplificación: consideramos abierto 9:30-16:00 UTC-5
    
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21; // Aproximado a UTC
    
    const isOpen = isWeekday && isMarketHours;
    
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('market-status-text');
    
    if (isOpen) {
        statusDot.classList.add('open');
        statusText.textContent = 'Mercado Abierto';
    } else {
        statusDot.classList.remove('open');
        statusText.textContent = 'Mercado Cerrado';
    }
}

// ============================================
// Screener
// ============================================
function runScreener() {
    const market = document.getElementById('filter-market').value;
    const sector = document.getElementById('filter-sector').value;
    const peMax = parseFloat(document.getElementById('filter-pe').value);
    const dividendMin = parseFloat(document.getElementById('filter-dividend').value);
    const discountMin = parseFloat(document.getElementById('filter-discount').value);
    
    // Simular resultados
    const mockResults = [
        { ticker: 'AAPL', name: 'Apple Inc.', price: 175.50, pe: 28.5, dividend: 0.5, discount: 15 },
        { ticker: 'MSFT', name: 'Microsoft Corp.', price: 330.20, pe: 32.1, dividend: 0.7, discount: 8 },
        { ticker: 'JNJ', name: 'Johnson & Johnson', price: 155.80, pe: 16.2, dividend: 2.9, discount: 22 },
        { ticker: 'V', name: 'Visa Inc.', price: 245.60, pe: 30.5, dividend: 0.7, discount: 12 },
        { ticker: 'PG', name: 'Procter & Gamble', price: 145.30, pe: 24.8, dividend: 2.4, discount: 18 }
    ];
    
    // Filtrar
    let results = mockResults;
    
    if (peMax) {
        results = results.filter(r => r.pe <= peMax);
    }
    
    if (dividendMin) {
        results = results.filter(r => r.dividend >= dividendMin);
    }
    
    if (discountMin) {
        results = results.filter(r => r.discount >= discountMin);
    }
    
    // Mostrar resultados
    const container = document.getElementById('screener-results');
    
    if (results.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No se encontraron resultados con esos filtros</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="screener-table">
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th>P/E</th>
                    <th>Dividendo%</th>
                    <th>Descuento DCF</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(r => `
                    <tr>
                        <td><strong>${r.ticker}</strong></td>
                        <td>${r.name}</td>
                        <td>$${r.price.toFixed(2)}</td>
                        <td>${r.pe.toFixed(1)}</td>
                        <td>${r.dividend.toFixed(1)}%</td>
                        <td class="${r.discount > 15 ? 'positive' : ''}">${r.discount}%</td>
                        <td>
                            <button class="btn btn-sm" onclick="analyzeTicker('${r.ticker}')">Analizar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function analyzeTicker(ticker) {
    document.getElementById('ticker-search').value = ticker;
    searchStock();
    switchView('analyzer');
}

// ============================================
// Utilidades
// ============================================
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatPercent(num) {
    if (num === null || num === undefined) return 'N/A';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
}

// ============================================
// Atajos de teclado
// ============================================
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K para buscar
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('ticker-search').focus();
    }
    
    // Escape para cerrar modales
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.remove());
    }
});
