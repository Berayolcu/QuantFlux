import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Zap,
  Activity,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  DollarSign,
  Percent,
  Layers,
  GitCommit,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

/* =====================================================================
 * TİP TANIMLARI (TypeScript Interfaces)
 * ===================================================================== */

export interface StressInputs {
  cogs_increase_pct: number;
  fx_shock_pct: number;
  interest_rate_hike_bps: number;
  demand_contraction_pct: number;
}

export interface StressKpis {
  base_net_income: number;
  stressed_net_income: number;
  net_income_diff: number;
  net_income_diff_pct: number;
  base_ebitda: number;
  stressed_ebitda: number;
  ebitda_diff_pct: number;
  base_current_ratio: number;
  stressed_current_ratio: number;
  stress_status: string;
  stress_badge_class: string;
}

export interface ComparisonRow {
  metric: string;
  base_val: number;
  stressed_val: number;
  diff_val: number;
  diff_pct: number;
  unit: string;
  is_ratio: boolean;
  is_primary?: boolean;
}

export interface WaterfallData {
  labels: string[];
  values: number[];
  measures: string[];
}

export interface PresetScenario {
  id: string;
  name: string;
  badge: string;
  description?: string;
  desc?: string;
  cogs_increase_pct: number;
  fx_shock_pct: number;
  interest_rate_hike_bps: number;
  demand_contraction_pct: number;
}

export interface StressSimulationResponse {
  ticker: string;
  company_name: string;
  sector: string;
  inputs: StressInputs;
  kpis: StressKpis;
  exposures: {
    net_fx_exposure_billion: number;
    fx_import_share_pct: number;
    floating_debt_share_pct: number;
    demand_elasticity: number;
  };
  waterfall: WaterfallData;
  comparison_matrix: ComparisonRow[];
  presets: PresetScenario[];
}

export interface StressTestLabProps {
  ticker?: string;
  apiBaseUrl?: string;
  className?: string;
}

/* =====================================================================
 * YERLEŞİK SİMÜLASYON MOTORU (Offline Fallback Engine)
 * ===================================================================== */

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'lira_shock',
    name: 'Lira Devalüasyonu & Maliyet Sıçraması',
    badge: 'KUR VE ENFLASYON',
    description: 'USD/TRY kurunda %35 sıçrama, hammadde ithalat maliyetlerinde %25 artış ve 400 bps faiz artışı.',
    cogs_increase_pct: 25.0,
    fx_shock_pct: 35.0,
    interest_rate_hike_bps: 400,
    demand_contraction_pct: 5.0
  },
  {
    id: 'global_recession',
    name: 'Küresel Durgunluk & Talep Çöküşü',
    badge: 'STAGFLASYON',
    description: 'Tüketici talebinde %20 sert daralma, ciro erimesi ve girdi maliyetlerinde %10 artış.',
    cogs_increase_pct: 10.0,
    fx_shock_pct: 15.0,
    interest_rate_hike_bps: 200,
    demand_contraction_pct: 20.0
  },
  {
    id: 'liquidity_crunch',
    name: 'Aşırı Parasal Sıkılaşma & Kredi Şoku',
    badge: 'FAİZ KRİZİ',
    description: 'Politika faizinde 800 bps sert artış, rotatif kredilerde faiz patlaması ve talepte %12 düşüş.',
    cogs_increase_pct: 15.0,
    fx_shock_pct: 20.0,
    interest_rate_hike_bps: 800,
    demand_contraction_pct: 12.0
  },
  {
    id: 'black_swan',
    name: 'Siyah Kuğu (Black Swan) Çoklu Kriz',
    badge: 'EKSTREM ŞOK',
    description: 'Kura %50 şok, girdi maliyetlerinde %40 artış, 1000 bps faiz artışı ve %25 talep kaybı.',
    cogs_increase_pct: 40.0,
    fx_shock_pct: 50.0,
    interest_rate_hike_bps: 1000,
    demand_contraction_pct: 25.0
  }
];

