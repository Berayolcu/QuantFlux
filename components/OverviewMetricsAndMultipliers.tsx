import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  ShieldAlert, 
  Activity, 
  Database, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw 
} from 'lucide-react';

interface KPIData {
  raw: number;
  formatted: string;
  yoy_change: number;
  is_positive: boolean;
}

interface MultiplesData {
  pe: number;
  pb: number;
  ev_ebitda: number;
  current_ratio: number;
  net_debt_ebitda: number;
  roe: number;
  roa: number;
  eps: number;
  bvps: number;
}

interface AnnualizedStatement {
  period: string;
  disclosure_date: string;
  currentAssets: number;
  fixedAssets: number;
  totalAssets: number;
  shortTermLiab: number;
  longTermLiab: number;
  equity: number;
  revenue: number;
  ebitda: number;
  netIncome: number;
  currentAssets_mrd: number;
  fixedAssets_mrd: number;
  totalAssets_mrd: number;
  shortTermLiab_mrd: number;
  equity_mrd: number;
  netIncome_mrd: number;
}

interface OverviewResponse {
  ticker: string;
  name: string;
  sector: string;
  bist: string;
  price: number;
  shares: number;
  market_cap: number;
  market_cap_formatted: string;
  enterprise_value: number;
  enterprise_value_formatted: string;
  kpis: {
    net_income: KPIData;
    equity: KPIData;
    ebitda: KPIData;
    total_assets: KPIData;
  };
  multiples: MultiplesData;
  annualized_balance_sheet: AnnualizedStatement[];
}

export default function OverviewMetricsAndMultipliers({ ticker = "THYAO" }: { ticker?: string }) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchOverview() {
      try {
        setLoading(true);
        const res = await fetch(`/api/terminal/overview/${ticker}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Overview fetch failed`);
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOverview();
    return () => { isMounted = false; };
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 font-mono text-sm">
        <span className="animate-spin mr-3">⟳</span> QuantFlux Finansal Çarpanlar Hesaplanıyor...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-sm">
        Hata: {error || "Finansal veriler alınamadı."}
      </div>
    );
  }

  const { kpis, multiples, annualized_balance_sheet } = data;

  return (
    <div className="space-y-6">
      {/* 1. ÜST 4 METRİK KARTI (NET KÂR, ÖZKAYNAKLAR, FAVÖK, AKTİF TOPLAMI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Kar / Zarar */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 backdrop-blur rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              kpis.net_income.is_positive 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}>
              {kpis.net_income.is_positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {kpis.net_income.is_positive ? "+" : ""}%{Math.abs(kpis.net_income.yoy_change)}
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Net Kâr / Zarar (Net Income)</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono tracking-tight">{kpis.net_income.formatted}</div>
          </div>
        </div>

        {/* Özkaynaklar */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 backdrop-blur rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              kpis.equity.is_positive 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}>
              {kpis.equity.is_positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {kpis.equity.is_positive ? "+" : ""}%{Math.abs(kpis.equity.yoy_change)}
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Özkaynaklar (Equity)</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tracking-tight">{kpis.equity.formatted}</div>
          </div>
        </div>

        {/* FAVÖK */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 backdrop-blur rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              kpis.ebitda.is_positive 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}>
              {kpis.ebitda.is_positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {kpis.ebitda.is_positive ? "+" : ""}%{Math.abs(kpis.ebitda.yoy_change)}
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">FAVÖK (EBITDA)</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono tracking-tight">{kpis.ebitda.formatted}</div>
          </div>
        </div>

        {/* Aktif Toplamı */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 backdrop-blur rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Database className="w-5 h-5" />
            </div>
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              kpis.total_assets.is_positive 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}>
              {kpis.total_assets.is_positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {kpis.total_assets.is_positive ? "+" : ""}%{Math.abs(kpis.total_assets.yoy_change)}
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Aktif Toplamı (Total Assets)</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono tracking-tight">{kpis.total_assets.formatted}</div>
          </div>
        </div>
      </div>

      {/* 2. SOLDA TEMEL ANALİZ & ÇARPANLAR, SAĞDA YILLIKLANDIRILMIŞ BİLANÇO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Temel Analiz & Çarpanlar Tablosu */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 backdrop-blur rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div className="border-b border-zinc-800 pb-4 mb-4">
            <h3 className="text-base font-semibold text-white">Temel Analiz & Çarpanlar ({ticker})</h3>
            <p className="text-xs text-zinc-400 mt-1">Canlı piyasa fiyatı (₺{data.price}) ve TTM UFRS rasyoları.</p>
          </div>
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">F/K (Fiyat/Kazanç - TTM)</span>
              <span className="font-mono font-bold text-cyan-400">{multiples.pe}x</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">PD/DD (Piyasa/Defter Değeri)</span>
              <span className="font-mono font-bold text-white">{multiples.pb}x</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">FD/FAVÖK (Firma Değeri/FAVÖK)</span>
              <span className="font-mono font-bold text-white">{multiples.ev_ebitda}x</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Cari Oran (Likidite)</span>
              <span className={`font-mono font-bold ${multiples.current_ratio >= 1.0 ? "text-emerald-400" : "text-rose-400"}`}>
                {multiples.current_ratio} ({multiples.current_ratio >= 1.0 ? "Güçlü" : "Düşük"})
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Net Borç / FAVÖK</span>
              <span className="font-mono font-bold text-indigo-400">{multiples.net_debt_ebitda}x</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-zinc-400">ROE (Özkaynak Kârlılığı)</span>
              <span className="font-mono font-bold text-emerald-400">%{multiples.roe}</span>
            </div>
          </div>
        </div>

        {/* Yıllıklandırılmış Bilanço Kalemleri (TL Milyar) */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 backdrop-blur rounded-xl p-6 shadow-xl lg:col-span-2 overflow-hidden flex flex-col">
          <div className="border-b border-zinc-800 pb-4 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-white">Yıllıklandırılmış Bilanço Kalemleri (TL Milyar)</h3>
              <p className="text-xs text-zinc-400 mt-1">Dönemler bazında UFRS varlık, borç ve kârlılık dağılımı.</p>
            </div>
            <span className="text-xs bg-zinc-800 text-cyan-400 px-2.5 py-1 rounded-md font-mono">
              Piyasa Değeri: {data.market_cap_formatted}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950/60 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Dönem</th>
                  <th className="py-2.5 px-3">Dönen Varlık</th>
                  <th className="py-2.5 px-3">Duran Varlık</th>
                  <th className="py-2.5 px-3">Toplam Aktif</th>
                  <th className="py-2.5 px-3">Kısa V. Yük.</th>
                  <th className="py-2.5 px-3">Özkaynaklar</th>
                  <th className="py-2.5 px-3">Net Kâr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {annualized_balance_sheet.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{row.period}</td>
                    <td className="py-2.5 px-3 text-zinc-300">₺{row.currentAssets_mrd} Mrd</td>
                    <td className="py-2.5 px-3 text-zinc-300">₺{row.fixedAssets_mrd} Mrd</td>
                    <td className="py-2.5 px-3 font-semibold text-white">₺{row.totalAssets_mrd} Mrd</td>
                    <td className="py-2.5 px-3 text-zinc-300">₺{row.shortTermLiab_mrd} Mrd</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">₺{row.equity_mrd} Mrd</td>
                    <td className={`py-2.5 px-3 font-bold ${row.netIncome_mrd >= 0 ? "text-cyan-300" : "text-rose-400"}`}>
                      ₺{row.netIncome_mrd} Mrd
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
