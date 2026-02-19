// ============================================
// ADVANCED-VALUATION.JS - Modelos de valoración avanzados
// Basado en investigación académica y práctica profesional
// ============================================

// ============================================
// 1. RESIDUAL INCOME MODEL (RIM)
// Más preciso que DCF para empresas con earnings estables
// Fórmula: Value = Book Value + PV of Future Residual Income
// ============================================
function calculateResidualIncome(data) {
    if (!data.bookValue || !data.eps || data.eps <= 0) {
        return null;
    }

    const bookValue = data.bookValue;
    const eps = data.eps;
    
    // Cost of Equity (CAPM)
    const riskFreeRate = 0.045; // 4.5% T-bill actual
    const marketReturn = 0.10;  // 10% histórico
    const beta = data.beta || 1.0;
    const costOfEquity = riskFreeRate + beta * (marketReturn - riskFreeRate);
    
    // Residual Income = EPS - (Book Value * Cost of Equity)
    const residualIncome = eps - (bookValue * costOfEquity);
    
    // Si RI es negativo, la empresa destruye valor
    if (residualIncome <= 0) {
        return {
            valuePerShare: bookValue * 0.8, // Descuento por destrucción de valor
            residualIncome: residualIncome,
            costOfEquity: costOfEquity,
            upside: ((bookValue * 0.8 - data.price) / data.price) * 100,
            note: 'Empresa destruye valor - RI negativo'
        };
    }
    
    // Crecimiento sostenible del Residual Income (más conservador que earnings)
    const sectorGrowth = {
        'Tecnología': 0.08,
        'Finanzas': 0.04,
        'Salud': 0.06,
        'Consumo': 0.03,
        'Energía': 0.02,
        'Industriales': 0.04,
        'Automotriz': 0.05
    };
    const growthRate = sectorGrowth[data.sector] || 0.05;
    
    // Perpetuidad creciente de RI
    // Value = BV + RI_1 / (r - g)
    const terminalValue = (residualIncome * (1 + growthRate)) / (costOfEquity - growthRate);
    const valuePerShare = bookValue + terminalValue;
    
    const upside = ((valuePerShare - data.price) / data.price) * 100;
    
    return {
        valuePerShare: valuePerShare,
        bookValue: bookValue,
        residualIncome: residualIncome,
        costOfEquity: costOfEquity,
        growthRate: growthRate,
        terminalValue: terminalValue,
        upside: upside
    };
}

// ============================================
// 2. ABNORMAL EARNINGS GROWTH (AEG)
// Mejor que DDM para empresas sin dividendos
// Mide crecimiento de earnings sobre lo requerido
// ============================================
function calculateAEG(data) {
    if (!data.eps || data.eps <= 0 || !data.shares) {
        return null;
    }

    const eps = data.eps;
    const bookValue = data.bookValue || (data.price / (data.pb || 1));
    
    // Required return (CAPM)
    const riskFreeRate = 0.045;
    const marketReturn = 0.10;
    const beta = data.beta || 1.0;
    const requiredReturn = riskFreeRate + beta * (marketReturn - riskFreeRate);
    
    // Required earnings growth = Required return * Book Value
    const requiredEarningsGrowth = requiredReturn * bookValue;
    
    // Abnormal Earnings Growth = Actual EPS growth - Required growth
    // Usamos ROE como proxy de crecimiento sostenible
    const roe = (eps / bookValue);
    const sustainableGrowth = roe * (1 - 0.3); // 30% payout ratio promedio
    const abnormalGrowth = (roe * bookValue) - requiredEarningsGrowth;
    
    // Valoración AEG
    // Value = Book Value + PV of Abnormal Earnings
    const sectorGrowth = {
        'Tecnología': 0.06,
        'Finanzas': 0.03,
        'Salud': 0.05,
        'Consumo': 0.03,
        'Energía': 0.02,
        'Industriales': 0.03
    };
    const growthRate = sectorGrowth[data.sector] || 0.04;
    
    if (abnormalGrowth <= 0) {
        return {
            valuePerShare: bookValue,
            abnormalGrowth: abnormalGrowth,
            upside: ((bookValue - data.price) / data.price) * 100,
            note: 'Sin crecimiento anormal de earnings'
        };
    }
    
    const aegTerminal = (abnormalGrowth * (1 + growthRate)) / (requiredReturn - growthRate);
    const valuePerShare = bookValue + aegTerminal;
    
    return {
        valuePerShare: valuePerShare,
        bookValue: bookValue,
        roe: roe,
        abnormalGrowth: abnormalGrowth,
        requiredReturn: requiredReturn,
        growthRate: growthRate,
        upside: ((valuePerShare - data.price) / data.price) * 100
    };
}

