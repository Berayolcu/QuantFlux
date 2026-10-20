"""
QuantFlux What-If Stres Testi ve Duyarlılık Simülasyon Motoru (v3.2)
Bilanço Şok Yansıtma Modeli:
- Girdi Parametreleri:
  1. Satış Maliyeti Artışı (% cogs_increase_pct)
  2. Kur Şoku (USD/TRY % fx_shock_pct)
  3. Politika Faizi Değişimi (bps interest_rate_hike_bps)
  4. Talep / Ciro Daralması (% demand_contraction_pct)
- Bilanço İletim Mekanizması:
  1. Talep şoku -> Satış hasılatında daralma
  2. Maliyet şoku + kur şoku ithal girdi payı -> Satış maliyetinde artış
  3. Politika faizi artışı -> Değişken faizli kısa vadeli borç üzerinden finansman gideri artışı
  4. Şirketin yabancı para net pozisyonu -> Kambiyo kâr/zararı
  5. Nihai simüle edilen Brüt Kâr, FAVÖK, Net Kâr, Cari Oran
  6. Kâr erimesini gösteren Şelale (Waterfall) köprüsü veri seti
"""

from typing import Dict, List, Any, Optional
import math


class StressTestingEngine:
    """
    Şirket Bilanço What-If Stres Testi ve Makro Şok Simülatörü.
    """

    # BIST Şirketleri Bilanço ve Maruziyet Profilleri
    COMPANY_PROFILES: Dict[str, Dict[str, Any]] = {
        "THYAO": {
            "name": "Türk Hava Yolları A.O.",
            "sector": "Havacılık / Ulaştırma",
            "base_revenue": 745430000000.0,          # ₺745.4 Mrd
            "base_cost_of_sales": 602522000000.0,    # ₺602.5 Mrd
            "base_ebitda": 142908000000.0,           # ₺142.9 Mrd
            "base_financial_exp": 28400000000.0,     # ₺28.4 Mrd
            "base_net_income": 113357000000.0,       # ₺113.4 Mrd
            "current_assets": 341910000000.0,        # ₺341.9 Mrd
            "short_term_liab": 339533000000.0,       # ₺339.5 Mrd
            "base_current_ratio": 1.01,
            # Maruziyet Parametreleri
            "fx_import_share": 0.42,                 # Maliyetlerin %42'si döviz cinsinden (yakıt, kiralama)
            "net_fx_exposure": 28500000000.0,        # Net Döviz Pozisyonu: +₺28.5 Mrd (Döviz fazlası / Doğal hedge)
            "floating_debt_share": 0.38,             # Kısa vadeli borçların %38'i değişken faizli
            "demand_elasticity": 0.85                 # Talep daralması hasılat esnekliği
        },
        "KCHOL": {
            "name": "Koç Holding A.Ş.",
            "sector": "Holding / Yatırım",
            "base_revenue": 880200000000.0,
            "base_cost_of_sales": 685400000000.0,
            "base_ebitda": 118400000000.0,
            "base_financial_exp": 32100000000.0,
            "base_net_income": 82450000000.0,
            "current_assets": 412500000000.0,
            "short_term_liab": 365200000000.0,
            "base_current_ratio": 1.13,
            "fx_import_share": 0.35,
            "net_fx_exposure": 12400000000.0,        # +₺12.4 Mrd döviz pozisyonu
            "floating_debt_share": 0.32,
            "demand_elasticity": 0.78
        },
        "AGHOL": {
            "name": "AG Anadolu Grubu Holding A.Ş.",
            "sector": "Holding / İçecek & Perakende",
            "base_revenue": 342100000000.0,
            "base_cost_of_sales": 258400000000.0,
            "base_ebitda": 48600000000.0,
            "base_financial_exp": 18500000000.0,
            "base_net_income": 22400000000.0,
            "current_assets": 128400000000.0,
            "short_term_liab": 124500000000.0,
            "base_current_ratio": 1.03,
            "fx_import_share": 0.45,
            "net_fx_exposure": -14800000000.0,       # -₺14.8 Mrd (Döviz açığı / Eurobond riski)
            "floating_debt_share": 0.44,
            "demand_elasticity": 0.82
        },
        "BERA": {
            "name": "Bera Holding A.Ş.",
            "sector": "İmalat / Çeşitlendirilmiş",
            "base_revenue": 18450000000.0,
            "base_cost_of_sales": 13950000000.0,
            "base_ebitda": 2850000000.0,
            "base_financial_exp": 1120000000.0,
            "base_net_income": 1420000000.0,
            "current_assets": 8950000000.0,
            "short_term_liab": 7450000000.0,
            "base_current_ratio": 1.20,
            "fx_import_share": 0.48,
            "net_fx_exposure": -2150000000.0,        # -₺2.15 Mrd döviz açığı
            "floating_debt_share": 0.52,
            "demand_elasticity": 0.90
        }
    }

    # Hazır Ön Tanımlı Makro Şok Senaryoları
    PRESET_SCENARIOS: List[Dict[str, Any]] = [
        {
            "id": "lira_shock",
            "name": "Lira Devalüasyonu & Maliyet Sıçraması",
            "badge": "KUR VE ENFLASYON",
            "description": "USD/TRY kurunda ani %35 sıçrama, hammadde ithalat maliyetlerinde %25 artış ve 400 bps faiz artışı.",
            "cogs_increase_pct": 25.0,
            "fx_shock_pct": 35.0,
            "interest_rate_hike_bps": 400,
            "demand_contraction_pct": 5.0
        },
        {
            "id": "global_recession",
            "name": "Küresel Durgunluk & Talep Çöküşü",
            "badge": "STAGFLASYON",
            "description": "Tüketici talebinde %20 sert daralma, ciro erimesi ve girdi maliyetlerinde %10 artış.",
            "cogs_increase_pct": 10.0,
            "fx_shock_pct": 15.0,
            "interest_rate_hike_bps": 200,
            "demand_contraction_pct": 20.0
        },
        {
            "id": "liquidity_crunch",
            "name": "Aşırı Parasal Sıkılaşma & Kredi Şoku",
            "badge": "FAİZ KRİZİ",
            "description": "Politika faizinde 800 bps sert artış, rotatif kredilerde faiz patlaması ve talepte %12 düşüş.",
            "cogs_increase_pct": 15.0,
            "fx_shock_pct": 20.0,
            "interest_rate_hike_bps": 800,
            "demand_contraction_pct": 12.0
        },
        {
            "id": "black_swan",
            "name": "Siyah Kuğu (Black Swan) Çoklu Kriz",
            "badge": "EKSTREM ŞOK",
            "description": "Kura %50 şok, girdi maliyetlerinde %40 artış, 1000 bps faiz artışı ve %25 talep kaybı.",
            "cogs_increase_pct": 40.0,
            "fx_shock_pct": 50.0,
            "interest_rate_hike_bps": 1000,
            "demand_contraction_pct": 25.0
        }
    ]

    @classmethod
    def simulate_stress_scenario(
        cls,
        ticker: str = "THYAO",
        cogs_increase_pct: float = 0.0,
        fx_shock_pct: float = 0.0,
        interest_rate_hike_bps: float = 0.0,
        demand_contraction_pct: float = 0.0
    ) -> Dict[str, Any]:
        """
        Girdi makro parametreleri doğrultusunda şirketin gelir tablosu
        ve kâr erime şelalesini (Waterfall) simüle eder.
        """
        ticker_clean = ticker.upper()
        prof = cls.COMPANY_PROFILES.get(ticker_clean)
        if not prof:
            try:
                from backend.api_server import get_company_data
                c_data = get_company_data(ticker_clean)
                st = c_data['statements'][0] if c_data and 'statements' in c_data and c_data['statements'] else {}
                rev = float(st.get('net_satislar', 250e9)) or 250e9
                prof = {
                    "name": c_data.get('name', f"{ticker_clean} A.Ş."),
                    "sector": c_data.get('sector', "BIST Genel"),
                    "base_revenue": rev,
                    "base_cost_of_sales": abs(float(st.get('costOfSales', rev * 0.75))) or (rev * 0.75),
                    "base_ebitda": float(st.get('favok', rev * 0.20)) or (rev * 0.20),
                    "base_financial_exp": rev * 0.05,
                    "base_net_income": float(st.get('net_kar', rev * 0.12)) or (rev * 0.12),
                    "current_assets": float(st.get('donen_varliklar', rev * 0.5)) or (rev * 0.5),
                    "short_term_liab": float(st.get('kisa_vadeli_yuk', rev * 0.45)) or (rev * 0.45),
                    "base_current_ratio": float(st.get('currentRatio', 1.1)) or 1.1,
                    "fx_import_share": 0.35,
                    "net_fx_exposure": 5000000000.0,
                    "floating_debt_share": 0.35,
                    "demand_elasticity": 0.85
                }
            except Exception:
                prof = cls.COMPANY_PROFILES["THYAO"]

        base_rev = prof["base_revenue"]
        base_cogs = prof["base_cost_of_sales"]
        base_ebitda = prof["base_ebitda"]
        base_fin = prof["base_financial_exp"]
        base_net = prof["base_net_income"]
        cur_assets = prof["current_assets"]
        st_liab = prof["short_term_liab"]
        base_cr = prof["base_current_ratio"]

        # 1. Talep / Ciro Daralması Şoku
        # demand_contraction_pct pozitif geldikçe ciro azalır
        effective_demand_drop = (demand_contraction_pct / 100.0) * prof["demand_elasticity"]
        demand_impact = base_rev * effective_demand_drop
        stressed_rev = base_rev - demand_impact

        # 2. Satış Maliyeti & İthal Girdi Şoku
        # Maliyet artışı ve kur şokunun ithal girdi payı çarpanı
        fx_cogs_multiplier = (fx_shock_pct / 100.0) * prof["fx_import_share"]
        total_cost_inflation = (cogs_increase_pct / 100.0) + fx_cogs_multiplier
        cogs_impact = base_cogs * total_cost_inflation
        stressed_cogs = base_cogs + cogs_impact

        # 3. Yabancı Para Net Pozisyonu Kur Şoku (Kambiyo Kâr / Zararı)
        # Pozitif net_fx_exposure kur artışında kâr üretir, negatif net_fx_exposure zarar üretir
        fx_gain_loss = prof["net_fx_exposure"] * (fx_shock_pct / 100.0)

        # 4. Politika Faizi Artışı Finansman Gideri Şoku
        # Değişken faizli borç stoku * (bps / 10000)
        floating_debt_amount = st_liab * prof["floating_debt_share"]
        interest_impact = floating_debt_amount * (interest_rate_hike_bps / 10000.0)
        stressed_fin = base_fin + interest_impact

        # 5. Yeni Brüt Kâr, FAVÖK ve Net Kâr
        base_gp = base_rev - base_cogs
        stressed_gp = stressed_rev - stressed_cogs

        # EBITDA simülasyonu
        # Brüt kârdaki erimenin %75'i FAVÖK'e yansır
        ebitda_erosion = (base_gp - stressed_gp) * 0.75
        stressed_ebitda = base_ebitda - ebitda_erosion

        # Net Kâr simülasyonu (Tüm bileşenlerin bileşkesi)
        # Net etki = - Ciro Daralması - Maliyet Artışı + Kambiyo Kâr/Zararı - Finansman Şoku
        total_net_impact = (-demand_impact) - cogs_impact + fx_gain_loss - interest_impact
        stressed_net = base_net + total_net_impact

        # Cari Oran Şoku
        stressed_cur_assets = cur_assets * (1.0 - effective_demand_drop * 0.5)
        stressed_st_liab = st_liab + interest_impact
        stressed_cr = round(stressed_cur_assets / stressed_st_liab, 2) if stressed_st_liab > 0 else base_cr

        # Yüzdesel Değişimler
        net_diff_pct = round(((stressed_net - base_net) / abs(base_net)) * 100.0, 1) if base_net != 0 else 0.0
        ebitda_diff_pct = round(((stressed_ebitda - base_ebitda) / abs(base_ebitda)) * 100.0, 1) if base_ebitda != 0 else 0.0

        # Stres Durumu Sınıflandırması
        if stressed_net < 0:
            stress_status = "AĞIR ZARAR BÖLGESİ (CRITICAL)"
            stress_badge_class = "negative"
        elif net_diff_pct <= -50.0:
            stress_status = "YÜKSEK BASKI ALTINDA (HIGH RISK)"
            stress_badge_class = "negative"
        elif net_diff_pct < -20.0:
            stress_status = "ORTA SEVİYE ERİME (MODERATE)"
            stress_badge_class = "warning"
        else:
            stress_status = "DAYANIKLI / SAĞLAM (RESILIENT)"
            stress_badge_class = "positive"

        # 6. Kâr Erimesi Şelale (Waterfall) Grafiği Veri Seti
        # Başlangıç Net Kâr -> Ciro Kaybı -> Maliyet Artışı -> Kambiyo Etkisi -> Faiz Gideri -> Nihai Net Kâr
        waterfall_labels = [
            "Başlangıç Net Kâr",
            "Ciro / Talep Daralması",
            "Maliyet & Girdi Şoku",
            "Kur / Kambiyo Etkisi",
            "Faiz & Finansman Şoku",
            "Stres Sonrası Net Kâr"
        ]

        waterfall_values = [
            round(base_net / 1e9, 2),
            round(-demand_impact / 1e9, 2),
            round(-cogs_impact / 1e9, 2),
            round(fx_gain_loss / 1e9, 2),
            round(-interest_impact / 1e9, 2),
            round(stressed_net / 1e9, 2)
        ]

        waterfall_measures = [
            "absolute",
            "relative",
            "relative",
            "relative",
            "relative",
            "total"
        ]

        # 7. Simülasyon Öncesi vs Sonrası Karşılaştırma Matrisi
        matrix_rows = [
            {
                "metric": "Satış Hasılatı (Ciro)",
                "base_val": round(base_rev / 1e9, 2),
                "stressed_val": round(stressed_rev / 1e9, 2),
                "diff_val": round((stressed_rev - base_rev) / 1e9, 2),
                "diff_pct": round(((stressed_rev - base_rev) / base_rev) * 100, 1),
                "unit": "₺ Milyar",
                "is_ratio": False
            },
            {
                "metric": "Satışların Maliyeti (-)",
                "base_val": round(base_cogs / 1e9, 2),
                "stressed_val": round(stressed_cogs / 1e9, 2),
                "diff_val": round((stressed_cogs - base_cogs) / 1e9, 2),
                "diff_pct": round(((stressed_cogs - base_cogs) / base_cogs) * 100, 1),
                "unit": "₺ Milyar",
                "is_ratio": False
            },
            {
                "metric": "Brüt Kâr",
                "base_val": round(base_gp / 1e9, 2),
                "stressed_val": round(stressed_gp / 1e9, 2),
                "diff_val": round((stressed_gp - base_gp) / 1e9, 2),
                "diff_pct": round(((stressed_gp - base_gp) / base_gp) * 100, 1) if base_gp != 0 else 0,
                "unit": "₺ Milyar",
                "is_ratio": False
            },
            {
                "metric": "FAVÖK (EBITDA)",
                "base_val": round(base_ebitda / 1e9, 2),
                "stressed_val": round(stressed_ebitda / 1e9, 2),
                "diff_val": round((stressed_ebitda - base_ebitda) / 1e9, 2),
                "diff_pct": ebitda_diff_pct,
                "unit": "₺ Milyar",
                "is_ratio": False
            },
            {
                "metric": "Finansman & Faiz Gideri",
                "base_val": round(base_fin / 1e9, 2),
                "stressed_val": round(stressed_fin / 1e9, 2),
                "diff_val": round((stressed_fin - base_fin) / 1e9, 2),
                "diff_pct": round(((stressed_fin - base_fin) / base_fin) * 100, 1) if base_fin != 0 else 0,
                "unit": "₺ Milyar",
                "is_ratio": False
            },
            {
                "metric": "Net Dönem Kârı / Zararı",
                "base_val": round(base_net / 1e9, 2),
                "stressed_val": round(stressed_net / 1e9, 2),
                "diff_val": round((stressed_net - base_net) / 1e9, 2),
                "diff_pct": net_diff_pct,
                "unit": "₺ Milyar",
                "is_ratio": False,
                "is_primary": True
            },
            {
                "metric": "Cari Oran (Likidite Güvencesi)",
                "base_val": base_cr,
                "stressed_val": stressed_cr,
                "diff_val": round(stressed_cr - base_cr, 2),
                "diff_pct": round(((stressed_cr - base_cr) / base_cr) * 100, 1),
                "unit": "x",
                "is_ratio": True
            }
        ]

        return {
            "ticker": ticker_clean,
            "company_name": prof["name"],
            "sector": prof["sector"],
            "inputs": {
                "cogs_increase_pct": cogs_increase_pct,
                "fx_shock_pct": fx_shock_pct,
                "interest_rate_hike_bps": interest_rate_hike_bps,
                "demand_contraction_pct": demand_contraction_pct
            },
            "kpis": {
                "base_net_income": round(base_net / 1e9, 2),
                "stressed_net_income": round(stressed_net / 1e9, 2),
                "net_income_diff": round(total_net_impact / 1e9, 2),
                "net_income_diff_pct": net_diff_pct,
                "base_ebitda": round(base_ebitda / 1e9, 2),
                "stressed_ebitda": round(stressed_ebitda / 1e9, 2),
                "ebitda_diff_pct": ebitda_diff_pct,
                "base_current_ratio": base_cr,
                "stressed_current_ratio": stressed_cr,
                "stress_status": stress_status,
                "stress_badge_class": stress_badge_class
            },
            "exposures": {
                "net_fx_exposure_billion": round(prof["net_fx_exposure"] / 1e9, 2),
                "fx_import_share_pct": round(prof["fx_import_share"] * 100, 1),
                "floating_debt_share_pct": round(prof["floating_debt_share"] * 100, 1),
                "demand_elasticity": prof["demand_elasticity"]
            },
            "waterfall": {
                "labels": waterfall_labels,
                "values": waterfall_values,
                "measures": waterfall_measures
            },
            "comparison_matrix": matrix_rows,
            "presets": cls.PRESET_SCENARIOS
        }
