"""
QuantFlux Machine Learning Sector Clustering & Financial Peer Engine (v3.2)
Uses RobustScaler & K-Means (k=4) on BIST balance sheet metrics:
- ROE (%)
- Satış Büyümesi (Revenue Growth YoY %)
- Borç / Özkaynak (Debt to Equity)
- F/K (Price to Earnings)
- Cari Oran (Current Ratio)

Provides Scatter Plot and Radar Chart representations for peer comparison and risk monitoring.
"""

from typing import List, Dict, Any, Optional, Tuple
import math

# Try importing scikit-learn; provide resilient pure-Python fallback if unavailable
try:
    from sklearn.preprocessing import RobustScaler as SklearnRobustScaler
    from sklearn.cluster import KMeans as SklearnKMeans
    import numpy as np
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


# ==============================================================================
# BIST PEER UNIVERSE FINANCIAL METRIC PROFILES
# ==============================================================================
BIST_UNIVERSE: List[Dict[str, Any]] = [
    # Havacılık / Ulaştırma
    {
        "ticker": "THYAO",
        "name": "Türk Hava Yolları A.O.",
        "sector": "Havacılık / Ulaştırma",
        "bist": "BIST 30",
        "market_cap": 434.0,  # TL Milyar
        "price": 314.50,
        "roe": 35.7,
        "revenue_growth": 47.8,
        "debt_to_equity": 1.30,
        "pe": 2.66,
        "current_ratio": 0.94
    },
    {
        "ticker": "PGSUS",
        "name": "Pegasus Hava Taşımacılığı A.Ş.",
        "sector": "Havacılık / Ulaştırma",
        "bist": "BIST 30",
        "market_cap": 252.0,
        "price": 246.00,
        "roe": 28.4,
        "revenue_growth": 52.1,
        "debt_to_equity": 1.85,
        "pe": 5.40,
        "current_ratio": 0.88
    },
    {
        "ticker": "TAVHL",
        "name": "TAV Havalimanları Holding A.Ş.",
        "sector": "Havacılık / Ulaştırma",
        "bist": "BIST 30",
        "market_cap": 98.5,
        "price": 271.00,
        "roe": 18.2,
        "revenue_growth": 34.6,
        "debt_to_equity": 1.95,
        "pe": 8.80,
        "current_ratio": 1.15
    },

    # Holding / Yatırım
    {
        "ticker": "KCHOL",
        "name": "Koç Holding A.Ş.",
        "sector": "Holding / Yatırım",
        "bist": "BIST 30",
        "market_cap": 492.0,
        "price": 194.00,
        "roe": 19.5,
        "revenue_growth": 36.2,
        "debt_to_equity": 0.72,
        "pe": 4.18,
        "current_ratio": 1.45
    },
    {
        "ticker": "SAHOL",
        "name": "Sabancı Holding A.Ş.",
        "sector": "Holding / Yatırım",
        "bist": "BIST 30",
        "market_cap": 204.0,
        "price": 99.80,
        "roe": 17.8,
        "revenue_growth": 28.5,
        "debt_to_equity": 0.58,
        "pe": 3.75,
        "current_ratio": 1.52
    },
    {
        "ticker": "AGHOL",
        "name": "AG Anadolu Grubu Holding A.Ş.",
        "sector": "Holding / İçecek & Perakende",
        "bist": "BIST 30",
        "market_cap": 84.5,
        "price": 348.00,
        "roe": 22.4,
        "revenue_growth": 38.9,
        "debt_to_equity": 1.15,
        "pe": 5.10,
        "current_ratio": 1.22
    },
    {
        "ticker": "BERA",
        "name": "Bera Holding A.Ş.",
        "sector": "İmalat / Çeşitlendirilmiş",
        "bist": "BIST 100",
        "market_cap": 14.9,
        "price": 21.80,
        "roe": 4.5,
        "revenue_growth": 14.8,
        "debt_to_equity": 0.30,
        "pe": 12.86,
        "current_ratio": 2.50
    },

    # Perakende / Tüketim
    {
        "ticker": "BIMAS",
        "name": "BİM Birleşik Mağazalar A.Ş.",
        "sector": "Perakende Ticaret",
        "bist": "BIST 30",
        "market_cap": 312.0,
        "price": 514.00,
        "roe": 38.6,
        "revenue_growth": 54.2,
        "debt_to_equity": 0.95,
        "pe": 11.20,
        "current_ratio": 0.85
    },
    {
        "ticker": "MGROS",
        "name": "Migros Ticaret A.Ş.",
        "sector": "Perakende Ticaret",
        "bist": "BIST 30",
        "market_cap": 96.0,
        "price": 530.00,
        "roe": 34.1,
        "revenue_growth": 48.0,
        "debt_to_equity": 1.10,
        "pe": 8.90,
        "current_ratio": 0.92
    },

    # Otomotiv / İmalat
    {
        "ticker": "FROTO",
        "name": "Ford Otomotiv Sanayi A.Ş.",
        "sector": "Otomotiv",
        "bist": "BIST 30",
        "market_cap": 378.0,
        "price": 1078.00,
        "roe": 44.5,
        "revenue_growth": 42.0,
        "debt_to_equity": 1.65,
        "pe": 7.45,
        "current_ratio": 1.08
    },
    {
        "ticker": "TOASO",
        "name": "Tofaş Türk Otomobil Fabrikası A.Ş.",
        "sector": "Otomotiv",
        "bist": "BIST 30",
        "market_cap": 124.0,
        "price": 248.00,
        "roe": 29.8,
        "revenue_growth": 22.4,
        "debt_to_equity": 0.84,
        "pe": 6.80,
        "current_ratio": 1.35
    },

    # Demir Çelik / Sanayi
    {
        "ticker": "EREGL",
        "name": "Ereğli Demir ve Çelik Fabrikaları T.A.Ş.",
        "sector": "Demir Çelik",
        "bist": "BIST 30",
        "market_cap": 182.0,
        "price": 52.00,
        "roe": 8.2,
        "revenue_growth": 12.4,
        "debt_to_equity": 0.48,
        "pe": 14.50,
        "current_ratio": 2.15
    },
    {
        "ticker": "KRDMD",
        "name": "Kardemir Karabük Demir Çelik A.Ş.",
        "sector": "Demir Çelik",
        "bist": "BIST 30",
        "market_cap": 28.5,
        "price": 25.40,
        "roe": 6.4,
        "revenue_growth": 9.8,
        "debt_to_equity": 0.52,
        "pe": 16.20,
        "current_ratio": 1.95
    },
    {
        "ticker": "SISE",
        "name": "Türkiye Şişe ve Cam Fabrikaları A.Ş.",
        "sector": "Cam & Kimya",
        "bist": "BIST 30",
        "market_cap": 142.0,
        "price": 46.50,
        "roe": 12.5,
        "revenue_growth": 21.0,
        "debt_to_equity": 0.92,
        "pe": 9.15,
        "current_ratio": 1.62
    },

    # Telekomünikasyon
    {
        "ticker": "TCELL",
        "name": "Turkcell İletişim Hizmetleri A.Ş.",
        "sector": "Telekomünikasyon",
        "bist": "BIST 30",
        "market_cap": 218.0,
        "price": 99.10,
        "roe": 26.2,
        "revenue_growth": 39.5,
        "debt_to_equity": 1.25,
        "pe": 8.10,
        "current_ratio": 1.28
    },
    {
        "ticker": "TTKOM",
        "name": "Türk Telekomünikasyon A.Ş.",
        "sector": "Telekomünikasyon",
        "bist": "BIST 30",
        "market_cap": 185.0,
        "price": 52.80,
        "roe": 21.0,
        "revenue_growth": 35.2,
        "debt_to_equity": 1.48,
        "pe": 9.40,
        "current_ratio": 0.95
    },

    # Enerji / Petrol
    {
        "ticker": "TUPRS",
        "name": "Türkiye Petrol Rafinerileri A.Ş.",
        "sector": "Enerji / Petrol",
        "bist": "BIST 30",
        "market_cap": 318.0,
        "price": 165.20,
        "roe": 31.4,
        "revenue_growth": 24.5,
        "debt_to_equity": 0.65,
        "pe": 4.60,
        "current_ratio": 1.38
    },
    {
        "ticker": "PETKM",
        "name": "Petkim Petrokimya Holding A.Ş.",
        "sector": "Enerji / Petrokimya",
        "bist": "BIST 30",
        "market_cap": 52.0,
        "price": 20.50,
        "roe": 3.8,
        "revenue_growth": 8.5,
        "debt_to_equity": 2.45,
        "pe": 28.50,
        "current_ratio": 0.82
    },

    # Savunma / Teknoloji / Taahhüt
    {
        "ticker": "ASELS",
        "name": "Aselsan Elektronik Sanayi A.Ş.",
        "sector": "Savunma Sanayi",
        "bist": "BIST 30",
        "market_cap": 298.0,
        "price": 65.40,
        "roe": 25.1,
        "revenue_growth": 45.0,
        "debt_to_equity": 0.88,
        "pe": 10.50,
        "current_ratio": 1.75
    },
    {
        "ticker": "ARCLK",
        "name": "Arçelik A.Ş.",
        "sector": "Dayanıklı Tüketim",
        "bist": "BIST 30",
        "market_cap": 112.0,
        "price": 165.80,
        "roe": 7.2,
        "revenue_growth": 29.0,
        "debt_to_equity": 2.65,
        "pe": 22.00,
        "current_ratio": 0.91
    },
    {
        "ticker": "ENKAI",
        "name": "Enka İnşaat ve Sanayi A.Ş.",
        "sector": "İnşaat / Mühendislik",
        "bist": "BIST 30",
        "market_cap": 282.0,
        "price": 47.00,
        "roe": 11.5,
        "revenue_growth": 16.0,
        "debt_to_equity": 0.18,
        "pe": 8.20,
        "current_ratio": 3.40
    }
]


