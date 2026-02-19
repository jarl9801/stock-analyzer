// ============================================
// VALUATION.JS - Métodos de Valoración
// ============================================

// Variables globales - currentStock se define en app.js
let valuations = {
    dcf: null,
    ddm: null,
    multiples: null
};

// ============================================
// Helper functions
// ============================================
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '$--';
    return '$' + value.toFixed(2);
}

function formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return '--%';
    return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
}

// ============================================
// DCF - Discounted Cash Flow
// ============================================
function calculateDCF() {
    const fcfInput = document.getElementById('dcf-fcf').value;
    const growthInput = document.getElementById('dcf-growth').value;
    const terminalInput = document.getElementById('dcf-terminal').value;
    const waccInput = document.getElementById('dcf-wacc').value;
    const sharesInput = document.getElementById('dcf-shares').value;
    
    const fcf = parseFloat(fcfInput);
    const growthRate = parseFloat(growthInput) / 100;
    const terminalGrowth = parseFloat(terminalInput) / 100;
    const wacc = parseFloat(waccInput) / 100;
    const shares = parseFloat(sharesInput);
    
    if (!fcf || !shares || isNaN(fcf) || isNaN(shares)) {
        alert('Por favor completa FCF y número de acciones');
        return;
    }
    
    // Proyección de FCF por 5 años
    let projectedFCF = [];
    let currentFCF = fcf;
    
    for (let i = 0; i < 5; i++) {
        currentFCF = currentFCF * (1 + growthRate);
        projectedFCF.push(currentFCF);
    }
    
    // Valor presente de FCF proyectados
    let pvFCF = 0;
    for (let i = 0; i < 5; i++) {
        pvFCF += projectedFCF[i] / Math.pow(1 + wacc, i + 1);
    }
    
    // Terminal Value (Gordon Growth Model)
    const terminalFCF = projectedFCF[4] * (1 + terminalGrowth);
    const terminalValue = terminalFCF / (wacc - terminalGrowth);
    const pvTerminalValue = terminalValue / Math.pow(1 + wacc, 5);
    
    // Enterprise Value
    const enterpriseValue = pvFCF + pvTerminalValue;
    
    // Valor por acción
    const valuePerShare = enterpriseValue / shares;
    
    // Calcular upside/downside
    const currentPrice = currentStock?.price || 0;
    const upside = currentPrice ? ((valuePerShare - currentPrice) / currentPrice) * 100 : 0;
    
    // Guardar resultado
    valuations.dcf = {
        valuePerShare: valuePerShare,
        enterpriseValue: enterpriseValue,
        pvFCF: pvFCF,
        pvTerminalValue: pvTerminalValue,
        upside: upside,
        projectedFCF: projectedFCF
    };
    
    // Actualizar UI
    document.getElementById('dcf-value').textContent = `$${valuePerShare.toFixed(2)}`;
    
    const upsideEl = document.getElementById('dcf-upside');
    upsideEl.textContent = `${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%`;
    upsideEl.className = upside >= 0 ? 'positive' : 'negative';
    
    // Actualizar análisis de sensibilidad
    updateSensitivityAnalysis();
    
    // Actualizar resumen
    updateValuationSummary();
    
    // Actualizar análisis de riesgo
    if (typeof updateRiskAnalysis === 'function') {
        updateRiskAnalysis();
    }
}

// ============================================
// DDM - Dividend Discount Model
// ============================================
function calculateDDM() {
    const dividend = parseFloat(document.getElementById('ddm-dividend').value);
    const growthRate = parseFloat(document.getElementById('ddm-growth').value) / 100;
    const discountRate = parseFloat(document.getElementById('ddm-discount').value) / 100;
    
    if (!dividend) {
        alert('Por favor ingresa el dividendo anual');
        return;
    }
    
    // Modelo Gordon Growth
    // Valor = D1 / (r - g)
    // Donde D1 = D0 * (1 + g)
    
    if (discountRate <= growthRate) {
        alert('La tasa de descuento debe ser mayor que el crecimiento');
        return;
    }
    
    const d1 = dividend * (1 + growthRate);
    const valuePerShare = d1 / (discountRate - growthRate);
    
    // Yield al valor justo
    const yieldAtFairValue = (dividend / valuePerShare) * 100;
    
    // Calcular upside
    const currentPrice = currentStock?.price || 0;
    const upside = currentPrice ? ((valuePerShare - currentPrice) / currentPrice) * 100 : 0;
    
    // Guardar resultado
    valuations.ddm = {
        valuePerShare: valuePerShare,
        dividend: dividend,
        growthRate: growthRate,
        discountRate: discountRate,
        yieldAtFairValue: yieldAtFairValue,
        upside: upside
    };
    
    // Actualizar UI
    document.getElementById('ddm-value').textContent = `$${valuePerShare.toFixed(2)}`;
    document.getElementById('ddm-yield').textContent = `${yieldAtFairValue.toFixed(2)}%`;
    
    // Actualizar resumen
    updateValuationSummary();
    
    // Actualizar análisis de riesgo
    updateRiskAnalysis();
}

