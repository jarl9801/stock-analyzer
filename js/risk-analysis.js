// ============================================
// RISK-ANALYSIS.JS - Análisis de Riesgo
// ============================================

// Variables globales
let riskMetrics = {
    sharpeRatio: null,
    beta: null,
    volatility: null,
    marginOfSafety: null
};

// ============================================
// Actualizar Análisis de Riesgo
// ============================================
function updateRiskAnalysis() {
    if (!currentStock) return;
    
    // Calcular métricas de riesgo
    calculateSharpeRatio();
    calculateBeta();
    calculateVolatility();
    calculateMarginOfSafety();
    
    // Actualizar UI
    updateRiskUI();
    
    // Generar assessment
    generateRiskAssessment();
}

// ============================================
// Ratio de Sharpe
// ============================================
function calculateSharpeRatio() {
    // En una implementación real, esto usaría datos históricos
    // Sharpe Ratio = (Return - Risk Free Rate) / Standard Deviation
    
    const riskFreeRate = 0.04; // 4% T-bill
    const expectedReturn = getExpectedReturn();
    const volatility = getHistoricalVolatility();
    
    const sharpeRatio = (expectedReturn - riskFreeRate) / volatility;
    
    riskMetrics.sharpeRatio = sharpeRatio;
}

// ============================================
// Beta (Sensibilidad al mercado)
// ============================================
function calculateBeta() {
    // En producción, esto vendría de datos de mercado
    // Por ahora simulamos basado en el sector
    
    const sectorBetas = {
        'Tecnología': 1.2,
        'Finanzas': 1.1,
        'Salud': 0.8,
        'Consumo': 0.9,
        'Energía': 1.3,
        'Automotriz': 1.4,
        'Diversificado': 1.0
    };
    
    const baseBeta = sectorBetas[currentStock.sector] || 1.0;
    
    // Añadir algo de variación aleatoria
    const variation = (Math.random() - 0.5) * 0.2;
    riskMetrics.beta = baseBeta + variation;
}

// ============================================
// Volatilidad
// ============================================
function calculateVolatility() {
    // Volatilidad anualizada basada en sector
    const sectorVolatilities = {
        'Tecnología': 0.25,
        'Finanzas': 0.20,
        'Salud': 0.18,
        'Consumo': 0.15,
        'Energía': 0.30,
        'Automotriz': 0.35,
        'Diversificado': 0.22
    };
    
    const baseVol = sectorVolatilities[currentStock.sector] || 0.22;
    const variation = (Math.random() - 0.5) * 0.05;
    
    riskMetrics.volatility = baseVol + variation;
}

// ============================================
// Margen de Seguridad
// ============================================
function calculateMarginOfSafety() {
    const currentPrice = currentStock?.price || 0;
    
    // Obtener el valor intrínseco calculado
    let fairValue = null;
    
    if (valuations.dcf && valuations.multiples && valuations.ddm) {
        // Promedio ponderado
        fairValue = (
            valuations.dcf.valuePerShare * 0.5 +
            valuations.multiples.valueAvg * 0.3 +
            valuations.ddm.valuePerShare * 0.2
        );
    } else if (valuations.dcf) {
        fairValue = valuations.dcf.valuePerShare;
    } else if (valuations.multiples) {
        fairValue = valuations.multiples.valueAvg;
    } else if (valuations.ddm) {
        fairValue = valuations.ddm.valuePerShare;
    }
    
    if (fairValue && currentPrice > 0) {
        riskMetrics.marginOfSafety = ((fairValue - currentPrice) / fairValue) * 100;
    } else {
        riskMetrics.marginOfSafety = null;
    }
}