// ============================================
// 3. EVA (ECONOMIC VALUE ADDED)
// Mide valor real creado sobre costo de capital total
// ============================================
function calculateEVA(data) {
    if (!data.revenue || !data.marketCap) {
        return null;
    }

    // NOPAT = EBIT * (1 - Tax Rate)
    // Estimamos EBIT como 15% de revenue (margen operativo típico)
    const ebitMargin = data.sector === 'Tecnología' ? 0.25 :
                       data.sector === 'Finanzas' ? 0.35 :
                       data.sector === 'Salud' ? 0.20 :
                       data.sector === 'Consumo' ? 0.12 : 0.15;
    
    const ebit = data.revenue * ebitMargin;
    const taxRate = 0.21; // 21% US corporate tax
    const nopat = ebit * (1 - taxRate);
    
    // Capital Employed
    const capitalEmployed = data.marketCap + data.debt - data.cash;
    
    // WACC ajustado por sector
    const sectorWACC = {
        'Tecnología': 0.10,
        'Finanzas': 0.09,
        'Salud': 0.085,
        'Consumo': 0.075,
        'Energía': 0.09,
        'Industriales': 0.085
    };
    const wacc = sectorWACC[data.sector] || 0.09;
    
    // EVA = NOPAT - (Capital Employed * WACC)
    const capitalCharge = capitalEmployed * wacc;
    const eva = nopat - capitalCharge;
    
    // EVA perpetuo
    const growthRate = 0.03;
    const evaValue = eva > 0 ? (eva * (1 + growthRate)) / (wacc - growthRate) : 0;
    
    // Enterprise Value + adjustments
    const enterpriseValue = capitalEmployed + evaValue;
    const equityValue = enterpriseValue - data.debt + data.cash;
    const valuePerShare = equityValue / data.shares;
    
    return {
        valuePerShare: valuePerShare,
        nopat: nopat,
        capitalEmployed: capitalEmployed,
        wacc: wacc,
        eva: eva,
        evaValue: evaValue,
        upside: ((valuePerShare - data.price) / data.price) * 100,
        note: eva < 0 ? 'EVA negativo - destruye valor' : 'EVA positivo - crea valor'
    };
}