// ============================================
// Múltiplos Comparables
// ============================================
function calculateMultiples() {
    const eps = parseFloat(document.getElementById('mult-eps').value);
    const peSector = parseFloat(document.getElementById('mult-pe').value);
    const bookValue = parseFloat(document.getElementById('mult-bv').value);
    const pbSector = parseFloat(document.getElementById('mult-pb').value);
    
    if (!eps || !bookValue) {
        alert('Por favor completa EPS y Book Value');
        return;
    }
    
    // Valor por P/E
    const valuePE = eps * peSector;
    
    // Valor por P/B
    const valuePB = bookValue * pbSector;
    
    // Promedio
    const valueAvg = (valuePE + valuePB) / 2;
    
    // Calcular upside
    const currentPrice = currentStock?.price || 0;
    const upside = currentPrice ? ((valueAvg - currentPrice) / currentPrice) * 100 : 0;
    
    // Guardar resultado
    valuations.multiples = {
        valuePE: valuePE,
        valuePB: valuePB,
        valueAvg: valueAvg,
        eps: eps,
        bookValue: bookValue,
        peSector: peSector,
        pbSector: pbSector,
        upside: upside
    };
    
    // Actualizar UI
    document.getElementById('mult-pe-value').textContent = `$${valuePE.toFixed(2)}`;
    document.getElementById('mult-pb-value').textContent = `$${valuePB.toFixed(2)}`;
    document.getElementById('mult-avg-value').textContent = `$${valueAvg.toFixed(2)}`;
    
    // Actualizar resumen
    updateValuationSummary();
    
    // Actualizar análisis de riesgo
    updateRiskAnalysis();
}

// ============================================
// Resumen de Valoración
// ============================================
function updateValuationSummary() {
    const values = [];
    
    if (valuations.dcf) values.push(valuations.dcf.valuePerShare);
    if (valuations.ddm) values.push(valuations.ddm.valuePerShare);
    if (valuations.multiples) values.push(valuations.multiples.valueAvg);
    
    if (values.length === 0) return;
    
    // Promedio ponderado (DCF 50%, Multiples 30%, DDM 20%)
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
    
    const fairValue = weightedSum / weights;
    const currentPrice = currentStock?.price || 0;
    
    // Actualizar UI
    document.getElementById('fair-value').textContent = `$${fairValue.toFixed(2)}`;
    document.getElementById('summary-current').textContent = `$${currentPrice.toFixed(2)}`;
    document.getElementById('summary-fair').textContent = `$${fairValue.toFixed(2)}`;
    
    // Calcular descuento/prima
    const discount = ((fairValue - currentPrice) / currentPrice) * 100;
    const discountBadge = document.getElementById('discount-badge');
    
    if (discount >= 0) {
        discountBadge.textContent = `${discount.toFixed(1)}% Descuento`;
        discountBadge.className = 'discount-badge';
    } else {
        discountBadge.textContent = `${Math.abs(discount).toFixed(1)}% Sobrevalorada`;
        discountBadge.className = 'discount-badge overvalued';
    }
    
    // Recomendación
    const recommendationEl = document.getElementById('recommendation');
    
    if (discount >= 20) {
        recommendationEl.textContent = '✅ COMPRAR - Descuento significativo vs valor intrínseco';
        recommendationEl.className = 'recommendation buy';
    } else if (discount >= 5) {
        recommendationEl.textContent = '🟡 COMPRAR CON CAUTELA - Ligero descuento';
        recommendationEl.className = 'recommendation hold';
    } else if (discount > -10) {
        recommendationEl.textContent = '⏳ MANTENER - Precio cercano al valor justo';
        recommendationEl.className = 'recommendation hold';
    } else {
        recommendationEl.textContent = '❌ VENDER - Acción sobrevalorada';
        recommendationEl.className = 'recommendation sell';
    }
}