function runLocalStressSimulation(
  ticker: string,
  cogsPct: number,
  fxPct: number,
  rateBps: number,
  demandPct: number
): StressSimulationResponse {
  // THYAO Temel Finansalları (Milyar TL)
  const baseRev = 745.43;
  const baseCogs = 602.52;
  const baseGp = baseRev - baseCogs;
  const baseEbitda = 142.91;
  const baseFinExp = 28.40;
  const baseNet = 113.36;
  const baseCr = 1.01;

  // İletim çarpanları
  const demandImpact = baseRev * ((demandPct / 100) * 0.85);
  const stressedRev = baseRev - demandImpact;

  const cogsInflation = (cogsPct / 100) + (fxPct / 100 * 0.42);
  const cogsImpact = baseCogs * cogsInflation;
  const stressedCogs = baseCogs + cogsImpact;

  const stressedGp = stressedRev - stressedCogs;
  const fxGainLoss = 28.5 * (fxPct / 100); // +28.5 Mrd Net FX pozisyonu
  const interestImpact = (339.5 * 0.38) * (rateBps / 10000); // 339.5 Mrd ST Liab * %38 değişken
  const stressedFinExp = baseFinExp + interestImpact;

  const ebitdaErosion = (baseGp - stressedGp) * 0.75;
  const stressedEbitda = baseEbitda - ebitdaErosion;

  const totalNetImpact = (-demandImpact) - cogsImpact + fxGainLoss - interestImpact;
  const stressedNet = baseNet + totalNetImpact;

  const netDiffPct = Number((((stressedNet - baseNet) / Math.abs(baseNet)) * 100).toFixed(1));
  const ebitdaDiffPct = Number((((stressedEbitda - baseEbitda) / Math.abs(baseEbitda)) * 100).toFixed(1));

  const stressedCr = Number((baseCr * (1 - (demandPct * 0.3) / 100)).toFixed(2));

  let status = 'DAYANIKLI / SAĞLAM (RESILIENT)';
  let badgeClass = 'positive';
  if (stressedNet < 0) {
    status = 'AĞIR ZARAR BÖLGESİ (CRITICAL)';
    badgeClass = 'negative';
  } else if (netDiffPct <= -50) {
    status = 'YÜKSEK BASKI ALTINDA (HIGH RISK)';
    badgeClass = 'negative';
  } else if (netDiffPct < -20) {
    status = 'ORTA SEVİYE ERİME (MODERATE)';
    badgeClass = 'warning';
  }

  const waterfallLabels = [
    'Başlangıç Net Kâr',
    'Talep Daralması',
    'Maliyet Şoku',
    'Kur / Kambiyo',
    'Finansman Şoku',
    'Stres Sonrası Kâr'
  ];

  const waterfallValues = [
    Number(baseNet.toFixed(2)),
    Number((-demandImpact).toFixed(2)),
    Number((-cogsImpact).toFixed(2)),
    Number(fxGainLoss.toFixed(2)),
    Number((-interestImpact).toFixed(2)),
    Number(stressedNet.toFixed(2))
  ];

  const matrix: ComparisonRow[] = [
    {
      metric: 'Satış Hasılatı (Ciro)',
      base_val: Number(baseRev.toFixed(2)),
      stressed_val: Number(stressedRev.toFixed(2)),
      diff_val: Number((stressedRev - baseRev).toFixed(2)),
      diff_pct: Number((((stressedRev - baseRev) / baseRev) * 100).toFixed(1)),
      unit: '₺ Milyar',
      is_ratio: false
    },
    {
      metric: 'Satışların Maliyeti (-)',
      base_val: Number(baseCogs.toFixed(2)),
      stressed_val: Number(stressedCogs.toFixed(2)),
      diff_val: Number((stressedCogs - baseCogs).toFixed(2)),
      diff_pct: Number((((stressedCogs - baseCogs) / baseCogs) * 100).toFixed(1)),
      unit: '₺ Milyar',
      is_ratio: false
    },
    {
      metric: 'Brüt Kâr',
      base_val: Number(baseGp.toFixed(2)),
      stressed_val: Number(stressedGp.toFixed(2)),
      diff_val: Number((stressedGp - baseGp).toFixed(2)),
      diff_pct: Number((((stressedGp - baseGp) / baseGp) * 100).toFixed(1)),
      unit: '₺ Milyar',
      is_ratio: false
    },
    {
      metric: 'FAVÖK (EBITDA)',
      base_val: Number(baseEbitda.toFixed(2)),
      stressed_val: Number(stressedEbitda.toFixed(2)),
      diff_val: Number((stressedEbitda - baseEbitda).toFixed(2)),
      diff_pct: ebitdaDiffPct,
      unit: '₺ Milyar',
      is_ratio: false
    },
    {
      metric: 'Finansman & Faiz Gideri',
      base_val: Number(baseFinExp.toFixed(2)),
      stressed_val: Number(stressedFinExp.toFixed(2)),
      diff_val: Number((stressedFinExp - baseFinExp).toFixed(2)),
      diff_pct: Number((((stressedFinExp - baseFinExp) / baseFinExp) * 100).toFixed(1)),
      unit: '₺ Milyar',
      is_ratio: false
    },
    {
      metric: 'Net Dönem Kârı / Zararı',
      base_val: Number(baseNet.toFixed(2)),
      stressed_val: Number(stressedNet.toFixed(2)),
      diff_val: Number((stressedNet - baseNet).toFixed(2)),
      diff_pct: netDiffPct,
      unit: '₺ Milyar',
      is_ratio: false,
      is_primary: true
    },
    {
      metric: 'Cari Oran (Likidite)',
      base_val: baseCr,
      stressed_val: stressedCr,
      diff_val: Number((stressedCr - baseCr).toFixed(2)),
      diff_pct: Number((((stressedCr - baseCr) / baseCr) * 100).toFixed(1)),
      unit: 'x',
      is_ratio: true
    }
  ];

  return {
    ticker: ticker.toUpperCase(),
    company_name: 'Türk Hava Yolları A.O.',
    sector: 'Havacılık / Ulaştırma',
    inputs: {
      cogs_increase_pct: cogsPct,
      fx_shock_pct: fxPct,
      interest_rate_hike_bps: rateBps,
      demand_contraction_pct: demandPct
    },
    kpis: {
      base_net_income: Number(baseNet.toFixed(2)),
      stressed_net_income: Number(stressedNet.toFixed(2)),
      net_income_diff: Number(totalNetImpact.toFixed(2)),
      net_income_diff_pct: netDiffPct,
      base_ebitda: Number(baseEbitda.toFixed(2)),
      stressed_ebitda: Number(stressedEbitda.toFixed(2)),
      ebitda_diff_pct: ebitdaDiffPct,
      base_current_ratio: baseCr,
      stressed_current_ratio: stressedCr,
      stress_status: status,
      stress_badge_class: badgeClass
    },
    exposures: {
      net_fx_exposure_billion: 28.5,
      fx_import_share_pct: 42.0,
      floating_debt_share_pct: 38.0,
      demand_elasticity: 0.85
    },
    waterfall: {
      labels: waterfallLabels,
      values: waterfallValues,
      measures: ['absolute', 'relative', 'relative', 'relative', 'relative', 'total']
    },
    comparison_matrix: matrix,
    presets: PRESET_SCENARIOS
  };
}

