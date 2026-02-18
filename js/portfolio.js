// ============================================
// PORTFOLIO.JS - Seguimiento de Cartera
// ============================================

// Variables globales
let portfolio = [];
let watchlist = [];

// ============================================
// Agregar a Cartera
// ============================================
function addToPortfolio() {
    if (!currentStock) {
        alert('Primero busca una acción para analizar');
        return;
    }
    
    // Verificar si ya existe
    const existing = portfolio.find(p => p.ticker === currentStock.ticker);
    if (existing) {
        alert(`${currentStock.ticker} ya está en tu cartera`);
        return;
    }
    
    // Calcular valoración si no está calculada
    let fairValue = null;
    if (valuations.dcf || valuations.multiples || valuations.ddm) {
        fairValue = calculateWeightedFairValue();
    }
    
    // Crear posición
    const position = {
        ticker: currentStock.ticker,
        name: currentStock.name,
        sector: currentStock.sector,
        shares: 0, // Usuario debe actualizar
        entryPrice: currentStock.price,
        currentPrice: currentStock.price,
        fairValue: fairValue,
        addedAt: new Date().toISOString()
    };
    
    portfolio.push(position);
    
    // Guardar en localStorage
    savePortfolio();
    
    // Actualizar UI
    updatePortfolioUI();
    updatePortfolioCount();
    
    alert(`${currentStock.ticker} agregado a tu cartera`);
}

// ============================================
// Calcular Valor Justo Ponderado
// ============================================
function calculateWeightedFairValue() {
    let weightedSum = 0;
    let weights = 0;
    
    if (valuations.dcf) {
        weightedSum += valuations.dcf.valuePerShare * 0.5;
        weights += 0.5;
    }
    if (valuations.multiples) {
        weightedSum += valuations.multiples.valueAvg * 0.3;
        weights += 0.3;
    }
    if (valuations.ddm) {
        weightedSum += valuations.ddm.valuePerShare * 0.2;
        weights += 0.2;
    }
    
    return weights > 0 ? weightedSum / weights : null;
}

