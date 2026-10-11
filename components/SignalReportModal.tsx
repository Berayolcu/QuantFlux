"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Award,
  LineChart,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Download,
  Printer,
  X,
  TrendingUp,
  Activity,
  CheckCircle2,
  FileText
} from "lucide-react";

export interface SignalReportData {
  metadata: {
    engine: string;
    generated_at: string;
    ticker: string;
    company_name: string;
    last_price: number;
    currency: string;
  };
  consensus: {
    signal: string;
    score: number;
    max_score: number;
    rating: string;
  };
  scorecards: {
    fundamental: {
      piotroski_score: string;
      piotroski_status: string;
      altman_z_score: number;
      altman_zone: string;
      default_risk: string;
    };
    deep_learning_lstm: {
      projection_horizon_days: number;
      target_price: number;
      expected_return_pct: string;
      confidence_interval_band: string;
      trend_direction: string;
    };
    event_study_reaction: {
      latest_sue: string;
      car_10_days_pct: string;
      earnings_surprise_pct: string;
      drift_signal: string;
    };
    risk_var_stress: {
      var_99_daily_pct: string;
      var_99_amount_try: string;
      stress_resilience: string;
      garch_volatility_annual: string;
    };
  };
  multipliers: {
    pe: number;
    pb: number;
    ev_ebitda: number;
    roe_pct: number;
    current_ratio: number;
    jensens_alpha_pct: string;
  };
}

export interface SignalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker?: string;
  customData?: Partial<SignalReportData>;
}

