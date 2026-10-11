"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  ShieldAlert,
  LineChart,
  Calendar,
  GitMerge,
  Database,
  RotateCcw,
  CheckCheck,
  Wifi,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Server
} from "lucide-react";

export interface TimeSeriesConfig {
  lstm_lookback: number;
  forecast_horizon: number;
  confidence_interval: number;
  lstm_epochs: number;
  learning_rate: number;
  batch_size: number;
  arima_auto: boolean;
}

export interface RiskVaRConfig {
  students_t_df: number;
  history_window: number;
  var_confidence: number;
  volatility_model: string;
  ewma_lambda: number;
  mc_paths: number;
}

export interface EventStudyConfig {
  estimation_window: number;
  event_window_half: number;
  benchmark: string;
  capm_min_obs: number;
}

export interface RegressionConfig {
  vif_threshold: number;
  significance_alpha: number;
  cov_type: string;
  active_factors: string[];
}

export interface ModelConfigPayload {
  time_series: TimeSeriesConfig;
  risk_var: RiskVaRConfig;
  event_study: EventStudyConfig;
  regression: RegressionConfig;
  meta: {
    profile_name: string;
    updated_at: string;
    version: string;
  };
}

const DEFAULT_CONFIG: ModelConfigPayload = {
  time_series: {
    lstm_lookback: 60,
    forecast_horizon: 20,
    confidence_interval: 0.95,
    lstm_epochs: 100,
    learning_rate: 0.001,
    batch_size: 32,
    arima_auto: true
  },
  risk_var: {
    students_t_df: 5.0,
    history_window: 252,
    var_confidence: 0.99,
    volatility_model: "garch",
    ewma_lambda: 0.94,
    mc_paths: 50000
  },
  event_study: {
    estimation_window: 100,
    event_window_half: 5,
    benchmark: "XU100",
    capm_min_obs: 60
  },
  regression: {
    vif_threshold: 5.0,
    significance_alpha: 0.05,
    cov_type: "newey-west",
    active_factors: ["MKT", "SMB", "HML", "MOM", "USD_TRY", "INTEREST_RATE"]
  },
  meta: {
    profile_name: "QuantFlux Production v3.2",
    updated_at: new Date().toISOString(),
    version: "3.2"
  }
};

const PRESET_PROFILES = [
  {
    id: "prod",
    name: "Üretim (Production v3.2)",
    desc: "Dengeli piyasa modeli, 60 gün LSTM, t-Student df=5.0 ve VIF=5.0",
    config: DEFAULT_CONFIG
  },
  {
    id: "crisis",
    name: "Kriz & Yüksek Volatilite",
    desc: "Ağır leptokurtik kuyruk (df=3.0), %99.9 VaR, 90 gün LSTM lookback",
    config: {
      ...DEFAULT_CONFIG,
      time_series: { ...DEFAULT_CONFIG.time_series, lstm_lookback: 90, forecast_horizon: 30, confidence_interval: 0.99 },
      risk_var: { ...DEFAULT_CONFIG.risk_var, students_t_df: 3.0, var_confidence: 0.999, history_window: 504 },
      regression: { ...DEFAULT_CONFIG.regression, vif_threshold: 3.5, significance_alpha: 0.01 }
    }
  },
  {
    id: "hft",
    name: "Kısa Vade & Yüksek Frekans",
    desc: "30 gün kısa lookback, 10 gün projeksiyon ufku, hızlı adaptasyon",
    config: {
      ...DEFAULT_CONFIG,
      time_series: { ...DEFAULT_CONFIG.time_series, lstm_lookback: 30, forecast_horizon: 10, confidence_interval: 0.90 },
      risk_var: { ...DEFAULT_CONFIG.risk_var, history_window: 126, students_t_df: 6.0 },
      event_study: { ...DEFAULT_CONFIG.event_study, event_window_half: 3, estimation_window: 60 }
    }
  }
];

