// ============================================
// AUTO-VALUATION.JS - Cálculo automático de valoraciones
// ============================================

// ============================================
// Calcular DCF automáticamente
// ============================================
function calculateDCFAuto(data) {
    if (!data || !data.fcf || !data.shares) {
        return null;
    }
    
    // Convertir a millones si es necesario
    const fcf = data.fcf > 1000000000 ? data.fcf / 1000000 : data.fcf;
    const shares = data.shares > 1000000000 ? data.shares / 1000000 : data.shares;
    
    // Estimaciones basadas en sector
    const sectorGrowth = {
        'Tecnología': 0.12,
        'Finanzas': 0.06,
        'Salud': 0.08,
        'Consumo': 0.05,
        'Energía': 0.04,
        'Automotriz': 0.08,
        'Industriales': 0.06
    };
    
    const growthRate = sectorGrowth[data.sector] || 0.08;
    const terminalGrowth = 0.025; // 2.5% crecimiento terminal
    const wacc = 0.095; // 9.5% WACC promedio
    
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
    
    // Terminal Value
    const terminalFCF = projectedFCF[4] * (1 + terminalGrowth);
    const terminalValue = terminalFCF / (wacc - terminalGrowth);
    const pvTerminalValue = terminalValue / Math.pow(1 + wacc, 5);
    
    // Enterprise Value
    const enterpriseValue = pvFCF + pvTerminalValue;
    
    // Ajustar por net cash/debt
    const netCash = (data.cash || 0) - (data.debt || 0);
    const equityValue = enterpriseValue + (netCash / 1000000); // Convertir a millones
    
    // Valor por acción
    const valuePerShare = equityValue / shares;
    
    // Calcular upside
    const upside = data.price ? ((valuePerShare - data.price) / data.price) * 100 : 0;
    
    return {
        valuePerShare: valuePerShare,
        enterpriseValue: enterpriseValue,
        pvFCF: pvFCF,
        pvTerminalValue: pvTerminalValue,
        upside: upside,
        growthRate: growthRate,
        terminalGrowth: terminalGrowth,
        wacc: wacc,
        projectedFCF: projectedFCF,
        assumptions: {
            growthRate: growthRate,
            terminalGrowth: terminalGrowth,
            wacc: wacc
        }
    };
}

// ============================================
// Calcular DDM automáticamente
// ============================================
function calculateDDMAuto(data) {
    if (!data || !data.dividend || data.dividend === 0) {
        return null;
    }
    
    const dividend = data.dividend;
    
    // Estimar crecimiento de dividendos por sector
    const sectorDivGrowth = {
        'Tecnología': 0.08,
        'Finanzas': 0.05,
        'Salud': 0.06,
        'Consumo': 0.04,
        'Energía': 0.03,
        'Automotriz': 0.05,
        'Industriales': 0.04
    };
    
    const growthRate = sectorDivGrowth[data.sector] || 0.05;
    
    // CAPM para tasa de descuento
    // r = rf + β * (rm - rf)
    const riskFreeRate = 0.04; // 4% T-bill
    const marketReturn = 0.10; // 10% retorno mercado
    const beta = data.beta || 1.0;
    const discountRate = riskFreeRate + beta * (marketReturn - riskFreeRate);
    
    // Verificar que descuento > crecimiento
    if (discountRate <= growthRate) {
        return null;
    }
    
    // Modelo Gordon: P = D1 / (r - g)
    const d1 = dividend * (1 + growthRate);
    const valuePerShare = d1 / (discountRate - growthRate);
    
    // Yield al valor justo
    const yieldAtFairValue = (dividend / valuePerShare) * 100;
    
    // Upside
    const upside = data.price ? ((valuePerShare - data.price) / data.price) * 100 : 0;
    
    return {
        valuePerShare: valuePerShare,
        dividend: dividend,
        growthRate: growthRate,
        discountRate: discountRate,
        yieldAtFairValue: yieldAtFairValue,
        upside: upside,
        assumptions: {
            growthRate: growthRate,
            discountRate: discountRate,
            riskFreeRate: riskFreeRate,
            marketReturn: marketReturn,
            beta: beta
        }
    };
}

