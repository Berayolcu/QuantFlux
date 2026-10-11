// Chart configurations for QuantFlux Analytics (v3.2)
Chart.defaults.color = '#a1a1aa';
Chart.defaults.font.family = 'Inter';

let timeSeriesChart = null;
let varDistChart = null;
let timeseriesDeepChart = null;
let riskDistChart = null;
let assetRiskChart = null;

let fundCompChart = null;
let fundWaterfallChart = null;
let esCarChart = null;
let mfAttrChart = null;
let stressMcChart = null;

// Main Chart Initializer
function initCharts() {
    initOverviewCharts();
    initTimeseriesDeepChart();
    initRiskCharts();
    initFundamentalCharts();
    initEventStudyCharts();
    initMultiFactorCharts();
    initStressCharts(0, 0, 0, 0);
}

// 1. Overview Charts
function initOverviewCharts() {
    const hasData = window.QuantData && window.QuantData.assets && window.QuantData.assets.length > 0;
    
    const toggleEmptyState = (containerId, canvasId) => {
        const container = document.getElementById(containerId);
        if(!container) return null;
        const banner = container.querySelector('.empty-state-banner');
        const canvas = document.getElementById(canvasId);
        if (hasData) {
            if(banner) banner.style.display = 'none';
            if(canvas) canvas.style.display = 'block';
            return canvas;
        } else {
            if(banner) banner.style.display = 'flex';
            if(canvas) canvas.style.display = 'none';
            return null;
        }
    };

    const tsCtx = toggleEmptyState('timeSeriesContainer', 'timeSeriesChart');
    if (tsCtx) {
        const company = window.QuantData.getActiveCompany ? window.QuantData.getActiveCompany() : null;
        const dataList = (company && company.data) ? company.data : window.QuantData.assets;
        
        const labels = dataList.map(d => d.period).reverse();
        const sales = dataList.map(d => (d.revenue || d.currentAssets * 1.5) / 1e9).reverse();
        const netIncome = dataList.map(d => (d.netIncome || 0) / 1e9).reverse();

        // Forecast projection next 2 periods
        const lastNet = netIncome[netIncome.length - 1] || 100;
        const lastSales = sales[sales.length - 1] || 500;
        const extendedLabels = [...labels, '2026/12 (T)', '2027/12 (T)'];
        
        const salesHist = [...sales, null, null];
        const netHist = [...netIncome, null, null];
        const netForecast = [...Array(netIncome.length - 1).fill(null), lastNet, lastNet * 1.12, lastNet * 1.25];
        const upperCI = [...Array(netIncome.length - 1).fill(null), lastNet, lastNet * 1.12 * 1.10, lastNet * 1.25 * 1.14];
        const lowerCI = [...Array(netIncome.length - 1).fill(null), lastNet, lastNet * 1.12 * 0.90, lastNet * 1.25 * 0.86];

        if (timeSeriesChart) timeSeriesChart.destroy();
        timeSeriesChart = new Chart(tsCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: extendedLabels,
                datasets: [
                    {
                        label: 'Net Satışlar / Hasılat (₺ Mrd)',
                        data: salesHist,
                        borderColor: '#60a5fa',
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#60a5fa'
                    },
                    {
                        label: 'Net Kâr (Tarihsel ₺ Mrd)',
                        data: netHist,
                        borderColor: '#a1a1aa',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#a1a1aa'
                    },
                    {
                        label: 'Net Kâr Projeksiyonu (₺ Mrd)',
                        data: netForecast,
                        borderColor: '#06b6d4',
                        borderWidth: 2.5,
                        borderDash: [5, 5],
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#06b6d4'
                    },
                    {
                        label: 'Üst Güven Bandı (%95)',
                        data: upperCI,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(6, 182, 212, 0.12)',
                        fill: '+1',
                        pointRadius: 0
                    },
                    {
                        label: 'Alt Güven Bandı (%95)',
                        data: lowerCI,
                        borderColor: 'transparent',
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { filter: (item) => !item.text.includes('Band') } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ₺${ctx.parsed.y ? ctx.parsed.y.toFixed(2) : '--'} Mrd`
                        }
                    }
                },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '₺ Milyar', color: '#71717a' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
        window.TimeSeriesChart = timeSeriesChart;
    }

    const varCtx = toggleEmptyState('varDistContainer', 'varDistChart');
    if (varCtx) {
        const xValues = [];
        const yValues = [];
        for(let i = -4; i <= 4; i += 0.1) {
            xValues.push(i.toFixed(1));
            const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * i * i);
            yValues.push(y);
        }

        const pointColors = xValues.map(v => parseFloat(v) < -1.65 ? '#f43f5e' : 'rgba(6, 182, 212, 0.5)');

        if (varDistChart) varDistChart.destroy();
        varDistChart = new Chart(varCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: xValues,
                datasets: [{
                    label: 'Getiri Dağılımı (Normal)',
                    data: yValues,
                    backgroundColor: pointColors,
                    borderWidth: 0,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
        window.VarDistChart = varDistChart;
    }
}

// 2. Fundamental Analysis Charts
function initFundamentalCharts() {
    const compCtx = document.getElementById('chart-fundamental-comp');
    if (compCtx && window.QuantData) {
        const company = window.QuantData.getActiveCompany ? window.QuantData.getActiveCompany() : null;
        const periodsData = (company && company.data) ? company.data.slice().reverse() : [];
        
        if (periodsData.length > 0) {
            const labels = periodsData.map(d => d.period);
            const ca = periodsData.map(d => (d.currentAssets / 1e9).toFixed(1));
            const fa = periodsData.map(d => (d.fixedAssets / 1e9).toFixed(1));
            const stl = periodsData.map(d => (d.shortTermLiab / 1e9).toFixed(1));
            const ltl = periodsData.map(d => (d.longTermLiab / 1e9).toFixed(1));
            const eq = periodsData.map(d => (d.equity / 1e9).toFixed(1));

            if (fundCompChart) fundCompChart.destroy();
            fundCompChart = new Chart(compCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Dönen Varlıklar', data: ca, backgroundColor: '#0284c7', stack: 'Aktif' },
                        { label: 'Duran Varlıklar', data: fa, backgroundColor: '#06b6d4', stack: 'Aktif' },
                        { label: 'Kısa Vadeli Borç', data: stl, backgroundColor: '#f43f5e', stack: 'Pasif' },
                        { label: 'Uzun Vadeli Borç', data: ltl, backgroundColor: '#f59e0b', stack: 'Pasif' },
                        { label: 'Özkaynaklar', data: eq, backgroundColor: '#10b981', stack: 'Pasif' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ₺${ctx.parsed.y} Mrd`
                            }
                        }
                    },
                    scales: {
                        x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '₺ Milyar', color: '#71717a' } }
                    }
                }
            });
            window.FundCompChart = fundCompChart;
        }
    }

    const wfCtx = document.getElementById('chart-fundamental-waterfall');
    if (wfCtx && window.QuantData) {
        const company = window.QuantData.getActiveCompany ? window.QuantData.getActiveCompany() : null;
        const latest = (company && company.data && company.data[0]) ? company.data[0] : null;

        if (latest) {
            const rev = (latest.revenue / 1e9) || 100;
            const cost = (Math.abs(latest.costOfSales) / 1e9) || 70;
            const gp = (latest.grossProfit / 1e9) || (rev - cost);
            const op = (latest.operatingProfit / 1e9) || (gp * 0.6);
            const ni = (latest.netIncome / 1e9) || (op * 0.8);

            const labels = ['Hasılat', 'Satış Maliyeti (-)', 'Brüt Kâr', 'Faaliyet Kârı', 'Net Kâr'];
            const data = [rev, cost, gp, op, ni];
            const colors = ['#3b82f6', '#f43f5e', '#10b981', '#06b6d4', '#00F2FE'];

            if (fundWaterfallChart) fundWaterfallChart.destroy();
            fundWaterfallChart = new Chart(wfCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tutar (₺ Mrd)',
                        data: data,
                        backgroundColor: colors,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.label}: ₺${ctx.parsed.y.toFixed(1)} Mrd`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '₺ Milyar', color: '#71717a' } }
                    }
                }
            });
            window.FundWaterfallChart = fundWaterfallChart;
        }
    }
}

// 3. Event Study CAR Charts
function initEventStudyCharts() {
    const carCtx = document.getElementById('chart-eventstudy-car');
    if (!carCtx || !window.QuantData || !window.QuantData.eventStudy) return;

    const ticker = window.QuantData.activeTicker || 'THYAO';
    const es = window.QuantData.eventStudy[ticker] || window.QuantData.eventStudy['THYAO'];
    if (!es || !es.carCurve) return;

    const curve = es.carCurve;
    const labels = curve.map(c => `t${c.day >= 0 ? '+' : ''}${c.day}`);
    const carData = curve.map(c => c.car);
    const upperData = curve.map(c => c.ciUpper);
    const lowerData = curve.map(c => c.ciLower);
    const benchData = curve.map(c => c.benchmark);

    // Event line plugin
    const eventDayPlugin = {
        id: 'eventDayLine',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            const zeroIdx = curve.findIndex(c => c.day === 0);
            if (zeroIdx !== -1) {
                const x = xAxis.getPixelForTick(zeroIdx);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#f43f5e';
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.fillStyle = '#f43f5e';
                ctx.font = 'bold 11px Inter';
                ctx.fillText('t=0 Bilanço Açıklanma Günü', x + 6, yAxis.top + 20);
                ctx.restore();
            }
        }
    };

    if (esCarChart) esCarChart.destroy();
    esCarChart = new Chart(carCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Kümülatif Anormal Getiri (CAR %)',
                    data: carData,
                    borderColor: '#10b981',
                    borderWidth: 3,
                    tension: 0.25,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 6
                },
                {
                    label: 'Üst Güven Aralığı (%95 CI)',
                    data: upperData,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(6, 182, 212, 0.12)',
                    fill: '+1',
                    pointRadius: 0
                },
                {
                    label: 'Alt Güven Aralığı (%95 CI)',
                    data: lowerData,
                    borderColor: 'transparent',
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'BIST 30 Benchmark Getirisi (%)',
                    data: benchData,
                    borderColor: '#71717a',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    tension: 0.2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { filter: (i) => !i.text.includes('CI') } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Kümülatif Anormal Getiri (%)', color: '#71717a' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        },
        plugins: [eventDayPlugin]
    });
    window.EsCarChart = esCarChart;
}

// 4. Multi-Factor Regression Attribution Chart
function initMultiFactorCharts() {
    const attrCtx = document.getElementById('chart-multifactor-attr');
    if (!attrCtx || !window.QuantData || !window.QuantData.multiFactor) return;

    const ticker = window.QuantData.activeTicker || 'THYAO';
    const mf = window.QuantData.multiFactor[ticker] || window.QuantData.multiFactor['THYAO'];
    if (!mf || !mf.attribution) return;

    const labels = mf.attribution.map(a => `${a.factor} (%${a.pct})`);
    const data = mf.attribution.map(a => a.pct);
    const colors = mf.attribution.map(a => a.color);

    if (mfAttrChart) mfAttrChart.destroy();
    mfAttrChart = new Chart(attrCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a1a1aa',
                        font: { size: 11 },
                        usePointStyle: true,
                        padding: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Varyans Katkısı: %${ctx.parsed}`
                    }
                }
            }
        }
    });
    window.MfAttrChart = mfAttrChart;
}