export default function ModelSettingsPanel({
  apiUrl = "http://localhost:8000"
}: {
  apiUrl?: string;
}) {
  const [config, setConfig] = useState<ModelConfigPayload>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingApi, setTestingApi] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [dbSynced, setDbSynced] = useState<boolean>(false);

  // Initial Load from SQLite Backend or LocalStorage
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const res = await fetch(`${apiUrl}/api/model-configs/active`);
        if (res.ok) {
          const data: ModelConfigPayload = await res.json();
          if (isMounted) {
            setConfig(data);
            setDbSynced(true);
            try {
              localStorage.setItem("quantflux_model_configs_v32", JSON.stringify(data));
            } catch (e) {}
          }
          return;
        }
      } catch (err) {
        console.warn("[ModelSettings] Backend unreachable, falling back to LocalStorage:", err);
      }

      // LocalStorage Fallback
      try {
        const stored = localStorage.getItem("quantflux_model_configs_v32");
        if (stored && isMounted) {
          setConfig(JSON.parse(stored));
        }
      } catch (e) {}

      if (isMounted) {
        setLoading(false);
      }
    }

    loadConfig().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Save Config Handler
  const handleSave = async () => {
    setSaving(true);
    const updatedPayload = {
      ...config,
      meta: {
        ...config.meta,
        updated_at: new Date().toISOString()
      }
    };

    // 1. LocalStorage update
    try {
      localStorage.setItem("quantflux_model_configs_v32", JSON.stringify(updatedPayload));
    } catch (e) {}

    // 2. Global Event Broadcast
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("quantflux:config-updated", { detail: updatedPayload })
      );
    }

    // 3. SQLite Persistence via API
    try {
      const res = await fetch(`${apiUrl}/api/model-configs/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) {
        const json = await res.json();
        setConfig(json.config || updatedPayload);
        setDbSynced(true);
        showToast("Model hiperparametreleri SQLite (model_configs) ve LocalStorage'a başarıyla kaydedildi.", "success");
      } else {
        showToast("Ayarlar tarayıcıda kaydedildi, backend yanıt kodu: " + res.status, "info");
      }
    } catch (err) {
      showToast("Ayarlar yerel modda (LocalStorage) kaydedildi ve tüm sekmelere uygulandı.", "info");
    } finally {
      setSaving(false);
    }
  };

  // Reset Handler
  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/model-configs/reset`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setConfig(json.config || DEFAULT_CONFIG);
        setDbSynced(true);
        try {
          localStorage.setItem("quantflux_model_configs_v32", JSON.stringify(json.config || DEFAULT_CONFIG));
        } catch (e) {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("quantflux:config-updated", { detail: json.config || DEFAULT_CONFIG })
          );
        }
        showToast("Tüm kantitatif model parametreleri fabrika ayarlarına sıfırlandı.", "info");
        return;
      }
    } catch (err) {
      console.warn("Reset API error:", err);
    }

    // Fallback reset
    setConfig(DEFAULT_CONFIG);
    try {
      localStorage.setItem("quantflux_model_configs_v32", JSON.stringify(DEFAULT_CONFIG));
    } catch (e) {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("quantflux:config-updated", { detail: DEFAULT_CONFIG })
      );
    }
    showToast("Parametreler varsayılan değerlere sıfırlandı.", "info");
    setSaving(false);
  };

  // Preset Selection
  const applyPreset = (presetConfig: ModelConfigPayload, name: string) => {
    setConfig({
      ...presetConfig,
      meta: {
        ...presetConfig.meta,
        profile_name: name,
        updated_at: new Date().toISOString()
      }
    });
    showToast(`"${name}" profili yüklendi. Uygulamak için "Kaydet" butonuna tıklayın.`, "info");
  };

  // API Health Check
  const testApiConnection = async () => {
    setTestingApi(true);
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        setDbSynced(true);
        showToast("FastAPI Python backend bağlantısı aktif ve hazır (HTTP 200 OK)!", "success");
      } else {
        showToast(`FastAPI bağlandı fakat beklenmeyen durum: ${res.status}`, "info");
      }
    } catch (err) {
      showToast("FastAPI çevrimdışı. İstemci Quant motoru bağımsız modda çalışıyor.", "info");
    } finally {
      setTestingApi(false);
    }
  };

  // Toggle factor checkbox
  const toggleFactor = (factor: string) => {
    const current = config.regression.active_factors || [];
    const updated = current.includes(factor)
      ? current.filter((f) => f !== factor)
      : [...current, factor];
    setConfig({
      ...config,
      regression: { ...config.regression, active_factors: updated }
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-cyan-400">
        <Sliders className="h-6 w-6 animate-spin mr-2" />
        <span>Model konfigürasyonları yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-cyan-400" />
              Kantitatif Model Ayarları & Hiperparametre Laboratuvarı
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              v{config.meta.version}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              <Database className="h-3 w-3" />
              {dbSynced ? "SQLite: Senkronize" : "Yerel Mod"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            LSTM tahmin ufkunu, Student's t kuyruk kalınlığını (df), Event Study penceresini ve çoklu bağlantı (VIF) sınırlarını dinamik kalibre edin.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Varsayılana Sıfırla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-90 rounded-lg shadow-lg shadow-cyan-500/10 transition"
          >
            <CheckCheck className="h-4 w-4" />
            {saving ? "Kaydediliyor..." : "Ayarları Kaydet & Uygula"}
          </button>
        </div>
      </div>

      {/* Status Notification Toast */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : statusMessage.type === "error"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-cyan-950/40 border-cyan-500/40 text-cyan-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-cyan-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Preset Profiles Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-200">Hazır Makro Profil Seçimi:</span>
          <span className="text-xs text-slate-400">Aktif: <strong className="text-cyan-400">{config.meta.profile_name}</strong></span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.config, p.name)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 rounded-md border border-slate-700/50 hover:border-cyan-500/40 transition"
              title={p.desc}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Core Parameter Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: Time Series & LSTM Deep Learning */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                <LineChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">1. LSTM & Zaman Serisi Modeli</h3>
                <p className="text-[11px] text-slate-400">PyTorch Sequential & ARIMA Grid Search</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              DL Engine
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Lookback Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">Lookback Penceresi (Geçmiş Bar)</label>
                <span className="text-cyan-400 font-mono font-bold">{config.time_series.lstm_lookback} Gün</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={config.time_series.lstm_lookback}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    time_series: { ...config.time_series, lstm_lookback: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Model eğitiminde kullanılan geriye dönük işlem günü sayısı.</span>
            </div>

            {/* Forecast Horizon Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">Tahmin Ufku (Forecast Horizon)</label>
                <span className="text-cyan-400 font-mono font-bold">{config.time_series.forecast_horizon} Gün</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={config.time_series.forecast_horizon}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    time_series: { ...config.time_series, forecast_horizon: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Geleceğe yönelik simüle edilecek bar sayısı (t + n).</span>
            </div>

            {/* Confidence Interval */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">Güven Aralığı Bandı</label>
              <select
                value={config.time_series.confidence_interval}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    time_series: { ...config.time_series, confidence_interval: parseFloat(e.target.value) }
                  })
                }
                className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-cyan-400 focus:outline-none"
              >
                <option value={0.90}>%90 Güven Aralığı</option>
                <option value={0.95}>%95 Güven Aralığı (Önerilen)</option>
                <option value={0.99}>%99 Güven Aralığı (Geniş Band)</option>
              </select>
            </div>

            {/* Epochs & Learning Rate */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Eğitim Döngüsü (Epochs)</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  step="10"
                  value={config.time_series.lstm_epochs}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      time_series: { ...config.time_series, lstm_epochs: parseInt(e.target.value) || 100 }
                    })
                  }
                  className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1">Öğrenme Oranı (LR)</label>
                <select
                  value={config.time_series.learning_rate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      time_series: { ...config.time_series, learning_rate: parseFloat(e.target.value) }
                    })
                  }
                  className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-cyan-400 focus:outline-none font-mono"
                >
                  <option value={0.0001}>0.0001 (Yavaş / Stabil)</option>
                  <option value={0.001}>0.001 (Adam Standart)</option>
                  <option value={0.01}>0.01 (Agresif)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Risk & Parametric VaR (Student's t Fat-Tail) */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">2. Risk & VaR Motoru (Fat-Tail)</h3>
                <p className="text-[11px] text-slate-400">Student's t Dağılımı & GARCH(1,1)</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Basel III
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Student's t df Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">Student's t Serbestlik Derecesi (df)</label>
                <span className="text-rose-400 font-mono font-bold">
                  {config.risk_var.students_t_df.toFixed(1)} {config.risk_var.students_t_df <= 6 ? "(Ağır Kuyruk)" : "(Normal Yakın)"}
                </span>
              </div>
              <input
                type="range"
                min="2.5"
                max="30.0"
                step="0.5"
                value={config.risk_var.students_t_df}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    risk_var: { ...config.risk_var, students_t_df: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                df &rarr; 3: Şiddetli leptokurtik piyasa kuyruğu, df &rarr; 30: Standart Gauss eğrisi.
              </span>
            </div>

            {/* Risk History Window */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">Tarihsel Risk Penceresi</label>
                <span className="text-rose-400 font-mono font-bold">
                  {config.risk_var.history_window} Gün (~{(config.risk_var.history_window / 252).toFixed(1)} Yıl)
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="504"
                step="21"
                value={config.risk_var.history_window}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    risk_var: { ...config.risk_var, history_window: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Tarihsel ve parametrik volatilite kovaryans penceresi.</span>
            </div>

            {/* VaR Confidence Level */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">VaR Güven Düzeyi</label>
              <select
                value={config.risk_var.var_confidence}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    risk_var: { ...config.risk_var, var_confidence: parseFloat(e.target.value) }
                  })
                }
                className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-rose-400 focus:outline-none"
              >
                <option value={0.95}>%95 Güven Düzeyi</option>
                <option value={0.99}>%99 Güven Düzeyi (Basel III Zorunlu)</option>
                <option value={0.999}>%99.9 Ekstrem Kuyruk Riski</option>
              </select>
            </div>

            {/* Volatility Model & EWMA lambda */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Volatilite Modeli</label>
                <select
                  value={config.risk_var.volatility_model}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      risk_var: { ...config.risk_var, volatility_model: e.target.value }
                    })
                  }
                  className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-rose-400 focus:outline-none"
                >
                  <option value="garch">GARCH(1,1)</option>
                  <option value="egarch">EGARCH (Asymmetric)</option>
                  <option value="ewma">EWMA (RiskMetrics)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1">EWMA Decay (&lambda;)</label>
                <input
                  type="number"
                  min="0.80"
                  max="0.99"
                  step="0.01"
                  value={config.risk_var.ewma_lambda}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      risk_var: { ...config.risk_var, ewma_lambda: parseFloat(e.target.value) || 0.94 }
                    })
                  }
                  className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-rose-400 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: Event Study (Bilanço Olay Çalışması) */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">3. Bilanço Olay Çalışması (Event Study)</h3>
                <p className="text-[11px] text-slate-400">CAPM OLS & Anormal Kümülatif Getiri (CAR)</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Econometrics
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Estimation Window Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">Tahmin Penceresi (Estimation Window)</label>
                <span className="text-emerald-400 font-mono font-bold">
                  {config.event_study.estimation_window} İşlem Günü
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="180"
                step="10"
                value={config.event_study.estimation_window}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    event_study: { ...config.event_study, estimation_window: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                CAPM piyasa modeli (alpha, beta) kalibrasyon aralığı (örn: [-{config.event_study.estimation_window + 20}, -21]).
              </span>
            </div>

            {/* Event Window Half Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">Olay Penceresi Yarı Genişliği ([-t, +t])</label>
                <span className="text-emerald-400 font-mono font-bold">
                  [-{config.event_study.event_window_half}, +{config.event_study.event_window_half}] Gün
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={config.event_study.event_window_half}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    event_study: { ...config.event_study, event_window_half: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Bilanço KAP açıklama günü (t0) merkezli CAR hesaplama aralığı.
              </span>
            </div>

            {/* Benchmark Index */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">Benchmark Piyasa Endeksi</label>
              <select
                value={config.event_study.benchmark}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    event_study: { ...config.event_study, benchmark: e.target.value }
                  })
                }
                className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-emerald-400 focus:outline-none font-mono"
              >
                <option value="XU100">BIST 100 Endeksi (XU100)</option>
                <option value="XU030">BIST 30 Endeksi (XU030)</option>
              </select>
            </div>

            {/* Min Obs */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">Minimum CAPM Gözlem Filtresi</label>
              <select
                value={config.event_study.capm_min_obs}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    event_study: { ...config.event_study, capm_min_obs: parseInt(e.target.value) }
                  })
                }
                className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-emerald-400 focus:outline-none"
              >
                <option value={40}>40 İşlem Günü</option>
                <option value={60}>60 İşlem Günü (Önerilen)</option>
                <option value={80}>80 İşlem Günü</option>
              </select>
            </div>
          </div>
        </div>

        {/* CARD 4: Multi-Factor Regression & VIF */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
                <GitMerge className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">4. Çok Faktörlü Panel Regresyon (VIF)</h3>
                <p className="text-[11px] text-slate-400">Statsmodels OLS & Newey-West HAC</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Factor Engine
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* VIF Threshold Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">VIF Çoklu Bağlantı Eşiği</label>
                <span className="text-indigo-400 font-mono font-bold">
                  {config.regression.vif_threshold.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="2.0"
                max="10.0"
                step="0.5"
                value={config.regression.vif_threshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    regression: { ...config.regression, vif_threshold: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                VIF &gt; Eşik olan bağımsız değişkenler çoklu bağlantı (multicollinearity) riski nedeniyle elenir.
              </span>
            </div>

            {/* Significance Level (alpha) */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">Anlamlılık Düzeyi (&alpha;)</label>
              <select
                value={config.regression.significance_alpha}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    regression: { ...config.regression, significance_alpha: parseFloat(e.target.value) }
                  })
                }
                className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-indigo-400 focus:outline-none font-mono"
              >
                <option value={0.01}>&alpha; = 0.01 (%99 Güven / Katı Filtre)</option>
                <option value={0.05}>&alpha; = 0.05 (%95 Güven / Tavsiye Edilen)</option>
                <option value={0.10}>&alpha; = 0.10 (%90 Güven)</option>
              </select>
            </div>

            {/* Robust Covariance Matrix */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">Kovaryans Düzeltmesi (Standart Hata)</label>
              <select
                value={config.regression.cov_type}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    regression: { ...config.regression, cov_type: e.target.value }
                  })
                }
                className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-lg p-2 focus:border-indigo-400 focus:outline-none"
              >
                <option value="newey-west">Newey-West HAC (Otokorelasyon & Heteroskedastisite)</option>
                <option value="white">White Heteroskedasticity (HC1)</option>
                <option value="ols">Standart OLS Homoskedastik</option>
              </select>
            </div>

            {/* Active Factor Checkboxes */}
            <div>
              <label className="text-slate-300 font-medium block mb-1.5">Aktif BIST Risk Faktörleri</label>
              <div className="flex flex-wrap gap-2">
                {["MKT", "SMB", "HML", "MOM", "USD_TRY", "INTEREST_RATE"].map((f) => {
                  const isChecked = config.regression.active_factors?.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFactor(f)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono border transition ${
                        isChecked
                          ? "bg-indigo-950/80 border-indigo-500/50 text-indigo-300 font-bold"
                          : "bg-slate-800/50 border-slate-700/50 text-slate-500 line-through"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 5: Persistence & FastAPI Backend Connectivity */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-200">
            <Server className="h-4 w-4 text-amber-400" />
            <span className="font-semibold">Büyük Veri & SQLite / FastAPI Çift Yönlü Kalıcılık Hattı</span>
          </div>
          <button
            onClick={testApiConnection}
            disabled={testingApi}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/50 rounded-lg transition"
          >
            <Wifi className="h-3.5 w-3.5" />
            {testingApi ? "Test Ediliyor..." : "FastAPI Backend Test Et"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-500 block text-[10px]">VERİTABANI TABLOSU:</span>
            <span className="text-emerald-400 font-semibold">quantflux.db &rarr; model_configs</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-500 block text-[10px]">BROWSER ÖNBELLEK:</span>
            <span className="text-cyan-400 font-semibold">localStorage[quantflux_model_configs_v32]</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-500 block text-[10px]">EVENT BROADCAST:</span>
            <span className="text-amber-400 font-semibold">quantflux:config-updated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