// ============================================
// 4. DCF MEJORADO (2 ETAPAS CON AJUSTES)
// Con ajustes por calidad de earnings y sector
// ============================================
function calculateEnhancedDCF(data) {
    if (!data.fcf || data.fcf <= 0 || !data.shares) {
        return null;
    }

    // Ajustar FCF por calidad
    // Si FCF < Net Income, usamos average con conservador
    const estimatedNetIncome = data.eps * data.shares;
    const fcfQuality = data.fcf / estimatedNetIncome;
    
    let adjustedFCF = data.fcf;
    if (fcfQuality < 0.8) {
        // FCF de baja calidad - ajustamos conservadoramente
        adjustedFCF = data.fcf * 0.9;
    }
    
    const fcf = adjustedFCF / 1000000; // En millones
    const shares = data.shares / 1000000;
    
    // Crecimiento por sector (más realista)
    const sectorGrowthStage1 = {
        'Tecnología': 0.18,
        'Finanzas': 0.08,
        'Salud': 0.12,
        'Consumo': 0.06,
        'Energía': 0.04,
        'Industriales': 0.07,
        'Automotriz': 0.10
    };
    
    const growthRate = sectorGrowthStage1[data.sector] || 0.08;
    const terminalGrowth = 0.025; // 2.5% más conservador
    
    // WACC ajustado
    const riskFreeRate = 0.045;
    const marketReturn = 0.10;
    const beta = data.beta || 1.0;
    const costOfEquity = riskFreeRate + beta * (marketReturn - riskFreeRate);
    
    // Asumimos 20% deuda a costo 6%
    const costOfDebt = 0.06;
    const taxRate = 0.21;
    const wacc = (0.8 * costOfEquity) + (0.2 * costOfDebt * (1 - taxRate));
    
    // Proyección 5 años con declive de crecimiento
    let projectedFCF = [];
    let currentFCF = fcf;
    let currentGrowth = growthRate;
    
    for (let i = 0; i < 5; i++) {
        currentFCF = currentFCF * (1 + currentGrowth);
        projectedFCF.push(currentFCF);
        // Declive gradual del crecimiento
        currentGrowth = currentGrowth * 0.85;
    }
    
    // Valor presente
    let pvFCF = 0;
    for (let i = 0; i < 5; i++) {
        pvFCF += projectedFCF[i] / Math.pow(1 + wacc, i + 1);
    }
    
    // Terminal Value con múltiplo de salida conservador
    const exitMultiple = 12; // EV/EBITDA conservador
    const ebitda = data.revenue * 0.15 / 1000000;
    const terminalValue = (ebitda * exitMultiple) / Math.pow(1 + wacc, 5);
    
    const enterpriseValue = pvFCF + terminalValue;
    const netCash = (data.cash - data.debt) / 1000000;
    const equityValue = enterpriseValue + netCash;
    const valuePerShare = equityValue / shares;
    
    return {
        valuePerShare: valuePerShare,
        pvFCF: pvFCF,
        terminalValue: terminalValue,
        wacc: wacc,
        growthRate: growthRate,
        fcfQuality: fcfQuality,
        projectedFCF: projectedFCF,
        upside: ((valuePerShare - data.price) / data.price) * 100
    };
}

// ============================================
// 5. MÚLTIPLOS AJUSTADOS POR SECTOR
// Más sofisticado que P/E simple
// ============================================
function calculateAdjustedMultiples(data) {
    if (!data.eps || !data.bookValue) {
        return null;
    }

    // Múltiplos objetivo por sector (medianas históricas)
    const sectorMultiples = {
        'Tecnología': { pe: 28, pb: 5.5, ps: 8, evEbitda: 22 },
        'Finanzas': { pe: 14, pb: 1.3, ps: 3.5, evEbitda: 12 },
        'Salud': { pe: 22, pb: 4.5, ps: 5, evEbitda: 16 },
        'Consumo': { pe: 20, pb: 3.5, ps: 2, evEbitda: 14 },
        'Energía': { pe: 12, pb: 1.8, ps: 1.5, evEbitda: 7 },
        'Industriales': { pe: 18, pb: 3, ps: 2, evEbitda: 12 },
        'Automotriz': { pe: 15, pb: 1.5, ps: 0.8, evEbitda: 9 }
    };
    
    const multiples = sectorMultiples[data.sector] || sectorMultiples['Industriales'];
    
    // Ajustar P/E por crecimiento (PEG)
    const peg = data.pe / (multiples.pe / 10); // Normalizado
    let adjustedPE = multiples.pe;
    if (peg < 1) adjustedPE *= 1.1;
    else if (peg > 2) adjustedPE *= 0.85;
    
    // Ajustar P/B por ROE
    const roe = (data.eps / data.bookValue) * 100;
    let adjustedPB = multiples.pb;
    if (roe > 20) adjustedPB *= 1.15;
    else if (roe < 10) adjustedPB *= 0.8;
    
    // Valores por múltiplo
    const valuePE = data.eps * adjustedPE;
    const valuePB = data.bookValue * adjustedPB;
    
    // EV/EBITDA si tenemos datos
    let valueEVEBITDA = null;
    if (data.marketCap && data.revenue) {
        const ebitda = data.revenue * 0.15;
        const ev = ebitda * multiples.evEbitda;
        const equityValue = ev - data.debt + data.cash;
        valueEVEBITDA = equityValue / data.shares;
    }
    
    // Ponderación: P/E 40%, P/B 35%, EV/EBITDA 25%
    let weightedValue = (valuePE * 0.40) + (valuePB * 0.35);
    if (valueEVEBITDA) {
        weightedValue += valueEVEBITDA * 0.25;
    } else {
        weightedValue = weightedValue / 0.75;
    }
    
    return {
        valuePE: valuePE,
        valuePB: valuePB,
        valueEVEBITDA: valueEVEBITDA,
        valueAvg: weightedValue,
        peUsed: adjustedPE,
        pbUsed: adjustedPB,
        peg: peg,
        roe: roe,
        upside: ((weightedValue - data.price) / data.price) * 100
    };
}

