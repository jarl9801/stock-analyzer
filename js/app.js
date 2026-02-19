// ============================================
// APP.JS - Lógica Principal Mejorada
// ============================================

// Variables globales
let currentView = 'analyzer';
let currentStock = null;
let isLoading = false;

// ============================================
// Inicialización
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Stock Analyzer Pro initialized');
    
    // Setup navigation
    setupNavigation();
    
    // Setup market status
    updateMarketStatus();
    setInterval(updateMarketStatus, 60000); // Actualizar cada minuto
    
    // Setup search autocomplete
    setupSearchAutocomplete();
    
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
// Setup Search Autocomplete
// ============================================
function setupSearchAutocomplete() {
    const searchInput = document.getElementById('ticker-search');
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchStock();
        }
    });
}

// ============================================
// Buscar Stock (con datos automáticos)
// ============================================
async function searchStock() {
    const tickerInput = document.getElementById('ticker-search');
    const ticker = tickerInput.value.toUpperCase().trim();
    
    if (!ticker) {
        showNotification('Ingresa un ticker', 'error');
        return;
    }
    
    if (isLoading) return;
    isLoading = true;
    
    // Mostrar loading
    showLoading(true);
    
    try {
        // Obtener datos de la API
        console.log('[App] Fetching data for:', ticker);
        const data = await fetchStockData(ticker);
        console.log('[App] Data received:', data);
        
        currentStock = data;
        
        // Actualizar UI con los datos
        updateStockUI(data);
        
        // Mostrar contenido de análisis
        document.getElementById('analysis-content').style.display = 'grid';
        
        // Realizar análisis completo automáticamente
        showNotification('Calculando valoraciones avanzadas...', 'info');
        console.log('[App] Starting advanced analysis...');
        
        // Usar nuevos modelos de valoración
        const analysis = calculateAllAdvancedValuations(data);
        console.log('[App] Advanced analysis completed:', analysis);
        
        // Actualizar UI con resultados
        updateAdvancedValuationUI(analysis, data);
        
        showNotification(`${data.name} analizado con modelos avanzados`, 'success');
        
    } catch (error) {
        console.error('[App] Error:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// ============================================
// Actualizar UI con datos del stock
// ============================================
function updateStockUI(data) {
    // Header
    document.getElementById('stock-name').textContent = data.name;
    document.getElementById('stock-ticker').textContent = `${data.ticker} • ${data.sector} • ${data.currency}`;
    
    const priceSection = document.getElementById('stock-price-section');
    priceSection.style.display = 'block';
    
    document.getElementById('current-price').textContent = formatCurrency(data.price, data.currency);
    
    const changeEl = document.getElementById('price-change');
    const changePercent = data.changePercent || ((data.change / (data.price - data.change)) * 100);
    const changeSymbol = data.change >= 0 ? '▲' : '▼';
    
    changeEl.innerHTML = `${changeSymbol} ${formatCurrency(Math.abs(data.change))} (${Math.abs(changePercent).toFixed(2)}%)`;
    changeEl.className = `price-change ${data.change >= 0 ? 'positive' : 'negative'}`;
}

// ============================================
// Actualizar UI con valoraciones avanzadas
// ============================================
function updateAdvancedValuationUI(valuations, data) {
    console.log('[App] Updating UI with advanced valuations:', valuations);
    
    // Helper para setear valores de forma segura
    const setValue = (id, value, suffix = '') => {
        const el = document.getElementById(id);
        if (el) el.textContent = value !== null && value !== undefined ? value + suffix : '--';
    };
    
    const setInputValue = (id, value) => {
        const el = document.getElementById(id);
        if (el && value !== null && value !== undefined) el.value = value;
    };
    
    // 1. DCF MEJORADO
    if (valuations.dcf) {
        setInputValue('dcf-fcf', valuations.dcf.projectedFCF ? valuations.dcf.projectedFCF[0].toFixed(0) : (data.fcf / 1000000).toFixed(0));
        setInputValue('dcf-growth', (valuations.dcf.growthRate * 100).toFixed(1));
        setInputValue('dcf-wacc', (valuations.dcf.wacc * 100).toFixed(1));
        setInputValue('dcf-shares', (data.shares / 1000000).toFixed(0));
        setValue('dcf-value', '$' + valuations.dcf.valuePerShare.toFixed(2));
        setValue('dcf-upside', valuations.dcf.upside.toFixed(1), '%');
    }
    
    // 2. RESIDUAL INCOME MODEL
    if (valuations.rim) {
        setValue('rim-value', '$' + valuations.rim.valuePerShare.toFixed(2));
        setValue('rim-book', '$' + valuations.rim.bookValue.toFixed(2));
        setValue('rim-residual', '$' + valuations.rim.residualIncome.toFixed(2));
        setValue('rim-cost', (valuations.rim.costOfEquity * 100).toFixed(1), '%');
        setValue('rim-upside', valuations.rim.upside.toFixed(1), '%');
    }
    
    // 3. AEG (Abnormal Earnings Growth)
    if (valuations.aeg) {
        setValue('aeg-value', '$' + valuations.aeg.valuePerShare.toFixed(2));
        setValue('aeg-roe', (valuations.aeg.roe * 100).toFixed(1), '%');
        setValue('aeg-growth', '$' + valuations.aeg.abnormalGrowth.toFixed(2));
        setValue('aeg-upside', valuations.aeg.upside.toFixed(1), '%');
    }
    
    // 4. EVA
    if (valuations.eva) {
        setValue('eva-value', '$' + valuations.eva.valuePerShare.toFixed(2));
        setValue('eva-nopat', (valuations.eva.nopat / 1e9).toFixed(2), 'B');
        setValue('eva-wacc', (valuations.eva.wacc * 100).toFixed(1), '%');
        setValue('eva-amount', (valuations.eva.eva / 1e9).toFixed(2), 'B');
        setValue('eva-upside', valuations.eva.upside.toFixed(1), '%');
    }
    
    // 5. MÚLTIPLOS AJUSTADOS
    if (valuations.multiples) {
        setInputValue('mult-eps', data.eps.toFixed(2));
        setInputValue('mult-pe', valuations.multiples.peUsed.toFixed(1));
        setInputValue('mult-bv', data.bookValue.toFixed(2));
        setInputValue('mult-pb', valuations.multiples.pbUsed.toFixed(1));
        setValue('mult-pe-value', '$' + valuations.multiples.valuePE.toFixed(2));
        setValue('mult-pb-value', '$' + valuations.multiples.valuePB.toFixed(2));
        setValue('mult-avg-value', '$' + valuations.multiples.valueAvg.toFixed(2));
    }
    
    // RESUMEN FINAL
    if (valuations.fairValue) {
        setValue('fair-value', '$' + valuations.fairValue.toFixed(2));
        setValue('summary-current', '$' + data.price.toFixed(2));
        setValue('summary-fair', '$' + valuations.fairValue.toFixed(2));
        
        const upside = valuations.upside;
        const discountBadge = document.getElementById('discount-badge');
        if (discountBadge) {
            if (upside >= 0) {
                discountBadge.textContent = upside.toFixed(1) + '% Descuento';
                discountBadge.className = 'discount-badge';
            } else {
                discountBadge.textContent = Math.abs(upside).toFixed(1) + '% Sobrevalorada';
                discountBadge.className = 'discount-badge overvalued';
            }
        }
        
        // Recomendación
        const recEl = document.getElementById('recommendation');
        if (recEl) {
            let rec = '';
            let recClass = '';
            if (upside >= 25) { rec = '✅ COMPRAR FUERTE'; recClass = 'buy'; }
            else if (upside >= 15) { rec = '✅ COMPRAR'; recClass = 'buy'; }
            else if (upside >= 5) { rec = '🟡 COMPRAR CON CAUTELA'; recClass = 'hold'; }
            else if (upside > -10) { rec = '⏳ MANTENER'; recClass = 'hold'; }
            else { rec = '❌ VENDER'; recClass = 'sell'; }
            recEl.textContent = rec;
            recEl.className = 'recommendation ' + recClass;
        }
    }
    
    // Autollenar campos legacy para compatibilidad
    autoFillValuationFields(data);
}

// ============================================
// Auto-llenar campos de valoración (legacy)
// ============================================
function autoFillValuationFields(data) {
    // DCF Fields
    if (data.fcf && document.getElementById('dcf-fcf')) {
        document.getElementById('dcf-fcf').value = (data.fcf / 1000000).toFixed(0); // Convertir a millones
    }
    if (data.shares && document.getElementById('dcf-shares')) {
        document.getElementById('dcf-shares').value = (data.shares / 1000000).toFixed(0); // Convertir a millones
    }
    
    // DDM Fields
    if (data.dividend && document.getElementById('ddm-dividend')) {
        document.getElementById('ddm-dividend').value = data.dividend.toFixed(2);
    }
    
    // Multiples Fields
    if (data.eps && document.getElementById('mult-eps')) {
        document.getElementById('mult-eps').value = data.eps.toFixed(2);
    }
    if (data.bookValue && document.getElementById('mult-bv')) {
        document.getElementById('mult-bv').value = data.bookValue.toFixed(2);
    }
    if (data.pe && document.getElementById('mult-pe')) {
        document.getElementById('mult-pe').value = data.pe.toFixed(1);
    }
    if (data.pb && document.getElementById('mult-pb')) {
        document.getElementById('mult-pb').value = data.pb.toFixed(1);
    }
}

// ============================================
// Estado del Mercado
// ============================================
function updateMarketStatus() {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // NYSE: 14:30 - 21:00 UTC (9:30 AM - 4:00 PM ET)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21;
    
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
// Loading State
// ============================================
function showLoading(show) {
    const searchBtn = document.querySelector('.btn-search');
    if (show) {
        searchBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
        searchBtn.disabled = true;
    } else {
        searchBtn.innerHTML = '🔍';
        searchBtn.disabled = false;
    }
}

// ============================================
// Notificaciones
// ============================================
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: var(--accent-green-dim); color: var(--accent-green); border: 1px solid rgba(0, 208, 132, 0.3);' : 
          type === 'error' ? 'background: var(--accent-red-dim); color: var(--accent-red); border: 1px solid rgba(255, 71, 87, 0.3);' :
          'background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border);'}
    `;
    notif.textContent = message;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ============================================
// Screener
// ============================================
async function runScreener() {
    const market = document.getElementById('filter-market').value;
    const sector = document.getElementById('filter-sector').value;
    const peMax = parseFloat(document.getElementById('filter-pe').value);
    const dividendMin = parseFloat(document.getElementById('filter-dividend').value);
    const discountMin = parseFloat(document.getElementById('filter-discount').value);
    
    const container = document.getElementById('screener-results');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    // Lista de tickers populares para screener
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT', 
                     'JNJ', 'UNH', 'XOM', 'BAC', 'PG', 'HD', 'CVX', 'MA', 'LLY', 'ABBV'];
    
    try {
        // Obtener datos de todos los tickers
        const results = await Promise.all(
            tickers.map(async t => {
                try {
                    return await fetchStockData(t);
                } catch (e) {
                    return null;
                }
            })
        );
        
        let filtered = results.filter(r => r !== null);
        
        // Aplicar filtros
        if (sector && sector !== 'all') {
            const sectorMap = {
                'tech': 'Tecnología',
                'finance': 'Finanzas',
                'health': 'Salud',
                'consumer': 'Consumo',
                'energy': 'Energía'
            };
            filtered = filtered.filter(r => r.sector === sectorMap[sector]);
        }
        
        if (peMax) {
            filtered = filtered.filter(r => r.pe <= peMax);
        }
        
        if (dividendMin) {
            filtered = filtered.filter(r => (r.dividendYield || (r.dividend / r.price * 100)) >= dividendMin);
        }
        
        // Ordenar por descuento estimado (simulado)
        filtered.sort((a, b) => (b.pe - a.pe) - (a.pe - b.pe));
        
        if (filtered.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No se encontraron resultados con esos filtros</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="screener-table">
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Nombre</th>
                        <th>Sector</th>
                        <th>Precio</th>
                        <th>P/E</th>
                        <th>Div Yield</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(r => {
                        const divYield = r.dividend > 0 ? ((r.dividend / r.price) * 100).toFixed(2) : '0.00';
                        return `
                            <tr>
                                <td><strong>${r.ticker}</strong></td>
                                <td>${r.name}</td>
                                <td>${r.sector}</td>
                                <td>${formatCurrency(r.price)}</td>
                                <td>${r.pe.toFixed(1)}</td>
                                <td>${divYield}%</td>
                                <td>
                                    <button class="btn btn-sm" onclick="analyzeTicker('${r.ticker}')"
                                        style="padding: 8px 16px; font-size: 13px;">Analizar</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = '<p class="placeholder-text">Error al cargar datos. Intenta de nuevo.</p>';
    }
}

function analyzeTicker(ticker) {
    document.getElementById('ticker-search').value = ticker;
    searchStock();
    switchView('analyzer');
}

// ============================================
// Utilidades
// ============================================
function formatCurrency(num, currency = 'USD') {
    if (num === null || num === undefined) return 'N/A';
    const symbol = currency === 'USD' ? '$' : currency + ' ';
    return symbol + num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(decimals) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(decimals) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(decimals) + 'K';
    }
    
    return num.toFixed(decimals);
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

// ============================================
// Animaciones CSS
// ============================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