# ==============================================================================
# PURE PYTHON ROBUST SCALER & K-MEANS FALLBACK IMPLEMENTATION
# ==============================================================================
def _calculate_median(values: List[float]) -> float:
    s = sorted(values)
    n = len(s)
    if n == 0:
        return 0.0
    mid = n // 2
    if n % 2 == 1:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2.0


def _calculate_iqr(values: List[float]) -> float:
    s = sorted(values)
    n = len(s)
    if n < 4:
        return max(values) - min(values) or 1.0
    q1 = s[int(n * 0.25)]
    q3 = s[int(n * 0.75)]
    iqr = q3 - q1
    return iqr if iqr > 1e-6 else 1.0


def pure_robust_scale(matrix: List[List[float]]) -> List[List[float]]:
    """
    Standard RobustScaler: (x - median) / IQR across each feature column.
    """
    n_rows = len(matrix)
    n_cols = len(matrix[0]) if n_rows > 0 else 0
    scaled = [[0.0] * n_cols for _ in range(n_rows)]

    for c in range(n_cols):
        col_vals = [matrix[r][c] for r in range(n_rows)]
        med = _calculate_median(col_vals)
        iqr = _calculate_iqr(col_vals)
        for r in range(n_rows):
            scaled[r][c] = (matrix[r][c] - med) / iqr
    return scaled


