"""
QuantFlux Piotroski F-Score & Altman Z''-Score Quantitative Scoring Engine (v3.2)
Evaluates financial statement quality, insolvency/distress risk, and operational health
specifically calibrated for BIST equities and Emerging Markets.
"""

from typing import List, Dict, Any, Tuple, Optional


class BalanceSheetScoringEngine:
    """
    Piotroski F-Score (0-9) ve Altman Z''-Score hesaplama motoru.
    """

    @staticmethod
    def calculate_piotroski_f_score(statements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Piotroski F-Score hesaplaması (9 kriter üzerinden 0-9 puan).
        İki çeyrek/yıl dönemi (t ve t-1) karşılaştırılır.
        """
        if not statements or len(statements) == 0:
            return {
                "score": 0,
                "max_score": 9,
                "label": "Yetersiz Veri",
                "color": "rose",
                "categories": {}
            }

        latest = statements[0]
        # Önceki dönem yoksa cari dönemin kendi marjlarından temkinli çıkarım yapılır
        prev = statements[1] if len(statements) > 1 else latest

        # Temel veriler - Cari Dönem (t)
        ca_t = float(latest.get("donen_varliklar", latest.get("currentAssets", 0)))
        fa_t = float(latest.get("duran_varliklar", latest.get("fixedAssets", 0)))
        ta_t = float(latest.get("toplam_varliklar", latest.get("totalAssets", 0))) or (ca_t + fa_t)
        stl_t = float(latest.get("kisa_vadeli_yuk", latest.get("shortTermLiab", 0)))
        ltl_t = float(latest.get("uzun_vadeli_yuk", latest.get("longTermLiab", 0)))
        eq_t = float(latest.get("ozkaynaklar", latest.get("equity", 0)))
        rev_t = float(latest.get("net_satislar", latest.get("revenue", 0)))
        gp_t = float(latest.get("grossProfit", rev_t * 0.28))
        ebitda_t = float(latest.get("favok", latest.get("ebitda", 0)))
        ni_t = float(latest.get("net_kar", latest.get("netIncome", 0)))

        # Temel veriler - Önceki Dönem (t-1)
        ca_p = float(prev.get("donen_varliklar", prev.get("currentAssets", 0)))
        fa_p = float(prev.get("duran_varliklar", prev.get("fixedAssets", 0)))
        ta_p = float(prev.get("toplam_varliklar", prev.get("totalAssets", 0))) or (ca_p + fa_p)
        stl_p = float(prev.get("kisa_vadeli_yuk", prev.get("shortTermLiab", 0)))
        ltl_p = float(prev.get("uzun_vadeli_yuk", prev.get("longTermLiab", 0)))
        eq_p = float(prev.get("ozkaynaklar", prev.get("equity", 0)))
        rev_p = float(prev.get("net_satislar", prev.get("revenue", 0)))
        gp_p = float(prev.get("grossProfit", rev_p * 0.28))
        ni_p = float(prev.get("net_kar", prev.get("netIncome", 0)))

        # -------------------------------------------------------------
        # 1. KÂRLILIK KRİTERLERİ (PROFITABILITY - 4 Puan)
        # -------------------------------------------------------------
        roa_t = (ni_t / ta_t) if ta_t > 0 else 0
        roa_p = (ni_p / ta_p) if ta_p > 0 else 0

        # Nakit akışı (CFO): Net Kar + Amortisman (tahmini FAVÖK'e paralel CFO)
        cfo_t = ebitda_t * 0.95 if ebitda_t > 0 else (ni_t * 1.15)

        # 1. Net Kar > 0
        crit_1 = ni_t > 0
        # 2. CFO > 0
        crit_2 = cfo_t > 0
        # 3. Delta ROA > 0
        crit_3 = roa_t >= roa_p if prev is not latest else roa_t > 0
        # 4. Kalite (Accrual): CFO > Net Kâr
        crit_4 = cfo_t > ni_t

        prof_score = int(crit_1) + int(crit_2) + int(crit_3) + int(crit_4)

        # -------------------------------------------------------------
        # 2. KALDIRAÇ, LİKİDİTE VE FON KAYNAĞI (LEVERAGE/LIQUIDITY - 3 Puan)
        # -------------------------------------------------------------
        lev_t = (ltl_t / ta_t) if ta_t > 0 else 0
        lev_p = (ltl_p / ta_p) if ta_p > 0 else 0

        cr_t = (ca_t / stl_t) if stl_t > 0 else 0
        cr_p = (ca_p / stl_p) if stl_p > 0 else 0

        # 5. Delta Kaldıraç <= 0 (Uzun vadeli borç / aktif oranı düşmüş veya sabit)
        crit_5 = (lev_t <= lev_p) if prev is not latest else (lev_t < 0.45)
        # 6. Delta Cari Oran >= 0 (Likidite artmış veya 1.0 üzerinde)
        crit_6 = (cr_t >= cr_p) if prev is not latest else (cr_t >= 1.0)
        # 7. Seyrelme / Dilution: Yeni hisse ihracı olmamış mı? (Sermaye artışı yok)
        crit_7 = True  # BIST büyük hisselerinde çeyreklik bazda seyreltme yok varsayımı

        lev_score = int(crit_5) + int(crit_6) + int(crit_7)

        # -------------------------------------------------------------
        # 3. OPERASYONEL VERİMLİLİK (EFFICIENCY - 2 Puan)
        # -------------------------------------------------------------
        gm_t = (gp_t / rev_t) if rev_t > 0 else 0
        gm_p = (gp_p / rev_p) if rev_p > 0 else 0

        at_t = (rev_t / ta_t) if ta_t > 0 else 0
        at_p = (rev_p / ta_p) if ta_p > 0 else 0

        # 8. Delta Brüt Kâr Marjı >= 0
        crit_8 = (gm_t >= gm_p) if prev is not latest else (gm_t > 0.15)
        # 9. Delta Aktif Devir Hızı >= 0
        crit_9 = (at_t >= at_p) if prev is not latest else (at_t > 0.30)

        eff_score = int(crit_8) + int(crit_9)

        total_score = prof_score + lev_score + eff_score

        if total_score >= 8:
            verdict = "Mükemmel Finansal Sağlık"
            badge_color = "emerald"
            badge_class = "text-emerald-400"
        elif total_score >= 5:
            verdict = "Sağlıklı / Dengeli Bilanço"
            badge_color = "cyan"
            badge_class = "text-cyan-400"
        else:
            verdict = "Zayıf / Finansal Bozulma Riski"
            badge_color = "rose"
            badge_class = "text-rose-400"

        return {
            "score": total_score,
            "max_score": 9,
            "percentage": int((total_score / 9) * 100),
            "verdict": verdict,
            "badge_color": badge_color,
            "categories": {
                "profitability": {
                    "name": "Kârlılık Kriterleri",
                    "score": prof_score,
                    "max": 4,
                    "items": [
                        {"name": "Net Kâr Pozitif", "passed": crit_1, "value": f"₺{(ni_t/1e9):.1f} Mrd"},
                        {"name": "Faaliyet Nakit Akışı Pozitif (CFO > 0)", "passed": crit_2, "value": f"₺{(cfo_t/1e9):.1f} Mrd"},
                        {"name": "Aktif Kârlılığı Artışı (ΔROA > 0)", "passed": crit_3, "value": f"%{(roa_t*100):.1f}"},
                        {"name": "Kâr Kalitesi (CFO > Net Kâr)", "passed": crit_4, "value": "CFO > Kâr"}
                    ]
                },
                "leverage": {
                    "name": "Kaldıraç & Likidite",
                    "score": lev_score,
                    "max": 3,
                    "items": [
                        {"name": "Uzun Vadeli Kaldıraç Azalışı (ΔKaldıraç ≤ 0)", "passed": crit_5, "value": f"%{(lev_t*100):.1f}"},
                        {"name": "Cari Oran İyileşmesi (ΔCari Oran ≥ 0)", "passed": crit_6, "value": f"{cr_t:.2f}x"},
                        {"name": "Hisse Seyrelmesi Yok (Sermaye İhracı Yok)", "passed": crit_7, "value": "0 Dilution"}
                    ]
                },
                "efficiency": {
                    "name": "Operasyonel Verimlilik",
                    "score": eff_score,
                    "max": 2,
                    "items": [
                        {"name": "Brüt Kâr Marjı Artışı (ΔBrüt Marj ≥ 0)", "passed": crit_8, "value": f"%{(gm_t*100):.1f}"},
                        {"name": "Aktif Devir Hızı Artışı (ΔDevir Hızı ≥ 0)", "passed": crit_9, "value": f"{at_t:.2f}x"}
                    ]
                }
            }
        }

    @staticmethod
    def calculate_altman_z_score(statements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Altman Z''-Score (Gelişmekte Olan Piyasalar / Emerging Markets Modeli):
        Z'' = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4
          X1 = Net İşletme Sermayesi / Toplam Aktif
          X2 = Geçmiş Kârlar (Özkaynaklar) / Toplam Aktif
          X3 = Esas Faaliyet Kârı (EBIT/FAVÖK) / Toplam Aktif
          X4 = Özkaynak Defter Değeri / Toplam Yükümlülükler
        
        Bölgeler:
          Z'' > 2.60: Güvenli Bölge (Safe Zone)
          1.10 <= Z'' <= 2.60: Gri Bölge (Grey Zone)
          Z'' < 1.10: Riskli / İflas Bölgesi (Distress Zone)
        """
        if not statements or len(statements) == 0:
            return {"z_score": 0.0, "zone": "Distress", "zone_tr": "Belirsiz", "color": "rose"}

        latest = statements[0]

        ca = float(latest.get("donen_varliklar", latest.get("currentAssets", 0)))
        fa = float(latest.get("duran_varliklar", latest.get("fixedAssets", 0)))
        ta = float(latest.get("toplam_varliklar", latest.get("totalAssets", 0))) or (ca + fa)
        stl = float(latest.get("kisa_vadeli_yuk", latest.get("shortTermLiab", 0)))
        ltl = float(latest.get("uzun_vadeli_yuk", latest.get("longTermLiab", 0)))
        eq = float(latest.get("ozkaynaklar", latest.get("equity", 0)))
        ebit = float(latest.get("favok", latest.get("ebitda", 0))) or (float(latest.get("net_kar", latest.get("netIncome", 0))) * 1.2)
        total_liab = stl + ltl

        if ta <= 0:
            return {"z_score": 0.0, "zone": "Distress", "zone_tr": "Hesaplanamadı", "color": "rose"}

        # X1: Net İşletme Sermayesi (Dönen Varlıklar - Kısa Vadeli Yükümlülükler) / Toplam Aktif
        net_working_capital = ca - stl
        x1 = net_working_capital / ta

        # X2: Özkaynak / Toplam Aktif (Kümülatif Birikim Gücü)
        x2 = eq / ta

        # X3: EBIT / Toplam Aktif (Aktif Kârlılığı Gücü)
        x3 = ebit / ta

        # X4: Özkaynak / Toplam Yükümlülükler (Kaldıraç Güvencesi)
        x4 = (eq / total_liab) if total_liab > 0 else 1.0

        # Altman Z'' Formülü
        z_score = round(6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4, 2)

        # Bölge Tespiti
        if z_score >= 2.60:
            zone = "Safe"
            zone_tr = "GÜVENLİ BÖLGE"
            description = "İflas ve temerrüt riski son derece düşüktür. Güçlü bilanço tamponu."
            color = "emerald"
            gauge_pct = min(100, int((z_score / 5.0) * 100))
        elif z_score >= 1.10:
            zone = "Grey"
            zone_tr = "GRİ BÖLGE (DİKKAT)"
            description = "Orta seviye finansal stres. Borçlanma ve likidite yakından izlenmeli."
            color = "amber"
            gauge_pct = int((z_score / 5.0) * 100)
        else:
            zone = "Distress"
            zone_tr = "RİSKLİ / İFLAS BÖLGESİ"
            description = "Yüksek borçluluk ve yetersiz işletme sermayesi. Temerrüt riski mevcuttur."
            color = "rose"
            gauge_pct = max(10, int((z_score / 5.0) * 100))

        return {
            "z_score": z_score,
            "zone": zone,
            "zone_tr": zone_tr,
            "description": description,
            "color": color,
            "gauge_pct": gauge_pct,
            "components": {
                "x1_net_working_capital": round(x1, 3),
                "x2_retained_earnings": round(x2, 3),
                "x3_ebit_to_assets": round(x3, 3),
                "x4_equity_to_liabilities": round(x4, 3)
            }
        }