// ============================================
// Calcular Múltiplos automáticamente
// ============================================
function calculateMultiplesAuto(data) {
    if (!data || !data.eps || !data.bookValue) {
        return null;
    }
    
    // P/E promedio por sector
    const sectorPE = {
        'Tecnología': 25,
        'Finanzas': 12,
        'Salud': 20,
        'Consumo': 18,
        'Energía': 10,
        'Automotriz': 15,
        'Industriales': 16
    };
    
    // P/B promedio por sector
    const sectorPB = {
        'Tecnología': 6,
        'Finanzas': 1.2,
        'Salud': 4,
        'Consumo': 3,
        'Energía': 1.5,
        'Automotriz': 2,
        'Industriales': 2.5
    };
    
    const peSector = sectorPE[data.sector] || 18;
    const pbSector = sectorPB[data.sector] || 2.5;
    
    // Ajustar P/E por crecimiento (PEG ratio)
    const growthRate = data.sector === 'Tecnología' ? 0.12 : 
                       data.sector === 'Finanzas' ? 0.06 : 0.08;
    const peg = data.pe / (growthRate * 100);
    let adjustedPE = peSector;
    
    if (peg < 1) adjustedPE *= 1.1; // Premium por bajo PEG
    else if (peg > 2) adjustedPE *= 0.9; // Descuento por alto PEG
    
    // Valor por P/E
    const valuePE = data.eps * adjustedPE;
    
    // Valor por P/B
    const valuePB = data.bookValue * pbSector;
    
    // Valor por EV/EBITDA (si tenemos datos)
    let valueEVEBITDA = null;
    if (data.marketCap && data.debt && data.cash && data.revenue) {
        const ev = data.marketCap + data.debt - data.cash;
        const ebitda = data.revenue * 0.15; // Estimación
        const evEbitdaSector = data.sector === 'Tecnología' ? 18 : 
                               data.sector === 'Finanzas' ? 10 : 12;
        const impliedEbitda = ev / evEbitdaSector;
        const targetEV = impliedEbitda * evEbitdaSector;
        const equityValue = targetEV - data.debt + data.cash;
        valueEVEBITDA = equityValue / data.shares;
    }
    
    // Promedio ponderado
    let weightedValue = (valuePE * 0.5) + (valuePB * 0.3);
    if (valueEVEBITDA) {
        weightedValue += valueEVEBITDA * 0.2;
    } else {
        weightedValue = weightedValue / 0.8; // Normalizar
    }
    
    // Upside
    const upside = data.price ? ((weightedValue - data.price) / data.price) * 100 : 0;
    
    return {
        valuePE: valuePE,
        valuePB: valuePB,
        valueEVEBITDA: valueEVEBITDA,
        valueAvg: weightedValue,
        peUsed: adjustedPE,
        pbUsed: pbSector,
        upside: upside,
        assumptions: {
            peSector: peSector,
            pbSector: pbSector,
            pegRatio: peg
        }
    };
}

// ============================================
// Calcular todas las valoraciones
// ============================================
function calculateAllValuations(data) {
    const valuations = {
        dcf: calculateDCFAuto(data),
        ddm: calculateDDMAuto(data),
        multiples: calculateMultiplesAuto(data)
    };
    
    // Calcular valor intrínseco ponderado
    let weightedSum = 0;
    let totalWeight = 0;
    
    if (valuations.dcf) {
        weightedSum += valuations.dcf.valuePerShare * 0.5;
        totalWeight += 0.5;
    }
    
    if (valuations.multiples) {
        weightedSum += valuations.multiples.valueAvg * 0.3;
        totalWeight += 0.3;
    }
    
    if (valuations.ddm) {
        weightedSum += valuations.ddm.valuePerShare * 0.2;
        totalWeight += 0.2;
    }
    
    const fairValue = totalWeight > 0 ? weightedSum / totalWeight : null;
    
    return {
        ...valuations,
        fairValue: fairValue,
        upside: fairValue && data.price ? ((fairValue - data.price) / data.price) * 100 : null
    };
}