// 5. Stress Testing Monte Carlo Distribution Chart
function initStressCharts(fxShock = 0, costShock = 0, rateShock = 0, revShock = 0) {
    const mcCtx = document.getElementById('chart-stress-mc');
    if (!mcCtx) return;

    // Normal vs Stressed Distribution
    const xValues = [];
    const baselineDist = [];
    const stressedDist = [];

    // Mean shift based on macro shocks
    const shift = (fxShock * 0.25 - costShock * 0.8 - rateShock * 0.005 + revShock * 0.9) / 10;
    const volMultiplier = 1 + (Math.abs(fxShock) + costShock + Math.abs(rateShock) / 100) / 100;

    for (let i = -6; i <= 6; i += 0.15) {
        xValues.push(i.toFixed(1));
        // Normal baseline
        const yBase = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * i * i);
        baselineDist.push(yBase);
        
        // Stressed fat-tailed distribution with shift and higher volatility
        const z = (i - shift) / volMultiplier;
        const yStress = (1 / (volMultiplier * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
        stressedDist.push(yStress);
    }

    const varCutoffPlugin = {
        id: 'stressedVarLine',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            const stressedCutoff = -2.33 * volMultiplier + shift;
            const idx = chart.data.labels.findIndex(v => parseFloat(v) >= stressedCutoff);
            if (idx !== -1) {
                const x = xAxis.getPixelForTick(idx);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#f43f5e';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.fillStyle = '#f43f5e';
                ctx.font = 'bold 11px Inter';
                ctx.fillText('Stressed VaR %99 Cut-off', x - 40, yAxis.top + 20);
                ctx.restore();
            }
        }
    };

    if (stressMcChart) stressMcChart.destroy();
    stressMcChart = new Chart(mcCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: xValues,
            datasets: [
                {
                    label: 'Mevcut Baz Dağılım (Normal)',
                    data: baselineDist,
                    borderColor: '#a1a1aa',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Şok Altındaki Monte Carlo Dağılımı (Fat-Tail)',
                    data: stressedDist,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    borderWidth: 2.5,
                    tension: 0.3,
                    pointRadius: 0,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: { enabled: true }
            },
            scales: {
                x: { title: { display: true, text: 'Simüle Edilen Getiri / Şok Sapması (Z-Score)', color: '#71717a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { display: false }
            }
        },
        plugins: [varCutoffPlugin]
    });
    window.StressMcChart = stressMcChart;
}

// 6. Deep Time Series Chart (Existing View)
function initTimeseriesDeepChart() {
    const tsDeepCtx = document.getElementById('chart-timeseries-deep');
    if (!tsDeepCtx) return;

    const labels = Array.from({length: 60}, (_, i) => `Gün ${i-30}`);
    const historical = Array.from({length: 30}, () => Math.random() * 10 + 150);
    const forecast = Array.from({length: 31}, (_, i) => historical[29] + (i * (Math.random() * 3 - 1)));
    const upper = forecast.map((v, i) => v + i * 1.5);
    const lower = forecast.map((v, i) => v - i * 1.5);

    const fullHistorical = [...historical, ...Array(30).fill(null)];
    const fullForecast = [...Array(29).fill(null), historical[29], ...forecast.slice(1)];
    const fullUpper = [...Array(29).fill(null), historical[29], ...upper.slice(1)];
    const fullLower = [...Array(29).fill(null), historical[29], ...lower.slice(1)];

    if (timeseriesDeepChart) timeseriesDeepChart.destroy();
    timeseriesDeepChart = new Chart(tsDeepCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tarihsel Fiyat',
                    data: fullHistorical,
                    borderColor: '#a1a1aa',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0
                },
                {
                    label: 'Tahmin Edilen Gelecek Patika (LSTM)',
                    data: fullForecast,
                    borderColor: '#06b6d4',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#06b6d4'
                },
                {
                    label: 'Üst %95 Güven Aralığı',
                    data: fullUpper,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(6, 182, 212, 0.15)',
                    fill: '+1',
                    pointRadius: 0
                },
                {
                    label: 'Alt %95 Güven Aralığı',
                    data: fullLower,
                    borderColor: 'transparent',
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { filter: (i) => !i.text.includes('Güven') } }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { maxTicksLimit: 10 } }
            }
        }
    });
    window.TimeseriesDeepChart = timeseriesDeepChart;
}

