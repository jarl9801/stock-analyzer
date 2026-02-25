// ============================================
// FCF-ANALYSIS.JS - Análisis profundo de Free Cash Flow
// El módulo central de valoración
// ============================================

// ============================================
// Historical FCF Data (estimates based on known data)
// Format: [oldest → newest] in millions USD
// ============================================
const FCF_HISTORICAL = {
    'AAPL': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [58896, 73365, 92953, 111443, 99584, 105000, 101000],
        operatingCF:   [69391, 80674, 104038, 122151, 110543, 116000, 112000],
        capex:         [10495, 7309, 11085, 10708, 10959, 11000, 11000],
        netIncome:     [55256, 57411, 94680, 99803, 96995, 100800, 101500],
        revenue:       [260174, 274515, 365817, 394328, 383285, 390000, 391000],
        depreciation:  [12547, 11056, 11284, 11104, 11519, 11800, 12000],
        sbc:           [6068, 6829, 7906, 9038, 10833, 11500, 12000],
    },
    'MSFT': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [38260, 45234, 56118, 65149, 59475, 63000, 67000],
        operatingCF:   [52185, 60675, 76740, 89035, 87582, 90000, 95000],
        capex:         [13925, 15441, 20622, 23886, 28107, 27000, 28000],
        netIncome:     [39240, 44281, 61271, 72738, 72361, 73500, 75000],
        revenue:       [125843, 143015, 168088, 198270, 211915, 230000, 245000],
        depreciation:  [12796, 13038, 13460, 14460, 13861, 15000, 16000],
        sbc:           [4652, 5289, 6118, 7502, 9611, 10500, 11000],
    },
    'GOOGL': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [30972, 42843, 67012, 60060, 69495, 67000, 69000],
        operatingCF:   [54520, 65124, 91652, 91495, 101746, 98000, 100000],
        capex:         [23548, 22281, 24640, 31435, 32251, 31000, 31000],
        netIncome:     [34343, 40269, 76033, 59972, 73795, 70000, 72000],
        revenue:       [161857, 182527, 257637, 282836, 307394, 335000, 350000],
        depreciation:  [10856, 12905, 13697, 15287, 16384, 17000, 17500],
        sbc:           [10794, 12991, 15376, 19525, 22460, 23000, 24000],
    },
    'AMZN': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [21653, 31020, -14726, -16889, 32217, 35000, 36800],
        operatingCF:   [38514, 66064, 46327, 46752, 84946, 88000, 90000],
        capex:         [16861, 35044, 61053, 63645, 52729, 53000, 53200],
        netIncome:     [11588, 21331, 33364, -2722, 30425, 33000, 37000],
        revenue:       [280522, 386064, 469822, 513983, 574785, 610000, 638000],
        depreciation:  [21789, 25251, 34433, 41921, 48663, 50000, 52000],
        sbc:           [6864, 9208, 12757, 19621, 24023, 25000, 26000],
    },
    'META': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [21212, 23632, 39116, 19044, 43901, 42000, 43000],
        operatingCF:   [36314, 38747, 57683, 35553, 71113, 68000, 70000],
        capex:         [15102, 15115, 18567, 16511, 27212, 26000, 27000],
        netIncome:     [18485, 29146, 39370, 23200, 39098, 40000, 42000],
        revenue:       [70697, 85965, 117929, 116609, 134902, 150000, 164000],
        depreciation:  [5741, 6862, 7967, 9297, 11178, 12000, 12500],
        sbc:           [4836, 6536, 9164, 11607, 14027, 15000, 16000],
    },
    'NVDA': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [2764, 4694, 3889, 8132, 3808, 18000, 27000],
        operatingCF:   [3743, 5822, 5822, 9108, 5642, 22000, 32000],
        capex:         [979, 1128, 1933, 976, 1834, 4000, 5000],
        netIncome:     [2796, 4332, 4332, 9752, 4368, 16000, 24000],
        revenue:       [10918, 16675, 16675, 26914, 26974, 48000, 61000],
        depreciation:  [509, 486, 486, 1544, 1508, 2500, 3000],
        sbc:           [844, 1397, 1397, 2004, 2709, 4000, 5000],
    },
    'TSLA': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [1078, 2786, 5015, 7566, 4359, 4200, 4400],
        operatingCF:   [2405, 5943, 11497, 14724, 13256, 12500, 13000],
        capex:         [1327, 3157, 6482, 7158, 8877, 8300, 8600],
        netIncome:     [-862, 721, 5519, 12583, 7928, 5500, 5200],
        revenue:       [24578, 31536, 53823, 81462, 96773, 95000, 97000],
        depreciation:  [2154, 2322, 2911, 3747, 4667, 5000, 5200],
        sbc:           [898, 1734, 2121, 1560, 1794, 2000, 2200],
    },
    'V': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [12015, 10380, 14507, 17093, 18429, 18500, 19000],
        operatingCF:   [12790, 10940, 15242, 18069, 19425, 19500, 20000],
        capex:         [775, 560, 735, 976, 996, 1000, 1000],
        netIncome:     [12080, 10866, 12311, 14957, 17273, 17500, 18000],
        revenue:       [22977, 21846, 24105, 29310, 32653, 34000, 35000],
        depreciation:  [610, 660, 700, 740, 800, 850, 900],
        sbc:           [367, 346, 413, 489, 521, 550, 580],
    },
    'JNJ': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [19918, 19752, 20469, 17859, 19979, 22000, 23000],
        operatingCF:   [23416, 23533, 23597, 21194, 22797, 25000, 26000],
        capex:         [3498, 3781, 3128, 3335, 2818, 3000, 3000],
        netIncome:     [15119, 14714, 20878, 17941, 35153, 18000, 19000],
        revenue:       [82059, 82584, 93775, 94943, 85159, 86000, 88000],
        depreciation:  [4082, 4193, 4153, 4424, 4645, 4800, 5000],
        sbc:           [1218, 1297, 1250, 1148, 1190, 1200, 1250],
    },
    'XOM': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [5355, -3605, 36029, 49471, 33394, 35000, 36000],
        operatingCF:   [29716, 14668, 48129, 76800, 55369, 57000, 58000],
        capex:         [24361, 18273, 12100, 21100, 21975, 22000, 22000],
        netIncome:     [14340, -22440, 23040, 55740, 36010, 33000, 34000],
        revenue:       [264938, 181502, 285640, 413680, 344582, 340000, 344000],
        depreciation:  [18998, 19044, 17268, 16459, 16700, 17000, 17200],
        sbc:           [350, 340, 360, 380, 400, 420, 440],
    },
    'WMT': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [14550, 15000, 25800, 11100, 12600, 11500, 11800],
        operatingCF:   [27753, 28300, 36400, 24200, 28800, 26000, 27000],
        capex:         [10344, 10300, 10600, 13100, 16200, 14500, 15200],
        netIncome:     [6670, 14881, 13673, 11680, 15511, 15800, 16000],
        revenue:       [523964, 559151, 572754, 611289, 648125, 645000, 648000],
        depreciation:  [10678, 10987, 11152, 10658, 11853, 12000, 12200],
        sbc:           [1430, 1540, 1698, 1793, 1900, 2000, 2100],
    },
    'BA': {
        years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        fcf:           [-4400, -19700, -4200, 2300, -3500, -2000, -1500],
        operatingCF:   [-2446, -18410, -3416, 3512, -2400, -500, 500],
        capex:         [1954, 1303, 980, 1222, 1500, 1500, 2000],
        netIncome:     [-636, -11941, -4290, -5053, -2242, -3000, -4000],
        revenue:       [76559, 58158, 62286, 66608, 77794, 68000, 66000],
        depreciation:  [2271, 2129, 1961, 1970, 2100, 2200, 2300],
        sbc:           [308, 254, 218, 290, 350, 380, 400],
    },
    'NU': {
        years: [2021, 2022, 2023, 2024, 2025],
        fcf:           [200, 800, 1500, 2200, 2800],
        operatingCF:   [350, 1100, 2000, 2800, 3500],
        capex:         [150, 300, 500, 600, 700],
        netIncome:     [-165, 141, 1030, 1700, 2500],
        revenue:       [1700, 3200, 4700, 5800, 6360],
        depreciation:  [50, 80, 120, 160, 200],
        sbc:           [200, 350, 500, 550, 600],
    },
};