/* =====================================================================
 * ÖZEL WATERFALL TOOLTIP
 * ===================================================================== */

const CustomWaterfallTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2.5 shadow-xl backdrop-blur-md text-xs">
      <div className="font-semibold text-slate-200">{item.name}</div>
      <div className="mt-1 flex items-center justify-between gap-4 font-mono">
        <span className="text-slate-400">Etki Tutarı:</span>
        <span className={`font-bold ${item.raw_val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {item.raw_val >= 0 ? '+' : ''}₺{item.raw_val.toFixed(2)} Mrd
        </span>
      </div>
      {item.running_total !== undefined && (
        <div className="mt-0.5 flex items-center justify-between gap-4 font-mono text-[11px] text-slate-400">
          <span>Kümülatif Bakiye:</span>
          <span className="text-cyan-400 font-semibold">₺{item.running_total.toFixed(2)} Mrd</span>
        </div>
      )}
    </div>
  );
};

/* =====================================================================
 * ANA BİLEŞEN: StressTestSimulationLab
 * ===================================================================== */

export const StressTestSimulationLab: React.FC<StressTestLabProps> = ({
  ticker = 'THYAO',
  apiBaseUrl = 'http://localhost:8000',
  className = ''
}) => {
  // Slider State'leri
  const [cogsPct, setCogsPct] = useState<number>(0);
  const [fxPct, setFxPct] = useState<number>(0);
  const [rateBps, setRateBps] = useState<number>(0);
  const [demandPct, setDemandPct] = useState<number>(0);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Simülasyon Verisi
  const [simResult, setSimResult] = useState<StressSimulationResponse>(() =>
    runLocalStressSimulation(ticker, 0, 0, 0, 0)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // API veya yerleşik motor ile senkronizasyon
  const runSimulation = useCallback(
    async (cogs: number, fx: number, rate: number, demand: number) => {
      setIsLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const url = `${apiBaseUrl}/api/terminal/stress-test/${ticker}?cogs=${cogs}&fx=${fx}&rate=${rate}&demand=${demand}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && json.waterfall) {
            setSimResult(json);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        // Fallback engine
      }

      const local = runLocalStressSimulation(ticker, cogs, fx, rate, demand);
      setSimResult(local);
      setIsLoading(false);
    },
    [ticker, apiBaseUrl]
  );

  useEffect(() => {
    runSimulation(cogsPct, fxPct, rateBps, demandPct);
  }, [cogsPct, fxPct, rateBps, demandPct, runSimulation]);

  // Sıfırla Butonu
  const handleReset = () => {
    setCogsPct(0);
    setFxPct(0);
    setRateBps(0);
    setDemandPct(0);
    setActiveScenarioId(null);
  };

  // Ön Tanımlı Senaryo Uygulama
  const applyPreset = (sc: PresetScenario) => {
    setActiveScenarioId(sc.id);
    setCogsPct(sc.cogs_increase_pct);
    setFxPct(sc.fx_shock_pct);
    setRateBps(sc.interest_rate_hike_bps);
    setDemandPct(sc.demand_contraction_pct);
  };

  const { kpis, waterfall, comparison_matrix, exposures } = simResult;

  // Recharts Waterfall için Floating Bar Veri Yapısı
  const waterfallChartData = useMemo(() => {
    let running = 0;
    return waterfall.labels.map((lbl, idx) => {
      const val = waterfall.values[idx];
      const measure = waterfall.measures[idx];

      let bottom = 0;
      let height = 0;
      let color = '#00F2FE';

      if (measure === 'absolute' || measure === 'total') {
        bottom = 0;
        height = Math.abs(val);
        color = val >= 0 ? '#00F2FE' : '#F43F5E';
        running = val;
      } else {
        // Relative step
        if (val >= 0) {
          bottom = running;
          height = val;
          color = '#10B981';
          running += val;
        } else {
          running += val;
          bottom = running;
          height = Math.abs(val);
          color = '#F43F5E';
        }
      }

      return {
        name: lbl,
        raw_val: val,
        bottom,
        height,
        running_total: running,
        color
      };
    });
  }, [waterfall]);

  return (
    <div className={`space-y-6 text-slate-100 ${className}`}>
      {/* 1. ÜST BAŞLIK VE SIFIRLA BUTONU */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Stres Testi & Makro Şok Senaryoları (What-If)
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  Dinamik Simülasyon
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Ekstrem kur, hammadde maliyeti, faiz ve talep şokları altında bilanço kâr erozyonu simülatörü.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Parametreleri Sıfırla</span>
        </button>
      </div>

      {/* 2. ÖN TANIMLI MAKRO ŞOK SENARYOLARI */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Önceden Tanımlı Makro Şok Senaryoları
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_SCENARIOS.map((sc) => {
            const isActive = activeScenarioId === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => applyPreset(sc)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-cyan-950/40 border-cyan-400/80 shadow-lg shadow-cyan-950/50 scale-[1.01]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {sc.badge}
                  </span>
                  <h4 className="text-xs font-bold text-slate-100 mt-2 line-clamp-1">{sc.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{sc.desc || sc.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span>FX: +%{sc.fx_shock_pct}</span>
                  <span>Maliyet: +%{sc.cogs_increase_pct}</span>
                  <span>Faiz: +{sc.interest_rate_hike_bps}bp</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. İNTERAKTİF MAKRO ŞOK SLIDER ÇUBUĞU */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>İnteraktif Makro Şok Değişkenleri</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Canlı Simülasyon
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Slider 1: USD/TRY Kur Şoku */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">USD/TRY Kur Şoku (%):</span>
              <span className="font-mono font-bold text-cyan-400">
                {fxPct >= 0 ? '+' : ''}{fxPct}%
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="100"
              step="5"
              value={fxPct}
              onChange={(e) => {
                setFxPct(Number(e.target.value));
                setActiveScenarioId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Slider 2: Satış Maliyeti Artışı */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Satış Maliyeti / Hammadde (%):</span>
              <span className="font-mono font-bold text-rose-400">
                +{cogsPct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={cogsPct}
              onChange={(e) => {
                setCogsPct(Number(e.target.value));
                setActiveScenarioId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Slider 3: Politika Faizi Artışı */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Politika Faizi (bps):</span>
              <span className="font-mono font-bold text-amber-400">
                {rateBps >= 0 ? '+' : ''}{rateBps} bps
              </span>
            </div>
            <input
              type="range"
              min="-500"
              max="2000"
              step="50"
              value={rateBps}
              onChange={(e) => {
                setRateBps(Number(e.target.value));
                setActiveScenarioId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Slider 4: Talep / Ciro Daralması */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Talep / Ciro Daralması (%):</span>
              <span className="font-mono font-bold text-rose-400">
                {demandPct >= 0 ? '-' : '+'}{Math.abs(demandPct)}%
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              step="5"
              value={demandPct}
              onChange={(e) => {
                setDemandPct(Number(e.target.value));
                setActiveScenarioId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        </div>
      </div>

      {/* 4. ETKİ KPI KARTLARI (4 Kolonlu Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Şok Altında Yeni Net Kâr */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ŞOK ALTINDA NET KÂR</span>
            <span className={`font-mono text-[11px] font-bold ${kpis.net_income_diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpis.net_income_diff >= 0 ? '+' : ''}₺{kpis.net_income_diff} Mrd
            </span>
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${kpis.stressed_net_income >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            ₺{kpis.stressed_net_income} Mrd
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Kâr Değişimi: <strong className={kpis.net_income_diff_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{kpis.net_income_diff_pct}%</strong>
          </div>
        </div>

        {/* KPI 2: Şok Altında Yeni FAVÖK */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ŞOK ALTINDA FAVÖK</span>
            <span className={`font-mono text-[11px] font-bold ${kpis.ebitda_diff_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpis.ebitda_diff_pct >= 0 ? '+' : ''}{kpis.ebitda_diff_pct}%
            </span>
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${kpis.stressed_ebitda >= 0 ? 'text-slate-100' : 'text-rose-400'}`}>
            ₺{kpis.stressed_ebitda} Mrd
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Başlangıç FAVÖK: ₺{kpis.base_ebitda} Mrd
          </div>
        </div>

        {/* KPI 3: Yeni Cari Oran */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>YENİ CARİ ORAN</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              kpis.stressed_current_ratio >= 1.0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {kpis.stressed_current_ratio >= 1.0 ? 'Yeterli' : 'Baskı'}
            </span>
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${kpis.stressed_current_ratio >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {kpis.stressed_current_ratio}x
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Başlangıç: {kpis.base_current_ratio}x
          </div>
        </div>

        {/* KPI 4: Dayanıklılık Durumu */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DAYANIKLILIK DURUMU</span>
            <ShieldAlert className={`w-3.5 h-3.5 ${kpis.stress_badge_class === 'negative' ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-sm font-bold truncate mt-1 ${
            kpis.stress_badge_class === 'negative' ? 'text-rose-400' : (kpis.stress_badge_class === 'warning' ? 'text-amber-400' : 'text-emerald-400')
          }`}>
            {kpis.stress_status.split(' ')[0]} {kpis.stress_status.split(' ')[1] || ''}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Net FX: ₺{exposures.net_fx_exposure_billion} Mrd
          </div>
        </div>
      </div>

      {/* 5. KÂR ERİMESİ ŞELALE (WATERFALL) GRAFİĞİ BİLEŞENİ */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Kâr Erimesi Şelale (Waterfall) Köprüsü
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                EBITDA & Net Kâr Duyarlılığı
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Başlangıç net kârından makro şokların erozyon etkisi ve nihai stres kârı.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
              <span className="text-slate-300">Pozitif Katkı</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span>
              <span className="text-slate-300">Kâr Erozyonu</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 inline-block"></span>
              <span className="text-slate-300">Net Bakiye</span>
            </span>
          </div>
        </div>

        {/* Recharts Waterfall Chart */}
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallChartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                interval={0}
                angle={-10}
                textAnchor="end"
              />
              <YAxis
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v) => `₺${v}B`}
              />
              <Tooltip content={<CustomWaterfallTooltip />} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              {/* Invisible Bottom spacer for waterfall alignment */}
              <Bar dataKey="bottom" stackId="a" fill="transparent" />
              {/* Visible Waterfall Bar */}
              <Bar dataKey="height" stackId="a" isAnimationActive={true}>
                {waterfallChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. SİMÜLASYON ÖNCESİ VS SONRASI KARŞILAŞTIRMA TABLOSU */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Bilanço Kalemleri Şok Etki Matrisi (Simülasyon Öncesi vs Sonrası)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Birim: ₺ Milyar</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700/60">
              <tr>
                <th className="py-2.5 px-3">Finansal Kalem</th>
                <th className="py-2.5 px-3">Mevcut Değer</th>
                <th className="py-2.5 px-3">Simüle Edilen Şok Değeri</th>
                <th className="py-2.5 px-3">Fark</th>
                <th className="py-2.5 px-3">Yüzdesel Değişim</th>
                <th className="py-2.5 px-3">Stres Durumu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {comparison_matrix.map((row, idx) => {
                const isDiffPos = row.diff_val >= 0;
                const isGood = row.is_primary ? isDiffPos : (row.metric.includes('Maliyet') || row.metric.includes('Gider') ? !isDiffPos : isDiffPos);

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      row.is_primary ? 'bg-cyan-950/20 font-bold border-l-2 border-l-cyan-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-100">
                      {row.metric}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {row.is_ratio ? `${row.base_val}x` : `₺${row.base_val.toFixed(2)}`}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {row.is_ratio ? `${row.stressed_val}x` : `₺${row.stressed_val.toFixed(2)}`}
                    </td>
                    <td className={`py-2.5 px-3 font-semibold ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {row.diff_val >= 0 ? '+' : ''}{row.is_ratio ? `${row.diff_val}x` : `₺${row.diff_val.toFixed(2)}`}
                    </td>
                    <td className={`py-2.5 px-3 ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {row.is_ratio ? '--' : `${row.diff_pct >= 0 ? '+' : ''}${row.diff_pct}%`}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {row.is_ratio ? (
                        row.stressed_val >= 1.0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold">GÜVENLİ</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 font-bold">LİKİDİTE RİSKİ</span>
                        )
                      ) : row.is_primary ? (
                        row.stressed_val >= 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold">KÂRLI</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 font-bold">ZARAR</span>
                        )
                      ) : (
                        isGood ? (
                          <span className="text-emerald-400 text-[10px] font-semibold">DAYANIKLI</span>
                        ) : (
                          <span className="text-rose-400 text-[10px] font-semibold">DARALMA</span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer İletim Notu */}
        <div className="mt-3.5 p-3 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Bilanço İletim Mekanizması:</strong> Net Döviz Pozisyonu (+₺{exposures.net_fx_exposure_billion} Mrd) kur şokunu tamponlar; değişken faizli borç stoku (%{exposures.floating_debt_share_pct}) faiz hassasiyetini belirler.
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Monte Carlo & What-If Laboratuvarı v3.2
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressTestSimulationLab;