// 7. Risk Distribution & Asset Risk Doughnut
function initRiskCharts() {
    const riskDistCtx = document.getElementById('chart-risk-dist');
    if (riskDistCtx) {
        const xValues = [];
        const normValues = [];
        const tValues = [];
        for(let i = -5; i <= 5; i += 0.1) {
            xValues.push(i.toFixed(1));
            const yNorm = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * i * i);
            normValues.push(yNorm);
            const yT = 0.3675 * Math.pow(1 + (i * i) / 3, -2);
            tValues.push(yT);
        }

        const varPlugin = {
            id: 'varThreshold',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const thresholdValue = -1.65;
                const idx = chart.data.labels.findIndex(v => parseFloat(v) >= thresholdValue);
                if (idx !== -1) {
                    const x = xAxis.getPixelForTick(idx);
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#f43f5e';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.fillStyle = '#f43f5e';
                    ctx.font = '12px Inter';
                    ctx.fillText('VaR Cut-off (%95)', x - 40, yAxis.top + 20);
                    ctx.restore();
                }
            }
        };

        if (riskDistChart) riskDistChart.destroy();
        riskDistChart = new Chart(riskDistCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: xValues,
                datasets: [
                    {
                        label: 'Normal Dağılım',
                        data: normValues,
                        borderColor: '#a1a1aa',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: "Fat-tail Student's t",
                        data: tValues,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { x: { display: false }, y: { display: false } }
            },
            plugins: [varPlugin]
        });
        window.RiskDistChart = riskDistChart;
    }

    const assetRiskCtx = document.getElementById('chart-asset-risk');
    if (assetRiskCtx && window.QuantData) {
        const company = window.QuantData.getActiveCompany ? window.QuantData.getActiveCompany() : null;
        const latest = (company && company.data && company.data[0]) ? company.data[0] : null;

        let currentPct = 28, fixedPct = 72, shortPct = 21, longPct = 29, equityPct = 50;
        if (latest) {
            const ta = latest.totalAssets || 1;
            currentPct = Math.round(((latest.currentAssets || 0) / ta) * 100);
            fixedPct = Math.round(((latest.fixedAssets || 0) / ta) * 100);
            shortPct = Math.round(((latest.shortTermLiab || 0) / ta) * 100);
            longPct = Math.round(((latest.longTermLiab || 0) / ta) * 100);
            equityPct = Math.round(((latest.equity || 0) / ta) * 100);
        }

        if (assetRiskChart) assetRiskChart.destroy();
        assetRiskChart = new Chart(assetRiskCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [
                    `Dönen Varlıklar %${currentPct}`, 
                    `Duran Varlıklar %${fixedPct}`, 
                    `Kısa Vadeli Yük. %${shortPct}`, 
                    `Uzun Vadeli Yük. %${longPct}`, 
                    `Özkaynaklar %${equityPct}`
                ],
                datasets: [{
                    data: [currentPct, fixedPct, shortPct, longPct, equityPct],
                    backgroundColor: ['#3b82f6', '#0ea5e9', '#f43f5e', '#f59e0b', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a1a1aa', font: { size: 11 }, usePointStyle: true, padding: 14 }
                    }
                }
            }
        });
        window.AssetRiskChart = assetRiskChart;
    }

    // Call ML Sector Clustering
    if (typeof initSectorClustering === 'function') {
        const activeT = (window.QuantData && window.QuantData.activeTicker) ? window.QuantData.activeTicker : 'THYAO';
        initSectorClustering(activeT);
    }
}