// ============================================
// Generate synthetic historical data for unknown tickers
// ============================================
function generateHistoricalFCF(data) {
    const currentFCF = data.fcf / 1e6; // to millions
    const currentRevenue = data.revenue / 1e6;
    const currentNetIncome = (data.eps * data.shares) / 1e6;
    const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
    
    const fcf = [], operatingCF = [], capex = [], netIncome = [], revenue = [], depreciation = [], sbc = [];
    
    for (let i = 0; i < years.length; i++) {
        const factor = 0.55 + (i * 0.075); // gradual growth from ~55% to 100%
        const noise = 0.9 + Math.random() * 0.2;
        
        const rev = currentRevenue * factor * noise;
        const ni = currentNetIncome * factor * noise;
        const f = currentFCF * factor * noise;
        const ocf = f * (1.1 + Math.random() * 0.15);
        const cx = ocf - f;
        
        revenue.push(Math.round(rev));
        netIncome.push(Math.round(ni));
        fcf.push(Math.round(f));
        operatingCF.push(Math.round(ocf));
        capex.push(Math.round(Math.abs(cx)));
        depreciation.push(Math.round(rev * 0.03));
        sbc.push(Math.round(rev * 0.02));
    }
    
    return { years, fcf, operatingCF, capex, netIncome, revenue, depreciation, sbc, synthetic: true };
}

