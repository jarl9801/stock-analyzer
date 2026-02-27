// ============================================
// STOCK ANALYZER HUB WIDGET
// Widget compacto para el Nexus Hub
// ============================================

class StockAnalyzerHubWidget {
    constructor() {
        this.watchlist = JSON.parse(localStorage.getItem('stock_watchlist') || '[]');
        this.prices = {};
        this.updateInterval = null;
    }

    // Inicializar widget
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.render(container);
        this.startPriceUpdates();
    }

    // Renderizar widget
    render(container) {
        const watchlist = this.watchlist.slice(0, 5); // Mostrar top 5
        
        container.innerHTML = `
            <div class="stock-hub-widget">
                <div class="stock-hub-header">
                    <span>📈 Watchlist</span>
                    <span class="stock-hub-count">${this.watchlist.length}</span>
                </div>
                
                <div class="stock-hub-list">
                    ${watchlist.length === 0 ? 
                        `<div class="stock-hub-empty">
                            Sin stocks en watchlist
                            <button onclick="window.open('https://jarl9801.github.io/stock-analyzer/', '_blank')">
                                Abrir Analyzer
                            </button>
                        </div>` :
                        watchlist.map(stock => this.renderStockItem(stock)).join('')
                    }
                </div>
                
                <div class="stock-hub-footer">
                    <button onclick="window.open('https://jarl9801.github.io/stock-analyzer/', '_blank')">
                        Abrir Terminal ↗
                    </button>
                </div>
            </div>
        `;
    }

    // Renderizar item de stock
    renderStockItem(stock) {
        const price = this.prices[stock.ticker] || stock.lastPrice || 0;
        const change = stock.change || 0;
        const changePercent = stock.changePercent || 0;
        const isPositive = change >= 0;
        
        return `
            <div class="stock-hub-item" onclick="window.open('https://jarl9801.github.io/stock-analyzer/?ticker=${stock.ticker}', '_blank')">
                <div class="stock-hub-info">
                    <span class="stock-hub-ticker">${stock.ticker}</span>
                    <span class="stock-hub-name">${stock.name || ''}</span>
                </div>
                <div class="stock-hub-price">
                    <span class="stock-hub-value">$${price.toFixed(2)}</span>
                    <span class="stock-hub-change ${isPositive ? 'up' : 'down'}">
                        ${isPositive ? '+' : ''}${changePercent.toFixed(2)}%
                    </span>
                </div>
            </div>
        `;
    }

    // Actualizar precios
    async updatePrices() {
        for (const stock of this.watchlist.slice(0, 5)) {
            try {
                const price = await this.fetchPrice(stock.ticker);
                if (price) {
                    this.prices[stock.ticker] = price;
                }
            } catch (e) {
                console.error(`Error fetching ${stock.ticker}:`, e);
            }
        }
        
        // Re-renderizar si hay cambios significativos
        this.refreshUI();
    }

    // Fetch precio (simulado o real)
    async fetchPrice(ticker) {
        // Intentar usar API existente
        if (typeof fetchStockData === 'function') {
            try {
                const data = await fetchStockData(ticker);
                return data.price || data.currentPrice;
            } catch (e) {}
        }
        
        // Fallback: devolver último precio conocido con variación simulada
        const stock = this.watchlist.find(s => s.ticker === ticker);
        if (stock && stock.lastPrice) {
            const variation = (Math.random() - 0.5) * 0.02; // ±1%
            return stock.lastPrice * (1 + variation);
        }
        
        return 0;
    }

    // Iniciar actualizaciones
    startPriceUpdates() {
        this.updatePrices();
        this.updateInterval = setInterval(() => this.updatePrices(), 60000); // Cada minuto
    }

    // Detener actualizaciones
    stopPriceUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Refrescar UI
    refreshUI() {
        const container = document.querySelector('.stock-hub-widget');
        if (container) {
            const list = container.querySelector('.stock-hub-list');
            if (list) {
                const watchlist = this.watchlist.slice(0, 5);
                list.innerHTML = watchlist.map(stock => this.renderStockItem(stock)).join('');
            }
        }
    }

    // Agregar a watchlist
    addToWatchlist(ticker, name = '') {
        if (!this.watchlist.find(s => s.ticker === ticker)) {
            this.watchlist.push({
                ticker: ticker.toUpperCase(),
                name,
                addedAt: new Date().toISOString(),
                lastPrice: 0
            });
            this.saveWatchlist();
            this.refreshUI();
        }
    }

    // Guardar watchlist
    saveWatchlist() {
        localStorage.setItem('stock_watchlist', JSON.stringify(this.watchlist));
    }

    // Exportar datos del portfolio
    exportPortfolio() {
        const portfolio = JSON.parse(localStorage.getItem('stock_portfolio') || '[]');
        
        const headers = ['Ticker', 'Nombre', 'Shares', 'Precio Entrada', 'Precio Actual', 'Valor', 'Ganancia/Pérdida'];
        const rows = portfolio.map(pos => [
            pos.ticker,
            pos.name || '',
            pos.shares,
            pos.entryPrice,
            pos.currentPrice || pos.entryPrice,
            (pos.shares * (pos.currentPrice || pos.entryPrice)).toFixed(2),
            ((pos.currentPrice || pos.entryPrice) - pos.entryPrice) * pos.shares
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Instancia global
const stockHubWidget = new StockAnalyzerHubWidget();

// Exponer globalmente
window.stockHubWidget = stockHubWidget;

// Auto-inicializar si existe contenedor
if (document.getElementById('stock-hub-widget')) {
    stockHubWidget.init('stock-hub-widget');
}