// ============================================
// Análisis de Sensibilidad
// ============================================
function updateSensitivityAnalysis() {
    if (!valuations.dcf) return;
    
    const waccBase = parseFloat(document.getElementById('dcf-wacc').value);
    const growthBase = parseFloat(document.getElementById('dcf-growth').value);
    const fcf = parseFloat(document.getElementById('dcf-fcf').value);
    const shares = parseFloat(document.getElementById('dcf-shares').value);
    const terminalGrowth = parseFloat(document.getElementById('dcf-terminal').value) / 100;
    
    // Crear tabla de sensibilidad
    const waccRange = [waccBase - 2, waccBase - 1, waccBase, waccBase + 1, waccBase + 2];
    const growthRange = [growthBase - 2, growthBase - 1, growthBase, growthBase + 1, growthBase + 2];
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>WACC \\ Growth</th>
                    ${growthRange.map(g => `<th>${g.toFixed(1)}%</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const wacc of waccRange) {
        tableHTML += `<tr><td><strong>${wacc.toFixed(1)}%</strong></td>`;
        
        for (const growth of growthRange) {
            const waccDecimal = wacc / 100;
            const growthDecimal = growth / 100;
            
            // Recalcular valor
            let projectedFCF = [];
            let currentFCF = fcf;
            
            for (let i = 0; i < 5; i++) {
                currentFCF = currentFCF * (1 + growthDecimal);
                projectedFCF.push(currentFCF);
            }
            
            let pvFCF = 0;
            for (let i = 0; i < 5; i++) {
                pvFCF += projectedFCF[i] / Math.pow(1 + waccDecimal, i + 1);
            }
            
            const terminalFCF = projectedFCF[4] * (1 + terminalGrowth);
            const terminalValue = terminalFCF / (waccDecimal - terminalGrowth);
            const pvTerminalValue = terminalValue / Math.pow(1 + waccDecimal, 5);
            
            const enterpriseValue = pvFCF + pvTerminalValue;
            const valuePerShare = enterpriseValue / shares;
            
            // Color coding
            const currentPrice = currentStock?.price || 0;
            const upside = ((valuePerShare - currentPrice) / currentPrice) * 100;
            
            let colorClass = '';
            if (upside >= 20) colorClass = 'style="color: var(--accent-green)"';
            else if (upside >= 5) colorClass = 'style="color: #90EE90"';
            else if (upside > -10) colorClass = 'style="color: var(--accent-yellow)"';
            else colorClass = 'style="color: var(--accent-red)"';
            
            tableHTML += `<td ${colorClass}>$${valuePerShare.toFixed(0)}</td>`;
        }
        
        tableHTML += '</tr>';
    }
    
    tableHTML += '</tbody></table>';
    
    document.getElementById('sensitivity-table').innerHTML = tableHTML;
}

// ============================================
// Búsqueda de Stock
// ============================================
async function searchStock() {
    const ticker = document.getElementById('ticker-search').value.toUpperCase().trim();
    
    if (!ticker) {
        alert('Ingresa un ticker');
        return;
    }
    
    // Obtener datos reales desde la base de datos
    try {
        const stockData = await fetchStockData(ticker);
        
        if (!stockData) {
            alert(`No se encontraron datos para ${ticker}`);
            return;
        }
        
        // Guardar stock actual
        currentStock = {
            ticker: ticker,
            name: stockData.name,
            price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent,
            sector: stockData.sector,
            ...stockData
        };
        
        // Actualizar UI del header
        document.getElementById('stock-name').textContent = currentStock.name;
        document.getElementById('stock-ticker').textContent = `${currentStock.ticker} • ${currentStock.sector}`;
        
        const priceSection = document.getElementById('stock-price-section');
        priceSection.style.display = 'block';
        
        document.getElementById('current-price').textContent = `$${currentStock.price.toFixed(2)}`;
        
        const changeEl = document.getElementById('price-change');
        const changePercent = currentStock.changePercent || ((currentStock.change / currentStock.price) * 100);
        changeEl.textContent = `${currentStock.change >= 0 ? '+' : ''}${currentStock.change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
        changeEl.className = `price-change ${currentStock.change >= 0 ? 'positive' : 'negative'}`;
        
        // Mostrar contenido de análisis
        document.getElementById('analysis-content').style.display = 'grid';
        
        // Resetear valoraciones
        valuations = { dcf: null, ddm: null, multiples: null };
        
        // AUTOCOMPLETAR TODOS LOS CAMPOS CON DATOS REALES
        await performFullAnalysis(stockData);
        
        // Actualizar resumen
        updateValuationSummary();
        
    } catch (error) {
        console.error('Error fetching stock data:', error);
        alert(`Error al obtener datos para ${ticker}`);
    }
}

// Helper functions
function getCompanyName(ticker) {
    const names = {
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft Corporation',
        'GOOGL': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.',
        'TSLA': 'Tesla Inc.',
        'META': 'Meta Platforms Inc.',
        'NVDA': 'NVIDIA Corporation',
        'JPM': 'JPMorgan Chase & Co.',
        'V': 'Visa Inc.',
        'WMT': 'Walmart Inc.'
    };
    return names[ticker] || `${ticker} Corp.`;
}

function getSector(ticker) {
    const sectors = {
        'AAPL': 'Tecnología',
        'MSFT': 'Tecnología',
        'GOOGL': 'Tecnología',
        'AMZN': 'Consumo',
        'TSLA': 'Automotriz',
        'META': 'Tecnología',
        'NVDA': 'Tecnología',
        'JPM': 'Finanzas',
        'V': 'Finanzas',
        'WMT': 'Consumo'
    };
    return sectors[ticker] || 'Diversificado';
}

function getRandomPrice(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomChange() {
    return (Math.random() - 0.5) * 20;
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateDCF,
        calculateDDM,
        calculateMultiples,
        updateValuationSummary
    };
}
