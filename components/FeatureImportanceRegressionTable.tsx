import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Info,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Filter,
  BarChart3
} from 'lucide-react';

/* =====================================================================
 * TİP TANIMLARI (TypeScript Interfaces)
 * ===================================================================== */

export interface FactorItem {
  id: string;
  name: string;
  category: string;
  description: string;
  coefficient: number;
  weight: number;
  direction: string;
  direction_code: 'POSITIVE' | 'NEGATIVE';
  std_err: number;
  t_stat: number;
  p_value: number;
  is_statistically_significant: boolean;
  vif: number;
  is_vif_safe: boolean;
  vif_status: string;
  relative_importance_pct: number;
  bar_width_pct: number;
}

export interface ModelMetrics {
  r_squared: number;
  adj_r_squared: number;
  f_statistic: number;
  f_pvalue: number;
  durbin_watson: number;
  intercept: number;
  intercept_t: number;
  intercept_p: number;
  statsmodels_engine?: string;
}

export interface VifControl {
  threshold: number;
  rule: string;
  all_passed: boolean;
  max_vif: number;
  filtered_out_count: number;
}

export interface RegressionResponse {
  ticker: string;
  company_name: string;
  sector: string;
  dependent_variable: string;
  model_type: string;
  sample_size: number;
  metrics: ModelMetrics;
  vif_control: VifControl;
  factors: FactorItem[];
  filtered_factors?: FactorItem[];
  top_positive_factor?: FactorItem | null;
  top_negative_factor?: FactorItem | null;
}

export interface FeatureImportanceTableProps {
  ticker?: string;
  apiBaseUrl?: string;
  className?: string;
  vifThreshold?: number;
  onFactorSelect?: (factor: FactorItem) => void;
}

/* =====================================================================
 * YERLEŞİK YEDEK VERİ PROFİLLERİ (Fallback Offline Dataset)
 * ===================================================================== */

const FALLBACK_REGRESSION_PROFILES: Record<string, RegressionResponse> = {
  THYAO: {
    ticker: 'THYAO',
    company_name: 'Türk Hava Yolları A.O.',
    sector: 'Havacılık / Ulaştırma',
    dependent_variable: 'R_{t+1} (Gelecek Dönem Getiri)',
    model_type: 'Statsmodels OLS / Panel Faktör Regresyonu',
    sample_size: 120,
    metrics: {
      r_squared: 0.468,
      adj_r_squared: 0.445,
      f_statistic: 20.08,
      f_pvalue: 1.25e-14,
      durbin_watson: 1.94,
      intercept: 0.0042,
      intercept_t: 2.33,
      intercept_p: 0.0215,
      statsmodels_engine: 'Statsmodels OLS v0.15'
    },
    vif_control: {
      threshold: 5.0,
      rule: 'VIF > 5.0 olan değişkenler çoklu bağlantı (multicollinearity) nedeniyle elenir.',
      all_passed: true,
      max_vif: 2.05,
      filtered_out_count: 0
    },
    factors: [
      {
        id: 'roe_growth',
        name: 'ROE Artışı (ΔROE)',
        category: 'Temel Bilanço',
        description: 'Yıllıklandırılmış özkaynak kârlılığındaki çeyreklik ivme',
        coefficient: 0.428,
        weight: 0.428,
        direction: '+ Pozitif',
        direction_code: 'POSITIVE',
        std_err: 0.076,
        t_stat: 5.63,
        p_value: 0.00002,
        is_statistically_significant: true,
        vif: 1.48,
        is_vif_safe: true,
        vif_status: 'Güvenli (VIF < 5)',
        relative_importance_pct: 30.7,
        bar_width_pct: 77
      },
      {
        id: 'sue',
        name: 'Sürpriz Kâr (SUE)',
        category: 'Bilanço Sürprizi',
        description: 'Konsensüs net kâr beklentisi standartlaştırılmış sapması',
        coefficient: 0.312,
        weight: 0.312,
        direction: '+ Pozitif',
        direction_code: 'POSITIVE',
        std_err: 0.068,
        t_stat: 4.59,
        p_value: 0.00011,
        is_statistically_significant: true,
        vif: 1.62,
        is_vif_safe: true,
        vif_status: 'Güvenli (VIF < 5)',
        relative_importance_pct: 22.4,
        bar_width_pct: 56
      },
      {
        id: 'delta_net_debt_ebitda',
        name: 'Net Borç / FAVÖK Değişimi',
        category: 'Kaldıraç & Borç',
        description: 'Kaldıraç oranındaki azalış (Negatif katsayı borç düşüşünün primi)',
        coefficient: -0.286,
        weight: -0.286,
        direction: '- Negatif',
        direction_code: 'NEGATIVE',
        std_err: 0.071,
        t_stat: -4.03,
        p_value: 0.00018,
        is_statistically_significant: true,
        vif: 1.84,
        is_vif_safe: true,
        vif_status: 'Güvenli (VIF < 5)',
        relative_importance_pct: 20.5,
        bar_width_pct: 51
      },
      {
        id: 'garch_vol_spillover',
        name: 'Volatility Spillover (GARCH)',
        category: 'Risk & Volatilite',
        description: 'GARCH(1,1) koşullu volatilite şok yayılımı',
        coefficient: -0.214,
        weight: -0.214,
        direction: '- Negatif',
        direction_code: 'NEGATIVE',
        std_err: 0.065,
        t_stat: -3.29,
        p_value: 0.00135,
        is_statistically_significant: true,
        vif: 2.05,
        is_vif_safe: true,
        vif_status: 'Güvenli (VIF < 5)',
        relative_importance_pct: 15.3,
        bar_width_pct: 38
      },
      {
        id: 'volume_momentum',
        name: 'Hacim Momentumu (Vol_Mom)',
        category: 'Piyasa & Likidite',
        description: '20 günlük işlem hacminin 60 günlük ortalamaya oranı',
        coefficient: 0.156,
        weight: 0.156,
        direction: '+ Pozitif',
        direction_code: 'POSITIVE',
        std_err: 0.054,
        t_stat: 2.89,
        p_value: 0.00462,
        is_statistically_significant: true,
        vif: 1.35,
        is_vif_safe: true,
        vif_status: 'Güvenli (VIF < 5)',
        relative_importance_pct: 11.1,
        bar_width_pct: 28
      }
    ]
  }
};

