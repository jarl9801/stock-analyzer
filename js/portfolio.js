// ============================================
// PORTFOLIO.JS - Multi-Lot Portfolio Tracking
// ============================================

// Variables globales
let portfolio = [];
let watchlist = [];

// ============================================
// Migration: old format → new lots format
// ============================================
function migratePortfolioData(data) {
    return data.map(pos => {
        if (pos.lots) return pos; // Already new format
        // Old format: { shares, entryPrice } → convert to lots
        const lots = [];
        if (pos.shares > 0 && pos.entryPrice > 0) {
            lots.push({
                shares: pos.shares,
                price: pos.entryPrice,
                date: pos.addedAt ? pos.addedAt.split('T')[0] : new Date().toISOString().split('T')[0]
            });
        }
        return {
            ticker: pos.ticker,
            name: pos.name,
            sector: pos.sector,
            lots: lots,
            currentPrice: pos.currentPrice || pos.entryPrice,
            fairValue: pos.fairValue || null,
            addedAt: pos.addedAt || new Date().toISOString()
        };
    });
}

// ============================================
// Lot Calculations
// ============================================
function calcTotalShares(pos) {
    return pos.lots.reduce((sum, lot) => sum + lot.shares, 0);
}

function calcAvgEntry(pos) {
    const totalCost = pos.lots.reduce((sum, lot) => sum + lot.shares * lot.price, 0);
    const totalShares = calcTotalShares(pos);
    return totalShares > 0 ? totalCost / totalShares : 0;
}

function calcTotalCost(pos) {
    return pos.lots.reduce((sum, lot) => sum + lot.shares * lot.price, 0);
}

function calcTotalValue(pos) {
    return calcTotalShares(pos) * pos.currentPrice;
}

function calcPnL(pos) {
    return calcTotalValue(pos) - calcTotalCost(pos);
}

function calcPnLPercent(pos) {
    const cost = calcTotalCost(pos);
    return cost > 0 ? (calcPnL(pos) / cost) * 100 : 0;
}

// ============================================
// Add to Portfolio (from analysis page)
// ============================================
function addToPortfolio() {
    if (!currentStock) {
        alert('Primero busca una acción para analizar');
        return;
    }

    const existing = portfolio.find(p => p.ticker === currentStock.ticker);

    // Prompt for shares and price
    const sharesStr = prompt(`Shares to buy for ${currentStock.ticker}:`, '1');
    if (!sharesStr) return;
    const shares = parseFloat(sharesStr);
    if (isNaN(shares) || shares <= 0) { alert('Invalid shares'); return; }

    const priceStr = prompt('Entry price per share:', currentStock.price.toFixed(2));
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) { alert('Invalid price'); return; }

    const today = new Date().toISOString().split('T')[0];

    if (existing) {
        // Add lot to existing position
        existing.lots.push({ shares, price, date: today });
        existing.currentPrice = currentStock.price;
        // Update fair value if available
        let fv = calculateWeightedFairValue();
        if (fv) existing.fairValue = fv;
    } else {
        // Calculate fair value
        let fairValue = calculateWeightedFairValue();

        const position = {
            ticker: currentStock.ticker,
            name: currentStock.name,
            sector: currentStock.sector,
            lots: [{ shares, price, date: today }],
            currentPrice: currentStock.price,
            fairValue: fairValue,
            addedAt: new Date().toISOString()
        };
        portfolio.push(position);
    }

    savePortfolio();
    updatePortfolioUI();
    updatePortfolioCount();
    showNotification(`${shares} shares of ${currentStock.ticker} @ $${price.toFixed(2)} added`, 'success');
}

// ============================================
// Calculate Weighted Fair Value
// ============================================
function calculateWeightedFairValue() {
    let weightedSum = 0;
    let weights = 0;

    if (typeof valuations !== 'undefined') {
        if (valuations.dcf) { weightedSum += valuations.dcf.valuePerShare * 0.5; weights += 0.5; }
        if (valuations.multiples) { weightedSum += valuations.multiples.valueAvg * 0.3; weights += 0.3; }
        if (valuations.ddm) { weightedSum += valuations.ddm.valuePerShare * 0.2; weights += 0.2; }
    }

    return weights > 0 ? weightedSum / weights : null;
}

// ============================================
// Expanded rows state
// ============================================
let expandedTickers = new Set();