function getHistoricalFCF(ticker, data) {
    const hist = FCF_HISTORICAL[ticker];
    if (hist) return { ...hist, synthetic: false };
    return generateHistoricalFCF(data);
}

// ============================================
// FCF Quality Score (0-100)
// ============================================
function calculateFCFQualityScore(hist) {
    let score = 0;
    const n = hist.years.length;
    const details = [];
    
    // 1. FCF vs Net Income ratio (25 pts) — FCF >= NI is great
    let fcfVsNiCount = 0;
    for (let i = 0; i < n; i++) {
        if (hist.fcf[i] >= hist.netIncome[i] * 0.9) fcfVsNiCount++;
    }
    const fcfVsNiScore = Math.round((fcfVsNiCount / n) * 25);
    score += fcfVsNiScore;
    details.push({ name: 'FCF vs Net Income', score: fcfVsNiScore, max: 25, desc: `${fcfVsNiCount}/${n} años FCF ≥ Net Income` });
    
    // 2. FCF margin trend (20 pts)
    const margins = hist.fcf.map((f, i) => hist.revenue[i] > 0 ? f / hist.revenue[i] : 0);
    const marginTrend = margins.length >= 2 ? margins[margins.length - 1] - margins[0] : 0;
    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
    let marginScore = 0;
    if (avgMargin > 0.15) marginScore = 20;
    else if (avgMargin > 0.10) marginScore = 16;
    else if (avgMargin > 0.05) marginScore = 12;
    else if (avgMargin > 0) marginScore = 6;
    if (marginTrend > 0.02) marginScore = Math.min(20, marginScore + 3);
    if (marginTrend < -0.03) marginScore = Math.max(0, marginScore - 5);
    score += marginScore;
    details.push({ name: 'Margen FCF', score: marginScore, max: 20, desc: `Promedio: ${(avgMargin * 100).toFixed(1)}%, Tendencia: ${marginTrend > 0 ? '+' : ''}${(marginTrend * 100).toFixed(1)}%` });
    
    // 3. FCF consistency (20 pts) — low variance
    const positiveFCFs = hist.fcf.filter(f => f > 0);
    if (positiveFCFs.length >= 3) {
        const mean = positiveFCFs.reduce((a, b) => a + b, 0) / positiveFCFs.length;
        const variance = positiveFCFs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / positiveFCFs.length;
        const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
        let consScore = 0;
        if (cv < 0.15) consScore = 20;
        else if (cv < 0.25) consScore = 16;
        else if (cv < 0.40) consScore = 12;
        else if (cv < 0.60) consScore = 6;
        score += consScore;
        details.push({ name: 'Consistencia FCF', score: consScore, max: 20, desc: `CV: ${(cv * 100).toFixed(0)}% — ${cv < 0.25 ? 'Muy estable' : cv < 0.40 ? 'Estable' : 'Volátil'}` });
    } else {
        details.push({ name: 'Consistencia FCF', score: 0, max: 20, desc: 'Insuficientes años positivos' });
    }
    
    // 4. CAPEX intensity (20 pts) — lower is better
    const capexIntensity = hist.capex.map((c, i) => hist.revenue[i] > 0 ? c / hist.revenue[i] : 0);
    const avgCapex = capexIntensity.reduce((a, b) => a + b, 0) / capexIntensity.length;
    let capexScore = 0;
    if (avgCapex < 0.03) capexScore = 20;
    else if (avgCapex < 0.06) capexScore = 16;
    else if (avgCapex < 0.10) capexScore = 12;
    else if (avgCapex < 0.15) capexScore = 8;
    else capexScore = 3;
    score += capexScore;
    details.push({ name: 'Intensidad CAPEX', score: capexScore, max: 20, desc: `CAPEX/Revenue: ${(avgCapex * 100).toFixed(1)}% — ${avgCapex < 0.06 ? 'Capital-light' : avgCapex < 0.12 ? 'Moderado' : 'Capital-intensivo'}` });
    
    // 5. Working capital / OCF conversion (15 pts)
    const ocfConversion = hist.operatingCF.map((o, i) => hist.netIncome[i] > 0 ? o / hist.netIncome[i] : 0);
    const avgConversion = ocfConversion.filter(c => c > 0).reduce((a, b) => a + b, 0) / Math.max(1, ocfConversion.filter(c => c > 0).length);
    let wcScore = 0;
    if (avgConversion > 1.3) wcScore = 15;
    else if (avgConversion > 1.1) wcScore = 12;
    else if (avgConversion > 0.9) wcScore = 8;
    else wcScore = 3;
    score += wcScore;
    details.push({ name: 'Conversión OCF', score: wcScore, max: 15, desc: `OCF/NI: ${avgConversion.toFixed(2)}x — ${avgConversion > 1.2 ? 'Excelente' : avgConversion > 0.9 ? 'Buena' : 'Débil'}` });
    
    return { score: Math.min(100, score), details, avgMargin, avgCapex, avgConversion };
}