// ============================================
// Actualizar UI con valoraciones automáticas
// ============================================
function updateAutoValuationUI(valuations, data) {
    // Actualizar campos DCF
    if (valuations.dcf) {
        document.getElementById('dcf-fcf').value = (data.fcf / 1000000).toFixed(0);
        document.getElementById('dcf-growth').value = (valuations.dcf.growthRate * 100).toFixed(1);
        document.getElementById('dcf-terminal').value = (valuations.dcf.terminalGrowth * 100).toFixed(1);
        document.getElementById('dcf-wacc').value = (valuations.dcf.wacc * 100).toFixed(1);
        document.getElementById('dcf-shares').value = (data.shares / 1000000).toFixed(0);
        
        document.getElementById('dcf-value').textContent = formatCurrency(valuations.dcf.valuePerShare);
        
        const dcfUpsideEl = document.getElementById('dcf-upside');
        dcfUpsideEl.textContent = formatPercent(valuations.dcf.upside);
        dcfUpsideEl.className = `output-row strong ${valuations.dcf.upside >= 0 ? 'positive' : 'negative'}`;
        
        // Actualizar tabla de sensibilidad
        updateSensitivityTable(valuations.dcf, data);
    }
    
    // Actualizar campos DDM
    if (valuations.ddm) {
        document.getElementById('ddm-dividend').value = data.dividend.toFixed(2);
        document.getElementById('ddm-growth').value = (valuations.ddm.growthRate * 100).toFixed(1);
        document.getElementById('ddm-discount').value = (valuations.ddm.discountRate * 100).toFixed(1);
        
        document.getElementById('ddm-value').textContent = formatCurrency(valuations.ddm.valuePerShare);
        document.getElementById('ddm-yield').textContent = valuations.ddm.yieldAtFairValue.toFixed(2) + '%';
    }
    
    // Actualizar campos Múltiplos
    if (valuations.multiples) {
        document.getElementById('mult-eps').value = data.eps.toFixed(2);
        document.getElementById('mult-pe').value = valuations.multiples.peUsed.toFixed(1);
        document.getElementById('mult-bv').value = data.bookValue.toFixed(2);
        document.getElementById('mult-pb').value = valuations.multiples.pbUsed.toFixed(1);
        
        document.getElementById('mult-pe-value').textContent = formatCurrency(valuations.multiples.valuePE);
        document.getElementById('mult-pb-value').textContent = formatCurrency(valuations.multiples.valuePB);
        document.getElementById('mult-avg-value').textContent = formatCurrency(valuations.multiples.valueAvg);
    }
    
    // Actualizar resumen
    if (valuations.fairValue) {
        updateSummaryUI(valuations, data);
    }
}

// ============================================
// Actualizar UI de resumen
// ============================================
function updateSummaryUI(valuations, data) {
    const fairValue = valuations.fairValue;
    const currentPrice = data.price;
    const upside = valuations.upside;
    
    // Valor justo
    document.getElementById('fair-value').textContent = formatCurrency(fairValue);
    document.getElementById('summary-current').textContent = formatCurrency(currentPrice);
    document.getElementById('summary-fair').textContent = formatCurrency(fairValue);
    
    // Badge de descuento/sobrevaloración
    const discountBadge = document.getElementById('discount-badge');
    if (upside >= 0) {
        discountBadge.textContent = `${upside.toFixed(1)}% Descuento`;
        discountBadge.className = 'discount-badge';
    } else {
        discountBadge.textContent = `${Math.abs(upside).toFixed(1)}% Sobrevalorada`;
        discountBadge.className = 'discount-badge overvalued';
    }
    
    // Recomendación
    const recommendationEl = document.getElementById('recommendation');
    
    if (upside >= 25) {
        recommendationEl.textContent = '✅ COMPRAR FUERTE - Descuento significativo vs valor intrínseco';
        recommendationEl.className = 'recommendation buy';
    } else if (upside >= 15) {
        recommendationEl.textContent = '✅ COMPRAR - Buen margen de seguridad';
        recommendationEl.className = 'recommendation buy';
    } else if (upside >= 5) {
        recommendationEl.textContent = '🟡 COMPRAR CON CAUTELA - Ligero descuento';
        recommendationEl.className = 'recommendation hold';
    } else if (upside > -10) {
        recommendationEl.textContent = '⏳ MANTENER - Precio cercano al valor justo';
        recommendationEl.className = 'recommendation hold';
    } else if (upside > -25) {
        recommendationEl.textContent = '⚠️ CONSIDERAR VENTA - Ligera sobrevaloración';
        recommendationEl.className = 'recommendation hold';
    } else {
        recommendationEl.textContent = '❌ VENDER - Acción significativamente sobrevalorada';
        recommendationEl.className = 'recommendation sell';
    }
}