// ============================================
// Update Portfolio UI
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

    let html = '';
    portfolio.forEach(pos => {
        const totalShares = calcTotalShares(pos);
        const avgEntry = calcAvgEntry(pos);
        const totalValue = calcTotalValue(pos);
        const pnl = calcPnL(pos);
        const pnlPct = calcPnLPercent(pos);
        const fairValueDiff = pos.fairValue ?
            ((pos.fairValue - pos.currentPrice) / pos.currentPrice) * 100 : null;

        const isExpanded = expandedTickers.has(pos.ticker);

        html += `
            <tr class="portfolio-row ${isExpanded ? 'expanded' : ''}" onclick="toggleLots('${pos.ticker}')" style="cursor:pointer;">
                <td><strong>${pos.ticker}</strong> <span style="color:var(--gray);font-size:11px;">${isExpanded ? '▼' : '▶'} ${pos.lots.length} lot${pos.lots.length > 1 ? 's' : ''}</span></td>
                <td>${pos.name}</td>
                <td>${totalShares}</td>
                <td>$${avgEntry.toFixed(2)}</td>
                <td>$${pos.currentPrice.toFixed(2)}</td>
                <td>$${totalValue.toFixed(2)}</td>
                <td class="${pnl >= 0 ? 'positive' : 'negative'}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}</td>
                <td class="${pnlPct >= 0 ? 'positive' : 'negative'}">${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%</td>
                <td>${pos.fairValue ? `$${pos.fairValue.toFixed(2)} (${fairValueDiff > 0 ? '+' : ''}${fairValueDiff.toFixed(0)}%)` : 'N/A'}</td>
                <td>
                    <button onclick="event.stopPropagation(); showAddLotForm('${pos.ticker}')" class="btn-action" title="Add Lot">➕</button>
                    <button onclick="event.stopPropagation(); removeFromPortfolio('${pos.ticker}')" class="btn-remove" title="Remove">🗑️</button>
                </td>
            </tr>
        `;

        // Expanded lots detail
        if (isExpanded) {
            html += `
                <tr class="lots-header-row">
                    <td colspan="10">
                        <table class="lots-table">
                            <thead>
                                <tr>
                                    <th>Shares</th>
                                    <th>Entry Price</th>
                                    <th>Date</th>
                                    <th>Cost</th>
                                    <th>Value</th>
                                    <th>P&L</th>
                                    <th>P&L%</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            pos.lots.forEach((lot, idx) => {
                const lotCost = lot.shares * lot.price;
                const lotValue = lot.shares * pos.currentPrice;
                const lotPnl = lotValue - lotCost;
                const lotPnlPct = lotCost > 0 ? (lotPnl / lotCost) * 100 : 0;
                html += `
                                <tr>
                                    <td>${lot.shares}</td>
                                    <td>$${lot.price.toFixed(2)}</td>
                                    <td>${lot.date}</td>
                                    <td>$${lotCost.toFixed(2)}</td>
                                    <td>$${lotValue.toFixed(2)}</td>
                                    <td class="${lotPnl >= 0 ? 'positive' : 'negative'}">${lotPnl >= 0 ? '+' : ''}$${lotPnl.toFixed(2)}</td>
                                    <td class="${lotPnlPct >= 0 ? 'positive' : 'negative'}">${lotPnlPct >= 0 ? '+' : ''}${lotPnlPct.toFixed(2)}%</td>
                                    <td><button onclick="event.stopPropagation(); deleteLot('${pos.ticker}', ${idx})" class="btn-remove" title="Delete Lot">✕</button></td>
                                </tr>
                `;
            });
            // Inline add lot form
            html += `
                                <tr class="add-lot-row" id="add-lot-${pos.ticker}" style="display:none;">
                                    <td><input type="number" id="lot-shares-${pos.ticker}" placeholder="Shares" min="0.01" step="any" style="width:70px;"></td>
                                    <td><input type="number" id="lot-price-${pos.ticker}" placeholder="Price" min="0.01" step="any" style="width:90px;"></td>
                                    <td><input type="date" id="lot-date-${pos.ticker}" style="width:130px;"></td>
                                    <td colspan="4"><button onclick="event.stopPropagation(); submitAddLot('${pos.ticker}')" class="btn btn-primary" style="padding:4px 12px;font-size:11px;">Add</button>
                                    <button onclick="event.stopPropagation(); hideAddLotForm('${pos.ticker}')" class="btn btn-secondary" style="padding:4px 12px;font-size:11px;">Cancel</button></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html;
    updatePortfolioSummary();
    updateAllocationChart();
}

// ============================================
// Toggle lot expansion
// ============================================
function toggleLots(ticker) {
    if (expandedTickers.has(ticker)) {
        expandedTickers.delete(ticker);
    } else {
        expandedTickers.add(ticker);
    }
    updatePortfolioUI();
}

// ============================================
// Add Lot inline form
// ============================================
function showAddLotForm(ticker) {
    if (!expandedTickers.has(ticker)) {
        expandedTickers.add(ticker);
        updatePortfolioUI();
    }
    setTimeout(() => {
        const row = document.getElementById(`add-lot-${ticker}`);
        if (row) {
            row.style.display = '';
            const dateInput = document.getElementById(`lot-date-${ticker}`);
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
            const pos = portfolio.find(p => p.ticker === ticker);
            const priceInput = document.getElementById(`lot-price-${ticker}`);
            if (priceInput && pos) priceInput.value = pos.currentPrice.toFixed(2);
        }
    }, 50);
}

function hideAddLotForm(ticker) {
    const row = document.getElementById(`add-lot-${ticker}`);
    if (row) row.style.display = 'none';
}

function submitAddLot(ticker) {
    const shares = parseFloat(document.getElementById(`lot-shares-${ticker}`).value);
    const price = parseFloat(document.getElementById(`lot-price-${ticker}`).value);
    const date = document.getElementById(`lot-date-${ticker}`).value;

    if (isNaN(shares) || shares <= 0) { alert('Invalid shares'); return; }
    if (isNaN(price) || price <= 0) { alert('Invalid price'); return; }
    if (!date) { alert('Select a date'); return; }

    const pos = portfolio.find(p => p.ticker === ticker);
    if (pos) {
        pos.lots.push({ shares, price, date });
        savePortfolio();
        updatePortfolioUI();
        showNotification(`Added ${shares} shares of ${ticker} @ $${price.toFixed(2)}`, 'success');
    }
}

// ============================================
// Delete a single lot
// ============================================
function deleteLot(ticker, lotIndex) {
    const pos = portfolio.find(p => p.ticker === ticker);
    if (!pos) return;
    if (pos.lots.length === 1) {
        if (confirm(`This is the only lot for ${ticker}. Remove entire position?`)) {
            removeFromPortfolio(ticker);
        }
        return;
    }
    if (confirm(`Delete lot #${lotIndex + 1} (${pos.lots[lotIndex].shares} shares @ $${pos.lots[lotIndex].price.toFixed(2)})?`)) {
        pos.lots.splice(lotIndex, 1);
        savePortfolio();
        updatePortfolioUI();
    }
}

// ============================================
// Remove entire position
// ============================================
function removeFromPortfolio(ticker) {
    if (confirm(`¿Eliminar ${ticker} de tu cartera?`)) {
        portfolio = portfolio.filter(p => p.ticker !== ticker);
        expandedTickers.delete(ticker);
        savePortfolio();
        updatePortfolioUI();
        updatePortfolioCount();
    }
}

// ============================================
// Portfolio Summary
// ============================================
function updatePortfolioSummary() {
    let totalValue = 0;
    let totalCost = 0;

    portfolio.forEach(pos => {
        totalValue += calcTotalValue(pos);
        totalCost += calcTotalCost(pos);
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
// Allocation Chart
// ============================================
function updateAllocationChart() {
    const chartContainer = document.getElementById('allocation-chart');

    if (portfolio.length === 0) {
        chartContainer.innerHTML = `<p class="placeholder-text">Agrega posiciones para ver la asignación</p>`;
        return;
    }

    const sectorAllocation = {};
    let totalValue = 0;

    portfolio.forEach(pos => {
        const value = calcTotalValue(pos);
        sectorAllocation[pos.sector] = (sectorAllocation[pos.sector] || 0) + value;
        totalValue += value;
    });

    const colors = ['#00d084', '#3498db', '#f39c12', '#9b59b6', '#ff4757', '#1abc9c'];
    let colorIndex = 0;
    let html = '<div class="allocation-bars">';

    for (const [sector, value] of Object.entries(sectorAllocation)) {
        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
        const color = colors[colorIndex % colors.length];
        html += `
            <div class="allocation-item">
                <div class="allocation-label">
                    <span>${sector}</span>
                    <span>${percentage.toFixed(1)}% ($${value.toFixed(0)})</span>
                </div>
                <div class="allocation-bar-bg">
                    <div class="allocation-bar-fill" style="width: ${percentage}%; background: ${color}"></div>
                </div>
            </div>
        `;
        colorIndex++;
    }

    html += '</div>';
    chartContainer.innerHTML = html;
}

// ============================================
// Portfolio Count Badge
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
function addToWatchlist(tickerOverride) {
    let ticker;
    if (tickerOverride) {
        ticker = tickerOverride.toUpperCase().trim();
    } else {
        const input = document.getElementById('watchlist-add');
        ticker = input.value.toUpperCase().trim();
        if (!ticker) return;
        input.value = '';
    }

    if (watchlist.includes(ticker)) {
        showNotification(`${ticker} already in watchlist`, 'info');
        return;
    }

    watchlist.push(ticker);
    saveWatchlist();
    updateWatchlistUI();
    showNotification(`${ticker} added to watchlist`, 'success');
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
// Persistence
// ============================================
function savePortfolio() {
    localStorage.setItem('stockAnalyzer_portfolio', JSON.stringify(portfolio));
}

function loadPortfolio() {
    const saved = localStorage.getItem('stockAnalyzer_portfolio');
    if (saved) {
        let data = JSON.parse(saved);
        portfolio = migratePortfolioData(data);
        // Re-save if migrated
        savePortfolio();
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
// Export Analysis
// ============================================
function exportAnalysis() {
    if (!currentStock) {
        alert('Primero analiza una acción');
        return;
    }

    const analysis = {
        stock: currentStock,
        valuations: valuations,
        riskMetrics: typeof riskMetrics !== 'undefined' ? riskMetrics : null,
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
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadPortfolio();
    loadWatchlist();
});

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { addToPortfolio, removeFromPortfolio, updatePortfolioUI, exportAnalysis };
}