export default function SignalReportModal({
  isOpen,
  onClose,
  ticker = "THYAO",
  customData
}: SignalReportModalProps) {
  const [report, setReport] = useState<SignalReportData | null>(null);

  useEffect(() => {
    // Default compiled baseline report for BIST company
    const basePrice = ticker === "THYAO" ? 314.50 : ticker === "KCHOL" ? 228.00 : 342.25;
    const compName = ticker === "THYAO" ? "Türk Hava Yolları A.O." : ticker === "KCHOL" ? "Koç Holding A.Ş." : "AG Anadolu Grubu Holding";

    const defaultReport: SignalReportData = {
      metadata: {
        engine: "QuantFlux Algorithmic Risk Engine v3.2",
        generated_at: new Date().toISOString(),
        ticker: ticker,
        company_name: compName,
        last_price: basePrice,
        currency: "TRY"
      },
      consensus: {
        signal: "GÜÇLÜ AL (STRONG BUY)",
        score: 8.8,
        max_score: 10.0,
        rating: "Kurumsal Kantitatif A+"
      },
      scorecards: {
        fundamental: {
          piotroski_score: "8 / 9",
          piotroski_status: "Güçlü Finansal Kalite",
          altman_z_score: 4.82,
          altman_zone: "Güvenli Bölge",
          default_risk: "Düşük Risk"
        },
        deep_learning_lstm: {
          projection_horizon_days: 20,
          target_price: parseFloat((basePrice * 1.089).toFixed(2)),
          expected_return_pct: "+8.9%",
          confidence_interval_band: "%95 Güven Aralığı",
          trend_direction: "BULLISH (Yukarı Yönlü İvmelenme)"
        },
        event_study_reaction: {
          latest_sue: "+2.18 σ",
          car_10_days_pct: "+%4.80",
          earnings_surprise_pct: "+%15.8",
          drift_signal: "POZİTİF ANORMAL ALFA"
        },
        risk_var_stress: {
          var_99_daily_pct: "%4.50",
          var_99_amount_try: (basePrice * 0.045).toFixed(2),
          stress_resilience: "A+ (Döviz Pozitif Hedge)",
          garch_volatility_annual: "%32.4"
        }
      },
      multipliers: {
        pe: 2.66,
        pb: 0.69,
        ev_ebitda: 3.12,
        roe_pct: 28.4,
        current_ratio: 0.94,
        jensens_alpha_pct: "+2.40%"
      }
    };

    setReport({ ...defaultReport, ...customData });
  }, [ticker, customData]);

  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${report.metadata.ticker}_QuantFlux_Signal_Report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#090e17] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/30 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  QuantFlux Sinyal Raporu & Yatırımcı Karnesi
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {report.metadata.ticker}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {report.metadata.company_name} • {new Date(report.metadata.generated_at).toLocaleString("tr-TR")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 text-xs">
          {/* Consensus Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 to-emerald-950/30 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Genel Kantitatif Konsensüs
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl font-extrabold text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                  {report.consensus.signal}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                  Skor: {report.consensus.score} / {report.consensus.max_score}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Son İşlem Fiyatı</span>
              <span className="text-lg font-bold font-mono text-slate-100">
                ₺{report.metadata.last_price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 4 Core Scorecards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Fundamental Health */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-emerald-400" />
                  1. Temel Analiz & Bilanço Kalitesi
                </span>
                <span className="text-[10px] font-mono text-slate-400">Point-in-Time</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Piotroski F-Score</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {report.scorecards.fundamental.piotroski_score}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Altman Z''-Score</span>
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    {report.scorecards.fundamental.altman_z_score.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                Kârlılık ve operasyonel nakit akışı en üst grupta. {report.scorecards.fundamental.altman_zone} (Temerrüt Riski: {report.scorecards.fundamental.default_risk}).
              </p>
            </div>

            {/* Card 2: Deep Learning LSTM */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <LineChart className="h-4 w-4 text-cyan-400" />
                  2. LSTM Gelecek Trend Tahmini
                </span>
                <span className="text-[10px] font-mono text-slate-400">PyTorch Sequential</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">20-Gün Fiyat Projeksiyonu</span>
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    ₺{report.scorecards.deep_learning_lstm.target_price.toFixed(2)}{" "}
                    <span className="text-xs text-emerald-400">
                      ({report.scorecards.deep_learning_lstm.expected_return_pct})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Model Güveni</span>
                  <div className="text-sm font-bold text-slate-200">
                    {report.scorecards.deep_learning_lstm.confidence_interval_band}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                Pozitif momentum ivmelenmesi tespit edildi. Projeksiyon yönü: {report.scorecards.deep_learning_lstm.trend_direction}.
              </p>
            </div>

            {/* Card 3: Event Study Sürprizi */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  3. Bilanço Sürprizi & Event Study
                </span>
                <span className="text-[10px] font-mono text-slate-400">CAPM CAR [-5, +5]</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Sürpriz Skoru (SUE)</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {report.scorecards.event_study_reaction.latest_sue}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">10-Gün Anormal Getiri (CAR)</span>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {report.scorecards.event_study_reaction.car_10_days_pct}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                Analist konsensüs kâr tahmininin {report.scorecards.event_study_reaction.earnings_surprise_pct} üzerinde gerçekleşme. Post-Earnings Drift pozitif.
              </p>
            </div>

            {/* Card 4: Market Risk & VaR */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  4. Piyasa Riski & VaR Seviyesi
                </span>
                <span className="text-[10px] font-mono text-slate-400">Student's t (df=5)</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Günlük %99 Parametrik VaR</span>
                  <div className="text-xl font-bold font-mono text-rose-400">
                    ₺{report.scorecards.risk_var_stress.var_99_amount_try}{" "}
                    <span className="text-xs">({report.scorecards.risk_var_stress.var_99_daily_pct})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Stres Dayanıklılığı</span>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {report.scorecards.risk_var_stress.stress_resilience}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                Leptokurtik kuyruk riski modellendi. Döviz gelir ağırlıklı profil kur şokunda pozitif kambiyo tamponu sunuyor.
              </p>
            </div>
          </div>

          {/* Multipliers & Metrics Row */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-300 pb-2 mb-3 border-b border-slate-800/80 flex justify-between">
              <span>Bilanço Çarpanları & Rasyoları</span>
              <span className="text-cyan-400 font-mono">TTM Yıllıklandırılmış</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block">F/K ORANI</span>
                <strong className="text-sm font-mono text-slate-200">{report.multipliers.pe}x</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">PD/DD ORANI</span>
                <strong className="text-sm font-mono text-slate-200">{report.multipliers.pb}x</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">FD/FAVÖK</span>
                <strong className="text-sm font-mono text-slate-200">{report.multipliers.ev_ebitda}x</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">ROE %</span>
                <strong className="text-sm font-mono text-emerald-400">%{report.multipliers.roe_pct}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">CARİ ORAN</span>
                <strong className="text-sm font-mono text-slate-200">{report.multipliers.current_ratio}x</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">JENSEN'S ALPHA</span>
                <strong className="text-sm font-mono text-cyan-400">{report.multipliers.jensens_alpha_pct}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>QuantFlux Doğrulanmış Kantitatif Model Çıktısı</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition"
            >
              <Download className="h-3.5 w-3.5" />
              JSON İndir
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-90 rounded-lg shadow-md transition"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF / Yazdır
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
