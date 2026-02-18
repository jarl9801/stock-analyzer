# Stock Valuation & Portfolio Tracker

Aplicación completa para análisis de valoración de acciones con:
- Valoración por Descuento de Dividendos (DDM)
- Valoración por Múltiplos Comparables
- Valoración por Descuento de Flujos de Caja (DCF)
- Análisis de riesgo y márgenes de seguridad
- Seguimiento de cartera

## Estructura

```
stock-analyzer/
├── index.html              # Punto de entrada
├── css/
│   └── styles.css          # Estilos modernos
├── js/
│   ├── app.js              # Lógica principal
│   ├── valuation.js        # Métodos de valoración
│   ├── risk-analysis.js    # Análisis de riesgo
│   ├── portfolio.js        # Seguimiento de cartera
│   └── data-fetcher.js     # Obtención de datos
├── data/
│   └── tickers.json        # Lista de tickers
└── README.md
```

## Características

### 1. Valoración por Descuento de Dividendos (DDM)
- Modelo Gordon Growth
- Múltiples etapas de crecimiento
- Sensibilidad a tasas de descuento

### 2. Valoración por Múltiplos Comparables
- P/E, P/B, EV/EBITDA
- Comparación con sector
- Análisis de premium/discount

### 3. Valoración DCF
- Proyección de flujos libres
- Terminal value
- WACC personalizable

### 4. Análisis de Riesgo
- Ratio de Sharpe
- Beta vs mercado
- Volatilidad histórica
- Márgenes de seguridad

### 5. Seguimiento de Cartera
- Posiciones abiertas
- P&L en tiempo real
- Asignación por sector
- Rebalanceo sugerido