// ============================================
// FCF Red Flags
// ============================================
function detectFCFRedFlags(hist, data) {
    const flags = [];
    const n = hist.years.length;
    
    // 1. FCF declining 2+ consecutive years
    let declining = 0;
    for (let i = 1; i < n; i++) {
        if (hist.fcf[i] < hist.fcf[i - 1]) declining++;
        else declining = 0;
        if (declining >= 2) {
            flags.push({ severity: 'high', text: `FCF en declive ${declining + 1} años consecutivos`, icon: '📉' });
            break;
        }
    }
    
    // 2. FCF < Net Income consistently
    let fcfLtNi = 0;
    for (let i = 0; i < n; i++) {
        if (hist.fcf[i] < hist.netIncome[i] * 0.85) fcfLtNi++;
    }
    if (fcfLtNi >= Math.ceil(n * 0.6)) {
        flags.push({ severity: 'high', text: `FCF < Net Income en ${fcfLtNi}/${n} años — posible problema de calidad de earnings`, icon: '⚠️' });
    }
    
    // 3. SBC > 10% of FCF
    if (hist.sbc) {
        const latestFCF = hist.fcf[n - 1];
        const latestSBC = hist.sbc[n - 1];
        if (latestFCF > 0 && latestSBC / latestFCF > 0.10) {
            const pct = ((latestSBC / latestFCF) * 100).toFixed(0);
            flags.push({ severity: 'medium', text: `SBC es ${pct}% del FCF — dilución significativa`, icon: '💸' });
        }
    }
    
    // 4. CAPEX growing faster than revenue
    if (n >= 3) {
        const capexGrowth = (hist.capex[n - 1] / hist.capex[0]) - 1;
        const revGrowth = (hist.revenue[n - 1] / hist.revenue[0]) - 1;
        if (capexGrowth > revGrowth * 1.5 && capexGrowth > 0.3) {
            flags.push({ severity: 'medium', text: `CAPEX crece más rápido que revenue (${(capexGrowth * 100).toFixed(0)}% vs ${(revGrowth * 100).toFixed(0)}%)`, icon: '🏗️' });
        }
    }
    
    // 5. Negative FCF with positive Net Income
    for (let i = Math.max(0, n - 3); i < n; i++) {
        if (hist.fcf[i] < 0 && hist.netIncome[i] > 0) {
            flags.push({ severity: 'high', text: `FCF negativo con Net Income positivo en ${hist.years[i]} — señal de alarma`, icon: '🚩' });
            break;
        }
    }
    
    // 6. Negative FCF overall
    if (hist.fcf[n - 1] <= 0) {
        flags.push({ severity: 'high', text: 'FCF negativo actual — empresa no genera efectivo libre', icon: '❌' });
    }
    
    return flags;
}