// ============================================
// FUNCIÓN PRINCIPAL: CALCULAR TODAS LAS VALORACIONES
// ============================================
function calculateAllAdvancedValuations(data) {
    const valuations = {
        dcf: calculateEnhancedDCF(data),
        rim: calculateResidualIncome(data),
        aeg: calculateAEG(data),
        eva: calculateEVA(data),
        multiples: calculateAdjustedMultiples(data)
    };
    
    // Calcular valor intrínseco ponderado
    // Pesos basados en fiabilidad para el tipo de empresa
    let weightedSum = 0;
    let totalWeight = 0;
    
    // RIM es generalmente más preciso (30%)
    if (valuations.rim && valuations.rim.valuePerShare > 0) {
        weightedSum += valuations.rim.valuePerShare * 0.30;
        totalWeight += 0.30;
    }
    
    // DCF mejorado (25%)
    if (valuations.dcf && valuations.dcf.valuePerShare > 0) {
        weightedSum += valuations.dcf.valuePerShare * 0.25;
        totalWeight += 0.25;
    }
    
    // Múltiplos ajustados (20%)
    if (valuations.multiples && valuations.multiples.valueAvg > 0) {
        weightedSum += valuations.multiples.valueAvg * 0.20;
        totalWeight += 0.20;
    }
    
    // AEG (15%)
    if (valuations.aeg && valuations.aeg.valuePerShare > 0) {
        weightedSum += valuations.aeg.valuePerShare * 0.15;
        totalWeight += 0.15;
    }
    
    // EVA (10%)
    if (valuations.eva && valuations.eva.valuePerShare > 0) {
        weightedSum += valuations.eva.valuePerShare * 0.10;
        totalWeight += 0.10;
    }
    
    const fairValue = totalWeight > 0 ? weightedSum / totalWeight : null;
    
    return {
        ...valuations,
        fairValue: fairValue,
        upside: fairValue && data.price ? ((fairValue - data.price) / data.price) * 100 : null,
        confidence: totalWeight
    };
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateResidualIncome,
        calculateAEG,
        calculateEVA,
        calculateEnhancedDCF,
        calculateAdjustedMultiples,
        calculateAllAdvancedValuations
    };
}

if (typeof window !== 'undefined') {
    window.calculateResidualIncome = calculateResidualIncome;
    window.calculateAEG = calculateAEG;
    window.calculateEVA = calculateEVA;
    window.calculateEnhancedDCF = calculateEnhancedDCF;
    window.calculateAdjustedMultiples = calculateAdjustedMultiples;
    window.calculateAllAdvancedValuations = calculateAllAdvancedValuations;
}