// ============================================
// Actualizar UI de Cartera
// ============================================
function updatePortfolioUI() {
    const tbody = document.getElementById('portfolio-tbody');
    
    if (portfolio.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="10">Tu cartera está vacía. Agrega acciones desde el análisis.</td>
            </tr>
        `;
        updatePortfolioSummary();
        return;
    }
    
    // Actualizar precios (simulado)
    updatePortfolioPrices();
    
    // Generar filas
    tbody.innerHTML = portfolio.map(pos => {
        const value = pos.shares * pos.currentPrice;
        const cost = pos.shares * pos.entryPrice;
        const pnl = value - cost;
        const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
        
        const fairValueDiff = pos.fairValue ? 
            ((pos.fairValue - pos.currentPrice) / pos.currentPrice) * 100 : null;
        
        return `
            <tr>
                <td><strong>${pos.ticker}</strong></td>
                <td>${pos.name}</td>
                <td>
                    <input type="number" class="shares-input" 
                           value="${pos.shares}" min="0"
                           onchange="updatePositionShares('${pos.ticker}', this.value)"
                           style="width: 80px; padding: 4px;">
                </td>
                <td>$${pos.entryPrice.toFixed(2)}</td>
                <td>$${pos.currentPrice.toFixed(2)}</td>
                <td>$${value.toFixed(2)}</td>
                <td class="${pnl >= 0 ? 'positive' : 'negative'}">$${pnl.toFixed(2)}</td>
                <td class="${pnlPercent >= 0 ? 'positive' : 'negative'}">${pnlPercent.toFixed(2)}%</td>
                <td>${pos.fairValue ? `$${pos.fairValue.toFixed(2)} (${fairValueDiff > 0 ? '+' : ''}${fairValueDiff.toFixed(0)}%)` : 'N/A'}</td>
                <td>
                    <button onclick="removeFromPortfolio('${pos.ticker}')" class="btn-remove">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePortfolioSummary();
    updateAllocationChart();
}

// ============================================
// Actualizar Precios de Cartera
// ============================================
function updatePortfolioPrices() {
    // Simular actualización de precios
    portfolio.forEach(pos => {
        const change = (Math.random() - 0.5) * 0.02; // ±1% change
        pos.currentPrice = pos.currentPrice * (1 + change);
    });
}

// ============================================
// Actualizar Acciones de una Posición
// ============================================
function updatePositionShares(ticker, shares) {
    const position = portfolio.find(p => p.ticker === ticker);
    if (position) {
        position.shares = parseInt(shares) || 0;
        savePortfolio();
        updatePortfolioUI();
    }
}

// ============================================
// Eliminar de Cartera
// ============================================
function removeFromPortfolio(ticker) {
    if (confirm(`¿Eliminar ${ticker} de tu cartera?`)) {
        portfolio = portfolio.filter(p => p.ticker !== ticker);
        savePortfolio();
        updatePortfolioUI();
        updatePortfolioCount();
    }
}

// ============================================
// Resumen de Cartera
// ============================================
function updatePortfolioSummary() {
    let totalValue = 0;
    let totalCost = 0;
    
    portfolio.forEach(pos => {
        totalValue += pos.shares * pos.currentPrice;
        totalCost += pos.shares * pos.entryPrice;
    });
    
    const totalPnL = totalValue - totalCost;
    const totalReturn = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    
    document.getElementById('portfolio-total').textContent = `$${totalValue.toFixed(2)}`;
    
    const pnlEl = document.getElementById('portfolio-pnl');
    pnlEl.textContent = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`;
    pnlEl.className = `value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
    
    const returnEl = document.getElementById('portfolio-return');
    returnEl.textContent = `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;
    returnEl.className = `value ${totalReturn >= 0 ? 'positive' : 'negative'}`;
}

// ============================================
// Gráfico de Asignación
// ============================================
function updateAllocationChart() {
    const chartContainer = document.getElementById('allocation-chart');
    
    if (portfolio.length === 0) {
        chartContainer.innerHTML = `
            <p class="placeholder-text">Agrega posiciones para ver la asignación</p>
        `;
        return;
    }
    
    // Calcular asignación por sector
    const sectorAllocation = {};
    let totalValue = 0;
    
    portfolio.forEach(pos => {
        const value = pos.shares * pos.currentPrice;
        sectorAllocation[pos.sector] = (sectorAllocation[pos.sector] || 0) + value;
        totalValue += value;
    });
    
    // Generar barras de asignación
    const colors = ['#00d084', '#3498db', '#f39c12', '#9b59b6', '#ff4757', '#1abc9c'];
    let colorIndex = 0;
    
    let html = '<div class="allocation-bars">';
    
    for (const [sector, value] of Object.entries(sectorAllocation)) {
        const percentage = (value / totalValue) * 100;
        const color = colors[colorIndex % colors.length];
        
        html += `
            <div class="allocation-item">
                <div class="allocation-label">
                    <span>${sector}</span>
                    <span>${percentage.toFixed(1)}% ($${value.toFixed(0)})</span>
                </div>
                <div class="allocation-bar-bg">
                    <div class="allocation-bar-fill" 
                         style="width: ${percentage}%; background: ${color}"></div>
                </div>
            </div>
        `;
        
        colorIndex++;
    }
    
    html += '</div>';
    chartContainer.innerHTML = html;
}

// ============================================
// Actualizar Contador de Cartera
// ============================================
function updatePortfolioCount() {
    const badge = document.getElementById('portfolio-count');
    if (badge) {
        badge.textContent = portfolio.length;
        badge.style.display = portfolio.length > 0 ? 'inline-block' : 'none';
    }
}

// ============================================
// Watchlist
// ============================================
function addToWatchlist() {
    const input = document.getElementById('watchlist-add');
    const ticker = input.value.toUpperCase().trim();
    
    if (!ticker) return;
    
    if (watchlist.includes(ticker)) {
        alert(`${ticker} ya está en tu watchlist`);
        return;
    }
    
    watchlist.push(ticker);
    saveWatchlist();
    updateWatchlistUI();
    
    input.value = '';
}

function removeFromWatchlist(ticker) {
    watchlist = watchlist.filter(t => t !== ticker);
    saveWatchlist();
    updateWatchlistUI();
}

function updateWatchlistUI() {
    const grid = document.getElementById('watchlist-grid');
    
    if (watchlist.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="icon">⭐</span>
                <p>Tu watchlist está vacía</p>
                <span>Agrega tickers para seguirlos</span>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = watchlist.map(ticker => `
        <div class="watchlist-item">
            <div class="watchlist-ticker">${ticker}</div>
            <button onclick="removeFromWatchlist('${ticker}')" class="btn-remove">✕</button>
        </div>
    `).join('');
}

// ============================================
// Persistencia
// ============================================
function savePortfolio() {
    localStorage.setItem('stockAnalyzer_portfolio', JSON.stringify(portfolio));
}

function loadPortfolio() {
    const saved = localStorage.getItem('stockAnalyzer_portfolio');
    if (saved) {
        portfolio = JSON.parse(saved);
        updatePortfolioUI();
        updatePortfolioCount();
    }
}

function saveWatchlist() {
    localStorage.setItem('stockAnalyzer_watchlist', JSON.stringify(watchlist));
}

function loadWatchlist() {
    const saved = localStorage.getItem('stockAnalyzer_watchlist');
    if (saved) {
        watchlist = JSON.parse(saved);
        updateWatchlistUI();
    }
}

// ============================================
// Exportar Análisis
// ============================================
function exportAnalysis() {
    if (!currentStock) {
        alert('Primero analiza una acción');
        return;
    }
    
    const analysis = {
        stock: currentStock,
        valuations: valuations,
        riskMetrics: riskMetrics,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStock.ticker}_analysis.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// ============================================
// Inicialización
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadPortfolio();
    loadWatchlist();
});

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addToPortfolio,
        removeFromPortfolio,
        updatePortfolioUI,
        exportAnalysis
    };
}