/* =====================================================================
 * ANA BİLEŞEN: FeatureImportanceRegressionTable
 * ===================================================================== */

export const FeatureImportanceRegressionTable: React.FC<FeatureImportanceTableProps> = ({
  ticker = 'THYAO',
  apiBaseUrl = 'http://localhost:8000',
  className = '',
  vifThreshold = 5.0,
  onFactorSelect
}) => {
  const [data, setData] = useState<RegressionResponse>(() =>
    FALLBACK_REGRESSION_PROFILES[ticker] || FALLBACK_REGRESSION_PROFILES.THYAO
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'importance' | 'coef' | 'tstat'>('importance');
  const [filterVifOnly, setFilterVifOnly] = useState<boolean>(true);

  // Veri yükleme
  useEffect(() => {
    let isMounted = true;
    const fetchRegression = async () => {
      setIsLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(
          `${apiBaseUrl}/api/terminal/regression/${ticker}?vif_threshold=${vifThreshold}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && json.factors) {
            setData(json);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        // Fallback profile
      }

      if (isMounted) {
        const fallback = FALLBACK_REGRESSION_PROFILES[ticker] || FALLBACK_REGRESSION_PROFILES.THYAO;
        setData(fallback);
        setIsLoading(false);
      }
    };

    fetchRegression();

    return () => {
      isMounted = false;
    };
  }, [ticker, apiBaseUrl, vifThreshold]);

  // Sıralanmış ve filtrelenmiş faktörler
  const sortedFactors = useMemo(() => {
    let items = [...data.factors];

    if (filterVifOnly) {
      items = items.filter((f) => f.vif <= vifThreshold);
    }

    if (sortBy === 'importance') {
      items.sort((a, b) => b.relative_importance_pct - a.relative_importance_pct);
    } else if (sortBy === 'coef') {
      items.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
    } else if (sortBy === 'tstat') {
      items.sort((a, b) => Math.abs(b.t_stat) - Math.abs(a.t_stat));
    }

    return items;
  }, [data.factors, sortBy, filterVifOnly, vifThreshold]);

  const { metrics, vif_control } = data;

  const getCategoryBadgeClass = (category: string) => {
    if (category.includes('Temel')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (category.includes('Sürpriz')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (category.includes('Kaldıraç')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (category.includes('Risk')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md text-slate-100 ${className}`}>
      {/* 1. KART BAŞLIĞI VE MODEL ÖZET METRİKLERİ */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-wide">
                Özellik Önem Derecesi & Çok Faktörlü Regresyon
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                Statsmodels OLS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Bağımlı Değişken: <strong className="text-slate-300">R_{'{t+1}'} (Gelecek Dönem Getiri)</strong> | VIF Çoklu Bağlantı Kontrolü (VIF &le; {vifThreshold}).
            </p>
          </div>
        </div>

        {/* Model Performans Rozetleri */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono">
            <span>R²: <strong className="text-cyan-400">{metrics.r_squared.toFixed(3)}</strong></span>
            <span className="text-slate-600">|</span>
            <span>Adj R²: <strong className="text-slate-200">{metrics.adj_r_squared.toFixed(3)}</strong></span>
            <span className="text-slate-600">|</span>
            <span>F: <strong className="text-emerald-400">{metrics.f_statistic.toFixed(2)}</strong></span>
            <span className="text-slate-600">|</span>
            <span>DW: <strong className="text-slate-300">{metrics.durbin_watson.toFixed(2)}</strong></span>
          </div>

          {/* VIF Durum Rozeti */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
            vif_control.all_passed
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}>
            {vif_control.all_passed ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>VIF: Tüm Faktörler Güvenli (&lt; 5)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>VIF: {vif_control.filtered_out_count} Faktör Elendi</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. TABLO KONTROL BARI (Sıralama ve Filtre) */}
      <div className="flex items-center justify-between text-xs text-slate-400 my-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Sırala:</span>
          <button
            onClick={() => setSortBy('importance')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'importance' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Göreceli Önem
          </button>
          <button
            onClick={() => setSortBy('coef')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'coef' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Katsayı (β)
          </button>
          <button
            onClick={() => setSortBy('tstat')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'tstat' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            t-İstatistiği
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          {sortedFactors.length} Faktör Aktif | Örneklem: N={data.sample_size}
        </div>
      </div>

      {/* 3. DİNAMİK FAKTÖR REGRESYON TABLOSU */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700/60">
            <tr>
              <th className="py-2.5 px-3">Özellik / Faktör</th>
              <th className="py-2.5 px-3">Kategori</th>
              <th className="py-2.5 px-3">Etki Yönü</th>
              <th className="py-2.5 px-3">Katsayı (β / Weight)</th>
              <th className="py-2.5 px-3">t-İstatistiği (p-Val)</th>
              <th className="py-2.5 px-3">VIF Skoru</th>
              <th className="py-2.5 px-3 w-[220px]">Göreceli Önem Barı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedFactors.map((f) => {
              const isPositive = f.direction_code === 'POSITIVE';
              return (
                <tr
                  key={f.id}
                  onClick={() => onFactorSelect && onFactorSelect(f)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  {/* Faktör Adı & Açıklaması */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{f.description}</div>
                  </td>

                  {/* Kategori Rozeti */}
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getCategoryBadgeClass(f.category)}`}>
                      {f.category}
                    </span>
                  </td>

                  {/* Etki Yönü */}
                  <td className="py-2.5 px-3">
                    <span className={`font-semibold inline-flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {f.direction}
                    </span>
                  </td>

                  {/* Katsayı (β) & SE */}
                  <td className="py-2.5 px-3 font-mono">
                    <span className="font-bold text-slate-100">
                      {f.coefficient >= 0 ? '+' : ''}{f.coefficient.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      (SE: {f.std_err.toFixed(3)})
                    </span>
                  </td>

                  {/* t-İstatistiği & p-Değeri */}
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    <span className={f.is_statistically_significant ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                      t: {f.t_stat >= 0 ? '+' : ''}{f.t_stat.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      (p={f.p_value < 0.001 ? '<0.001' : f.p_value.toFixed(3)})
                    </span>
                  </td>

                  {/* VIF Skoru */}
                  <td className="py-2.5 px-3 font-mono">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                      f.vif <= 2.5
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : f.vif <= vifThreshold
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {f.vif.toFixed(2)} {f.is_vif_safe ? '✓' : '⚠️'}
                    </span>
                  </td>

                  {/* Göreceli Önem Barı */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPositive ? 'bg-cyan-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${f.bar_width_pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 w-11 text-right">
                        %{f.relative_importance_pct}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. FOOTER: EKONOMETRİK MODEL FORMÜLÜ VE VIF KONTROL NOTU */}
      <div className="mt-3.5 p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Model Formülasyonu:</strong> R_{'{t+1}'} = &alpha; + &beta;₁·&Delta;ROE + &beta;₂·SUE + &beta;₃·&Delta;(NetBorç/FAVÖK) + &beta;₄·Vol_Mom + &beta;₅·GARCH + &epsilon;
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          VIF &le; {vifThreshold.toFixed(1)} Filtresi Aktif (Çoklu Bağlantı Arındırılmış)
        </div>
      </div>
    </div>
  );
};

export default FeatureImportanceRegressionTable;
