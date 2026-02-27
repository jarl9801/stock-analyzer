// ============================================
// EXPORT SYSTEM — Stock Analyzer
// Exportar análisis, portfolio y watchlist
// ============================================

const StockExport = {
    // Exportar análisis actual a PDF/Excel
    exportAnalysis(format = 'pdf') {
        const ticker = document.getElementById('ticker-search')?.value;
        if (!ticker) {
            alert('Busca un stock primero');
            return;
        }

        const data = this.gatherAnalysisData(ticker);
        
        if (format === 'pdf') {
            this.exportToPDF(data);
        } else if (format === 'excel') {
            this.exportToExcel(data);
        } else if (format === 'json') {
            this.exportToJSON(data);
        }
    },

    // Recopilar datos del análisis
    gatherAnalysisData(ticker) {
        // Intentar obtener datos del DOM o variables globales
        const price = document.getElementById('stock-price')?.textContent || 'N/A';
        const change = document.getElementById('stock-change')?.textContent || 'N/A';
        const marketCap = document.getElementById('market-cap')?.textContent || 'N/A';
        const pe = document.getElementById('pe-ratio')?.textContent || 'N/A';
        
        // Valuación si existe
        const valuation = window.currentValuation || {};
        
        return {
            ticker: ticker.toUpperCase(),
            date: new Date().toISOString(),
            price,
            change,
            metrics: {
                marketCap,
                pe,
                eps: document.getElementById('eps')?.textContent || 'N/A',
                dividend: document.getElementById('dividend')?.textContent || 'N/A',
                beta: document.getElementById('beta')?.textContent || 'N/A'
            },
            valuation: {
                fairValue: valuation.fairValue || 'N/A',
                upside: valuation.upside || 'N/A',
                method: valuation.method || 'N/A'
            },
            recommendation: this.getRecommendation(valuation)
        };
    },

    // Obtener recomendación
    getRecommendation(valuation) {
        if (!valuation.upside) return 'NEUTRAL';
        const upside = parseFloat(valuation.upside);
        if (upside > 20) return 'STRONG BUY';
        if (upside > 10) return 'BUY';
        if (upside < -20) return 'STRONG SELL';
        if (upside < -10) return 'SELL';
        return 'HOLD';
    },

    // Exportar a PDF (usando jsPDF si está disponible, o imprimir)
    exportToPDF(data) {
        // Crear ventana de impresión formateada
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Análisis ${data.ticker}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #0a84ff; }
                    .header { border-bottom: 2px solid #0a84ff; padding-bottom: 20px; margin-bottom: 30px; }
                    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                    .metric { padding: 15px; background: #f5f5f5; border-radius: 8px; }
                    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
                    .metric-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
                    .recommendation { padding: 20px; background: ${data.recommendation.includes('BUY') ? '#d4edda' : data.recommendation.includes('SELL') ? '#f8d7da' : '#fff3cd'}; 
                                      border-radius: 8px; margin-top: 30px; text-align: center; }
                    .recommendation-text { font-size: 32px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📈 Stock Analyzer Pro</h1>
                    <p>Reporte de Análisis — ${new Date().toLocaleDateString()}</p>
                </div>
                
                <h2>${data.ticker}</h2>
                <p>Precio actual: <strong>${data.price}</strong> (${data.change})</p>
                
                <div class="metrics">
                    <div class="metric">
                        <div class="metric-label">Market Cap</div>
                        <div class="metric-value">${data.metrics.marketCap}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">P/E Ratio</div>
                        <div class="metric-value">${data.metrics.pe}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">EPS</div>
                        <div class="metric-value">${data.metrics.eps}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Dividendo</div>
                        <div class="metric-value">${data.metrics.dividend}</div>
                    </div>
                </div>
                
                <div class="recommendation">
                    <div class="metric-label">Recomendación</div>
                    <div class="recommendation-text">${data.recommendation}</div>
                    ${data.valuation.fairValue !== 'N/A' ? `<p>Valor justo estimado: ${data.valuation.fairValue}</p>` : ''}
                </div>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                    <p>Disclaimer: Este análisis es solo informativo. No constituye asesoramiento financiero.</p>
                    <p>Generado por Stock Analyzer Pro — ${new Date().toLocaleString()}</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    },

    // Exportar a Excel (CSV)
    exportToExcel(data) {
        const headers = ['Ticker', 'Fecha', 'Precio', 'Cambio', 'Market Cap', 'P/E', 'EPS', 'Dividendo', 'Valor Justo', 'Recomendación'];
        const row = [
            data.ticker,
            data.date,
            data.price,
            data.change,
            data.metrics.marketCap,
            data.metrics.pe,
            data.metrics.eps,
            data.metrics.dividend,
            data.valuation.fairValue,
            data.recommendation
        ];

        const csv = [headers.join(','), row.join(',')].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analisis_${data.ticker}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Exportar a JSON
    exportToJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analisis_${data.ticker}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Exportar portfolio completo
    exportPortfolio(format = 'csv') {
        const portfolio = JSON.parse(localStorage.getItem('stock_portfolio') || '[]');
        
        if (portfolio.length === 0) {
            alert('No hay posiciones en el portfolio');
            return;
        }

        if (format === 'csv') {
            const headers = ['Ticker', 'Nombre', 'Shares', 'Precio Entrada', 'Precio Actual', 'Valor Total', 'G/P', 'G/P %'];
            const rows = portfolio.map(pos => {
                const currentPrice = pos.currentPrice || pos.entryPrice;
                const value = pos.shares * currentPrice;
                const cost = pos.shares * pos.entryPrice;
                const pl = value - cost;
                const plPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice * 100).toFixed(2);
                
                return [
                    pos.ticker,
                    pos.name || '',
                    pos.shares,
                    pos.entryPrice.toFixed(2),
                    currentPrice.toFixed(2),
                    value.toFixed(2),
                    pl.toFixed(2),
                    plPercent + '%'
                ];
            });

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            this.downloadFile(csv, 'portfolio.csv', 'text/csv');
        } else if (format === 'json') {
            this.downloadFile(JSON.stringify(portfolio, null, 2), 'portfolio.json', 'application/json');
        }
    },

    // Helper para descargar archivo
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Exponer globalmente
window.StockExport = StockExport;
window.exportAnalysis = (format) => StockExport.exportAnalysis(format);
window.exportPortfolio = (format) => StockExport.exportPortfolio(format);