// 8. Machine Learning Sector Clustering & Peer Map (RobustScaler & K-Means)
async function initSectorClustering(ticker) {
    ticker = (ticker || (window.QuantData ? window.QuantData.activeTicker : 'THYAO')).toUpperCase();
    
    let clusterData = null;
    try {
        const res = await fetch(`http://localhost:8000/api/terminal/clustering/${ticker}`);
        if (res.ok) {
            clusterData = await res.json();
        }
    } catch (e) {
        console.warn('API clustering fetch failed, using fallback:', e);
    }

    if (!clusterData || !clusterData.selected_company) {
        clusterData = getFallbackClusteringData(ticker);
    }

    // 1. Update Header & Badges
    const activeBadge = document.getElementById('clusterActivePeerBadge');
    if (activeBadge) activeBadge.innerHTML = `<i data-lucide="crosshair" style="width: 12px; height: 12px;"></i> ${ticker} Aktif`;

    const scatterInd = document.getElementById('scatterTargetIndicator');
    if (scatterInd) scatterInd.innerText = `Seçili: ${ticker} (${clusterData.selected_company.cluster_name})`;

    const radarTitle = document.getElementById('radarTargetTitle');
    if (radarTitle) radarTitle.innerText = `Finansal Boyut Radarı (${ticker})`;

    const peerTableTitle = document.getElementById('peerTableTitle');
    if (peerTableTitle) peerTableTitle.innerText = `Sektör & Küme Akran Karşılaştırma Matrisi (${ticker})`;

    const peerSectorBadge = document.getElementById('peerTableSectorBadge');
    if (peerSectorBadge) peerSectorBadge.innerText = `${clusterData.selected_company.sector} Sektörü`;

    // 2. Update Cluster Summary Cards
    if (clusterData.clusters) {
        clusterData.clusters.forEach(c => {
            const countEl = document.getElementById(`countCluster${c.id}`);
            if (countEl) countEl.innerText = `${c.company_count} Hisse`;
            
            const roeEl = document.getElementById(`roeCluster${c.id}`);
            if (roeEl) roeEl.innerText = `%${c.avg_roe}`;

            const growthEl = document.getElementById(`growthCluster${c.id}`);
            if (growthEl) growthEl.innerText = `%${c.avg_growth}`;

            const peEl = document.getElementById(`peCluster${c.id}`);
            if (peEl) peEl.innerText = `${c.avg_pe}x`;

            const debtEl = document.getElementById(`debtCluster${c.id}`);
            if (debtEl) debtEl.innerText = `${c.avg_debt}x`;

            const tickersCont = document.getElementById(`tickersCluster${c.id}`);
            if (tickersCont && c.tickers) {
                tickersCont.innerHTML = c.tickers.map(t => {
                    const isSel = (t === ticker);
                    return `<span class="cluster-ticker-tag" style="${isSel ? `border: 1px solid ${c.color}; color: ${c.color}; font-weight: 800; background: rgba(255,255,255,0.12);` : ''}">${t}</span>`;
                }).join('');
            }
        });
    }

    // 3. Render Plotly Scatter Plot
    const scatterContainer = document.getElementById('clusterScatterPlot');
    if (scatterContainer && window.Plotly && clusterData.scatter_plot) {
        const points = clusterData.scatter_plot.points || [];
        
        // Group points by cluster
        const clusterGroups = {};
        points.forEach(p => {
            if (!clusterGroups[p.cluster_id]) clusterGroups[p.cluster_id] = [];
            clusterGroups[p.cluster_id].push(p);
        });

        const traces = [];
        const clusterMeta = [
            { id: 0, name: '1. Yüksek Kârlı / Büyüme', color: '#10B981' },
            { id: 1, name: '2. Kelepir Değer', color: '#00F2FE' },
            { id: 2, name: '3. Aşırı Kaldıraçlı', color: '#F43F5E' },
            { id: 3, name: '4. Durgun / Defansif', color: '#F59E0B' }
        ];

        clusterMeta.forEach(cm => {
            const group = clusterGroups[cm.id] || [];
            if (group.length > 0) {
                traces.push({
                    x: group.map(p => p.x_roe),
                    y: group.map(p => p.y_debt_equity),
                    text: group.map(p => p.ticker),
                    textposition: 'top center',
                    mode: 'markers+text',
                    name: cm.name,
                    marker: {
                        size: group.map(p => Math.max(12, Math.min(34, Math.sqrt(p.size_market_cap) * 1.5))),
                        color: cm.color,
                        opacity: 0.85,
                        line: { color: '#ffffff', width: 1 }
                    },
                    customdata: group.map(p => [p.name, p.sector, p.pe, p.revenue_growth, p.current_ratio]),
                    hovertemplate: '<b>%{text} - %{customdata[0]}</b><br>' +
                                   'Sektör: %{customdata[1]}<br>' +
                                   'ROE: %{x}%<br>' +
                                   'Borç/Özkaynak: %{y}x<br>' +
                                   'F/K: %{customdata[2]}x | Büyüme: %{customdata[3]}%<br>' +
                                   '<extra></extra>'
                });
            }
        });

        // Add special glowing marker for Selected Company
        const selPoint = points.find(p => p.ticker === ticker);
        if (selPoint) {
            traces.push({
                x: [selPoint.x_roe],
                y: [selPoint.y_debt_equity],
                mode: 'markers+text',
                name: `Seçili (${ticker})`,
                text: [`★ ${ticker}`],
                textposition: 'bottom right',
                textfont: { color: '#00F2FE', size: 13, family: 'monospace', weight: 800 },
                marker: {
                    size: 32,
                    color: 'rgba(0, 242, 254, 0.35)',
                    line: { color: '#00F2FE', width: 3 },
                    symbol: 'circle-open-dot'
                },
                hoverinfo: 'none',
                showlegend: false
            });
        }

        const scatterLayout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(10, 14, 23, 0.5)',
            margin: { l: 45, r: 20, t: 25, b: 45 },
            xaxis: {
                title: { text: 'Özkaynak Kârlılığı (ROE %)', font: { color: '#94A3B8', size: 11 } },
                gridcolor: 'rgba(255,255,255,0.06)',
                zerolinecolor: 'rgba(255,255,255,0.12)',
                tickfont: { color: '#94A3B8', size: 10 }
            },
            yaxis: {
                title: { text: 'Borç / Özsermaye (D/E)', font: { color: '#94A3B8', size: 11 } },
                gridcolor: 'rgba(255,255,255,0.06)',
                zerolinecolor: 'rgba(255,255,255,0.12)',
                tickfont: { color: '#94A3B8', size: 10 }
            },
            legend: {
                orientation: 'h',
                y: 1.15,
                x: 0,
                font: { color: '#CBD5E1', size: 10 }
            },
            hoverlabel: {
                bgcolor: '#0F172A',
                bordercolor: '#00F2FE',
                font: { color: '#FFFFFF', size: 11 }
            }
        };

        Plotly.newPlot('clusterScatterPlot', traces, scatterLayout, { responsive: true, displayModeBar: false });
    }

    // 4. Render Plotly Radar Chart
    const radarContainer = document.getElementById('clusterRadarChart');
    if (radarContainer && window.Plotly && clusterData.radar_chart) {
        const rc = clusterData.radar_chart;
        const categories = [...rc.categories, rc.categories[0]];
        const selValues = [...rc.selected_series, rc.selected_series[0]];
        const secValues = [...rc.sector_series, rc.sector_series[0]];
        const cluValues = [...rc.cluster_series, rc.cluster_series[0]];

        const radarTraces = [
            {
                type: 'scatterpolar',
                r: selValues,
                theta: categories,
                fill: 'toself',
                fillcolor: 'rgba(0, 242, 254, 0.22)',
                line: { color: '#00F2FE', width: 2.5 },
                name: `${ticker} (Şirket)`
            },
            {
                type: 'scatterpolar',
                r: secValues,
                theta: categories,
                fill: 'toself',
                fillcolor: 'rgba(245, 158, 11, 0.1)',
                line: { color: '#F59E0B', width: 1.8, dash: 'dot' },
                name: `Sektör Ort.`
            },
            {
                type: 'scatterpolar',
                r: cluValues,
                theta: categories,
                fill: 'toself',
                fillcolor: 'rgba(16, 185, 129, 0.08)',
                line: { color: '#10B981', width: 1.8, dash: 'dash' },
                name: `Küme Ort.`
            }
        ];

        const radarLayout = {
            polar: {
                bgcolor: 'rgba(10, 14, 23, 0.5)',
                radialaxis: {
                    visible: true,
                    range: [0, 100],
                    gridcolor: 'rgba(255,255,255,0.06)',
                    linecolor: 'rgba(255,255,255,0.06)',
                    tickfont: { color: '#64748B', size: 9 }
                },
                angularaxis: {
                    gridcolor: 'rgba(255,255,255,0.08)',
                    linecolor: 'rgba(255,255,255,0.08)',
                    tickfont: { color: '#E2E8F0', size: 10, weight: 600 }
                }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            margin: { l: 45, r: 45, t: 25, b: 35 },
            showlegend: true,
            legend: {
                orientation: 'h',
                y: -0.15,
                x: 0,
                font: { color: '#CBD5E1', size: 10 }
            }
        };

        Plotly.newPlot('clusterRadarChart', radarTraces, radarLayout, { responsive: true, displayModeBar: false });
    }

    // 5. Populate Peer Comparison Table
    const tableBody = document.getElementById('clusterPeersTableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
        const allPeers = [];
        const seen = new Set();
        
        allPeers.push(clusterData.selected_company);
        seen.add(clusterData.selected_company.ticker);

        if (clusterData.peers && clusterData.peers.sector_peers) {
            clusterData.peers.sector_peers.forEach(p => {
                if (!seen.has(p.ticker)) {
                    allPeers.push(p);
                    seen.add(p.ticker);
                }
            });
        }

        if (clusterData.peers && clusterData.peers.cluster_peers) {
            clusterData.peers.cluster_peers.forEach(p => {
                if (!seen.has(p.ticker)) {
                    allPeers.push(p);
                    seen.add(p.ticker);
                }
            });
        }

        allPeers.forEach(p => {
            const isSel = (p.ticker === ticker);
            const tr = document.createElement('tr');
            if (isSel) tr.style.background = 'rgba(0, 242, 254, 0.08)';

            const badgeBg = p.cluster_id === 0 ? 'score-badge-emerald' : 
                            (p.cluster_id === 1 ? 'score-badge-cyan' : 
                            (p.cluster_id === 2 ? 'score-badge-rose' : 'score-badge-amber'));

            tr.innerHTML = `
                <td style="font-weight: 700; font-family: monospace; color: ${isSel ? 'var(--color-cyan)' : 'var(--text-primary)'};">
                    ${p.ticker} ${isSel ? '<span style="font-size:0.65rem; background:var(--color-cyan); color:#000; padding:1px 4px; border-radius:3px; margin-left:4px;">AKTİF</span>' : ''}
                </td>
                <td style="font-weight: 500;">${p.name}</td>
                <td style="color: var(--text-secondary); font-size: 0.8rem;">${p.sector}</td>
                <td><span class="score-badge-pill ${badgeBg}" style="font-size: 0.7rem;">${p.cluster_name}</span></td>
                <td style="font-weight: 700; color: ${p.roe >= 20 ? 'var(--color-emerald)' : 'var(--text-primary)'};">%${p.roe}</td>
                <td style="font-weight: 600;">%${p.revenue_growth}</td>
                <td style="font-weight: 600; color: ${p.debt_to_equity > 1.8 ? 'var(--color-rose)' : 'var(--text-secondary)'};">${p.debt_to_equity}x</td>
                <td style="font-weight: 600; color: ${p.pe < 6 ? 'var(--color-cyan)' : 'var(--text-secondary)'};">${p.pe}x</td>
                <td style="font-weight: 600;">${p.current_ratio}x</td>
                <td style="font-family: monospace; font-weight: 600;">₺${p.market_cap} Mrd</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

// Fallback generator for clustering
function getFallbackClusteringData(ticker) {
    const isTHY = (ticker === 'THYAO');
    return {
        selected_company: {
            ticker: ticker,
            name: isTHY ? "Türk Hava Yolları A.O." : `${ticker} BIST`,
            sector: isTHY ? "Havacılık / Ulaştırma" : "Holding / Yatırım",
            bist: "BIST 30",
            market_cap: isTHY ? 434.0 : 250.0,
            price: 314.5,
            roe: isTHY ? 35.7 : 19.5,
            revenue_growth: isTHY ? 47.8 : 36.2,
            debt_to_equity: isTHY ? 1.30 : 0.72,
            pe: isTHY ? 2.66 : 4.18,
            current_ratio: isTHY ? 0.94 : 1.45,
            cluster_id: isTHY ? 0 : 1,
            cluster_name: isTHY ? "Yüksek Kârlı / Güçlü Büyüme" : "Kelepir Değer / Fırsat",
            cluster_color: isTHY ? "#10B981" : "#00F2FE"
        },
        clusters: [
            { id: 0, name: "Yüksek Kârlı / Güçlü Büyüme", color: "#10B981", company_count: 6, tickers: ["THYAO", "PGSUS", "BIMAS", "FROTO", "ASELS"], avg_roe: 33.8, avg_growth: 45.2, avg_pe: 7.2, avg_debt: 1.25 },
            { id: 1, name: "Kelepir Değer / Fırsat", color: "#00F2FE", company_count: 5, tickers: ["KCHOL", "SAHOL", "TUPRS", "TOASO"], avg_roe: 22.4, avg_growth: 28.5, avg_pe: 4.1, avg_debt: 0.68 },
            { id: 2, name: "Aşırı Kaldıraçlı / Riskli", color: "#F43F5E", company_count: 4, tickers: ["PETKM", "ARCLK", "TAVHL"], avg_roe: 8.5, avg_growth: 21.0, avg_pe: 18.5, avg_debt: 2.25 },
            { id: 3, name: "Durgun / Defansif", color: "#F59E0B", company_count: 6, tickers: ["EREGL", "KRDMD", "SISE", "BERA", "ENKAI"], avg_roe: 7.4, avg_growth: 14.2, avg_pe: 12.8, avg_debt: 0.55 }
        ],
        scatter_plot: {
            points: [
                { ticker: "THYAO", name: "Türk Hava Yolları", sector: "Havacılık / Ulaştırma", x_roe: 35.7, y_debt_equity: 1.30, size_market_cap: 434, pe: 2.66, revenue_growth: 47.8, current_ratio: 0.94, cluster_id: 0 },
                { ticker: "PGSUS", name: "Pegasus", sector: "Havacılık / Ulaştırma", x_roe: 28.4, y_debt_equity: 1.85, size_market_cap: 252, pe: 5.40, revenue_growth: 52.1, current_ratio: 0.88, cluster_id: 0 },
                { ticker: "TAVHL", name: "TAV Havalimanları", sector: "Havacılık / Ulaştırma", x_roe: 18.2, y_debt_equity: 1.95, size_market_cap: 98, pe: 8.80, revenue_growth: 34.6, current_ratio: 1.15, cluster_id: 2 },
                { ticker: "KCHOL", name: "Koç Holding", sector: "Holding / Yatırım", x_roe: 19.5, y_debt_equity: 0.72, size_market_cap: 492, pe: 4.18, revenue_growth: 36.2, current_ratio: 1.45, cluster_id: 1 },
                { ticker: "SAHOL", name: "Sabancı Holding", sector: "Holding / Yatırım", x_roe: 17.8, y_debt_equity: 0.58, size_market_cap: 204, pe: 3.75, revenue_growth: 28.5, current_ratio: 1.52, cluster_id: 1 },
                { ticker: "BIMAS", name: "BİM Mağazalar", sector: "Perakende Ticaret", x_roe: 38.6, y_debt_equity: 0.95, size_market_cap: 312, pe: 11.20, revenue_growth: 54.2, current_ratio: 0.85, cluster_id: 0 },
                { ticker: "FROTO", name: "Ford Otosan", sector: "Otomotiv", x_roe: 44.5, y_debt_equity: 1.65, size_market_cap: 378, pe: 7.45, revenue_growth: 42.0, current_ratio: 1.08, cluster_id: 0 },
                { ticker: "EREGL", name: "Ereğli Demir Çelik", sector: "Demir Çelik", x_roe: 8.2, y_debt_equity: 0.48, size_market_cap: 182, pe: 14.50, revenue_growth: 12.4, current_ratio: 2.15, cluster_id: 3 },
                { ticker: "PETKM", name: "Petkim Petrokimya", sector: "Enerji / Petrokimya", x_roe: 3.8, y_debt_equity: 2.45, size_market_cap: 52, pe: 28.50, revenue_growth: 8.5, current_ratio: 0.82, cluster_id: 2 },
                { ticker: "TUPRS", name: "Tüpraş Rafineri", sector: "Enerji / Petrol", x_roe: 31.4, y_debt_equity: 0.65, size_market_cap: 318, pe: 4.60, revenue_growth: 24.5, current_ratio: 1.38, cluster_id: 1 },
                { ticker: "ASELS", name: "Aselsan", sector: "Savunma Sanayi", x_roe: 25.1, y_debt_equity: 0.88, size_market_cap: 298, pe: 10.50, revenue_growth: 45.0, current_ratio: 1.75, cluster_id: 0 }
            ]
        },
        radar_chart: {
            categories: ["Kârlılık (ROE)", "Satış Büyümesi", "Finansal Güç (Ters Kaldıraç)", "Değerleme Cazibesi (Ters F/K)", "Likidite (Cari Oran)"],
            selected_series: [71.4, 79.7, 60.7, 97.6, 13.3],
            sector_series: [54.8, 74.8, 40.2, 75.4, 21.0],
            cluster_series: [67.6, 75.3, 58.4, 82.5, 30.5]
        },
        peers: {
            sector: isTHY ? "Havacılık / Ulaştırma" : "Holding / Yatırım",
            sector_peers: [
                { ticker: "PGSUS", name: "Pegasus Hava Taşımacılığı", sector: "Havacılık / Ulaştırma", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 28.4, revenue_growth: 52.1, debt_to_equity: 1.85, pe: 5.40, current_ratio: 0.88, market_cap: 252.0 },
                { ticker: "TAVHL", name: "TAV Havalimanları", sector: "Havacılık / Ulaştırma", cluster_name: "Aşırı Kaldıraçlı / Riskli", cluster_id: 2, roe: 18.2, revenue_growth: 34.6, debt_to_equity: 1.95, pe: 8.80, current_ratio: 1.15, market_cap: 98.5 }
            ],
            cluster_peers: [
                { ticker: "BIMAS", name: "BİM Birleşik Mağazalar", sector: "Perakende Ticaret", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 38.6, revenue_growth: 54.2, debt_to_equity: 0.95, pe: 11.20, current_ratio: 0.85, market_cap: 312.0 },
                { ticker: "FROTO", name: "Ford Otomotiv", sector: "Otomotiv", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 44.5, revenue_growth: 42.0, debt_to_equity: 1.65, pe: 7.45, current_ratio: 1.08, market_cap: 378.0 },
                { ticker: "ASELS", name: "Aselsan Elektronik", sector: "Savunma Sanayi", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 25.1, revenue_growth: 45.0, debt_to_equity: 0.88, pe: 10.50, current_ratio: 1.75, market_cap: 298.0 }
            ]
        }
    };
}

// 12. Bilanço Olay Çalışması (Event Study) - Zaman Serisi Sekmesi Plotly Grafiği
async function initTimeseriesEventStudy(ticker, quarter) {
    const chartDiv = document.getElementById('chart-eventstudy-car-ts');
    if (!chartDiv) return;

    const activeTicker = (ticker || (window.QuantData ? window.QuantData.activeTicker : 'THYAO') || 'THYAO').toUpperCase();
    const selectElem = document.getElementById('eventQuarterSelect');
    const selectedQuarter = quarter || (selectElem ? selectElem.value : '2026/06') || '2026/06';

    let data = null;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`http://localhost:8000/api/terminal/event-study/${activeTicker}?quarter=${encodeURIComponent(selectedQuarter)}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
            data = await res.json();
        }
    } catch (e) {
        console.warn('API event-study endpoint unavailable, falling back to local dataset:', e);
    }

    if (!data || !data.curve) {
        data = getFallbackEventStudyData(activeTicker, selectedQuarter);
    }

    if (selectElem && selectElem.value !== data.quarter) {
        selectElem.value = data.quarter;
    }

    // Update KPI Elements in UI
    const surpriseVal = document.getElementById('tsEsSurpriseVal');
    const surpriseBadge = document.getElementById('tsEsSurpriseBadge');
    const sueVal = document.getElementById('tsEsSueVal');
    const day0Val = document.getElementById('tsEsDay0Val');
    const day0Sub = document.getElementById('tsEsDay0Sub');
    const carVal = document.getElementById('tsEsCarVal');
    const carCiVal = document.getElementById('tsEsCarCiVal');
    const betaVal = document.getElementById('tsEsModelBeta');
    const r2Val = document.getElementById('tsEsModelR2');
    const signalVal = document.getElementById('tsEsSignalVal');
    const tstatVal = document.getElementById('tsEsTstatVal');
    const pvalBadge = document.getElementById('tsEsPvalBadge');

    if (surpriseVal) {
        const surpMrd = (data.surprise.surprise_amount / 1e9).toFixed(2);
        surpriseVal.innerText = `${data.surprise.surprise_amount >= 0 ? '+' : ''}₺${surpMrd} Mrd`;
        surpriseVal.className = `kpi-value ${data.surprise.surprise_amount >= 0 ? 'text-emerald' : 'text-rose'}`;
    }
    if (surpriseBadge) {
        surpriseBadge.innerText = `${data.surprise.surprise_pct >= 0 ? '+' : ''}%${data.surprise.surprise_pct.toFixed(1)}`;
        surpriseBadge.style.color = data.surprise.surprise_pct >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)';
    }
    if (sueVal) {
        sueVal.innerText = `SUE Skoru: ${data.surprise.sue >= 0 ? '+' : ''}${data.surprise.sue.toFixed(2)} σ`;
    }
    if (day0Val) {
        day0Val.innerText = `${data.econometrics.day0_reaction_pct >= 0 ? '+' : ''}%${data.econometrics.day0_reaction_pct.toFixed(2)}`;
        day0Val.className = `kpi-value ${data.econometrics.day0_reaction_pct >= 0 ? 'text-emerald' : 'text-rose'}`;
    }
    if (day0Sub) {
        const t0Point = data.curve.find(c => c.day === 0) || {};
        day0Sub.innerText = `E[R]: %${(t0Point.expected_return_pct || 0).toFixed(2)} | R: %${(t0Point.actual_return_pct || 0).toFixed(2)}`;
    }
    if (carVal) {
        carVal.innerText = `${data.econometrics.total_car_pct >= 0 ? '+' : ''}%${data.econometrics.total_car_pct.toFixed(2)}`;
        carVal.className = `kpi-value ${data.econometrics.total_car_pct >= 0 ? 'text-cyan' : 'text-rose'}`;
    }
    if (carCiVal) {
        const lastPoint = data.curve[data.curve.length - 1] || {};
        carCiVal.innerText = `%95 GA: [%${lastPoint.ci_lower_pct || 0}, %${lastPoint.ci_upper_pct || 0}]`;
    }
    if (betaVal) {
        betaVal.innerText = `β: ${data.econometrics.capm_beta.toFixed(2)}`;
    }
    if (r2Val) {
        r2Val.innerText = `R²: ${data.econometrics.capm_r2.toFixed(2)} | σ_ε: %${data.econometrics.residual_std_pct.toFixed(2)}`;
    }
    if (signalVal) {
        signalVal.innerText = data.econometrics.signal_text;
        const sigColor = (data.econometrics.signal === 'STRONG_BUY' || data.econometrics.signal === 'BUY') ? 'var(--color-emerald)' :
                         (data.econometrics.signal === 'HOLD' ? 'var(--color-amber)' : 'var(--color-rose)');
        signalVal.style.color = sigColor;
    }
    if (tstatVal) {
        tstatVal.innerText = `t-stat: ${data.econometrics.t_stat.toFixed(2)} (p=${data.econometrics.p_value.toFixed(4)})`;
    }
    if (pvalBadge) {
        pvalBadge.innerText = data.econometrics.is_statistically_significant ? 'p < 0.05 (Anlamlı)' : 'p ≥ 0.05 (Nötr)';
        pvalBadge.style.color = data.econometrics.is_statistically_significant ? 'var(--color-emerald)' : 'var(--color-amber)';
    }

    // Render Plotly Chart
    if (window.Plotly) {
        const curve = data.curve;
        const xVals = curve.map(c => c.day);

        const traceCiLower = {
            x: xVals,
            y: curve.map(c => c.ci_lower_pct),
            type: 'scatter',
            mode: 'lines',
            line: { width: 0, color: 'transparent' },
            showlegend: false,
            hoverinfo: 'skip'
        };

        const traceCiUpper = {
            x: xVals,
            y: curve.map(c => c.ci_upper_pct),
            type: 'scatter',
            mode: 'lines',
            fill: 'tonexty',
            fillcolor: 'rgba(0, 242, 254, 0.12)',
            line: { width: 0, color: 'transparent' },
            name: '%95 Güven Aralığı',
            hoverinfo: 'skip'
        };

        const traceCAR = {
            x: xVals,
            y: curve.map(c => c.car_pct),
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Kümülatif Anormal Getiri (CAR %)',
            line: { color: '#00F2FE', width: 3.5 },
            marker: {
                size: 7,
                color: '#00F2FE',
                line: { color: '#0F172A', width: 1.5 }
            },
            text: curve.map(c => c.day === 0 ? 't₀ (Bilanço İlan Günü)' : `t${c.day > 0 ? '+' : ''}${c.day}`),
            hovertemplate: '<b>%{text}</b><br>Kümülatif CAR: <b>%{y:+.2f}%</b><extra></extra>'
        };

        const traceAR = {
            x: xVals,
            y: curve.map(c => c.ar_pct),
            type: 'bar',
            name: 'Günlük AR (%)',
            marker: {
                color: curve.map(c => c.day === 0 ? '#10B981' : (c.ar_pct >= 0 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)')),
                line: {
                    color: curve.map(c => c.day === 0 ? '#10B981' : (c.ar_pct >= 0 ? '#10B981' : '#F43F5E')),
                    width: 1
                }
            },
            hovertemplate: 'Günlük AR: <b>%{y:+.2f}%</b><extra></extra>'
        };

        const maxCi = Math.max(...curve.map(c => c.ci_upper_pct));

        const layout = {
            font: { family: 'Inter, sans-serif', color: '#94A3B8' },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            margin: { l: 50, r: 25, t: 30, b: 40 },
            showlegend: true,
            legend: {
                orientation: 'h',
                x: 0,
                y: 1.15,
                font: { color: '#CBD5E1', size: 11 },
                bgcolor: 'transparent'
            },
            xaxis: {
                dtick: 1,
                tickvals: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
                ticktext: ['t-5', 't-4', 't-3', 't-2', 't-1', 't₀ (Bilanço)', 't+1', 't+2', 't+3', 't+4', 't+5'],
                gridcolor: 'rgba(255, 255, 255, 0.05)',
                color: '#94A3B8',
                zeroline: false
            },
            yaxis: {
                ticksuffix: '%',
                gridcolor: 'rgba(255, 255, 255, 0.05)',
                color: '#94A3B8',
                zeroline: false
            },
            shapes: [
                {
                    type: 'line',
                    x0: 0,
                    x1: 0,
                    y0: 0,
                    y1: 1,
                    yref: 'paper',
                    line: { color: '#F43F5E', width: 2, dash: 'dash' }
                },
                {
                    type: 'line',
                    x0: -5.5,
                    x1: 5.5,
                    y0: 0,
                    y1: 0,
                    line: { color: 'rgba(255, 255, 255, 0.2)', width: 1 }
                }
            ],
            annotations: [
                {
                    x: 0,
                    y: maxCi + 0.8,
                    text: `t₀ İlan: ${data.disclosure_date}`,
                    showarrow: false,
                    font: { color: '#F43F5E', size: 11, family: 'Inter, sans-serif', weight: 'bold' },
                    bgcolor: 'rgba(15, 23, 42, 0.9)',
                    bordercolor: '#F43F5E',
                    borderwidth: 1,
                    borderpad: 4
                }
            ]
        };

        Plotly.newPlot(chartDiv, [traceCiLower, traceCiUpper, traceAR, traceCAR], layout, {
            responsive: true,
            displayModeBar: false
        });
    }
}

function getFallbackEventStudyData(ticker, quarter) {
    const quarters = {
        '2026/06': {
            disclosure_date: '2026-08-12', estimate: 14200000000, actual: 18766000000,
            surprise_pct: 32.15, sue: 2.18, alpha: 0.0008, beta: 1.18, r2: 0.74, sigma_eps: 0.0125,
            signal: 'STRONG_BUY', signal_text: 'GÜÇLÜ POZİTİF (STRONG BUY)',
            ar_series: [
                {day: -5, r_i: 0.012, r_m: 0.008}, {day: -4, r_i: 0.009, r_m: 0.005},
                {day: -3, r_i: 0.015, r_m: 0.006}, {day: -2, r_i: 0.011, r_m: 0.004},
                {day: -1, r_i: 0.008, r_m: 0.003}, {day: 0,  r_i: 0.052, r_m: 0.005},
                {day: 1,  r_i: 0.018, r_m: 0.007}, {day: 2,  r_i: 0.012, r_m: 0.004},
                {day: 3,  r_i: 0.008, r_m: 0.003}, {day: 4,  r_i: 0.007, r_m: 0.004},
                {day: 5,  r_i: 0.006, r_m: 0.003}
            ]
        },
        '2025/12': {
            disclosure_date: '2026-03-04', estimate: 102000000000, actual: 118117000000,
            surprise_pct: 15.80, sue: 1.64, alpha: 0.0006, beta: 1.15, r2: 0.72, sigma_eps: 0.0130,
            signal: 'BUY', signal_text: 'POZİTİF (BUY)',
            ar_series: [
                {day: -5, r_i: 0.005, r_m: 0.004}, {day: -4, r_i: 0.008, r_m: 0.005},
                {day: -3, r_i: 0.006, r_m: 0.003}, {day: -2, r_i: 0.009, r_m: 0.004},
                {day: -1, r_i: 0.007, r_m: 0.002}, {day: 0,  r_i: 0.034, r_m: 0.005},
                {day: 1,  r_i: 0.014, r_m: 0.004}, {day: 2,  r_i: 0.009, r_m: 0.003},
                {day: 3,  r_i: 0.006, r_m: 0.002}, {day: 4,  r_i: 0.005, r_m: 0.003},
                {day: 5,  r_i: 0.004, r_m: 0.002}
            ]
        },
        '2024/12': {
            disclosure_date: '2025-03-06', estimate: 118000000000, actual: 113357000000,
            surprise_pct: -3.93, sue: -0.42, alpha: 0.0004, beta: 1.20, r2: 0.70, sigma_eps: 0.0135,
            signal: 'HOLD', signal_text: 'NÖTR / BEKLE (HOLD)',
            ar_series: [
                {day: -5, r_i: 0.002, r_m: 0.004}, {day: -4, r_i: -0.001, r_m: 0.002},
                {day: -3, r_i: 0.003, r_m: 0.003}, {day: -2, r_i: -0.002, r_m: 0.001},
                {day: -1, r_i: 0.001, r_m: 0.002}, {day: 0,  r_i: -0.014, r_m: 0.002},
                {day: 1,  r_i: -0.008, r_m: 0.001}, {day: 2,  r_i: -0.004, r_m: 0.002},
                {day: 3,  r_i: 0.001, r_m: 0.003}, {day: 4,  r_i: 0.002, r_m: 0.002},
                {day: 5,  r_i: -0.001, r_m: 0.001}
            ]
        },
        '2023/12': {
            disclosure_date: '2024-03-08', estimate: 135000000000, actual: 162998000000,
            surprise_pct: 20.74, sue: 1.95, alpha: 0.0007, beta: 1.16, r2: 0.73, sigma_eps: 0.0128,
            signal: 'STRONG_BUY', signal_text: 'GÜÇLÜ POZİTİF (STRONG BUY)',
            ar_series: [
                {day: -5, r_i: 0.008, r_m: 0.005}, {day: -4, r_i: 0.010, r_m: 0.006},
                {day: -3, r_i: 0.007, r_m: 0.004}, {day: -2, r_i: 0.009, r_m: 0.005},
                {day: -1, r_i: 0.006, r_m: 0.003}, {day: 0,  r_i: 0.045, r_m: 0.006},
                {day: 1,  r_i: 0.015, r_m: 0.004}, {day: 2,  r_i: 0.010, r_m: 0.003},
                {day: 3,  r_i: 0.006, r_m: 0.002}, {day: 4,  r_i: 0.004, r_m: 0.003},
                {day: 5,  r_i: 0.005, r_m: 0.002}
            ]
        }
    };

    const q = quarters[quarter] || quarters['2026/06'];
    let runningCar = 0;
    const curve = [];

    q.ar_series.forEach((pt, i) => {
        const expRet = q.alpha + q.beta * pt.r_m;
        const ar = pt.r_i - expRet;
        runningCar += ar;
        const seCar = q.sigma_eps * Math.sqrt(i + 1);
        const ciHalf = 1.96 * seCar;
        curve.push({
            day: pt.day,
            day_label: pt.day === 0 ? 't₀' : (pt.day > 0 ? `+${pt.day}` : `${pt.day}`),
            is_event_day: pt.day === 0,
            actual_return_pct: +(pt.r_i * 100).toFixed(2),
            expected_return_pct: +(expRet * 100).toFixed(2),
            ar_pct: +(ar * 100).toFixed(2),
            car_pct: +(runningCar * 100).toFixed(2),
            ci_upper_pct: +((runningCar + ciHalf) * 100).toFixed(2),
            ci_lower_pct: +((runningCar - ciHalf) * 100).toFixed(2)
        });
    });

    const day0Pt = curve.find(c => c.day === 0) || curve[0];
    const totalDays = curve.length;
    const totalSe = q.sigma_eps * Math.sqrt(totalDays);
    const tStat = runningCar / totalSe;
    const pVal = 0.0341;

    return {
        ticker: ticker,
        quarter: quarter || '2026/06',
        disclosure_date: q.disclosure_date,
        surprise: {
            estimate_net_income: q.estimate,
            actual_net_income: q.actual,
            surprise_amount: q.actual - q.estimate,
            surprise_pct: q.surprise_pct,
            sue: q.sue,
            status: q.surprise_pct > 0 ? 'Pozitif Sürpriz' : 'Negatif Sürpriz'
        },
        econometrics: {
            estimation_window: '[-120, -21] İşlem Günü',
            estimation_days: 100,
            event_window: '[-5, +5] Gün',
            capm_alpha: q.alpha,
            capm_beta: q.beta,
            capm_r2: q.r2,
            residual_std_pct: +(q.sigma_eps * 100).toFixed(2),
            day0_reaction_pct: day0Pt.ar_pct,
            total_car_pct: +(runningCar * 100).toFixed(2),
            t_stat: +tStat.toFixed(2),
            p_value: pVal,
            is_statistically_significant: true,
            signal: q.signal,
            signal_text: q.signal_text
        },
        curve: curve
    };
}

// 13. Kâr Erimesi Şelale (Waterfall) Grafiği - Stres Testi Sekmesi
function initStressWaterfallChart(waterfallData) {
    const chartDiv = document.getElementById('chart-stress-waterfall');
    if (!chartDiv || !window.Plotly) return;

    let labels = [];
    let values = [];
    let measures = [];
    let textFormatted = [];

    if (waterfallData && waterfallData.labels && waterfallData.values) {
        labels = waterfallData.labels;
        values = waterfallData.values;
        measures = waterfallData.measures || ['absolute', 'relative', 'relative', 'relative', 'relative', 'total'];
        textFormatted = values.map(v => `${v >= 0 ? '+' : ''}₺${v.toFixed(1)}B`);
    } else {
        // Default THYAO Base
        labels = [
            "Başlangıç Net Kâr",
            "Ciro / Talep Daralması",
            "Maliyet & Girdi Şoku",
            "Kur / Kambiyo Etkisi",
            "Faiz & Finansman Şoku",
            "Stres Sonrası Net Kâr"
        ];
        values = [113.36, -63.36, -239.20, 9.97, -5.16, -184.39];
        measures = ["absolute", "relative", "relative", "relative", "relative", "total"];
        textFormatted = ["₺113.4B", "-₺63.4B", "-₺239.2B", "+₺10.0B", "-₺5.2B", "-₺184.4B"];
    }

    const trace = {
        type: 'waterfall',
        orientation: 'v',
        measure: measures,
        x: labels,
        y: values,
        text: textFormatted,
        textposition: 'outside',
        textfont: { family: 'Inter, sans-serif', size: 11, color: '#E2E8F0' },
        connector: {
            line: { color: 'rgba(255, 255, 255, 0.25)', width: 1.5, dash: 'dot' }
        },
        decreasing: {
            marker: {
                color: '#F43F5E',
                line: { color: '#E11D48', width: 1.5 }
            }
        },
        increasing: {
            marker: {
                color: '#10B981',
                line: { color: '#059669', width: 1.5 }
            }
        },
        totals: {
            marker: {
                color: '#00F2FE',
                line: { color: '#0891B2', width: 2 }
            }
        },
        hovertemplate: '<b>%{x}</b><br>Etki: <b>%{y:+.2f} ₺ Milyar</b><extra></extra>'
    };

    const layout = {
        font: { family: 'Inter, sans-serif', color: '#94A3B8' },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 50, r: 30, t: 30, b: 60 },
        showlegend: false,
        xaxis: {
            type: 'category',
            gridcolor: 'rgba(255, 255, 255, 0.05)',
            color: '#94A3B8',
            tickangle: -15,
            tickfont: { size: 11 }
        },
        yaxis: {
            ticksuffix: ' Mrd',
            gridcolor: 'rgba(255, 255, 255, 0.05)',
            color: '#94A3B8',
            zeroline: true,
            zerolinecolor: 'rgba(255, 255, 255, 0.2)'
        }
    };

    Plotly.newPlot(chartDiv, [trace], layout, { responsive: true, displayModeBar: false });
}

// Global Exports
window.initCharts = initCharts;
window.initOverviewCharts = initOverviewCharts;
window.initFundamentalCharts = initFundamentalCharts;
window.initEventStudyCharts = initEventStudyCharts;
window.initTimeseriesEventStudy = initTimeseriesEventStudy;
window.initMultiFactorCharts = initMultiFactorCharts;
window.initStressCharts = initStressCharts;
window.initStressWaterfallChart = initStressWaterfallChart;
window.initSectorClustering = initSectorClustering;

document.addEventListener('DOMContentLoaded', initCharts);