// ============================================
// Actualizar tabla de sensibilidad
// ============================================
function updateSensitivityTable(dcf, data) {
    const container = document.getElementById('sensitivity-table');
    
    const waccBase = dcf.wacc * 100;
    const growthBase = dcf.growthRate * 100;
    
    const waccRange = [waccBase - 2, waccBase - 1, waccBase, waccBase + 1, waccBase + 2];
    const growthRange = [growthBase - 2, growthBase - 1, growthBase, growthBase + 1, growthBase + 2];
    
    const fcf = dcf.projectedFCF[0] / (1 + dcf.growthRate); // FCF actual
    const shares = data.shares > 1000000000 ? data.shares / 1000000 : data.shares;
    const terminalGrowth = dcf.terminalGrowth;
    
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
            const upside = data.price ? ((valuePerShare - data.price) / data.price) * 100 : 0;
            
            let colorStyle = '';
            if (upside >= 30) colorStyle = 'color: var(--accent-green); font-weight: 700;';
            else if (upside >= 15) colorStyle = 'color: #90EE90;';
            else if (upside >= 0) colorStyle = 'color: var(--accent-yellow);';
            else if (upside > -15) colorStyle = 'color: #FFB6C1;';
            else colorStyle = 'color: var(--accent-red);';
            
            tableHTML += `<td style="${colorStyle}">$${valuePerShare.toFixed(0)}</td>`;
        }
        
        tableHTML += '</tr>';
    }
    
    tableHTML += '</tbody></table>';
    
    container.innerHTML = tableHTML;
}

// ============================================
// Calcular métricas de riesgo automáticamente
// ============================================
function calculateAutoRiskMetrics(data, valuations) {
    if (!data) return null;
    
    // Ratio Sharpe (usando datos históricos simulados)
    const riskFreeRate = 0.04;
    const expectedReturn = valuations.upside ? valuations.upside / 100 : 0.08;
    const volatility = data.volatility || 0.25;
    const sharpeRatio = (expectedReturn - riskFreeRate) / volatility;
    
    // Beta (del dato o estimado)
    const beta = data.beta || 1.0;
    
    // Margen de seguridad
    const marginOfSafety = valuations.upside || 0;
    
    return {
        sharpeRatio: sharpeRatio,
        beta: beta,
        volatility: volatility,
        marginOfSafety: marginOfSafety
    };
}

// ============================================
// Actualizar UI de riesgo automáticamente
// ============================================
function updateAutoRiskUI(metrics) {
    if (!metrics) return;
    
    // Sharpe Ratio
    const sharpeEl = document.getElementById('risk-sharpe');
    sharpeEl.textContent = metrics.sharpeRatio.toFixed(2);
    sharpeEl.style.color = metrics.sharpeRatio >= 1 ? 'var(--accent-green)' : 
                           metrics.sharpeRatio >= 0.5 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    
    // Beta
    const betaEl = document.getElementById('risk-beta');
    betaEl.textContent = metrics.beta.toFixed(2);
    betaEl.style.color = metrics.beta > 1.2 ? 'var(--accent-red)' : 
                        metrics.beta < 0.8 ? 'var(--accent-green)' : 'var(--text-primary)';
    
    // Volatility
    const volEl = document.getElementById('risk-volatility');
    volEl.textContent = `${(metrics.volatility * 100).toFixed(1)}%`;
    volEl.style.color = metrics.volatility > 0.30 ? 'var(--accent-red)' : 
                        metrics.volatility < 0.20 ? 'var(--accent-green)' : 'var(--accent-yellow)';
    
    // Margin of Safety
    const marginEl = document.getElementById('risk-margin');
    marginEl.textContent = `${metrics.marginOfSafety.toFixed(1)}%`;
    marginEl.style.color = metrics.marginOfSafety >= 30 ? 'var(--accent-green)' : 
                           metrics.marginOfSafety >= 15 ? 'var(--accent-yellow)' : 
                           metrics.marginOfSafety > 0 ? 'var(--accent-blue)' : 'var(--accent-red)';
    
    // Assessment
    updateRiskAssessment(metrics);
}