// ============================================
// FCF-Based Valuation Models
// ============================================
function calculateFCFValuations(hist, data) {
    const n = hist.years.length;
    const latestFCF = hist.fcf[n - 1] * 1e6; // back to absolute
    const fcfPerShare = data.shares > 0 ? latestFCF / data.shares : 0;
    const results = {};
    
    // 1. FCF Yield
    const fcfYield = data.price > 0 ? (fcfPerShare / data.price) * 100 : 0;
    const treasuryYield = 4.5; // 10Y approx
    results.fcfYield = {
        value: fcfYield,
        fcfPerShare: fcfPerShare,
        treasuryYield: treasuryYield,
        verdict: fcfYield > treasuryYield ? 'Atractivo vs bonos' : 'Menor que bonos del tesoro'
    };
    
    // 2. DCF 3 scenarios
    const baseFCFm = hist.fcf[n - 1]; // millions
    const sharesM = data.shares / 1e6;
    const netCashM = ((data.cash || 0) - (data.debt || 0)) / 1e6;
    
    const scenarios = {
        bear:  { growth: 0.03, terminal: 0.02, wacc: 0.12, label: 'Pesimista' },
        base:  { growth: 0.08, terminal: 0.025, wacc: 0.10, label: 'Base' },
        bull:  { growth: 0.15, terminal: 0.03, wacc: 0.09, label: 'Optimista' },
    };
    
    // Adjust growth by sector
    const sectorMult = {
        'Tecnología': 1.3, 'Finanzas': 0.7, 'Salud': 1.0,
        'Consumo': 0.6, 'Energía': 0.5, 'Industriales': 0.7, 'Automotriz': 0.9
    };
    const mult = sectorMult[data.sector] || 1.0;
    
    results.dcfScenarios = {};
    for (const [key, s] of Object.entries(scenarios)) {
        const g = Math.min(s.growth * mult, 0.25);
        let pv = 0;
        let cf = baseFCFm;
        for (let i = 1; i <= 10; i++) {
            cf *= (1 + (i <= 5 ? g : g * 0.5));
            pv += cf / Math.pow(1 + s.wacc, i);
        }
        const tv = (cf * (1 + s.terminal)) / (s.wacc - s.terminal);
        const pvTV = tv / Math.pow(1 + s.wacc, 10);
        const ev = pv + pvTV + netCashM;
        const valuePerShare = sharesM > 0 ? ev / sharesM : 0;
        results.dcfScenarios[key] = {
            label: s.label,
            growth: g,
            wacc: s.wacc,
            valuePerShare: Math.max(0, valuePerShare),
            upside: data.price > 0 ? ((valuePerShare - data.price) / data.price) * 100 : 0
        };
    }
    
    // 3. FCF Payback Period
    results.paybackYears = fcfPerShare > 0 ? data.price / fcfPerShare : Infinity;
    
    // 4. Owner Earnings (Buffett)
    const latestNI = hist.netIncome[n - 1] * 1e6;
    const latestDepr = (hist.depreciation ? hist.depreciation[n - 1] : 0) * 1e6;
    const maintenanceCapex = (hist.capex[n - 1] * 0.6) * 1e6; // ~60% of capex is maintenance
    const ownerEarnings = latestNI + latestDepr - maintenanceCapex;
    const oePerShare = data.shares > 0 ? ownerEarnings / data.shares : 0;
    results.ownerEarnings = {
        total: ownerEarnings,
        perShare: oePerShare,
        yield: data.price > 0 ? (oePerShare / data.price) * 100 : 0
    };
    
    // 5. EV/FCF
    const ev = data.marketCap + (data.debt || 0) - (data.cash || 0);
    results.evFcf = latestFCF > 0 ? ev / latestFCF : null;
    
    // Sector medians for EV/FCF
    const sectorEVFCF = {
        'Tecnología': 30, 'Finanzas': 15, 'Salud': 22,
        'Consumo': 20, 'Energía': 12, 'Industriales': 18, 'Automotriz': 25
    };
    results.sectorEvFcf = sectorEVFCF[data.sector] || 20;
    
    return results;
}

// ============================================
// FCF Verdict
// ============================================
function getFCFVerdict(qualityScore, flags, valuations) {
    const highFlags = flags.filter(f => f.severity === 'high').length;
    
    let verdict, level, explanation;
    const fairLow = valuations.dcfScenarios.bear.valuePerShare;
    const fairMid = valuations.dcfScenarios.base.valuePerShare;
    const fairHigh = valuations.dcfScenarios.bull.valuePerShare;
    
    if (qualityScore >= 70 && highFlags === 0) {
        verdict = 'FCF STRONG ✅';
        level = 'strong';
        explanation = `Calidad de FCF excelente (${qualityScore}/100). Sin banderas rojas críticas. FCF yield de ${valuations.fcfYield.value.toFixed(1)}%.`;
    } else if (qualityScore >= 45 && highFlags <= 1) {
        verdict = 'FCF CAUTION ⚠️';
        level = 'caution';
        explanation = `Calidad de FCF moderada (${qualityScore}/100). ${highFlags > 0 ? 'Una bandera roja detectada.' : 'Margen de mejora en métricas clave.'}`;
    } else {
        verdict = 'FCF WEAK ❌';
        level = 'weak';
        explanation = `Calidad de FCF baja (${qualityScore}/100). ${highFlags} banderas rojas críticas detectadas.`;
    }
    
    return { verdict, level, explanation, fairRange: { low: fairLow, mid: fairMid, high: fairHigh } };
}

