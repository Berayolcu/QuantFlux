const translations = {
    tr: {
        "nav_overview": "Genel Bakış (Terminal)",
        "nav_timeseries": "Zaman Serisi & Tahmin",
        "nav_risk": "Risk & Portföy (VaR)",
        "nav_pipeline": "Büyük Veri Akışı",
        "nav_stress": "Stres Testi (What-If)",
        "nav_settings": "Model Ayarları",
        "title_overview": "Portföy & Risk Terminali",
        "desc_overview": "Gerçek zamanlı piyasa verisi, risk simülasyonu ve volatilite tahminleri.",
        "kpi_netincome": "Net Kar / Zarar (Net Income)",
        "kpi_equity": "Özkaynaklar (Equity)",
        "kpi_ebitda": "FAVÖK (EBITDA)",
        "kpi_assets": "Aktif Toplamı (Total Assets)",
        "download_sample": "Örnek THYAO Bilanço Şablonu İndir (.csv)",
        "upload_btn": "📂 Bilanço / Finansal Tablo Yükle (.xls, .csv)",
        "ai_report_btn": "⚡ QuantFlux Sinyal Raporu",
        
        "sim_header": "Kârlılık & Şok Simülasyonu (What-If)",
        "sim_reset": "Sıfırla",
        "sim_lbl_cost": "Satış Maliyeti Artışı (%)",
        "sim_lbl_fx": "Kur Şoku (USD/TRY Değişimi %)",
        "sim_impact": "Simüle Edilen Net Kar Etkisi:",
        "sim_new_net": "Yeni Net Kar:",
        
        "chart_trends": "Bilanço Trendleri & Gelecek Yıl Projeksiyonu",
        "chart_trends_desc": "Net Satışlar ve Net Kar tahmin eğrisi.",
        "empty_chart_1": "📊 Lütfen analizi başlatmak için bir Bilanço (XLS/CSV) veri seti yükleyin.",
        "chart_dist": "Varlık & Kaynak Dağılımı",
        "chart_dist_desc": "Aktif ve Pasif dağılımının karşılaştırmalı analizi.",
        
        "basic_analysis_header": "Temel Analiz & Çarpanlar (THYAO)",
        "ba_fk": "F/K (Fiyat/Kazanç)",
        "ba_pddd": "PD/DD (Piyasa/Defter Değeri)",
        "ba_fdfavok": "FD/FAVÖK",
        "ba_cari": "Cari Oran",

        "table_assets_header": "Yıllıklandırılmış Bilanço Kalemleri (TL Milyar)",
        "th_period": "Dönem",
        "th_ca": "Dönen Varlıklar",
        "th_fa": "Duran Varlıklar",
        "th_ta": "Toplam Varlıklar",
        "th_stl": "Kısa Vadeli Yük.",
        "th_eq": "Özkaynaklar",
        "th_ni": "Net Kar",
        
        "ts_title": "Zaman Serisi & Tahmin",
        "ts_desc": "Makine öğrenimi ve istatistiksel modeller ile zaman serisi tahmini.",
        "ts_run": "Optimizasyonu Çalıştır",
        "kpi_rmse": "RMSE",
        "kpi_aic": "AIC",
        "kpi_r2": "R² (Açıklanan Varyans)",
        "kpi_df": "Dickey-Fuller Durağanlık",
        
        "ts_chart": "Fiyat Yolu Tahmini & Güven Aralıkları (LSTM)",
        "fi_header": "Özellik Önem Derecesi (Feature Importance / Lag Table)",
        "fi_th1": "Özellik / Faktör",
        "fi_th2": "Etki Yönü",
        "fi_th3": "Ağırlık (Weight)",
        "fi_th4": "Göreceli Önem",
        
        "risk_title": "Risk & Portföy (VaR)",
        "risk_desc": "Parametrik ve tarihsel simülasyon metodlarıyla risk analizi.",
        "kpi_pvar": "Parametrik VaR (%99, 1-Gün)",
        "kpi_hvar": "Tarihsel Simülasyon VaR (%95)",
        "kpi_cvar": "Expected Shortfall (CVaR)",
        "kpi_maxdd": "Maksimum Drawdown",
        
        "risk_chart1": "Getiri Dağılımı & VaR Cut-off",
        "risk_chart1_desc": "Normal vs. Fat-tail Student's t",
        "risk_chart2": "Varlık Risk Katkısı",
        "risk_chart2_desc": "Marginal Risk Contributions",
        "corr_header": "Korelasyon Matrisi (Correlation Heatmap)",

        "pipeline_msg": "Büyük Veri Akışı Bağlantıları Kuruluyor...",
        "stress_msg": "Stres Testi (What-If) Senaryoları",
        "settings_msg": "Model Ayarları & Hiperparametre Optimizasyonu",

        // New Navigation
        "nav_fundamental": "Bilanço & Temel Analiz",
        "nav_eventstudy": "Event Study (Bilanço Sürprizi)",
        "nav_multifactor": "Çok Faktörlü Regresyon",

        // Fundamental Analysis
        "fund_title": "Bilanço & Temel Finansal Analiz",
        "fund_desc": "BIST finansal tabloları, kârlılık, likidite, DuPont ayrıştırması ve değerleme çarpanları.",
        "fund_dupont_title": "DuPont Kârlılık Ayrıştırması (3-Aşamalı ROE Modeli)",
        "fund_dupont_roe": "Özkaynak Kârlılığı (ROE)",
        "fund_dupont_margin": "Net Kâr Marjı (Kârlılık)",
        "fund_dupont_turnover": "Aktif Devir Hızı (Verimlilik)",
        "fund_dupont_leverage": "Kaldıraç Çarpanı (Finansal Yapı)",
        "fund_chart_comp": "Varlık ve Kaynak Kompozisyonu (Bilanço Dağılımı)",
        "fund_chart_waterfall": "Gelir Tablosu Şelale Analizi (Ciro -> Net Kâr)",
        "fund_ratios_title": "Finansal Rasyolar & Sağlık Göstergeleri",

        // Event Study
        "es_title": "Event Study: Bilanço Sürprizleri & CAR Analizi",
        "es_desc": "KAP bilanço açıklanma gününde piyasa reaksiyonu, beklenmeyen kâr (SUE) ve kümülatif anormal getiriler (CAR).",
        "es_chart_car": "Kümülatif Anormal Getiri (CAR) Zaman Yolu [-10, +10 Gün]",
        "es_chart_car_desc": "Bilanço açıklanma günü (t=0) etrafındaki piyasa fiyatlaması ve %95 güven aralığı.",
        "es_table_title": "Tarihsel Bilanço Açıklamaları & Sürpriz Skoru (SUE)",
        "es_th_period": "Dönem",
        "es_th_date": "Açıklanma Tarihi",
        "es_th_est": "Konsensüs Beklenti",
        "es_th_act": "Gerçekleşen Kâr",
        "es_th_surp": "Sürpriz",
        "es_th_sue": "SUE Skoru",
        "es_th_t1": "T+1 Tepki",
        "es_th_car": "10-Günlük CAR",
        "es_th_signal": "Kantitatif Sinyal",

        // Multi-Factor Regression
        "mf_title": "Çok Faktörlü Risk & Faktör Regresyonu",
        "mf_desc": "Fama-French 3/5 Faktör + Momentum + Kur ve Faiz duyarlılık regresyon modeli.",
        "mf_table_title": "Faktör Katsayıları (Betalar & Anlamlılık İstatistikleri)",
        "mf_th_factor": "Risk Faktörü",
        "mf_th_beta": "Faktör Duyarlılığı (Beta)",
        "mf_th_stderr": "Standart Hata",
        "mf_th_tstat": "t-İstatistiği",
        "mf_th_pval": "p-Değeri",
        "mf_th_vif": "VIF (Çoklu Doğrusallık)",
        "mf_th_sig": "Anlamlılık",
        "mf_chart_attr": "Risk Ayrıştırması & Faktör Varyans Katkısı",
        "mf_sim_title": "İnteraktif Faktör Şok Tahmincisi",

        // Big Data Stream
        "pipe_title": "Büyük Veri Akışı & Algoritmik Olay Motoru",
        "pipe_desc": "Apache Arrow / Kafka simülatörü ile BIST L2 tick akışı, olay işleme ve anomali tespiti.",
        "pipe_throughput": "Throughput (Olay / sn)",
        "pipe_datarate": "Veri Hızı (MB / sn)",
        "pipe_latency": "Uçtan Uca Gecikme (p99)",
        "pipe_schema": "Arrow Şema Doğrulama",
        "pipe_terminal_title": "Gerçek Zamanlı Terminal Konsolu (Live Stream Logs)",
        "pipe_btn_pause": "Akışı Duraklat",
        "pipe_btn_resume": "Akışı Başlat",
        "pipe_btn_anomaly": "Volatilite Şoku Enjekte Et",

        // Stress Testing
        "stress_title": "Stres Testi & Makro Şok Senaryoları (What-If)",
        "stress_desc": "Ekstrem piyasa koşulları, döviz şokları ve Monte Carlo simülasyonu ile bilanço dayanıklılığı.",
        "stress_preset_title": "Önceden Tanımlı Makro Şok Senaryoları",
        "stress_mc_chart": "Monte Carlo Şok Dağılımı (10.000 Patika)",
        "stress_mc_desc": "Normal piyasa koşulları vs. şok altındaki kuyruk riski (Fat-Tail / %99 Stressed VaR).",
        "stress_impact_matrix": "Bilanço Kalemleri Şok Etki Matrisi",

        // Model Settings
        "settings_title": "Kantitatif Model Ayarları & Hiperparametreler",
        "settings_desc": "Risk motoru, GARCH volatilite parametreleri, LSTM lookback ve FastAPI backend entegrasyonu.",
        "settings_btn_save": "Ayarları Kaydet ve Uygula",
        "settings_btn_reset": "Varsayılanlara Sıfırla",
        "settings_btn_test": "FastAPI Bağlantısını Test Et",

        "ai_status": "Copilot Online",
        "ai_title": "QuantFlux AI",
        "ai_role": "Finansal Stratejist & Kantitatif Copilot",
        "ai_pill1": "THYAO bilançosunu özetle",
        "ai_pill2": "Duran Varlıkların aktifteki yeri nedir?",
        "ai_pill3": "Satış ve kârlılık durumunu yorumla",
        "ai_placeholder": "Kantitatif bir soru sorun..."
    },
    en: {
        "nav_overview": "Overview (Terminal)",
        "nav_timeseries": "Time Series & Forecast",
        "nav_risk": "Risk & Portfolio (VaR)",
        "nav_pipeline": "Big Data Stream (LIVE)",
        "nav_stress": "Stress Test (What-If)",
        "nav_settings": "Model Settings",
        "title_overview": "Portfolio & Risk Terminal",
        "desc_overview": "Real-time market data, risk simulation, and volatility forecasts.",
        "kpi_netincome": "Net Income / Loss",
        "kpi_equity": "Shareholder Equity",
        "kpi_ebitda": "EBITDA",
        "kpi_assets": "Total Assets",
        "download_sample": "Download THYAO Balance Sheet Sample (.csv)",
        "upload_btn": "📂 Upload Balance Sheet / Financials (.xls, .csv)",
        "ai_report_btn": "⚡ QuantFlux Signal Report",

        "sim_header": "Profitability & Shock Simulation (What-If)",
        "sim_reset": "Reset",
        "sim_lbl_cost": "Cost of Sales Increase (%)",
        "sim_lbl_fx": "FX Shock (USD/TRY Change %)",
        "sim_impact": "Simulated Net Income Impact:",
        "sim_new_net": "New Net Income:",
        
        "chart_trends": "Balance Sheet Trends & Next Year Projection",
        "chart_trends_desc": "Net Sales and Net Income forecast curve.",
        "empty_chart_1": "📊 Please upload a Balance Sheet (XLS/CSV) dataset to start analysis.",
        "chart_dist": "Asset & Liability Distribution",
        "chart_dist_desc": "Comparative analysis of Asset and Liability breakdown.",
        
        "basic_analysis_header": "Fundamental Analysis & Multiples",
        "ba_fk": "P/E Ratio",
        "ba_pddd": "P/B Ratio",
        "ba_fdfavok": "EV/EBITDA",
        "ba_cari": "Current Ratio",

        "table_assets_header": "Annualized Balance Sheet Items (Billion)",
        "th_period": "Period",
        "th_ca": "Current Assets",
        "th_fa": "Fixed Assets",
        "th_ta": "Total Assets",
        "th_stl": "Short-Term Liab.",
        "th_eq": "Equity",
        "th_ni": "Net Income",
        
        "ts_title": "Time Series & Forecast",
        "ts_desc": "Time series forecasting with machine learning and statistical models.",
        "ts_run": "Run Optimization",
        "kpi_rmse": "RMSE",
        "kpi_aic": "AIC",
        "kpi_r2": "R² (Explained Variance)",
        "kpi_df": "Dickey-Fuller Stationarity",
        
        "ts_chart": "Price Path Forecast & Confidence Intervals (LSTM)",
        "fi_header": "Feature Importance / Lag Table",
        "fi_th1": "Feature / Factor",
        "fi_th2": "Impact Direction",
        "fi_th3": "Weight",
        "fi_th4": "Relative Importance",
        
        "risk_title": "Risk & Portfolio (VaR)",
        "risk_desc": "Risk analysis using parametric and historical simulation methods.",
        "kpi_pvar": "Parametric VaR (99%, 1-Day)",
        "kpi_hvar": "Historical Simulation VaR (95%)",
        "kpi_cvar": "Expected Shortfall (CVaR)",
        "kpi_maxdd": "Maximum Drawdown",
        
        "risk_chart1": "Return Distribution & VaR Cut-off",
        "risk_chart1_desc": "Normal vs. Fat-tail Student's t",
        "risk_chart2": "Asset Risk Contribution",
        "risk_chart2_desc": "Marginal Risk Contributions",
        "corr_header": "Correlation Heatmap",

        "pipeline_msg": "Establishing Big Data Pipeline Connections...",
        "stress_msg": "Stress Test (What-If) Scenarios",
        "settings_msg": "Model Settings & Hyperparameter Optimization",

        // New Navigation (EN)
        "nav_fundamental": "Balance Sheet & Fundamental",
        "nav_eventstudy": "Event Study (Earnings Surprise)",
        "nav_multifactor": "Multi-Factor Regression",

        // Fundamental Analysis (EN)
        "fund_title": "Balance Sheet & Fundamental Analysis",
        "fund_desc": "Financial statements, DuPont decomposition, profitability, liquidity, and valuation multiples.",
        "fund_dupont_title": "DuPont Profitability Decomposition (3-Stage ROE)",
        "fund_dupont_roe": "Return on Equity (ROE)",
        "fund_dupont_margin": "Net Profit Margin",
        "fund_dupont_turnover": "Asset Turnover",
        "fund_dupont_leverage": "Equity Multiplier",
        "fund_chart_comp": "Asset & Capital Composition",
        "fund_chart_waterfall": "Income Statement Waterfall",
        "fund_ratios_title": "Financial Ratios & Health Metrics",

        // Event Study (EN)
        "es_title": "Event Study: Earnings Surprises & CAR",
        "es_desc": "Market reaction on announcement date (t=0), Standardized Unexpected Earnings (SUE), and CAR.",
        "es_chart_car": "Cumulative Abnormal Return (CAR) Path [-10, +10 Days]",
        "es_chart_car_desc": "Market pricing around earnings release (t=0) with 95% confidence bands.",
        "es_table_title": "Historical Earnings Announcements & SUE Scores",
        "es_th_period": "Period",
        "es_th_date": "Announcement Date",
        "es_th_est": "Consensus Est.",
        "es_th_act": "Actual Net Income",
        "es_th_surp": "Surprise",
        "es_th_sue": "SUE Score",
        "es_th_t1": "T+1 Reaction",
        "es_th_car": "10-Day CAR",
        "es_th_signal": "Quant Signal",

        // Multi-Factor Regression (EN)
        "mf_title": "Multi-Factor Risk & Factor Regression",
        "mf_desc": "Fama-French 3/5 Factors + Momentum + FX and Interest Rate sensitivity model.",
        "mf_table_title": "Factor Betas & Econometric Significance",
        "mf_th_factor": "Risk Factor",
        "mf_th_beta": "Sensitivity (Beta)",
        "mf_th_stderr": "Std Error",
        "mf_th_tstat": "t-Statistic",
        "mf_th_pval": "p-Value",
        "mf_th_vif": "VIF",
        "mf_th_sig": "Significance",
        "mf_chart_attr": "Risk Attribution & Factor Variance Breakdown",
        "mf_sim_title": "Interactive Factor Shock Simulator",

        // Big Data Stream (EN)
        "pipe_title": "Big Data Stream & Algorithmic Event Engine",
        "pipe_desc": "Apache Arrow / Kafka stream simulator for BIST L2 tick flow, event processing, and anomaly detection.",
        "pipe_throughput": "Throughput (Events / sec)",
        "pipe_datarate": "Data Rate (MB / sec)",
        "pipe_latency": "End-to-End Latency (p99)",
        "pipe_schema": "Arrow Schema Validation",
        "pipe_terminal_title": "Real-Time Terminal Console (Live Stream Logs)",
        "pipe_btn_pause": "Pause Stream",
        "pipe_btn_resume": "Resume Stream",
        "pipe_btn_anomaly": "Inject Volatility Shock",

        // Stress Testing (EN)
        "stress_title": "Stress Testing & Macro Scenarios (What-If)",
        "stress_desc": "Tail-risk testing under extreme market scenarios, currency shocks, and Monte Carlo paths.",
        "stress_preset_title": "Pre-Configured Macro Shock Scenarios",
        "stress_mc_chart": "Monte Carlo Shock Distribution (10,000 Paths)",
        "stress_mc_desc": "Baseline market distribution vs. stressed fat-tail risk (99% Stressed VaR).",
        "stress_impact_matrix": "Balance Sheet Shock Impact Matrix",

        // Model Settings (EN)
        "settings_title": "Quantitative Model Settings & Hyperparameters",
        "settings_desc": "Risk engine configuration, GARCH volatility parameters, LSTM lookback, and FastAPI endpoint.",
        "settings_btn_save": "Save & Apply Settings",
        "settings_btn_reset": "Reset to Defaults",
        "settings_btn_test": "Test FastAPI Connection",

        "ai_status": "Copilot Online",
        "ai_title": "QuantFlux AI",
        "ai_role": "Financial Strategist & Quant Copilot",
        "ai_pill1": "Summarize THYAO balance sheet",
        "ai_pill2": "What is the share of Fixed Assets?",
        "ai_pill3": "Comment on sales and profitability",
        "ai_placeholder": "Ask a quantitative question..."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const langSelector = document.getElementById('langSelector');
    
    function applyTranslations(lang) {
        if (!translations[lang]) return;
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) {
                    el.placeholder = translations[lang][key];
                } else if (el.childNodes.length > 0) {
                    // Find the text node and replace its content, preserving other elements like icons
                    let textNodeReplaced = false;
                    for (let i = 0; i < el.childNodes.length; i++) {
                        const child = el.childNodes[i];
                        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                            child.textContent = translations[lang][key];
                            textNodeReplaced = true;
                            break;
                        }
                    }
                    if (!textNodeReplaced) {
                        el.textContent = translations[lang][key];
                    }
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        });
    }

    if (langSelector) {
        langSelector.addEventListener('change', (e) => {
            applyTranslations(e.target.value);
        });
        
        // Initial apply
        applyTranslations(langSelector.value);
    }
});