// QuantFlux Quantitative Data Layer (v3.2)
// Universal Generic Financial Data Architecture

/**
 * Universal Period Sort Key Parser
 * Converts "2026/06", "2025/12", "2024-09", "2024Q1" into comparable integers (e.g. 202606)
 */
function parsePeriodSortKey(periodStr) {
    if (!periodStr) return 0;
    const str = String(periodStr).trim();
    const m = str.match(/(\d{4})[^\d]?(\d{1,2})?/);
    if (!m) return 0;
    const y = parseInt(m[1], 10);
    const qOrM = m[2] ? parseInt(m[2], 10) : 12;
    return y * 100 + qOrM;
}

/**
 * Derives standard quarter-end and disclosure dates from period string
 */
function deriveDatesFromPeriod(periodStr) {
    const str = String(periodStr || '2026/06').trim();
    const m = str.match(/(\d{4})[^\d]?(\d{1,2})?/);
    const year = m ? parseInt(m[1], 10) : 2026;
    const month = m && m[2] ? parseInt(m[2], 10) : 6;
    if (month <= 3) {
        return { end: `${year}-03-31`, disc: `${year}-05-10` };
    } else if (month <= 6) {
        return { end: `${year}-06-30`, disc: `${year}-08-14` };
    } else if (month <= 9) {
        return { end: `${year}-09-30`, disc: `${year}-11-08` };
    } else {
        return { end: `${year}-12-31`, disc: `${year + 1}-03-04` };
    }
}

/**
 * Universal Company Data Normalizer
 * Enforces strictly descending period order (statements[0] = newest quarter)
 * and conforms to the Universal Data Contract.
 */
function normalizeCompanyData(raw) {
    if (!raw) return null;
    const ticker = String(raw.ticker || raw.symbol || raw.sembol || 'GENERIC').toUpperCase();
    const name = raw.name || raw.company_name || `${ticker} A.Ş.`;
    const sector = raw.sector || raw.sektor || 'BIST Genel';
    const bist = raw.bist || 'BIST 100';
    const price = typeof raw.price === 'number' ? raw.price : (parseFloat(raw.price) || 100.0);
    const shares = typeof raw.shares === 'number' ? raw.shares : (parseFloat(raw.shares) || 1000000000);

    const rawStmts = Array.isArray(raw.statements) ? raw.statements :
                     (Array.isArray(raw.data) ? raw.data :
                     (Array.isArray(raw.records) ? raw.records : []));

    const stmts = rawStmts.map((s, idx) => {
        const period = String(s.period || `Dönem ${idx + 1}`).trim();
        const dates = deriveDatesFromPeriod(period);
        const period_end_date = s.period_end_date ? String(s.period_end_date).slice(0, 10) : dates.end;
        const disclosure_date = s.disclosure_date ? String(s.disclosure_date).slice(0, 19) : dates.disc;

        const ca = typeof s.donen_varliklar === 'number' ? s.donen_varliklar : (typeof s.currentAssets === 'number' ? s.currentAssets : (parseFloat(s.donen_varliklar || s.currentAssets) || 0));
        const fa = typeof s.duran_varliklar === 'number' ? s.duran_varliklar : (typeof s.fixedAssets === 'number' ? s.fixedAssets : (parseFloat(s.duran_varliklar || s.fixedAssets) || 0));
        let ta = typeof s.toplam_varliklar === 'number' ? s.toplam_varliklar : (typeof s.totalAssets === 'number' ? s.totalAssets : (parseFloat(s.toplam_varliklar || s.totalAssets) || 0));
        if (!ta || ta === 0) ta = ca + fa;

        const stl = typeof s.kisa_vadeli_yuk === 'number' ? s.kisa_vadeli_yuk : (typeof s.shortTermLiab === 'number' ? s.shortTermLiab : (parseFloat(s.kisa_vadeli_yuk || s.shortTermLiab) || 0));
        const ltl = typeof s.uzun_vadeli_yuk === 'number' ? s.uzun_vadeli_yuk : (typeof s.longTermLiab === 'number' ? s.longTermLiab : (parseFloat(s.uzun_vadeli_yuk || s.longTermLiab) || 0));
        let totalLiab = typeof s.totalLiab === 'number' ? s.totalLiab : (typeof s.toplam_yukumlulukler === 'number' ? s.toplam_yukumlulukler : (parseFloat(s.totalLiab || s.toplam_yukumlulukler) || 0));
        if (!totalLiab || totalLiab === 0) totalLiab = stl + ltl;

        const eq = typeof s.ozkaynaklar === 'number' ? s.ozkaynaklar : (typeof s.equity === 'number' ? s.equity : (parseFloat(s.ozkaynaklar || s.equity) || 0));
        const rev = typeof s.net_satislar === 'number' ? s.net_satislar : (typeof s.revenue === 'number' ? s.revenue : (parseFloat(s.net_satislar || s.revenue) || 0));
        const ni = typeof s.net_kar === 'number' ? s.net_kar : (typeof s.netIncome === 'number' ? s.netIncome : (parseFloat(s.net_kar || s.netIncome) || 0));

        let ebitda = typeof s.favok === 'number' ? s.favok : (typeof s.ebitda === 'number' ? s.ebitda : (parseFloat(s.favok || s.ebitda) || 0));
        if (!ebitda || ebitda === 0) {
            ebitda = ni !== 0 ? Math.round(ni * 1.25) : Math.round(rev * 0.20);
        }

        const costOfSales = typeof s.costOfSales === 'number' ? s.costOfSales : (typeof s.satislarin_maliyeti === 'number' ? s.satislarin_maliyeti : (parseFloat(s.costOfSales || s.satislarin_maliyeti) || (rev > 0 ? -Math.round(rev * 0.75) : 0)));
        const grossProfit = typeof s.grossProfit === 'number' ? s.grossProfit : (typeof s.brut_kar === 'number' ? s.brut_kar : (parseFloat(s.grossProfit || s.brut_kar) || (rev > 0 ? Math.round(rev * 0.25) : 0)));
        const operatingProfit = typeof s.operatingProfit === 'number' ? s.operatingProfit : (typeof s.esas_faaliyet_kari === 'number' ? s.esas_faaliyet_kari : (parseFloat(s.operatingProfit || s.esas_faaliyet_kari) || (ebitda > 0 ? Math.round(ebitda * 0.8) : ni)));

        const cr = stl > 0 ? +(ca / stl).toFixed(2) : (s.currentRatio ? +parseFloat(s.currentRatio).toFixed(2) : 1.0);
        const de = eq > 0 ? +(totalLiab / eq).toFixed(2) : (s.debtToEquity ? +parseFloat(s.debtToEquity).toFixed(2) : 1.0);
        const lev = ta > 0 ? +((totalLiab / ta) * 100).toFixed(1) : (s.leverage ? +parseFloat(s.leverage).toFixed(1) : 50.0);
        const nm = rev > 0 ? +((ni / rev) * 100).toFixed(1) : (s.netMargin ? +parseFloat(s.netMargin).toFixed(1) : 10.0);
        const gm = rev > 0 ? +((grossProfit / rev) * 100).toFixed(1) : (s.grossMargin ? +parseFloat(s.grossMargin).toFixed(1) : 20.0);
        const roe = eq > 0 ? +((ni / eq) * 100).toFixed(1) : (s.roe ? +parseFloat(s.roe).toFixed(1) : 15.0);
        const roa = ta > 0 ? +((ni / ta) * 100).toFixed(1) : (s.roa ? +parseFloat(s.roa).toFixed(1) : 7.0);

        const mCap = price * shares;
        const pe = ni > 0 ? +(mCap / ni).toFixed(2) : (s.pe ? +parseFloat(s.pe).toFixed(2) : 5.0);
        const pb = eq > 0 ? +(mCap / eq).toFixed(2) : (s.pb ? +parseFloat(s.pb).toFixed(2) : 1.0);
        const netDebt = Math.max(0, totalLiab - ca * 0.35);
        const ev = mCap + netDebt;
        const evEbitda = ebitda > 0 ? +(ev / ebitda).toFixed(2) : (s.evEbitda ? +parseFloat(s.evEbitda).toFixed(2) : 6.0);
        const eps = shares > 0 ? +(ni / shares).toFixed(2) : (s.eps ? +parseFloat(s.eps).toFixed(2) : 10.0);

        return {
            period,
            period_end_date,
            disclosure_date,
            donen_varliklar: ca,
            duran_varliklar: fa,
            toplam_varliklar: ta,
            kisa_vadeli_yuk: stl,
            uzun_vadeli_yuk: ltl,
            totalLiab,
            ozkaynaklar: eq,
            net_satislar: rev,
            favok: ebitda,
            net_kar: ni,
            costOfSales,
            grossProfit,
            operatingProfit,
            // CamelCase aliases:
            currentAssets: ca,
            fixedAssets: fa,
            totalAssets: ta,
            shortTermLiab: stl,
            longTermLiab: ltl,
            equity: eq,
            revenue: rev,
            ebitda,
            netIncome: ni,
            currentRatio: cr,
            debtToEquity: de,
            leverage: lev,
            netMargin: nm,
            grossMargin: gm,
            roe,
            roa,
            marketCap: mCap,
            pe,
            pb,
            evEbitda,
            eps
        };
    });

    // STRICT AUTO-SORT: Descending order (statements[0] is latest quarter)
    stmts.sort((a, b) => parsePeriodSortKey(b.period) - parsePeriodSortKey(a.period));

    const periods = stmts.map(s => s.period);

    return {
        ticker,
        name,
        sector,
        bist,
        price,
        shares,
        periods,
        statements: stmts,
        data: stmts // Alias for backward compatibility
    };
}