// ============================================
// Actualizar assessment de riesgo
// ============================================
function updateRiskAssessment(metrics) {
    const assessmentEl = document.getElementById('risk-assessment');
    
    let riskLevel = '';
    let riskClass = '';
    let recommendations = [];
    
    // Determinar nivel de riesgo
    if (metrics.beta > 1.3 || metrics.volatility > 0.35) {
        riskLevel = 'ALTO RIESGO';
        riskClass = 'high-risk';
    } else if (metrics.beta > 1.1 || metrics.volatility > 0.25) {
        riskLevel = 'RIESGO MODERADO';
        riskClass = 'moderate-risk';
    } else {
        riskLevel = 'BAJO RIESGO';
        riskClass = 'low-risk';
    }
    
    // Generar recomendaciones
    if (metrics.sharpeRatio < 0.5) {
        recommendations.push('Ratio Sharpe bajo - considera otros activos con mejor rendimiento ajustado por riesgo');
    }
    
    if (metrics.beta > 1.2) {
        recommendations.push('Alta sensibilidad al mercado - diversifica tu cartera para reducir riesgo sistemático');
    }
    
    if (metrics.marginOfSafety < 15 && metrics.marginOfSafety > 0) {
        recommendations.push('Margen de seguridad limitado - considera reducir tamaño de posición');
    } else if (metrics.marginOfSafety < 0) {
        recommendations.push('Sin margen de seguridad - alto riesgo de pérdida de capital');
    }
    
    if (metrics.volatility > 0.30) {
        recommendations.push('Alta volatilidad - prepara para fluctuaciones significativas de precio');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('Perfil de riesgo aceptable para inversión a largo plazo');
    }
    
    assessmentEl.innerHTML = `
        <div class="risk-level ${riskClass}">${riskLevel}</div>
        <ul class="risk-recommendations">
            ${recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
    `;
    assessmentEl.className = 'risk-assessment active';
}

// ============================================
// Función principal de análisis automático
// ============================================
async function performFullAnalysis(data) {
    try {
        console.log('[AutoValuation] Starting analysis for:', data.ticker);
        
        // Calcular todas las valoraciones
        const valuations = calculateAllValuations(data);
        console.log('[AutoValuation] Valuations calculated:', valuations);
        
        // Actualizar UI de valoraciones
        updateAutoValuationUI(valuations, data);
        
        // Calcular métricas de riesgo
        const riskMetrics = calculateAutoRiskMetrics(data, valuations);
        console.log('[AutoValuation] Risk metrics calculated:', riskMetrics);
        
        // Actualizar UI de riesgo
        updateAutoRiskUI(riskMetrics);
        
        return { valuations, riskMetrics };
    } catch (error) {
        console.error('[AutoValuation] Error in performFullAnalysis:', error);
        throw error;
    }
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateDCFAuto,
        calculateDDMAuto,
        calculateMultiplesAuto,
        calculateAllValuations,
        performFullAnalysis
    };
}

// Hacer funciones disponibles globalmente para el navegador
if (typeof window !== 'undefined') {
    window.calculateDCFAuto = calculateDCFAuto;
    window.calculateDDMAuto = calculateDDMAuto;
    window.calculateMultiplesAuto = calculateMultiplesAuto;
    window.calculateAllValuations = calculateAllValuations;
    window.performFullAnalysis = performFullAnalysis;
    window.updateAutoValuationUI = updateAutoValuationUI;
    window.updateAutoRiskUI = updateAutoRiskUI;
    window.calculateAutoRiskMetrics = calculateAutoRiskMetrics;
}