def pure_kmeans(matrix: List[List[float]], k: int = 4, max_iter: int = 50) -> List[int]:
    """
    Lloyd's algorithm for k-means clustering with deterministic initial seeds.
    """
    n = len(matrix)
    if n <= k:
        return list(range(n))

    # Deterministic seed indices across the dataset
    step = max(1, n // k)
    centroids = [list(matrix[i * step]) for i in range(k)]
    labels = [0] * n

    for _ in range(max_iter):
        # Assign step
        new_labels = []
        for row in matrix:
            dists = [sum((a - b) ** 2 for a, b in zip(row, c)) for c in centroids]
            new_labels.append(dists.index(min(dists)))

        if new_labels == labels:
            break
        labels = new_labels

        # Update step
        for ci in range(k):
            members = [matrix[i] for i in range(n) if labels[i] == ci]
            if members:
                for c_dim in range(len(centroids[ci])):
                    centroids[ci][c_dim] = sum(m[c_dim] for m in members) / len(members)

    return labels


# ==============================================================================
# FINANCIAL CLUSTER ENGINE
# ==============================================================================
class FinancialClusterEngine:
    """
    Scikit-learn RobustScaler + KMeans 4-Kümeleyici Finansal Analiz Motoru.
    """

    FEATURE_KEYS = ["roe", "revenue_growth", "debt_to_equity", "pe", "current_ratio"]
    FEATURE_NAMES_TR = ["ROE (%)", "Satış Büyümesi (%)", "Borç / Özsermaye", "F/K", "Cari Oran"]

    CLUSTER_DEFINITIONS = {
        "growth": {
            "id": 0,
            "key": "growth",
            "name": "Yüksek Kârlı / Güçlü Büyüme",
            "badge": "Büyüme & Kârlılık Lideri",
            "color": "#10B981",  # Emerald
            "badge_class": "badge-live-green",
            "description": "Yüksek özkaynak kârlılığı (ROE > %25) ve çift haneli ciro büyümesine sahip, sermaye getirisi güçlü lider şirketler.",
            "risk_profile": "Düşük - Orta (Operasyonel Nakit Akışı Güçlü)",
            "strategy": "Uzun Vadeli Büyüme & Momentum"
        },
        "value": {
            "id": 1,
            "key": "value",
            "name": "Kelepir Değer / Fırsat",
            "badge": "İskontolu Değer",
            "color": "#00F2FE",  # Cyan
            "badge_class": "badge-live-cyan",
            "description": "Düşük F/K çarpanı (F/K < 6x) ve sağlam bilanço tamponuyla tarihsel ortalamalarına göre iskontolu işlem gören şirketler.",
            "risk_profile": "Düşük (Değerleme Güvenlik Marjı Yüksek)",
            "strategy": "Kelepir Değer Yatırımı (Deep Value)"
        },
        "distress": {
            "id": 2,
            "key": "distress",
            "name": "Aşırı Kaldıraçlı / Riskli",
            "badge": "Yüksek Borç / Risk",
            "color": "#F43F5E",  # Rose
            "badge_class": "badge-live-red",
            "description": "Yüksek Borç/Özsermaye oranı ve 1.0 altı cari oran nedeniyle faiz gideri ve refinansman stresi taşıyan şirketler.",
            "risk_profile": "Yüksek (Likidite & Borç Servis Riski)",
            "strategy": "Yakın İzleme / Hedging Gerekli"
        },
        "defensive": {
            "id": 3,
            "key": "defensive",
            "name": "Durgun / Defansif Düşük Verim",
            "badge": "Defansif / Yatay",
            "color": "#F59E0B",  # Amber
            "badge_class": "badge-live-amber",
            "description": "Düşük satış büyümesi ve sınırlı ROE üreten; yüksek nakit taşısa dahi kârlılık ivmesi yatay seyreden defansif şirketler.",
            "risk_profile": "Orta (Düşük Büyüme, Enflasyona Karşı Hassas)",
            "strategy": "Temettü & Koruma Odaklı"
        }
    }

    @classmethod
    def execute_clustering(cls, universe: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """
        Runs RobustScaler + KMeans (k=4) on universe, mapping each company to one of 4 clusters.
        """
        companies = universe or BIST_UNIVERSE
        n = len(companies)
        if n == 0:
            return []

        # 1. Feature Matrix (n x 5)
        raw_features = [
            [
                float(c["roe"]),
                float(c["revenue_growth"]),
                float(c["debt_to_equity"]),
                float(c["pe"]),
                float(c["current_ratio"])
            ]
            for c in companies
        ]

        # 2. RobustScaler & KMeans
        if SKLEARN_AVAILABLE:
            try:
                scaler = SklearnRobustScaler()
                scaled_features = scaler.fit_transform(raw_features)
                kmeans = SklearnKMeans(n_clusters=4, random_state=42, n_init=10)
                raw_labels = kmeans.fit_predict(scaled_features).tolist()
            except Exception:
                scaled_features = pure_robust_scale(raw_features)
                raw_labels = pure_kmeans(scaled_features, k=4)
        else:
            scaled_features = pure_robust_scale(raw_features)
            raw_labels = pure_kmeans(scaled_features, k=4)

        # 3. Label Mapping: Map raw cluster numbers to meaningful financial personas
        # We classify clusters by inspecting their average (ROE, Growth, D/E, P/E):
        cluster_averages: Dict[int, Dict[str, float]] = {}
        for ci in range(4):
            members = [companies[i] for i in range(n) if raw_labels[i] == ci]
            if members:
                cluster_averages[ci] = {
                    "roe": sum(m["roe"] for m in members) / len(members),
                    "growth": sum(m["revenue_growth"] for m in members) / len(members),
                    "debt": sum(m["debt_to_equity"] for m in members) / len(members),
                    "pe": sum(m["pe"] for m in members) / len(members),
                    "cr": sum(m["current_ratio"] for m in members) / len(members),
                }
            else:
                cluster_averages[ci] = {"roe": 0, "growth": 0, "debt": 0, "pe": 0, "cr": 0}

        # Determine cluster roles:
        # Highest (ROE + Growth) -> Growth
        # Highest Debt / Low CR -> Distress
        # Lowest P/E with decent ROE -> Value
        # Remaining -> Defensive
        sorted_by_growth = sorted(cluster_averages.keys(), key=lambda ci: cluster_averages[ci]["roe"] + cluster_averages[ci]["growth"], reverse=True)
        growth_cluster = sorted_by_growth[0]

        remaining = [c for c in range(4) if c != growth_cluster]
        sorted_by_debt = sorted(remaining, key=lambda ci: cluster_averages[ci]["debt"], reverse=True)
        distress_cluster = sorted_by_debt[0]

        remaining = [c for c in remaining if c != distress_cluster]
        sorted_by_pe = sorted(remaining, key=lambda ci: cluster_averages[ci]["pe"])
        value_cluster = sorted_by_pe[0]

        defensive_cluster = [c for c in remaining if c != value_cluster][0]

        cluster_map = {
            growth_cluster: cls.CLUSTER_DEFINITIONS["growth"],
            value_cluster: cls.CLUSTER_DEFINITIONS["value"],
            distress_cluster: cls.CLUSTER_DEFINITIONS["distress"],
            defensive_cluster: cls.CLUSTER_DEFINITIONS["defensive"],
        }

        # 4. Attach cluster data to each company
        enriched_companies = []
        for i, c in enumerate(companies):
            c_copy = dict(c)
            cl_info = cluster_map.get(raw_labels[i], cls.CLUSTER_DEFINITIONS["growth"])
            c_copy["cluster_id"] = cl_info["id"]
            c_copy["cluster_key"] = cl_info["key"]
            c_copy["cluster_name"] = cl_info["name"]
            c_copy["cluster_color"] = cl_info["color"]
            c_copy["cluster_badge"] = cl_info["badge"]
            c_copy["scaled_coords"] = [round(scaled_features[i][j], 2) for j in range(5)]
            enriched_companies.append(c_copy)

        return enriched_companies

    @classmethod
    def get_sector_map_and_peers(cls, selected_ticker: str = "THYAO") -> Dict[str, Any]:
        """
        Builds the complete dataset for frontend integration:
        - 4 Clusters summary
        - Scatter Plot format (ROE vs Debt/Equity, bubble size = Market Cap)
        - Radar Chart format (5 axes normalized comparison: Selected vs Sector vs Cluster)
        - Peer group comparison table
        """
        clustered_universe = cls.execute_clustering()

        selected_ticker_clean = selected_ticker.upper()
        selected_company = next(
            (c for c in clustered_universe if c["ticker"] == selected_ticker_clean),
            None
        )
        if not selected_company:
            try:
                from backend.api_server import get_company_data
                c_data = get_company_data(selected_ticker_clean)
                st = c_data['statements'][0] if c_data and 'statements' in c_data and c_data['statements'] else {}
                roe_val = float(st.get('roe', 20.0))
                de_val = float(st.get('debtToEquity', 1.0))
                mcap = float(c_data.get('price', 100.0)) * float(c_data.get('shares', 1000000000)) / 1e9
                cid = 0 if roe_val > 25 else (1 if de_val < 1.0 else (2 if de_val > 2.0 else 3))
                cluster_names = {
                    0: ("Yüksek Kârlı / Güçlü Büyüme", "#10B981"),
                    1: ("Kelepir Değer / Fırsat", "#00F2FE"),
                    2: ("Aşırı Kaldıraçlı / Riskli", "#F43F5E"),
                    3: ("Durgun / Defansif", "#F59E0B")
                }
                cname, ccol = cluster_names.get(cid, ("BIST Genel Kümesi", "#10B981"))
                selected_company = {
                    "ticker": selected_ticker_clean,
                    "name": c_data.get('name', f"{selected_ticker_clean} A.Ş."),
                    "sector": c_data.get('sector', "BIST Genel"),
                    "bist": c_data.get('bist', "BIST 100"),
                    "market_cap": round(mcap, 1),
                    "price": float(c_data.get('price', 100.0)),
                    "roe": roe_val,
                    "revenue_growth": 25.0,
                    "debt_to_equity": de_val,
                    "pe": float(st.get('pe', 6.5)),
                    "current_ratio": float(st.get('currentRatio', 1.2)),
                    "cluster_id": cid,
                    "cluster_name": cname,
                    "cluster_color": ccol
                }
                clustered_universe.insert(0, selected_company)
            except Exception:
                selected_company = clustered_universe[0]

        sector = selected_company["sector"]
        sector_peers = [c for c in clustered_universe if c["sector"] == sector]
        cluster_peers = [c for c in clustered_universe if c["cluster_id"] == selected_company["cluster_id"]]

        # -------------------------------------------------------------
        # 1. SCATTER PLOT DATA (2D: X=ROE %, Y=Borç/Özkaynak, Z=Piyasa Değeri)
        # -------------------------------------------------------------
        scatter_points = []
        for c in clustered_universe:
            is_selected = (c["ticker"] == selected_company["ticker"])
            is_sector_peer = (c["sector"] == sector and not is_selected)

            scatter_points.append({
                "ticker": c["ticker"],
                "name": c["name"],
                "sector": c["sector"],
                "x_roe": c["roe"],
                "y_debt_equity": c["debt_to_equity"],
                "size_market_cap": c["market_cap"],
                "pe": c["pe"],
                "revenue_growth": c["revenue_growth"],
                "current_ratio": c["current_ratio"],
                "cluster_id": c["cluster_id"],
                "cluster_name": c["cluster_name"],
                "cluster_color": c["cluster_color"],
                "is_selected": is_selected,
                "is_sector_peer": is_sector_peer
            })

        # -------------------------------------------------------------
        # 2. RADAR CHART DATA (5 Axes: 0 - 100 Normalized Scores)
        # -------------------------------------------------------------
        # Normalization helper (min-max bounding for fintech radar)
        def norm_val(val: float, min_val: float, max_val: float, invert: bool = False) -> float:
            clamped = max(min_val, min(max_val, val))
            pct = ((clamped - min_val) / (max_val - min_val)) * 100
            return round(100 - pct if invert else pct, 1)

        # Averages
        def avg(lst: List[Dict[str, Any]], key: str) -> float:
            return sum(x[key] for x in lst) / len(lst) if lst else 0.0

        sec_roe = avg(sector_peers, "roe")
        sec_growth = avg(sector_peers, "revenue_growth")
        sec_debt = avg(sector_peers, "debt_to_equity")
        sec_pe = avg(sector_peers, "pe")
        sec_cr = avg(sector_peers, "current_ratio")

        clu_roe = avg(cluster_peers, "roe")
        clu_growth = avg(cluster_peers, "revenue_growth")
        clu_debt = avg(cluster_peers, "debt_to_equity")
        clu_pe = avg(cluster_peers, "pe")
        clu_cr = avg(cluster_peers, "current_ratio")

        radar_axes = [
            {
                "axis": "Kârlılık (ROE)",
                "selected": norm_val(selected_company["roe"], 0, 50),
                "sector_avg": norm_val(sec_roe, 0, 50),
                "cluster_avg": norm_val(clu_roe, 0, 50),
                "unit": "%",
                "raw_selected": f"%{selected_company['roe']:.1f}",
                "raw_sector": f"%{sec_roe:.1f}"
            },
            {
                "axis": "Satış Büyümesi",
                "selected": norm_val(selected_company["revenue_growth"], 0, 60),
                "sector_avg": norm_val(sec_growth, 0, 60),
                "cluster_avg": norm_val(clu_growth, 0, 60),
                "unit": "%",
                "raw_selected": f"%{selected_company['revenue_growth']:.1f}",
                "raw_sector": f"%{sec_growth:.1f}"
            },
            {
                "axis": "Finansal Güç (Ters Kaldıraç)",
                "selected": norm_val(selected_company["debt_to_equity"], 0.2, 3.0, invert=True),
                "sector_avg": norm_val(sec_debt, 0.2, 3.0, invert=True),
                "cluster_avg": norm_val(clu_debt, 0.2, 3.0, invert=True),
                "unit": "x",
                "raw_selected": f"{selected_company['debt_to_equity']:.2f}x",
                "raw_sector": f"{sec_debt:.2f}x"
            },
            {
                "axis": "Değerleme Cazibesi (Ters F/K)",
                "selected": norm_val(selected_company["pe"], 2.0, 30.0, invert=True),
                "sector_avg": norm_val(sec_pe, 2.0, 30.0, invert=True),
                "cluster_avg": norm_val(clu_pe, 2.0, 30.0, invert=True),
                "unit": "x",
                "raw_selected": f"{selected_company['pe']:.2f}x",
                "raw_sector": f"{sec_pe:.2f}x"
            },
            {
                "axis": "Likidite (Cari Oran)",
                "selected": norm_val(selected_company["current_ratio"], 0.7, 2.5),
                "sector_avg": norm_val(sec_cr, 0.7, 2.5),
                "cluster_avg": norm_val(clu_cr, 0.7, 2.5),
                "unit": "x",
                "raw_selected": f"{selected_company['current_ratio']:.2f}x",
                "raw_sector": f"{sec_cr:.2f}x"
            }
        ]

        # -------------------------------------------------------------
        # 3. CLUSTERS OVERVIEW SUMMARY
        # -------------------------------------------------------------
        cluster_summaries = []
        for key, defn in cls.CLUSTER_DEFINITIONS.items():
            members = [c for c in clustered_universe if c["cluster_id"] == defn["id"]]
            cluster_summaries.append({
                "id": defn["id"],
                "name": defn["name"],
                "badge": defn["badge"],
                "color": defn["color"],
                "description": defn["description"],
                "strategy": defn["strategy"],
                "risk_profile": defn["risk_profile"],
                "company_count": len(members),
                "tickers": [m["ticker"] for m in members],
                "avg_roe": round(avg(members, "roe"), 1),
                "avg_growth": round(avg(members, "revenue_growth"), 1),
                "avg_pe": round(avg(members, "pe"), 1),
                "avg_debt": round(avg(members, "debt_to_equity"), 2)
            })

        return {
            "selected_company": selected_company,
            "clusters": cluster_summaries,
            "scatter_plot": {
                "title": "BIST Bilanço Rasyo Kümeleme Haritası (K-Means)",
                "x_axis_title": "Özkaynak Kârlılığı (ROE %)",
                "y_axis_title": "Borç / Özsermaye (D/E)",
                "points": scatter_points
            },
            "radar_chart": {
                "title": f"{selected_company['ticker']} vs Sektör & Küme Karşılaştırması",
                "categories": [a["axis"] for a in radar_axes],
                "selected_series": [a["selected"] for a in radar_axes],
                "sector_series": [a["sector_avg"] for a in radar_axes],
                "cluster_series": [a["cluster_avg"] for a in radar_axes],
                "axes": radar_axes
            },
            "peers": {
                "sector": sector,
                "sector_peers": sector_peers,
                "cluster_peers": cluster_peers[:6]
            }
        }