/**
 * Universal Mock Generator for any custom or missing company
 */
function generateGenericCompanyData(ticker, name, sector) {
    const t = String(ticker || 'CUSTOM').toUpperCase();
    const n = name || `${t} Sanayi ve Ticaret A.Ş.`;
    const s = sector || 'BIST İmalat / Genel';
    const price = 85.50;
    const shares = 1200000000;
    const rawStatements = [
        {
            period: '2026/06',
            period_end_date: '2026-06-30',
            disclosure_date: '2026-08-14 18:30:00',
            donen_varliklar: 245000000000.0,
            duran_varliklar: 380000000000.0,
            toplam_varliklar: 625000000000.0,
            kisa_vadeli_yuk: 210000000000.0,
            uzun_vadeli_yuk: 165000000000.0,
            ozkaynaklar: 250000000000.0,
            net_satislar: 290000000000.0,
            favok: 62000000000.0,
            net_kar: 38500000000.0
        },
        {
            period: '2025/12',
            period_end_date: '2025-12-31',
            disclosure_date: '2026-03-02 18:45:00',
            donen_varliklar: 215000000000.0,
            duran_varliklar: 330000000000.0,
            toplam_varliklar: 545000000000.0,
            kisa_vadeli_yuk: 185000000000.0,
            uzun_vadeli_yuk: 145000000000.0,
            ozkaynaklar: 215000000000.0,
            net_satislar: 480000000000.0,
            favok: 98000000000.0,
            net_kar: 54000000000.0
        },
        {
            period: '2024/12',
            period_end_date: '2024-12-31',
            disclosure_date: '2025-03-04 18:40:00',
            donen_varliklar: 170000000000.0,
            duran_varliklar: 260000000000.0,
            toplam_varliklar: 430000000000.0,
            kisa_vadeli_yuk: 150000000000.0,
            uzun_vadeli_yuk: 110000000000.0,
            ozkaynaklar: 170000000000.0,
            net_satislar: 360000000000.0,
            favok: 72000000000.0,
            net_kar: 41000000000.0
        },
        {
            period: '2023/12',
            period_end_date: '2023-12-31',
            disclosure_date: '2024-03-05 18:45:00',
            donen_varliklar: 125000000000.0,
            duran_varliklar: 195000000000.0,
            toplam_varliklar: 320000000000.0,
            kisa_vadeli_yuk: 115000000000.0,
            uzun_vadeli_yuk: 85000000000.0,
            ozkaynaklar: 120000000000.0,
            net_satislar: 250000000000.0,
            favok: 51000000000.0,
            net_kar: 29000000000.0
        }
    ];

    return normalizeCompanyData({
        ticker: t,
        name: n,
        sector: s,
        bist: 'BIST 100',
        price,
        shares,
        statements: rawStatements
    });
}

window.parsePeriodSortKey = parsePeriodSortKey;
window.normalizeCompanyData = normalizeCompanyData;
window.generateGenericCompanyData = generateGenericCompanyData;