// ============================================
// Main FCF Analysis Function
// ============================================
function performFCFAnalysis(data) {
    const ticker = data.ticker || '';
    const hist = getHistoricalFCF(ticker, data);
    const quality = calculateFCFQualityScore(hist);
    const flags = detectFCFRedFlags(hist, data);
    const valuations = calculateFCFValuations(hist, data);
    const verdict = getFCFVerdict(quality.score, flags, valuations);
    
    return { hist, quality, flags, valuations, verdict, ticker };
}

// ============================================
// Render FCF Section
// ============================================
function renderFCFSection(analysis, data) {
    const container = document.getElementById('fcf-analysis-section');
    if (!container) return;
    
    container.style.display = 'block';
    const { hist, quality, flags, valuations, verdict } = analysis;
    const n = hist.years.length;
    
    // Quality Score
    const scoreColor = quality.score >= 70 ? '#00FF00' : quality.score >= 45 ? '#FFD700' : '#FF3333';
    
    container.innerHTML = `
        <!-- FCF Verdict Card -->
        <div class="card fcf-verdict-card fcf-verdict-${verdict.level}">
            <div class="fcf-verdict-header">
                <div class="fcf-verdict-badge">${verdict.verdict}</div>
                <div class="fcf-quality-ring">
                    <svg viewBox="0 0 120 120" class="quality-svg">
                        <circle cx="60" cy="60" r="52" stroke="var(--border)" stroke-width="8" fill="none"/>
                        <circle cx="60" cy="60" r="52" stroke="${scoreColor}" stroke-width="8" fill="none"
                            stroke-dasharray="${quality.score * 3.27} 327" stroke-dashoffset="0"
                            transform="rotate(-90 60 60)" stroke-linecap="round"/>
                        <text x="60" y="55" text-anchor="middle" fill="#FFFFFF" font-size="28" font-weight="700" font-family="'JetBrains Mono',monospace">${quality.score}</text>
                        <text x="60" y="75" text-anchor="middle" fill="#888888" font-size="11" font-family="'JetBrains Mono',monospace">CALIDAD</text>
                    </svg>
                </div>
            </div>
            <p class="fcf-verdict-explanation">${verdict.explanation}</p>
            <div class="fcf-fair-range">
                <span class="range-label">Rango de Valor Justo (FCF):</span>
                <span class="range-values">
                    <span class="range-bear">$${verdict.fairRange.low.toFixed(2)}</span>
                    <span class="range-sep">—</span>
                    <span class="range-base">$${verdict.fairRange.mid.toFixed(2)}</span>
                    <span class="range-sep">—</span>
                    <span class="range-bull">$${verdict.fairRange.high.toFixed(2)}</span>
                </span>
            </div>
        </div>

        <!-- Quality Score Breakdown -->
        <div class="card fcf-quality-card">
            <div class="card-header">
                <h3>🔬 FCF Quality Score — ${quality.score}/100</h3>
            </div>
            <div class="fcf-quality-bars">
                ${quality.details.map(d => `
                    <div class="quality-bar-row">
                        <div class="quality-bar-label">
                            <span>${d.name}</span>
                            <span class="quality-bar-pts" style="font-family:var(--font-mono)">${d.score}/${d.max}</span>
                        </div>
                        <div class="quality-bar-track">
                            <div class="quality-bar-fill" style="width:${(d.score / d.max * 100)}%; background:${d.score / d.max >= 0.7 ? '#00FF00' : d.score / d.max >= 0.4 ? '#FFD700' : '#FF3333'}"></div>
                        </div>
                        <div class="quality-bar-desc">${d.desc}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- FCF Historical Chart -->
        <div class="card fcf-chart-card">
            <div class="card-header">
                <h3>📊 FCF Histórico${hist.synthetic ? ' (Estimado)' : ''}</h3>
            </div>
            <div class="fcf-chart-container">
                <canvas id="fcf-history-chart" height="280"></canvas>
            </div>
        </div>

        <!-- FCF Valuation Models -->
        <div class="card fcf-valuations-card">
            <div class="card-header">
                <h3>💎 Modelos de Valoración FCF</h3>
            </div>
            <div class="fcf-models-grid">
                <!-- FCF Yield -->
                <div class="fcf-model-item">
                    <div class="fcf-model-label">FCF Yield</div>
                    <div class="fcf-model-value" style="color:${valuations.fcfYield.value > valuations.fcfYield.treasuryYield ? '#00FF00' : '#FF3333'}">
                        ${valuations.fcfYield.value.toFixed(2)}%
                    </div>
                    <div class="fcf-model-sub">vs Treasury ${valuations.fcfYield.treasuryYield}%</div>
                </div>
                <!-- EV/FCF -->
                <div class="fcf-model-item">
                    <div class="fcf-model-label">EV/FCF</div>
                    <div class="fcf-model-value" style="color:${valuations.evFcf && valuations.evFcf < valuations.sectorEvFcf ? '#00FF00' : '#FFD700'}">
                        ${valuations.evFcf ? valuations.evFcf.toFixed(1) + 'x' : 'N/A'}
                    </div>
                    <div class="fcf-model-sub">Sector: ${valuations.sectorEvFcf}x</div>
                </div>
                <!-- Payback -->
                <div class="fcf-model-item">
                    <div class="fcf-model-label">Payback Period</div>
                    <div class="fcf-model-value" style="color:${valuations.paybackYears < 15 ? '#00FF00' : valuations.paybackYears < 25 ? '#FFD700' : '#FF3333'}">
                        ${valuations.paybackYears === Infinity ? '∞' : valuations.paybackYears.toFixed(1)} años
                    </div>
                    <div class="fcf-model-sub">Recuperar inversión al FCF actual</div>
                </div>
                <!-- Owner Earnings -->
                <div class="fcf-model-item">
                    <div class="fcf-model-label">Owner Earnings (Buffett)</div>
                    <div class="fcf-model-value">$${valuations.ownerEarnings.perShare.toFixed(2)}</div>
                    <div class="fcf-model-sub">Yield: ${valuations.ownerEarnings.yield.toFixed(2)}%</div>
                </div>
            </div>

            <!-- DCF 3 Scenarios -->
            <div class="fcf-scenarios">
                <h4>DCF — 3 Escenarios (10 años)</h4>
                <div class="fcf-scenarios-grid">
                    ${Object.entries(valuations.dcfScenarios).map(([key, s]) => {
                        const color = key === 'bear' ? '#FF3333' : key === 'base' ? '#3498db' : '#00FF00';
                        return `
                        <div class="fcf-scenario-item" style="border-color:${color}">
                            <div class="scenario-label" style="color:${color}">${s.label}</div>
                            <div class="scenario-value">$${s.valuePerShare.toFixed(2)}</div>
                            <div class="scenario-details">
                                <span>Growth: ${(s.growth * 100).toFixed(0)}%</span>
                                <span>WACC: ${(s.wacc * 100).toFixed(0)}%</span>
                            </div>
                            <div class="scenario-upside" style="color:${s.upside >= 0 ? '#00FF00' : '#FF3333'}">
                                ${s.upside >= 0 ? '+' : ''}${s.upside.toFixed(1)}%
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>

        <!-- Red Flags -->
        <div class="card fcf-flags-card">
            <div class="card-header">
                <h3>🚩 Banderas Rojas FCF</h3>
            </div>
            <div class="fcf-flags-list">
                ${flags.length === 0 
                    ? '<div class="fcf-flag-item fcf-flag-ok"><span class="flag-icon">✅</span><span>Sin banderas rojas — perfil de FCF saludable</span></div>'
                    : flags.map(f => `
                        <div class="fcf-flag-item fcf-flag-${f.severity}">
                            <span class="flag-icon">${f.icon}</span>
                            <span>${f.text}</span>
                        </div>
                    `).join('')}
            </div>
        </div>
    `;
    
    // Render Chart
    renderFCFChart(hist);
}

// ============================================
// Chart.js Historical FCF Chart
// ============================================
function renderFCFChart(hist) {
    const canvas = document.getElementById('fcf-history-chart');
    if (!canvas) return;
    
    // Wait for Chart.js
    if (typeof Chart === 'undefined') {
        console.warn('[FCF] Chart.js not loaded, using fallback');
        renderFCFChartFallback(hist, canvas.parentElement);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (window._fcfChart) window._fcfChart.destroy();
    
    const n = hist.years.length;
    // Find years where FCF < Net Income for annotations
    const fcfLtNi = hist.years.map((y, i) => hist.fcf[i] < hist.netIncome[i] * 0.9);
    
    window._fcfChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hist.years.map(String),
            datasets: [
                {
                    label: 'FCF',
                    data: hist.fcf,
                    backgroundColor: hist.fcf.map((f, i) => fcfLtNi[i] ? 'rgba(255,71,87,0.7)' : 'rgba(0,208,132,0.7)'),
                    borderColor: hist.fcf.map((f, i) => fcfLtNi[i] ? '#ff4757' : '#00d084'),
                    borderWidth: 1,
                    order: 2
                },
                {
                    label: 'Net Income',
                    data: hist.netIncome,
                    type: 'line',
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52,152,219,0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#3498db',
                    fill: false,
                    order: 1
                },
                {
                    label: 'Operating CF',
                    data: hist.operatingCF,
                    type: 'line',
                    borderColor: '#9b59b6',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    pointBackgroundColor: '#9b59b6',
                    fill: false,
                    order: 1
                },
                {
                    label: 'CAPEX',
                    data: hist.capex.map(c => -c),
                    backgroundColor: 'rgba(243,156,18,0.5)',
                    borderColor: '#f39c12',
                    borderWidth: 1,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: '#a0a3b1', font: { family: "'Inter', sans-serif", size: 12 } }
                },
                tooltip: {
                    backgroundColor: '#1e2029',
                    borderColor: '#2d2f3d',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#a0a3b1',
                    callbacks: {
                        label: function(ctx) {
                            const val = ctx.raw;
                            const absVal = Math.abs(val);
                            const formatted = absVal >= 1000 ? (absVal / 1000).toFixed(1) + 'B' : absVal.toFixed(0) + 'M';
                            return `${ctx.dataset.label}: $${val < 0 ? '-' : ''}${formatted}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#6b6e7e' },
                    grid: { color: 'rgba(45,47,61,0.5)' }
                },
                y: {
                    ticks: {
                        color: '#6b6e7e',
                        callback: function(v) {
                            return (v >= 0 ? '' : '-') + '$' + (Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(0) + 'B' : Math.abs(v).toFixed(0) + 'M');
                        }
                    },
                    grid: { color: 'rgba(45,47,61,0.5)' }
                }
            }
        }
    });
}

function renderFCFChartFallback(hist, container) {
    const maxVal = Math.max(...hist.fcf, ...hist.netIncome, ...hist.operatingCF);
    const scale = maxVal > 0 ? 200 / maxVal : 1;
    
    container.innerHTML = `
        <div class="fcf-chart-fallback">
            ${hist.years.map((y, i) => `
                <div class="fcf-bar-group">
                    <div class="fcf-bar" style="height:${Math.max(2, hist.fcf[i] * scale)}px;background:${hist.fcf[i] < hist.netIncome[i] * 0.9 ? '#FF3333' : '#00FF00'}"></div>
                    <span class="fcf-bar-label">${y}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// Update Stock Header with FCF Badge
// ============================================
function updateStockHeaderFCF(analysis) {
    const tickerEl = document.getElementById('stock-ticker');
    if (!tickerEl) return;
    
    // Remove existing badge
    const existing = document.getElementById('fcf-quality-badge');
    if (existing) existing.remove();
    
    const badge = document.createElement('span');
    badge.id = 'fcf-quality-badge';
    badge.className = `fcf-badge fcf-badge-${analysis.verdict.level}`;
    badge.textContent = `FCF: ${analysis.quality.score}/100`;
    tickerEl.parentElement.appendChild(badge);
    
    // Add FCF Yield next to price
    const priceSection = document.getElementById('stock-price-section');
    if (priceSection) {
        let yieldEl = document.getElementById('fcf-yield-display');
        if (!yieldEl) {
            yieldEl = document.createElement('div');
            yieldEl.id = 'fcf-yield-display';
            yieldEl.className = 'fcf-yield-header';
            priceSection.appendChild(yieldEl);
        }
        const y = analysis.valuations.fcfYield.value;
        yieldEl.innerHTML = `FCF Yield: <strong style="color:${y > 4.5 ? '#00FF00' : y > 2 ? '#FFD700' : '#FF3333'}">${y.toFixed(2)}%</strong>`;
    }
}

// ============================================
// Exports
// ============================================
if (typeof window !== 'undefined') {
    window.performFCFAnalysis = performFCFAnalysis;
    window.renderFCFSection = renderFCFSection;
    window.updateStockHeaderFCF = updateStockHeaderFCF;
    window.FCF_HISTORICAL = FCF_HISTORICAL;
}
