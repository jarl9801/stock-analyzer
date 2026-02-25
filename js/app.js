// ============================================
// APP.JS - Lógica Principal Mejorada
// ============================================

// Variables globales
let currentView = 'analyzer';
let currentStock = null;
let isLoading = false;
// valuations declared in valuation.js (loaded first)

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
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.display = 'none';
    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(dropdown);

    let selectedIdx = -1;

    searchInput.addEventListener('input', function() {
        const query = this.value.toUpperCase().trim();
        if (!query || typeof STOCK_DATABASE === 'undefined') {
            dropdown.style.display = 'none';
            return;
        }

        const matches = Object.entries(STOCK_DATABASE)
            .filter(([ticker, data]) =>
                ticker.includes(query) ||
                (data.name && data.name.toUpperCase().includes(query))
            )
            .slice(0, 8);

        if (matches.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        selectedIdx = -1;
        dropdown.innerHTML = matches.map(([ticker, data], i) =>
            `<div class="autocomplete-item" data-ticker="${ticker}" data-index="${i}">
                <span class="ac-ticker">${ticker}</span>
                <span class="ac-name">${data.name}</span>
            </div>`
        ).join('');
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                searchInput.value = this.dataset.ticker;
                dropdown.style.display = 'none';
                searchStock();
            });
        });
    });

    searchInput.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        if (dropdown.style.display === 'none' || items.length === 0) {
            if (e.key === 'Enter') searchStock();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
            items.forEach((it, i) => it.classList.toggle('selected', i === selectedIdx));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIdx = Math.max(selectedIdx - 1, 0);
            items.forEach((it, i) => it.classList.toggle('selected', i === selectedIdx));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIdx >= 0 && items[selectedIdx]) {
                searchInput.value = items[selectedIdx].dataset.ticker;
                dropdown.style.display = 'none';
            }
            searchStock();
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    searchInput.addEventListener('blur', function() {
        setTimeout(() => { dropdown.style.display = 'none'; }, 150);
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
        
        // Price Chart
        if (typeof renderPriceChart === 'function') {
            renderPriceChart(data.ticker || ticker);
        }

        // FCF Deep Dive Analysis
        if (typeof performFCFAnalysis === 'function') {
            const fcfAnalysis = performFCFAnalysis(data);
            console.log('[App] FCF analysis completed:', fcfAnalysis);
            renderFCFSection(fcfAnalysis, data);
            updateStockHeaderFCF(fcfAnalysis);
            // Store for weighted valuation
            window._lastFCFAnalysis = fcfAnalysis;
        }
        
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
function updateAdvancedValuationUI(valuations_obj, data) {
    console.log('[App] Updating UI with advanced valuations:', valuations_obj);
    
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
    if (valuations_obj.dcf) {
        setInputValue('dcf-fcf', valuations_obj.dcf.projectedFCF ? valuations_obj.dcf.projectedFCF[0].toFixed(0) : (data.fcf / 1000000).toFixed(0));
        setInputValue('dcf-growth', (valuations_obj.dcf.growthRate * 100).toFixed(1));
        setInputValue('dcf-wacc', (valuations_obj.dcf.wacc * 100).toFixed(1));
        setInputValue('dcf-shares', (data.shares / 1000000).toFixed(0));
        setValue('dcf-value', '$' + valuations_obj.dcf.valuePerShare.toFixed(2));
        setValue('dcf-upside', valuations_obj.dcf.upside.toFixed(1), '%');
    }
    
    // 2. RESIDUAL INCOME MODEL
    if (valuations_obj.rim) {
        setValue('rim-value', '$' + valuations_obj.rim.valuePerShare.toFixed(2));
        setValue('rim-book', '$' + valuations_obj.rim.bookValue.toFixed(2));
        setValue('rim-residual', '$' + valuations_obj.rim.residualIncome.toFixed(2));
        setValue('rim-cost', (valuations_obj.rim.costOfEquity * 100).toFixed(1), '%');
        setValue('rim-upside', valuations_obj.rim.upside.toFixed(1), '%');
    }
    
    // 3. AEG (Abnormal Earnings Growth)
    if (valuations_obj.aeg) {
        setValue('aeg-value', '$' + valuations_obj.aeg.valuePerShare.toFixed(2));
        setValue('aeg-roe', (valuations_obj.aeg.roe * 100).toFixed(1), '%');
        setValue('aeg-growth', '$' + valuations_obj.aeg.abnormalGrowth.toFixed(2));
        setValue('aeg-upside', valuations_obj.aeg.upside.toFixed(1), '%');
    }
    
    // 4. EVA
    if (valuations_obj.eva) {
        setValue('eva-value', '$' + valuations_obj.eva.valuePerShare.toFixed(2));
        setValue('eva-nopat', (valuations_obj.eva.nopat / 1e9).toFixed(2), 'B');
        setValue('eva-wacc', (valuations_obj.eva.wacc * 100).toFixed(1), '%');
        setValue('eva-amount', (valuations_obj.eva.eva / 1e9).toFixed(2), 'B');
        setValue('eva-upside', valuations_obj.eva.upside.toFixed(1), '%');
    }
    
    // 5. MÚLTIPLOS AJUSTADOS
    if (valuations_obj.multiples) {
        setInputValue('mult-eps', data.eps.toFixed(2));
        setInputValue('mult-pe', valuations_obj.multiples.peUsed.toFixed(1));
        setInputValue('mult-bv', data.bookValue.toFixed(2));
        setInputValue('mult-pb', valuations_obj.multiples.pbUsed.toFixed(1));
        setValue('mult-pe-value', '$' + valuations_obj.multiples.valuePE.toFixed(2));
        setValue('mult-pb-value', '$' + valuations_obj.multiples.valuePB.toFixed(2));
        setValue('mult-avg-value', '$' + valuations_obj.multiples.valueAvg.toFixed(2));
    }
    
    // RESUMEN FINAL
    if (valuations_obj.fairValue) {
        setValue('fair-value', '$' + valuations_obj.fairValue.toFixed(2));
        setValue('summary-current', '$' + data.price.toFixed(2));
        setValue('summary-fair', '$' + valuations_obj.fairValue.toFixed(2));
        
        const upside = valuations_obj.upside;
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
    
    // Store globally for portfolio.js / risk-analysis.js compatibility
    valuations = {
        dcf: valuations_obj.dcf,
        ddm: null,
        multiples: valuations_obj.multiples,
        rim: valuations_obj.rim,
        aeg: valuations_obj.aeg,
        eva: valuations_obj.eva
    };

    // Calculate DDM separately (not in advanced-valuation.js)
    if (typeof calculateDDMAuto === 'function') {
        const ddm = calculateDDMAuto(data);
        valuations.ddm = ddm;
        if (ddm) {
            const setInputValue = (id, value) => { const el = document.getElementById(id); if (el && value != null) el.value = value; };
            setInputValue('ddm-dividend', data.dividend.toFixed(2));
            setInputValue('ddm-growth', (ddm.growthRate * 100).toFixed(1));
            setInputValue('ddm-discount', (ddm.discountRate * 100).toFixed(1));
            setValue('ddm-value', '$' + ddm.valuePerShare.toFixed(2));
            setValue('ddm-yield', ddm.yieldAtFairValue.toFixed(2) + '%');
        }
    }

    // Sensitivity table
    if (valuations_obj.dcf && typeof updateSensitivityTable === 'function') {
        updateSensitivityTable(valuations_obj.dcf, data);
    }

    // Risk metrics
    if (typeof calculateAutoRiskMetrics === 'function' && typeof updateAutoRiskUI === 'function') {
        const riskMetrics = calculateAutoRiskMetrics(data, valuations_obj);
        updateAutoRiskUI(riskMetrics);
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
        searchBtn.innerHTML = 'GO';
        searchBtn.disabled = false;
    }
}

// ============================================
// Notificaciones
// ============================================
let _notifContainer = null;
function showNotification(message, type = 'info') {
    // Reuse single notification element — no stacking
    if (!_notifContainer) {
        _notifContainer = document.createElement('div');
        _notifContainer.id = 'app-notif';
        _notifContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1000;display:flex;flex-direction:column;gap:6px;pointer-events:none;';
        document.body.appendChild(_notifContainer);
    }
    // Remove previous if same type (avoid stacking info→info)
    const prev = _notifContainer.querySelector(`.notif-${type}`);
    if (prev) prev.remove();

    const notif = document.createElement('div');
    notif.className = `notif-${type}`;
    const colors = {
        success: 'background:rgba(0,255,0,0.12);color:#00FF00;border:1px solid rgba(0,255,0,0.3);',
        error:   'background:rgba(255,51,51,0.12);color:#FF3333;border:1px solid rgba(255,51,51,0.3);',
        info:    'background:rgba(255,140,0,0.12);color:#FF8C00;border:1px solid rgba(255,140,0,0.3);'
    };
    notif.style.cssText = `padding:10px 18px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;pointer-events:auto;${colors[type]||colors.info}`;
    notif.textContent = message;
    _notifContainer.appendChild(notif);
    setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.3s'; setTimeout(() => notif.remove(), 300); }, 3000);
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