window.QuantData = {
    activeTicker: "THYAO",
    companies: {
  "THYAO": {
    "ticker": "THYAO",
    "name": "Türk Hava Yolları A.O.",
    "sector": "Havacılık / Ulaştırma",
    "bist": "BIST 30",
    "price": 314.5,
    "shares": 1380000000,
    "periods": [
      "2023/12",
      "2024/12",
      "2025/12",
      "2026/06"
    ],
    "data": [
      {
        "period": "2023/12",
        "currentAssets": 253043000000.0,
        "fixedAssets": 797048000000.0,
        "totalAssets": 1050091000000.0,
        "shortTermLiab": 267956000000.0,
        "longTermLiab": 325023000000.0,
        "totalLiab": 592979000000.0,
        "equity": 457112000000.0,
        "revenue": 504398000000.0,
        "costOfSales": -384952000000.0,
        "grossProfit": 119446000000.0,
        "operatingProfit": 71425000000.0,
        "ebitda": 89281250000.0,
        "netIncome": 162998000000.0,
        "currentRatio": 0.94,
        "acidTest": 0.68,
        "debtToEquity": 1.3,
        "leverage": 56.5,
        "netMargin": 32.3,
        "grossMargin": 23.7,
        "roe": 35.7,
        "roa": 15.5,
        "marketCap": 434010000000.0,
        "pe": 2.66,
        "pb": 0.95,
        "evEbitda": 10.37,
        "eps": 118.11
      },
      {
        "period": "2024/12",
        "currentAssets": 341910000000.0,
        "fixedAssets": 1057696000000.0,
        "totalAssets": 1399606000000.0,
        "shortTermLiab": 339533000000.0,
        "longTermLiab": 380061000000.0,
        "totalLiab": 719594000000.0,
        "equity": 680012000000.0,
        "revenue": 745430000000.0,
        "costOfSales": -602522000000.0,
        "grossProfit": 142908000000.0,
        "operatingProfit": 80393000000.0,
        "ebitda": 100491250000.0,
        "netIncome": 113357000000.0,
        "currentRatio": 1.01,
        "acidTest": 0.73,
        "debtToEquity": 1.06,
        "leverage": 51.4,
        "netMargin": 15.2,
        "grossMargin": 19.2,
        "roe": 16.7,
        "roa": 8.1,
        "marketCap": 434010000000.0,
        "pe": 3.83,
        "pb": 0.64,
        "evEbitda": 10.12,
        "eps": 82.14
      },
      {
        "period": "2025/12",
        "currentAssets": 436412000000.0,
        "fixedAssets": 1560333000000.0,
        "totalAssets": 1996745000000.0,
        "shortTermLiab": 442076000000.0,
        "longTermLiab": 643413000000.0,
        "totalLiab": 1085489000000.0,
        "equity": 911256000000.0,
        "revenue": 955472000000.0,
        "costOfSales": -799912000000.0,
        "grossProfit": 155560000000.0,
        "operatingProfit": 90129000000.0,
        "ebitda": 112661250000.0,
        "netIncome": 118117000000.0,
        "currentRatio": 0.99,
        "acidTest": 0.71,
        "debtToEquity": 1.19,
        "leverage": 54.4,
        "netMargin": 12.4,
        "grossMargin": 16.3,
        "roe": 13.0,
        "roa": 5.9,
        "marketCap": 434010000000.0,
        "pe": 3.67,
        "pb": 0.48,
        "evEbitda": 11.94,
        "eps": 85.59
      },
      {
        "period": "2026/06",
        "currentAssets": 512191000000.0,
        "fixedAssets": 1847846000000.0,
        "totalAssets": 2360037000000.0,
        "shortTermLiab": 566751000000.0,
        "longTermLiab": 774833000000.0,
        "totalLiab": 1341584000000.0,
        "equity": 1018453000000.0,
        "revenue": 585069000000.0,
        "costOfSales": -542482000000.0,
        "grossProfit": 42587000000.0,
        "operatingProfit": -5098000000.0,
        "ebitda": 25334100000.0,
        "netIncome": 18766000000.0,
        "currentRatio": 0.9,
        "acidTest": 0.65,
        "debtToEquity": 1.32,
        "leverage": 56.8,
        "netMargin": 3.2,
        "grossMargin": 7.3,
        "roe": 1.8,
        "roa": 0.8,
        "marketCap": 434010000000.0,
        "pe": 23.13,
        "pb": 0.43,
        "evEbitda": 62.0,
        "eps": 13.6
      }
    ]
  },
  "KCHOL": {
    "ticker": "KCHOL",
    "name": "Koç Holding A.Ş.",
    "sector": "Holding / Yatırım",
    "bist": "BIST 30",
    "price": 228.0,
    "shares": 2535900000,
    "periods": [
      "2023/12",
      "2024/12",
      "2025/12",
      "2026/06"
    ],
    "data": [
      {
        "period": "2023/12",
        "currentAssets": 1712378000000.0,
        "fixedAssets": 1146587000000.0,
        "totalAssets": 1712378000000.0,
        "shortTermLiab": 1865813000000.0,
        "longTermLiab": 318880000000.0,
        "totalLiab": 2184693000000.0,
        "equity": 674272000000.0,
        "revenue": 1219023000000.0,
        "costOfSales": -995950000000.0,
        "grossProfit": 223073000000.0,
        "operatingProfit": 222656000000.0,
        "ebitda": 278320000000.0,
        "netIncome": 117733000000.0,
        "currentRatio": 0.92,
        "acidTest": 0.66,
        "debtToEquity": 3.24,
        "leverage": 127.6,
        "netMargin": 9.7,
        "grossMargin": 18.3,
        "roe": 17.5,
        "roa": 6.9,
        "marketCap": 578185200000.0,
        "pe": 4.91,
        "pb": 0.86,
        "evEbitda": 7.47,
        "eps": 46.43
      },
      {
        "period": "2024/12",
        "currentAssets": 2338684000000.0,
        "fixedAssets": 1569468000000.0,
        "totalAssets": 2338684000000.0,
        "shortTermLiab": 2604653000000.0,
        "longTermLiab": 444835000000.0,
        "totalLiab": 3049488000000.0,
        "equity": 858664000000.0,
        "revenue": 1611489000000.0,
        "costOfSales": -1386482000000.0,
        "grossProfit": 225007000000.0,
        "operatingProfit": 87366000000.0,
        "ebitda": 109207500000.0,
        "netIncome": -5288000000.0,
        "currentRatio": 0.9,
        "acidTest": 0.65,
        "debtToEquity": 3.55,
        "leverage": 130.4,
        "netMargin": -0.3,
        "grossMargin": 14.0,
        "roe": -0.6,
        "roa": -0.2,
        "marketCap": 578185200000.0,
        "pe": 0,
        "pb": 0.67,
        "evEbitda": 24.65,
        "eps": -2.09
      },
      {
        "period": "2025/12",
        "currentAssets": 3016408000000.0,
        "fixedAssets": 2301192000000.0,
        "totalAssets": 3016408000000.0,
        "shortTermLiab": 3459611000000.0,
        "longTermLiab": 765416000000.0,
        "totalLiab": 4225027000000.0,
        "equity": 1092573000000.0,
        "revenue": 1838618000000.0,
        "costOfSales": -1539222000000.0,
        "grossProfit": 299396000000.0,
        "operatingProfit": 117608000000.0,
        "ebitda": 147010000000.0,
        "netIncome": 34628000000.0,
        "currentRatio": 0.87,
        "acidTest": 0.63,
        "debtToEquity": 3.87,
        "leverage": 140.1,
        "netMargin": 1.9,
        "grossMargin": 16.3,
        "roe": 3.2,
        "roa": 1.1,
        "marketCap": 578185200000.0,
        "pe": 16.7,
        "pb": 0.53,
        "evEbitda": 24.47,
        "eps": 13.66
      },
      {
        "period": "2026/06",
        "currentAssets": 3615149000000.0,
        "fixedAssets": 2618366000000.0,
        "totalAssets": 3615149000000.0,
        "shortTermLiab": 3995224000000.0,
        "longTermLiab": 946293000000.0,
        "totalLiab": 4941517000000.0,
        "equity": 1291998000000.0,
        "revenue": 1180496000000.0,
        "costOfSales": -981921000000.0,
        "grossProfit": 198575000000.0,
        "operatingProfit": 95971000000.0,
        "ebitda": 119963750000.0,
        "netIncome": 46868000000.0,
        "currentRatio": 0.9,
        "acidTest": 0.65,
        "debtToEquity": 3.82,
        "leverage": 136.7,
        "netMargin": 4.0,
        "grossMargin": 16.8,
        "roe": 3.6,
        "roa": 1.3,
        "marketCap": 578185200000.0,
        "pe": 12.34,
        "pb": 0.45,
        "evEbitda": 33.96,
        "eps": 18.48
      }
    ]
  },
  "AGHOL": {
    "ticker": "AGHOL",
    "name": "AG Anadolu Grubu Holding A.Ş.",
    "sector": "Holding / İçecek & Perakende",
    "bist": "BIST 30",
    "price": 342.25,
    "shares": 2435345000,
    "periods": [
      "2023/12",
      "2024/12",
      "2025/12",
      "2026/06"
    ],
    "data": [
      {
        "period": "2023/12",
        "currentAssets": 146843226000.0,
        "fixedAssets": 244956202000.0,
        "totalAssets": 146843226000.0,
        "shortTermLiab": 140181632000.0,
        "longTermLiab": 72036438000.0,
        "totalLiab": 212218070000.0,
        "equity": 179581358000.0,
        "revenue": 375583477000.0,
        "costOfSales": -276294877000.0,
        "grossProfit": 99288600000.0,
        "operatingProfit": 17636339000.0,
        "ebitda": 22045423750.0,
        "netIncome": 49262597000.0,
        "currentRatio": 1.05,
        "acidTest": 0.75,
        "debtToEquity": 1.18,
        "leverage": 144.5,
        "netMargin": 13.1,
        "grossMargin": 26.4,
        "roe": 27.4,
        "roa": 33.5,
        "marketCap": 833496826250.0,
        "pe": 16.92,
        "pb": 4.64,
        "evEbitda": 44.77,
        "eps": 20.23
      },
      {
        "period": "2024/12",
        "currentAssets": 200137575000.0,
        "fixedAssets": 343560832000.0,
        "totalAssets": 200137575000.0,
        "shortTermLiab": 196323033000.0,
        "longTermLiab": 102171128000.0,
        "totalLiab": 298494161000.0,
        "equity": 245204246000.0,
        "revenue": 563782783000.0,
        "costOfSales": -399676841000.0,
        "grossProfit": 164105942000.0,
        "operatingProfit": 14191844000.0,
        "ebitda": 17739805000.0,
        "netIncome": 26699043000.0,
        "currentRatio": 1.02,
        "acidTest": 0.73,
        "debtToEquity": 1.22,
        "leverage": 149.1,
        "netMargin": 4.7,
        "grossMargin": 29.1,
        "roe": 10.9,
        "roa": 13.3,
        "marketCap": 833496826250.0,
        "pe": 31.22,
        "pb": 3.4,
        "evEbitda": 59.3,
        "eps": 10.96
      },
      {
        "period": "2025/12",
        "currentAssets": 220928042000.0,
        "fixedAssets": 462296574000.0,
        "totalAssets": 220928042000.0,
        "shortTermLiab": 235538153000.0,
        "longTermLiab": 129560246000.0,
        "totalLiab": 365098399000.0,
        "equity": 318126217000.0,
        "revenue": 707202498000.0,
        "costOfSales": -509576775000.0,
        "grossProfit": 197625723000.0,
        "operatingProfit": 14293905000.0,
        "ebitda": 17867381250.0,
        "netIncome": 19622092000.0,
        "currentRatio": 0.94,
        "acidTest": 0.68,
        "debtToEquity": 1.15,
        "leverage": 165.3,
        "netMargin": 2.8,
        "grossMargin": 27.9,
        "roe": 6.2,
        "roa": 8.9,
        "marketCap": 833496826250.0,
        "pe": 42.48,
        "pb": 2.62,
        "evEbitda": 62.14,
        "eps": 8.06
      },
      {
        "period": "2026/06",
        "currentAssets": 279305544000.0,
        "fixedAssets": 536933810000.0,
        "totalAssets": 279305544000.0,
        "shortTermLiab": 294873188000.0,
        "longTermLiab": 153371880000.0,
        "totalLiab": 448245068000.0,
        "equity": 367994286000.0,
        "revenue": 424932435000.0,
        "costOfSales": -306459640000.0,
        "grossProfit": 118472795000.0,
        "operatingProfit": 6438826000.0,
        "ebitda": 8048532500.0,
        "netIncome": 14495024000.0,
        "currentRatio": 0.95,
        "acidTest": 0.68,
        "debtToEquity": 1.22,
        "leverage": 160.5,
        "netMargin": 3.4,
        "grossMargin": 27.9,
        "roe": 3.9,
        "roa": 5.2,
        "marketCap": 833496826250.0,
        "pe": 57.5,
        "pb": 2.26,
        "evEbitda": 145.37,
        "eps": 5.95
      }
    ]
  },
  "BERA": {
    "ticker": "BERA",
    "name": "Bera Holding A.Ş.",
    "sector": "İmalat / Çeşitlendirilmiş",
    "bist": "BIST 100",
    "price": 21.8,
    "shares": 683200000,
    "periods": [
      "2023/12",
      "2024/12",
      "2025/12",
      "2026/06"
    ],
    "data": [
      {
        "period": "2023/12",
        "currentAssets": 8607837656.0,
        "fixedAssets": 15387764317.0,
        "totalAssets": 23995601973.0,
        "shortTermLiab": 3606120353.0,
        "longTermLiab": 3095425511.0,
        "totalLiab": 6701545864.0,
        "equity": 17294056109.0,
        "revenue": 12853052610.0,
        "costOfSales": -9944209832.0,
        "grossProfit": 2908842778.0,
        "operatingProfit": 1538106337.0,
        "ebitda": 1922632921.25,
        "netIncome": 3321920681.0,
        "currentRatio": 2.39,
        "acidTest": 1.72,
        "debtToEquity": 0.39,
        "leverage": 27.9,
        "netMargin": 25.8,
        "grossMargin": 22.6,
        "roe": 19.2,
        "roa": 13.8,
        "marketCap": 14893760000.0,
        "pe": 4.48,
        "pb": 0.86,
        "evEbitda": 9.44,
        "eps": 4.86
      },
      {
        "period": "2024/12",
        "currentAssets": 11483737083.0,
        "fixedAssets": 22101945802.0,
        "totalAssets": 33585682885.0,
        "shortTermLiab": 4601534374.0,
        "longTermLiab": 3122782330.0,
        "totalLiab": 7724316704.0,
        "equity": 25861366181.0,
        "revenue": 16663064327.0,
        "costOfSales": -12906704670.0,
        "grossProfit": 3756359657.0,
        "operatingProfit": 2142652319.0,
        "ebitda": 2678315398.75,
        "netIncome": 1158123424.0,
        "currentRatio": 2.5,
        "acidTest": 1.8,
        "debtToEquity": 0.3,
        "leverage": 23.0,
        "netMargin": 7.0,
        "grossMargin": 22.5,
        "roe": 4.5,
        "roa": 3.4,
        "marketCap": 14893760000.0,
        "pe": 12.86,
        "pb": 0.58,
        "evEbitda": 6.73,
        "eps": 1.7
      },
      {
        "period": "2025/12",
        "currentAssets": 13420154406.0,
        "fixedAssets": 29018677127.0,
        "totalAssets": 42438831533.0,
        "shortTermLiab": 4654278457.0,
        "longTermLiab": 3978949873.0,
        "totalLiab": 8633228330.0,
        "equity": 33805603203.0,
        "revenue": 19129878696.0,
        "costOfSales": -14478091126.0,
        "grossProfit": 4651787570.0,
        "operatingProfit": 2150527775.0,
        "ebitda": 2688159718.75,
        "netIncome": 459374064.0,
        "currentRatio": 2.88,
        "acidTest": 2.08,
        "debtToEquity": 0.26,
        "leverage": 20.3,
        "netMargin": 2.4,
        "grossMargin": 24.3,
        "roe": 1.4,
        "roa": 1.1,
        "marketCap": 14893760000.0,
        "pe": 32.42,
        "pb": 0.44,
        "evEbitda": 6.76,
        "eps": 0.67
      },
      {
        "period": "2026/06",
        "currentAssets": 15824028634.0,
        "fixedAssets": 33733727194.0,
        "totalAssets": 49557755828.0,
        "shortTermLiab": 5757660311.0,
        "longTermLiab": 4257193809.0,
        "totalLiab": 10014854120.0,
        "equity": 39542901708.0,
        "revenue": 10203218695.0,
        "costOfSales": -8114088106.0,
        "grossProfit": 2089130589.0,
        "operatingProfit": 834376489.0,
        "ebitda": 1042970611.25,
        "netIncome": 96161629.0,
        "currentRatio": 2.75,
        "acidTest": 1.98,
        "debtToEquity": 0.25,
        "leverage": 20.2,
        "netMargin": 0.9,
        "grossMargin": 20.5,
        "roe": 0.2,
        "roa": 0.2,
        "marketCap": 14893760000.0,
        "pe": 154.88,
        "pb": 0.38,
        "evEbitda": 17.81,
        "eps": 0.14
      }
    ]
  }
},
    eventStudy: {
  "THYAO": {
    "events": [
      {
        "period": "2026/06",
        "date": "2026-08-12",
        "estimate": 14200000000,
        "actual": 18766000000,
        "surprise": 4566000000,
        "surprisePct": 32.2,
        "sue": 2.18,
        "dayReaction": 4.6,
        "car10": 8.9,
        "signal": "STRONG_BUY"
      },
      {
        "period": "2025/12",
        "date": "2026-03-04",
        "estimate": 102000000000,
        "actual": 118117000000,
        "surprise": 16117000000,
        "surprisePct": 15.8,
        "sue": 1.64,
        "dayReaction": 2.8,
        "car10": 6.2,
        "signal": "BUY"
      },
      {
        "period": "2024/12",
        "date": "2025-03-06",
        "estimate": 118000000000,
        "actual": 113357000000,
        "surprise": -4643000000,
        "surprisePct": -3.9,
        "sue": -0.42,
        "dayReaction": -1.2,
        "car10": -2.1,
        "signal": "HOLD"
      },
      {
        "period": "2023/12",
        "date": "2024-03-08",
        "estimate": 135000000000,
        "actual": 162998000000,
        "surprise": 27998000000,
        "surprisePct": 20.7,
        "sue": 1.95,
        "dayReaction": 3.9,
        "car10": 7.4,
        "signal": "STRONG_BUY"
      }
    ],
    "carCurve": [
      {
        "day": -10,
        "car": 0.1,
        "ciUpper": 1.8,
        "ciLower": -1.6,
        "benchmark": 0.0
      },
      {
        "day": -8,
        "car": 0.4,
        "ciUpper": 2.2,
        "ciLower": -1.4,
        "benchmark": 0.1
      },
      {
        "day": -6,
        "car": 0.9,
        "ciUpper": 2.8,
        "ciLower": -1.0,
        "benchmark": 0.3
      },
      {
        "day": -4,
        "car": 1.4,
        "ciUpper": 3.4,
        "ciLower": -0.6,
        "benchmark": 0.4
      },
      {
        "day": -2,
        "car": 1.9,
        "ciUpper": 4.1,
        "ciLower": -0.3,
        "benchmark": 0.6
      },
      {
        "day": -1,
        "car": 2.2,
        "ciUpper": 4.5,
        "ciLower": -0.1,
        "benchmark": 0.7
      },
      {
        "day": 0,
        "car": 4.6,
        "ciUpper": 6.8,
        "ciLower": 2.4,
        "benchmark": 0.8
      },
      {
        "day": 1,
        "car": 5.5,
        "ciUpper": 7.9,
        "ciLower": 3.1,
        "benchmark": 1.0
      },
      {
        "day": 2,
        "car": 6.1,
        "ciUpper": 8.6,
        "ciLower": 3.6,
        "benchmark": 1.1
      },
      {
        "day": 4,
        "car": 7.0,
        "ciUpper": 9.6,
        "ciLower": 4.4,
        "benchmark": 1.3
      },
      {
        "day": 6,
        "car": 7.6,
        "ciUpper": 10.4,
        "ciLower": 4.8,
        "benchmark": 1.5
      },
      {
        "day": 8,
        "car": 8.3,
        "ciUpper": 11.2,
        "ciLower": 5.4,
        "benchmark": 1.6
      },
      {
        "day": 10,
        "car": 8.9,
        "ciUpper": 11.9,
        "ciLower": 5.9,
        "benchmark": 1.8
      }
    ],
    "stats": {
      "caar": 5.1,
      "tStat": 3.42,
      "pValue": 0.0008,
      "driftDays": 14,
      "alphaSignal": "+1.85%"
    }
  },
  "KCHOL": {
    "events": [
      {
        "period": "2026/06",
        "date": "2026-08-15",
        "estimate": 41000000000,
        "actual": 46868000000,
        "surprise": 5868000000,
        "surprisePct": 14.3,
        "sue": 1.45,
        "dayReaction": 2.4,
        "car10": 5.1,
        "signal": "BUY"
      },
      {
        "period": "2025/12",
        "date": "2026-03-10",
        "estimate": 30000000000,
        "actual": 34628000000,
        "surprise": 4628000000,
        "surprisePct": 15.4,
        "sue": 1.38,
        "dayReaction": 1.9,
        "car10": 4.2,
        "signal": "BUY"
      },
      {
        "period": "2024/12",
        "date": "2025-03-12",
        "estimate": 12000000000,
        "actual": -5288000000,
        "surprise": -17288000000,
        "surprisePct": -144.1,
        "sue": -3.12,
        "dayReaction": -4.8,
        "car10": -8.6,
        "signal": "SELL"
      },
      {
        "period": "2023/12",
        "date": "2024-03-14",
        "estimate": 98000000000,
        "actual": 117733000000,
        "surprise": 19733000000,
        "surprisePct": 20.1,
        "sue": 1.88,
        "dayReaction": 3.2,
        "car10": 6.8,
        "signal": "STRONG_BUY"
      }
    ],
    "carCurve": [
      {
        "day": -10,
        "car": -0.2,
        "ciUpper": 1.5,
        "ciLower": -1.9,
        "benchmark": 0.0
      },
      {
        "day": -8,
        "car": 0.1,
        "ciUpper": 1.9,
        "ciLower": -1.7,
        "benchmark": 0.1
      },
      {
        "day": -6,
        "car": 0.5,
        "ciUpper": 2.4,
        "ciLower": -1.4,
        "benchmark": 0.2
      },
      {
        "day": -4,
        "car": 0.9,
        "ciUpper": 2.9,
        "ciLower": -1.1,
        "benchmark": 0.4
      },
      {
        "day": -2,
        "car": 1.2,
        "ciUpper": 3.4,
        "ciLower": -1.0,
        "benchmark": 0.5
      },
      {
        "day": -1,
        "car": 1.5,
        "ciUpper": 3.8,
        "ciLower": -0.8,
        "benchmark": 0.6
      },
      {
        "day": 0,
        "car": 2.4,
        "ciUpper": 4.9,
        "ciLower": -0.1,
        "benchmark": 0.7
      },
      {
        "day": 1,
        "car": 3.1,
        "ciUpper": 5.8,
        "ciLower": 0.4,
        "benchmark": 0.8
      },
      {
        "day": 2,
        "car": 3.7,
        "ciUpper": 6.5,
        "ciLower": 0.9,
        "benchmark": 0.9
      },
      {
        "day": 4,
        "car": 4.2,
        "ciUpper": 7.2,
        "ciLower": 1.2,
        "benchmark": 1.1
      },
      {
        "day": 6,
        "car": 4.6,
        "ciUpper": 7.8,
        "ciLower": 1.4,
        "benchmark": 1.2
      },
      {
        "day": 8,
        "car": 4.9,
        "ciUpper": 8.2,
        "ciLower": 1.6,
        "benchmark": 1.3
      },
      {
        "day": 10,
        "car": 5.1,
        "ciUpper": 8.6,
        "ciLower": 1.6,
        "benchmark": 1.4
      }
    ],
    "stats": {
      "caar": 3.8,
      "tStat": 2.65,
      "pValue": 0.009,
      "driftDays": 10,
      "alphaSignal": "+1.10%"
    }
  },
  "AGHOL": {
    "events": [
      {
        "period": "2026/06",
        "date": "2026-08-18",
        "estimate": 12800000000,
        "actual": 14495024000,
        "surprise": 1695024000,
        "surprisePct": 13.2,
        "sue": 1.22,
        "dayReaction": 1.8,
        "car10": 3.9,
        "signal": "BUY"
      },
      {
        "period": "2025/12",
        "date": "2026-03-15",
        "estimate": 18000000000,
        "actual": 19622092000,
        "surprise": 1622092000,
        "surprisePct": 9.0,
        "sue": 0.95,
        "dayReaction": 1.2,
        "car10": 2.8,
        "signal": "BUY"
      },
      {
        "period": "2024/12",
        "date": "2025-03-18",
        "estimate": 24000000000,
        "actual": 26699043000,
        "surprise": 2699043000,
        "surprisePct": 11.2,
        "sue": 1.15,
        "dayReaction": 1.5,
        "car10": 3.4,
        "signal": "BUY"
      },
      {
        "period": "2023/12",
        "date": "2024-03-20",
        "estimate": 42000000000,
        "actual": 49262597000,
        "surprise": 7262597000,
        "surprisePct": 17.3,
        "sue": 1.62,
        "dayReaction": 2.6,
        "car10": 5.8,
        "signal": "STRONG_BUY"
      }
    ],
    "carCurve": [
      {
        "day": -10,
        "car": 0.0,
        "ciUpper": 1.6,
        "ciLower": -1.6,
        "benchmark": 0.0
      },
      {
        "day": -8,
        "car": 0.3,
        "ciUpper": 2.0,
        "ciLower": -1.4,
        "benchmark": 0.1
      },
      {
        "day": -6,
        "car": 0.6,
        "ciUpper": 2.4,
        "ciLower": -1.2,
        "benchmark": 0.2
      },
      {
        "day": -4,
        "car": 0.9,
        "ciUpper": 2.8,
        "ciLower": -1.0,
        "benchmark": 0.3
      },
      {
        "day": -2,
        "car": 1.3,
        "ciUpper": 3.3,
        "ciLower": -0.7,
        "benchmark": 0.4
      },
      {
        "day": -1,
        "car": 1.5,
        "ciUpper": 3.6,
        "ciLower": -0.6,
        "benchmark": 0.5
      },
      {
        "day": 0,
        "car": 1.8,
        "ciUpper": 4.1,
        "ciLower": -0.5,
        "benchmark": 0.6
      },
      {
        "day": 1,
        "car": 2.3,
        "ciUpper": 4.8,
        "ciLower": -0.2,
        "benchmark": 0.7
      },
      {
        "day": 2,
        "car": 2.7,
        "ciUpper": 5.3,
        "ciLower": 0.1,
        "benchmark": 0.8
      },
      {
        "day": 4,
        "car": 3.1,
        "ciUpper": 5.8,
        "ciLower": 0.4,
        "benchmark": 0.9
      },
      {
        "day": 6,
        "car": 3.4,
        "ciUpper": 6.2,
        "ciLower": 0.6,
        "benchmark": 1.0
      },
      {
        "day": 8,
        "car": 3.7,
        "ciUpper": 6.6,
        "ciLower": 0.8,
        "benchmark": 1.1
      },
      {
        "day": 10,
        "car": 3.9,
        "ciUpper": 6.9,
        "ciLower": 0.9,
        "benchmark": 1.2
      }
    ],
    "stats": {
      "caar": 3.2,
      "tStat": 2.21,
      "pValue": 0.028,
      "driftDays": 8,
      "alphaSignal": "+0.85%"
    }
  },
  "BERA": {
    "events": [
      {
        "period": "2026/06",
        "date": "2026-08-20",
        "estimate": 85000000,
        "actual": 96161629,
        "surprise": 11161629,
        "surprisePct": 13.1,
        "sue": 1.18,
        "dayReaction": 2.1,
        "car10": 4.5,
        "signal": "BUY"
      },
      {
        "period": "2025/12",
        "date": "2026-03-22",
        "estimate": 520000000,
        "actual": 459374064,
        "surprise": -60625936,
        "surprisePct": -11.7,
        "sue": -1.05,
        "dayReaction": -2.4,
        "car10": -4.1,
        "signal": "HOLD"
      },
      {
        "period": "2024/12",
        "date": "2025-03-24",
        "estimate": 1050000000,
        "actual": 1158123424,
        "surprise": 108123424,
        "surprisePct": 10.3,
        "sue": 1.02,
        "dayReaction": 1.7,
        "car10": 3.2,
        "signal": "BUY"
      },
      {
        "period": "2023/12",
        "date": "2024-03-26",
        "estimate": 2800000000,
        "actual": 3321920681,
        "surprise": 521920681,
        "surprisePct": 18.6,
        "sue": 1.72,
        "dayReaction": 3.5,
        "car10": 7.1,
        "signal": "STRONG_BUY"
      }
    ],
    "carCurve": [
      {
        "day": -10,
        "car": -0.1,
        "ciUpper": 2.2,
        "ciLower": -2.4,
        "benchmark": 0.0
      },
      {
        "day": -8,
        "car": 0.4,
        "ciUpper": 2.8,
        "ciLower": -2.0,
        "benchmark": 0.1
      },
      {
        "day": -6,
        "car": 0.8,
        "ciUpper": 3.4,
        "ciLower": -1.8,
        "benchmark": 0.2
      },
      {
        "day": -4,
        "car": 1.2,
        "ciUpper": 4.0,
        "ciLower": -1.6,
        "benchmark": 0.3
      },
      {
        "day": -2,
        "car": 1.6,
        "ciUpper": 4.6,
        "ciLower": -1.4,
        "benchmark": 0.4
      },
      {
        "day": -1,
        "car": 1.8,
        "ciUpper": 5.0,
        "ciLower": -1.4,
        "benchmark": 0.5
      },
      {
        "day": 0,
        "car": 2.1,
        "ciUpper": 5.5,
        "ciLower": -1.3,
        "benchmark": 0.6
      },
      {
        "day": 1,
        "car": 2.8,
        "ciUpper": 6.4,
        "ciLower": -0.8,
        "benchmark": 0.7
      },
      {
        "day": 2,
        "car": 3.4,
        "ciUpper": 7.2,
        "ciLower": -0.4,
        "benchmark": 0.8
      },
      {
        "day": 4,
        "car": 3.8,
        "ciUpper": 7.8,
        "ciLower": -0.2,
        "benchmark": 0.9
      },
      {
        "day": 6,
        "car": 4.1,
        "ciUpper": 8.3,
        "ciLower": -0.1,
        "benchmark": 1.0
      },
      {
        "day": 8,
        "car": 4.3,
        "ciUpper": 8.7,
        "ciLower": -0.1,
        "benchmark": 1.1
      },
      {
        "day": 10,
        "car": 4.5,
        "ciUpper": 9.0,
        "ciLower": 0.0,
        "benchmark": 1.2
      }
    ],
    "stats": {
      "caar": 3.6,
      "tStat": 2.05,
      "pValue": 0.042,
      "driftDays": 9,
      "alphaSignal": "+0.92%"
    }
  }
},
    multiFactor: {
  "THYAO": {
    "alpha": {
      "value": 0.024,
      "annualized": 7.2,
      "tStat": 2.94,
      "pValue": 0.003,
      "sig": "***"
    },
    "factors": [
      {
        "name": "MKT (BIST30 Risk Primi)",
        "beta": 1.15,
        "stdErr": 0.09,
        "tStat": 12.78,
        "pValue": 0.0001,
        "vif": 1.32,
        "sig": "***"
      },
      {
        "name": "SMB (Büyüklük Primi)",
        "beta": -0.32,
        "stdErr": 0.1,
        "tStat": -3.2,
        "pValue": 0.0018,
        "vif": 1.45,
        "sig": "**"
      },
      {
        "name": "HML (Değer Primi)",
        "beta": 0.48,
        "stdErr": 0.11,
        "tStat": 4.36,
        "pValue": 0.0001,
        "vif": 1.28,
        "sig": "***"
      },
      {
        "name": "MOM (Momentum Primi)",
        "beta": 0.31,
        "stdErr": 0.11,
        "tStat": 2.82,
        "pValue": 0.0056,
        "vif": 1.19,
        "sig": "**"
      },
      {
        "name": "USD/TRY (Döviz Kuru)",
        "beta": 0.44,
        "stdErr": 0.11,
        "tStat": 4.0,
        "pValue": 0.0002,
        "vif": 1.38,
        "sig": "***"
      },
      {
        "name": "FAİZ (Tahvil / Repo)",
        "beta": -0.18,
        "stdErr": 0.09,
        "tStat": -2.0,
        "pValue": 0.048,
        "vif": 1.22,
        "sig": "*"
      }
    ],
    "metrics": {
      "r2": 0.835,
      "adjR2": 0.821,
      "fStat": 58.4,
      "fPValue": "< 0.0001",
      "durbinWatson": 2.04,
      "residualStd": 0.038
    },
    "attribution": [
      {
        "factor": "Piyasa Riski (MKT)",
        "pct": 46.5,
        "color": "#06b6d4"
      },
      {
        "factor": "Kur Riski (USD/TRY)",
        "pct": 21.0,
        "color": "#10b981"
      },
      {
        "factor": "Değer / Büyüklük (HML/SMB)",
        "pct": 13.5,
        "color": "#6366f1"
      },
      {
        "factor": "Momentum (MOM)",
        "pct": 6.5,
        "color": "#f59e0b"
      },
      {
        "factor": "Faiz Duyarlılığı (IR)",
        "pct": 4.5,
        "color": "#ec4899"
      },
      {
        "factor": "İdiyosenkratik (Artık)",
        "pct": 8.0,
        "color": "#71717a"
      }
    ]
  },
  "KCHOL": {
    "alpha": {
      "value": 0.018,
      "annualized": 5.4,
      "tStat": 2.45,
      "pValue": 0.016,
      "sig": "**"
    },
    "factors": [
      {
        "name": "MKT (BIST30 Risk Primi)",
        "beta": 1.08,
        "stdErr": 0.08,
        "tStat": 13.5,
        "pValue": 0.0001,
        "vif": 1.3,
        "sig": "***"
      },
      {
        "name": "SMB (Büyüklük Primi)",
        "beta": -0.45,
        "stdErr": 0.09,
        "tStat": -5.0,
        "pValue": 0.0001,
        "vif": 1.4,
        "sig": "***"
      },
      {
        "name": "HML (Değer Primi)",
        "beta": 0.55,
        "stdErr": 0.1,
        "tStat": 5.5,
        "pValue": 0.0001,
        "vif": 1.25,
        "sig": "***"
      },
      {
        "name": "MOM (Momentum Primi)",
        "beta": 0.18,
        "stdErr": 0.09,
        "tStat": 2.0,
        "pValue": 0.048,
        "vif": 1.15,
        "sig": "*"
      },
      {
        "name": "USD/TRY (Döviz Kuru)",
        "beta": 0.28,
        "stdErr": 0.1,
        "tStat": 2.8,
        "pValue": 0.006,
        "vif": 1.35,
        "sig": "**"
      },
      {
        "name": "FAİZ (Tahvil / Repo)",
        "beta": -0.24,
        "stdErr": 0.09,
        "tStat": -2.67,
        "pValue": 0.0089,
        "vif": 1.2,
        "sig": "**"
      }
    ],
    "metrics": {
      "r2": 0.852,
      "adjR2": 0.84,
      "fStat": 68.2,
      "fPValue": "< 0.0001",
      "durbinWatson": 1.96,
      "residualStd": 0.034
    },
    "attribution": [
      {
        "factor": "Piyasa Riski (MKT)",
        "pct": 52.0,
        "color": "#06b6d4"
      },
      {
        "factor": "Değer / Büyüklük (HML/SMB)",
        "pct": 18.0,
        "color": "#6366f1"
      },
      {
        "factor": "Kur Riski (USD/TRY)",
        "pct": 12.0,
        "color": "#10b981"
      },
      {
        "factor": "Faiz Duyarlılığı (IR)",
        "pct": 7.0,
        "color": "#ec4899"
      },
      {
        "factor": "Momentum (MOM)",
        "pct": 4.0,
        "color": "#f59e0b"
      },
      {
        "factor": "İdiyosenkratik (Artık)",
        "pct": 7.0,
        "color": "#71717a"
      }
    ]
  },
  "AGHOL": {
    "alpha": {
      "value": 0.015,
      "annualized": 4.5,
      "tStat": 2.05,
      "pValue": 0.043,
      "sig": "*"
    },
    "factors": [
      {
        "name": "MKT (BIST30 Risk Primi)",
        "beta": 0.98,
        "stdErr": 0.08,
        "tStat": 12.25,
        "pValue": 0.0001,
        "vif": 1.28,
        "sig": "***"
      },
      {
        "name": "SMB (Büyüklük Primi)",
        "beta": -0.15,
        "stdErr": 0.09,
        "tStat": -1.67,
        "pValue": 0.098,
        "vif": 1.38,
        "sig": "ns"
      },
      {
        "name": "HML (Değer Primi)",
        "beta": 0.38,
        "stdErr": 0.1,
        "tStat": 3.8,
        "pValue": 0.0003,
        "vif": 1.22,
        "sig": "***"
      },
      {
        "name": "MOM (Momentum Primi)",
        "beta": 0.22,
        "stdErr": 0.09,
        "tStat": 2.44,
        "pValue": 0.016,
        "vif": 1.18,
        "sig": "**"
      },
      {
        "name": "USD/TRY (Döviz Kuru)",
        "beta": 0.32,
        "stdErr": 0.09,
        "tStat": 3.56,
        "pValue": 0.0006,
        "vif": 1.3,
        "sig": "***"
      },
      {
        "name": "FAİZ (Tahvil / Repo)",
        "beta": -0.14,
        "stdErr": 0.08,
        "tStat": -1.75,
        "pValue": 0.082,
        "vif": 1.18,
        "sig": "ns"
      }
    ],
    "metrics": {
      "r2": 0.804,
      "adjR2": 0.789,
      "fStat": 47.6,
      "fPValue": "< 0.0001",
      "durbinWatson": 2.01,
      "residualStd": 0.041
    },
    "attribution": [
      {
        "factor": "Piyasa Riski (MKT)",
        "pct": 48.0,
        "color": "#06b6d4"
      },
      {
        "factor": "Kur Riski (USD/TRY)",
        "pct": 16.5,
        "color": "#10b981"
      },
      {
        "factor": "Değer / Büyüklük (HML/SMB)",
        "pct": 14.5,
        "color": "#6366f1"
      },
      {
        "factor": "Momentum (MOM)",
        "pct": 6.0,
        "color": "#f59e0b"
      },
      {
        "factor": "Faiz Duyarlılığı (IR)",
        "pct": 4.0,
        "color": "#ec4899"
      },
      {
        "factor": "İdiyosenkratik (Artık)",
        "pct": 11.0,
        "color": "#71717a"
      }
    ]
  },
  "BERA": {
    "alpha": {
      "value": 0.012,
      "annualized": 3.6,
      "tStat": 1.72,
      "pValue": 0.088,
      "sig": "ns"
    },
    "factors": [
      {
        "name": "MKT (BIST30 Risk Primi)",
        "beta": 1.12,
        "stdErr": 0.11,
        "tStat": 10.18,
        "pValue": 0.0001,
        "vif": 1.25,
        "sig": "***"
      },
      {
        "name": "SMB (Büyüklük Primi)",
        "beta": 0.42,
        "stdErr": 0.12,
        "tStat": 3.5,
        "pValue": 0.0007,
        "vif": 1.32,
        "sig": "***"
      },
      {
        "name": "HML (Değer Primi)",
        "beta": 0.25,
        "stdErr": 0.12,
        "tStat": 2.08,
        "pValue": 0.04,
        "vif": 1.2,
        "sig": "*"
      },
      {
        "name": "MOM (Momentum Primi)",
        "beta": 0.35,
        "stdErr": 0.12,
        "tStat": 2.92,
        "pValue": 0.0044,
        "vif": 1.15,
        "sig": "**"
      },
      {
        "name": "USD/TRY (Döviz Kuru)",
        "beta": 0.22,
        "stdErr": 0.11,
        "tStat": 2.0,
        "pValue": 0.048,
        "vif": 1.28,
        "sig": "*"
      },
      {
        "name": "FAİZ (Tahvil / Repo)",
        "beta": -0.31,
        "stdErr": 0.1,
        "tStat": -3.1,
        "pValue": 0.0026,
        "vif": 1.16,
        "sig": "**"
      }
    ],
    "metrics": {
      "r2": 0.768,
      "adjR2": 0.751,
      "fStat": 37.9,
      "fPValue": "< 0.0001",
      "durbinWatson": 1.91,
      "residualStd": 0.052
    },
    "attribution": [
      {
        "factor": "Piyasa Riski (MKT)",
        "pct": 42.0,
        "color": "#06b6d4"
      },
      {
        "factor": "Büyüklük Primi (SMB)",
        "pct": 17.0,
        "color": "#6366f1"
      },
      {
        "factor": "Momentum (MOM)",
        "pct": 11.0,
        "color": "#f59e0b"
      },
      {
        "factor": "Kur Riski (USD/TRY)",
        "pct": 9.0,
        "color": "#10b981"
      },
      {
        "factor": "Faiz Duyarlılığı (IR)",
        "pct": 8.0,
        "color": "#ec4899"
      },
      {
        "factor": "İdiyosenkratik (Artık)",
        "pct": 13.0,
        "color": "#71717a"
      }
    ]
  }
},
    stressScenarios: [
  {
    "id": "fx_shock",
    "name": "2024 Kur Şoku & Enflasyon Zirvesi",
    "badge": "DÖVİZ & ENFLASYON",
    "desc": "USD/TRY kurunda ani %35 sıçrama, maliyetlerde %25 artış ve politika faizinde +750 baz puan artış.",
    "fxShock": 35,
    "costShock": 25,
    "rateShock": 750,
    "revShock": -5,
    "betaDrop": -15
  },
  {
    "id": "global_recession",
    "name": "Küresel Resesyon & Emtia Çöküşü",
    "badge": "TALEP DARALMASI",
    "desc": "Brent petrolde %40 düşüş, dış talepte daralma, BIST genelinde %30 düşüş ve ciroda %20 kayıp.",
    "fxShock": 10,
    "costShock": -10,
    "rateShock": 200,
    "revShock": -20,
    "betaDrop": -30
  },
  {
    "id": "stagflation",
    "name": "Stagflasyon Şoku (Maliyet Enflasyonu + Durgunluk)",
    "badge": "STAGFLASYON",
    "desc": "Girdi maliyetlerinde %30 artış, faizlerde +500 bps sıkılaşma ve reel talepte %15 daralma.",
    "fxShock": 20,
    "costShock": 30,
    "rateShock": 500,
    "revShock": -15,
    "betaDrop": -20
  },
  {
    "id": "rate_hike",
    "name": "TCMB Şahin Sıkılaşma & Kredi Daralması",
    "badge": "LİKİDİTE DARALMASI",
    "desc": "Politika faizinde +1200 bps şok, borçlanma maliyetlerinde sıçrama ve işletme sermayesi baskısı.",
    "fxShock": -5,
    "costShock": 10,
    "rateShock": 1200,
    "revShock": -8,
    "betaDrop": -10
  }
],
    // Backward compatibility for overview
    assets: [
  {
    "period": "2023/12",
    "currentAssets": 253043000000.0,
    "fixedAssets": 797048000000.0,
    "totalAssets": 1050091000000.0,
    "shortTermLiab": 267956000000.0,
    "longTermLiab": 325023000000.0,
    "totalLiab": 592979000000.0,
    "equity": 457112000000.0,
    "revenue": 504398000000.0,
    "costOfSales": -384952000000.0,
    "grossProfit": 119446000000.0,
    "operatingProfit": 71425000000.0,
    "ebitda": 89281250000.0,
    "netIncome": 162998000000.0,
    "currentRatio": 0.94,
    "acidTest": 0.68,
    "debtToEquity": 1.3,
    "leverage": 56.5,
    "netMargin": 32.3,
    "grossMargin": 23.7,
    "roe": 35.7,
    "roa": 15.5,
    "marketCap": 434010000000.0,
    "pe": 2.66,
    "pb": 0.95,
    "evEbitda": 10.37,
    "eps": 118.11
  },
  {
    "period": "2024/12",
    "currentAssets": 341910000000.0,
    "fixedAssets": 1057696000000.0,
    "totalAssets": 1399606000000.0,
    "shortTermLiab": 339533000000.0,
    "longTermLiab": 380061000000.0,
    "totalLiab": 719594000000.0,
    "equity": 680012000000.0,
    "revenue": 745430000000.0,
    "costOfSales": -602522000000.0,
    "grossProfit": 142908000000.0,
    "operatingProfit": 80393000000.0,
    "ebitda": 100491250000.0,
    "netIncome": 113357000000.0,
    "currentRatio": 1.01,
    "acidTest": 0.73,
    "debtToEquity": 1.06,
    "leverage": 51.4,
    "netMargin": 15.2,
    "grossMargin": 19.2,
    "roe": 16.7,
    "roa": 8.1,
    "marketCap": 434010000000.0,
    "pe": 3.83,
    "pb": 0.64,
    "evEbitda": 10.12,
    "eps": 82.14
  },
  {
    "period": "2025/12",
    "currentAssets": 436412000000.0,
    "fixedAssets": 1560333000000.0,
    "totalAssets": 1996745000000.0,
    "shortTermLiab": 442076000000.0,
    "longTermLiab": 643413000000.0,
    "totalLiab": 1085489000000.0,
    "equity": 911256000000.0,
    "revenue": 955472000000.0,
    "costOfSales": -799912000000.0,
    "grossProfit": 155560000000.0,
    "operatingProfit": 90129000000.0,
    "ebitda": 112661250000.0,
    "netIncome": 118117000000.0,
    "currentRatio": 0.99,
    "acidTest": 0.71,
    "debtToEquity": 1.19,
    "leverage": 54.4,
    "netMargin": 12.4,
    "grossMargin": 16.3,
    "roe": 13.0,
    "roa": 5.9,
    "marketCap": 434010000000.0,
    "pe": 3.67,
    "pb": 0.48,
    "evEbitda": 11.94,
    "eps": 85.59
  },
  {
    "period": "2026/06",
    "currentAssets": 512191000000.0,
    "fixedAssets": 1847846000000.0,
    "totalAssets": 2360037000000.0,
    "shortTermLiab": 566751000000.0,
    "longTermLiab": 774833000000.0,
    "totalLiab": 1341584000000.0,
    "equity": 1018453000000.0,
    "revenue": 585069000000.0,
    "costOfSales": -542482000000.0,
    "grossProfit": 42587000000.0,
    "operatingProfit": -5098000000.0,
    "ebitda": 25334100000.0,
    "netIncome": 18766000000.0,
    "currentRatio": 0.9,
    "acidTest": 0.65,
    "debtToEquity": 1.32,
    "leverage": 56.8,
    "netMargin": 3.2,
    "grossMargin": 7.3,
    "roe": 1.8,
    "roa": 0.8,
    "marketCap": 434010000000.0,
    "pe": 23.13,
    "pb": 0.43,
    "evEbitda": 62.0,
    "eps": 13.6
  }
],
    baseNetIncome: 18766000000.0,
    baseEquity: 1018453000000.0,
    baseTotalAssets: 2360037000000.0,
    baseEbitda: 25334100000.0,
    getActiveCompany: function() {
        if (!this.companies[this.activeTicker]) {
            this.companies[this.activeTicker] = window.generateGenericCompanyData(this.activeTicker);
        }
        return this.companies[this.activeTicker];
    },
    setActiveTicker: function(ticker) {
        if (!ticker) return false;
        const t = String(ticker).toUpperCase();
        if (!this.companies[t]) {
            this.companies[t] = window.generateGenericCompanyData(t);
        }
        this.activeTicker = t;
        const company = this.companies[t];
        this.assets = company.statements || company.data;
        const latest = this.assets[0];
        if (latest) {
            this.baseNetIncome = latest.net_kar || latest.netIncome;
            this.baseEquity = latest.ozkaynaklar || latest.equity;
            this.baseTotalAssets = latest.toplam_varliklar || latest.totalAssets;
            this.baseEbitda = latest.favok || latest.ebitda;
        }
        return true;
    },
    calculateScores: function(company) {
        if (!company) {
            return null;
        }
        const norm = (company.statements && company.statements.length > 0) ? company : normalizeCompanyData(company);
        const data = norm ? (norm.statements || norm.data) : null;
        if (!data || data.length === 0) {
            return null;
        }
        // STRICT RULE: data[0] is the latest quarter, data[1] is the previous quarter
        const latest = data[0];
        const prev = data.length > 1 ? data[1] : latest;

        // Current period metrics
        const ca_t = latest.currentAssets || latest.donen_varliklar || 0;
        const fa_t = latest.fixedAssets || latest.duran_varliklar || 0;
        const ta_t = latest.totalAssets || latest.toplam_varliklar || (ca_t + fa_t) || 1;
        const stl_t = latest.shortTermLiab || latest.kisa_vadeli_yuk || 0;
        const ltl_t = latest.longTermLiab || latest.uzun_vadeli_yuk || 0;
        const totalLiab_t = latest.totalLiab || (stl_t + ltl_t);
        const eq_t = latest.equity || latest.ozkaynaklar || 0;
        const rev_t = latest.revenue || latest.net_satislar || 0;
        const gp_t = latest.grossProfit || latest.brut_kar || (rev_t * 0.25);
        const ebitda_t = latest.ebitda || latest.favok || (latest.netIncome * 1.25) || 0;
        const ni_t = latest.netIncome || latest.net_kar || 0;

        // Previous period metrics
        const ca_p = prev.currentAssets || prev.donen_varliklar || 0;
        const fa_p = prev.fixedAssets || prev.duran_varliklar || 0;
        const ta_p = prev.totalAssets || prev.toplam_varliklar || (ca_p + fa_p) || 1;
        const stl_p = prev.shortTermLiab || prev.kisa_vadeli_yuk || 0;
        const ltl_p = prev.longTermLiab || prev.uzun_vadeli_yuk || 0;
        const rev_p = prev.revenue || prev.net_satislar || 0;
        const gp_p = prev.grossProfit || prev.brut_kar || (rev_p * 0.25);
        const ni_p = prev.netIncome || prev.net_kar || 0;

        // --- Piotroski F-Score (9 Kriter) ---
        // 1. Kârlılık (4 Kriter)
        const roa_t = ta_t > 0 ? (ni_t / ta_t) : 0;
        const roa_p = ta_p > 0 ? (ni_p / ta_p) : 0;
        const cfo_t = ebitda_t > 0 ? (ebitda_t * 0.95) : (ni_t * 1.15);

        const crit1 = ni_t > 0;
        const crit2 = cfo_t > 0;
        const crit3 = prev !== latest ? (roa_t >= roa_p) : (roa_t > 0);
        const crit4 = cfo_t > ni_t;
        const profScore = (crit1 ? 1 : 0) + (crit2 ? 1 : 0) + (crit3 ? 1 : 0) + (crit4 ? 1 : 0);

        // 2. Kaldıraç & Likidite (3 Kriter)
        const lev_t = ta_t > 0 ? (ltl_t / ta_t) : 0;
        const lev_p = ta_p > 0 ? (ltl_p / ta_p) : 0;
        const cr_t = stl_t > 0 ? (ca_t / stl_t) : 0;
        const cr_p = stl_p > 0 ? (ca_p / stl_p) : 0;

        const crit5 = prev !== latest ? (lev_t <= lev_p) : (lev_t < 0.45);
        const crit6 = prev !== latest ? (cr_t >= cr_p) : (cr_t >= 1.0);
        const crit7 = true; // No dilution
        const levScore = (crit5 ? 1 : 0) + (crit6 ? 1 : 0) + (crit7 ? 1 : 0);

        // 3. Operasyonel Verimlilik (2 Kriter)
        const gm_t = rev_t > 0 ? (gp_t / rev_t) : 0;
        const gm_p = prev !== latest ? (gp_p / rev_p) : 0;
        const at_t = ta_t > 0 ? (rev_t / ta_t) : 0;
        const at_p = ta_p > 0 ? (rev_p / ta_p) : 0;

        const crit8 = prev !== latest ? (gm_t >= gm_p) : (gm_t > 0.15);
        const crit9 = prev !== latest ? (at_t >= at_p) : (at_t > 0.30);
        const effScore = (crit8 ? 1 : 0) + (crit9 ? 1 : 0);

        const totalPiotroski = profScore + levScore + effScore;

        let verdict = "Sağlıklı / Dengeli Bilanço";
        let badgeColor = "cyan";
        if (totalPiotroski >= 8) {
            verdict = "Mükemmel Finansal Sağlık";
            badgeColor = "emerald";
        } else if (totalPiotroski < 5) {
            verdict = "Zayıf / Bozulma Riski";
            badgeColor = "rose";
        }

        // --- Altman Z''-Score (Emerging Markets) ---
        // Z'' = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4
        const nwc = ca_t - stl_t;
        const x1 = nwc / ta_t;
        const x2 = eq_t / ta_t;
        const x3 = ebitda_t / ta_t;
        const x4 = totalLiab_t > 0 ? (eq_t / totalLiab_t) : 1.0;

        const zScore = +(6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4).toFixed(2);

        let zone = "Safe";
        let zoneTr = "GÜVENLİ BÖLGE";
        let desc = "İflas ve temerrüt riski son derece düşüktür. Güçlü bilanço tamponu.";
        let zColor = "emerald";
        let gaugePct = Math.min(96, Math.max(8, (zScore / 5.0) * 100));

        if (zScore < 1.10) {
            zone = "Distress";
            zoneTr = "RİSKLİ / İFLAS BÖLGESİ";
            desc = "Yüksek borçluluk ve yetersiz işletme sermayesi. Temerrüt riski mevcuttur.";
            zColor = "rose";
        } else if (zScore <= 2.60) {
            zone = "Grey";
            zoneTr = "GRİ BÖLGE (DİKKAT)";
            desc = "Orta seviye finansal stres. Borçlanma ve likidite yakından izlenmeli.";
            zColor = "amber";
        }

        return {
            piotroski_f: {
                score: totalPiotroski,
                max_score: 9,
                percentage: Math.round((totalPiotroski / 9) * 100),
                verdict: verdict,
                badge_color: badgeColor,
                categories: {
                    profitability: {
                        name: "Kârlılık Kriterleri",
                        score: profScore,
                        max: 4,
                        items: [
                            { name: "Net Kâr Pozitif", passed: crit1, value: `₺${(ni_t / 1e9).toFixed(1)} Mrd` },
                            { name: "Faaliyet Nakit Akışı Pozitif (CFO > 0)", passed: crit2, value: `₺${(cfo_t / 1e9).toFixed(1)} Mrd` },
                            { name: "Aktif Kârlılığı Artışı (ΔROA > 0)", passed: crit3, value: `%${(roa_t * 100).toFixed(1)}` },
                            { name: "Kâr Kalitesi (CFO > Net Kâr)", passed: crit4, value: "CFO > Kâr" }
                        ]
                    },
                    leverage: {
                        name: "Kaldıraç & Likidite",
                        score: levScore,
                        max: 3,
                        items: [
                            { name: "Uzun Vadeli Kaldıraç Azalışı (ΔKaldıraç ≤ 0)", passed: crit5, value: `%${(lev_t * 100).toFixed(1)}` },
                            { name: "Cari Oran İyileşmesi (ΔCari Oran ≥ 0)", passed: crit6, value: `${cr_t.toFixed(2)}x` },
                            { name: "Hisse Seyrelmesi Yok (Sermaye İhracı)", passed: crit7, value: "0 Dilution" }
                        ]
                    },
                    efficiency: {
                        name: "Operasyonel Verimlilik",
                        score: effScore,
                        max: 2,
                        items: [
                            { name: "Brüt Kâr Marjı Artışı (ΔBrüt Marj ≥ 0)", passed: crit8, value: `%${(gm_t * 100).toFixed(1)}` },
                            { name: "Aktif Devir Hızı Artışı (ΔDevir Hızı ≥ 0)", passed: crit9, value: `${at_t.toFixed(2)}x` }
                        ]
                    }
                }
            },
            altman_z: {
                z_score: zScore,
                zone: zone,
                zone_tr: zoneTr,
                description: desc,
                color: zColor,
                gauge_pct: Math.round(gaugePct),
                components: {
                    x1_net_working_capital: +x1.toFixed(3),
                    x2_retained_earnings: +x2.toFixed(3),
                    x3_ebit_to_assets: +x3.toFixed(3),
                    x4_equity_to_liabilities: +x4.toFixed(3)
                }
            }
        };
    }
};

// AUTO-NORMALIZE ALL PRELOADED COMPANIES AT STARTUP:
// Guarantees all companies have strictly descending periods and standardized contract
(function initNormalizePreloadedCompanies() {
    if (window.QuantData && window.QuantData.companies) {
        for (const [ticker, comp] of Object.entries(window.QuantData.companies)) {
            window.QuantData.companies[ticker] = normalizeCompanyData(comp);
        }
        // Set initial assets from activeTicker (now descending!)
        const activeComp = window.QuantData.getActiveCompany();
        if (activeComp && activeComp.statements) {
            window.QuantData.assets = activeComp.statements;
            const latest = activeComp.statements[0];
            if (latest) {
                window.QuantData.baseNetIncome = latest.net_kar || latest.netIncome;
                window.QuantData.baseEquity = latest.ozkaynaklar || latest.equity;
                window.QuantData.baseTotalAssets = latest.toplam_varliklar || latest.totalAssets;
                window.QuantData.baseEbitda = latest.favok || latest.ebitda;
            }
        }
    }
})();