// ============================================
// Actualizar UI de Riesgo
// ============================================
function updateRiskUI() {
    // Sharpe Ratio
    const sharpeEl = document.getElementById('risk-sharpe');
    if (riskMetrics.sharpeRatio !== null) {
        sharpeEl.textContent = riskMetrics.sharpeRatio.toFixed(2);
        
        // Color coding
        if (riskMetrics.sharpeRatio >= 1) {
            sharpeEl.style.color = 'var(--accent-green)';
        } else if (riskMetrics.sharpeRatio >= 0.5) {
            sharpeEl.style.color = 'var(--accent-yellow)';
        } else {
            sharpeEl.style.color = 'var(--accent-red)';
        }
    }
    
    // Beta
    const betaEl = document.getElementById('risk-beta');
    if (riskMetrics.beta !== null) {
        betaEl.textContent = riskMetrics.beta.toFixed(2);
        
        if (riskMetrics.beta > 1.2) {
            betaEl.style.color = 'var(--accent-red)';
        } else if (riskMetrics.beta < 0.8) {
            betaEl.style.color = 'var(--accent-green)';
        } else {
            betaEl.style.color = 'var(--text-primary)';
        }
    }
    
    // Volatility
    const volEl = document.getElementById('risk-volatility');
    if (riskMetrics.volatility !== null) {
        volEl.textContent = `${(riskMetrics.volatility * 100).toFixed(1)}%`;
        
        if (riskMetrics.volatility > 0.30) {
            volEl.style.color = 'var(--accent-red)';
        } else if (riskMetrics.volatility < 0.20) {
            volEl.style.color = 'var(--accent-green)';
        } else {
            volEl.style.color = 'var(--accent-yellow)';
        }
    }
    
    // Margin of Safety
    const marginEl = document.getElementById('risk-margin');
    if (riskMetrics.marginOfSafety !== null) {
        const mos = riskMetrics.marginOfSafety;
        marginEl.textContent = `${mos.toFixed(1)}%`;
        
        if (mos >= 30) {
            marginEl.style.color = 'var(--accent-green)';
        } else if (mos >= 15) {
            marginEl.style.color = 'var(--accent-yellow)';
        } else if (mos > 0) {
            marginEl.style.color = 'var(--accent-blue)';
        } else {
            marginEl.style.color = 'var(--accent-red)';
        }
    }
}

// ============================================
// Generar Assessment de Riesgo
// ============================================
function generateRiskAssessment() {
    const assessmentEl = document.getElementById('risk-assessment');
    
    if (!riskMetrics.beta || !riskMetrics.volatility) {
        assessmentEl.textContent = 'Completa las valoraciones para ver el análisis de riesgo';
        assessmentEl.className = 'risk-assessment';
        return;
    }
    
    let riskLevel = '';
    let riskColor = '';
    let recommendations = [];
    
    // Evaluar nivel de riesgo
    if (riskMetrics.beta > 1.3 || riskMetrics.volatility > 0.35) {
        riskLevel = 'ALTO RIESGO';
        riskColor = 'high-risk';
    } else if (riskMetrics.beta > 1.1 || riskMetrics.volatility > 0.25) {
        riskLevel = 'RIESGO MODERADO';
        riskColor = 'moderate-risk';
    } else {
        riskLevel = 'BAJO RIESGO';
        riskColor = 'low-risk';
    }
    
    // Generar recomendaciones
    if (riskMetrics.sharpeRatio < 0.5) {
        recommendations.push('Ratio Sharpe bajo - considera otros activos');
    }
    
    if (riskMetrics.beta > 1.2) {
        recommendations.push('Alta sensibilidad al mercado - diversifica');
    }
    
    if (riskMetrics.marginOfSafety < 15 && riskMetrics.marginOfSafety > 0) {
        recommendations.push('Margen de seguridad limitado - reduce posición');
    }
    
    if (riskMetrics.marginOfSafety < 0) {
        recommendations.push('Sin margen de seguridad - alto riesgo de pérdida');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('Perfil de riesgo aceptable para inversión');
    }
    
    // Construir HTML
    let html = `
        <div class="risk-level ${riskColor}">
            <strong>${riskLevel}</strong>
        </div>
        <ul class="risk-recommendations">
            ${recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
    `;
    
    assessmentEl.innerHTML = html;
    assessmentEl.className = 'risk-assessment active';
}

// ============================================
// Funciones auxiliares
// ============================================
function getExpectedReturn() {
    // Retorno esperado basado en valoración
    if (valuations.dcf) {
        return valuations.dcf.upside / 100;
    }
    return 0.10; // 10% default
}

function getHistoricalVolatility() {
    return riskMetrics.volatility || 0.20;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateRiskAnalysis,
        riskMetrics
    };
}
