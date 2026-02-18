// ============================================
// TEST.JS - Pruebas de verificación
// ============================================

// Test 1: Verificar que las funciones existen
console.log('=== TEST DE FUNCIONES ===');

const requiredFunctions = [
    'fetchStockData',
    'calculateDCFAuto',
    'calculateDDMAuto', 
    'calculateMultiplesAuto',
    'calculateAllValuations',
    'performFullAnalysis',
    'searchStock',
    'updateStockUI'
];

let allExist = true;
requiredFunctions.forEach(fn => {
    if (typeof window[fn] === 'function') {
        console.log(`✅ ${fn} existe`);
    } else {
        console.log(`❌ ${fn} NO existe`);
        allExist = false;
    }
});

// Test 2: Probar cálculo DCF
console.log('\n=== TEST DCF ===');
const testData = {
    fcf: 99000000000,
    shares: 15400000000,
    price: 175.50,
    sector: 'Tecnología'
};

if (typeof calculateDCFAuto === 'function') {
    const dcf = calculateDCFAuto(testData);
    if (dcf && dcf.valuePerShare > 0) {
        console.log(`✅ DCF calculado: $${dcf.valuePerShare.toFixed(2)}`);
    } else {
        console.log('❌ DCF no calculó correctamente');
    }
}

// Test 3: Probar cálculo DDM
console.log('\n=== TEST DDM ===');
const testDataDDM = {
    dividend: 0.96,
    price: 175.50,
    sector: 'Tecnología',
    beta: 1.2
};

if (typeof calculateDDMAuto === 'function') {
    const ddm = calculateDDMAuto(testDataDDM);
    if (ddm && ddm.valuePerShare > 0) {
        console.log(`✅ DDM calculado: $${ddm.valuePerShare.toFixed(2)}`);
    } else {
        console.log('❌ DDM no calculó correctamente');
    }
}

// Test 4: Probar cálculo Múltiplos
console.log('\n=== TEST MÚLTIPLOS ===');
const testDataMult = {
    eps: 6.15,
    bookValue: 3.88,
    price: 175.50,
    sector: 'Tecnología'
};

if (typeof calculateMultiplesAuto === 'function') {
    const mult = calculateMultiplesAuto(testDataMult);
    if (mult && mult.valueAvg > 0) {
        console.log(`✅ Múltiplos calculado: $${mult.valueAvg.toFixed(2)}`);
    } else {
        console.log('❌ Múltiplos no calculó correctamente');
    }
}

console.log('\n=== TEST COMPLETO ===');
if (allExist) {
    console.log('✅ Todas las funciones requeridas existen');
} else {
    console.log('❌ Faltan algunas funciones');
}
