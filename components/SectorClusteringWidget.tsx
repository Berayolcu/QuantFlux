import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import {
  Network,
  Crosshair,
  TrendingUp,
  ShieldAlert,
  Gem,
  Activity,
  Layers,
  RefreshCw,
  Info,
  ChevronRight,
  Filter
} from 'lucide-react';

export interface CompanyPoint {
  ticker: string;
  name: string;
  sector: string;
  x_roe: number;
  y_debt_equity: number;
  size_market_cap: number;
  pe: number;
  revenue_growth: number;
  current_ratio: number;
  cluster_id: number;
  cluster_name: string;
  cluster_color: string;
  is_selected?: boolean;
  is_sector_peer?: boolean;
}

export interface ClusterSummary {
  id: number;
  name: string;
  badge: string;
  color: string;
  description: string;
  strategy: string;
  risk_profile: string;
  company_count: number;
  tickers: string[];
  avg_roe: number;
  avg_growth: number;
  avg_pe: number;
  avg_debt: number;
}

export interface RadarAxisData {
  axis: string;
  selected: number;
  sector_avg: number;
  cluster_avg: number;
  unit: string;
  raw_selected: string;
  raw_sector: string;
}

export interface ClusteringResponse {
  selected_company: {
    ticker: string;
    name: string;
    sector: string;
    bist: string;
    market_cap: number;
    price: number;
    roe: number;
    revenue_growth: number;
    debt_to_equity: number;
    pe: number;
    current_ratio: number;
    cluster_id: number;
    cluster_name: string;
    cluster_color: string;
    cluster_badge: string;
  };
  clusters: ClusterSummary[];
  scatter_plot: {
    title: string;
    x_axis_title: string;
    y_axis_title: string;
    points: CompanyPoint[];
  };
  radar_chart: {
    title: string;
    categories: string[];
    selected_series: number[];
    sector_series: number[];
    cluster_series: number[];
    axes: RadarAxisData[];
  };
  peers: {
    sector: string;
    sector_peers: any[];
    cluster_peers: any[];
  };
}

interface SectorClusteringWidgetProps {
  ticker?: string;
  initialData?: ClusteringResponse;
  apiUrl?: string;
  className?: string;
  onSelectTicker?: (ticker: string) => void;
}

export const SectorClusteringWidget: React.FC<SectorClusteringWidgetProps> = ({
  ticker = 'THYAO',
  initialData,
  apiUrl = 'http://localhost:8000/api/terminal/clustering',
  className = '',
  onSelectTicker
}) => {
  const [data, setData] = useState<ClusteringResponse | null>(initialData || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<number | null>(null);

  const fetchClustering = async (stockTicker: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/${stockTicker}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      const json: ClusteringResponse = await response.json();
      setData(json);
    } catch (err: any) {
      console.warn('API error, using mock fallback data:', err);
      // Fallback data representation for THYAO
      const isTHY = stockTicker.toUpperCase() === 'THYAO';
      setData({
        selected_company: {
          ticker: stockTicker.toUpperCase(),
          name: isTHY ? "Türk Hava Yolları A.O." : `${stockTicker.toUpperCase()} A.Ş.`,
          sector: isTHY ? "Havacılık / Ulaştırma" : "Holding / Yatırım",
          bist: "BIST 30",
          market_cap: isTHY ? 434.0 : 250.0,
          price: 314.50,
          roe: isTHY ? 35.7 : 19.5,
          revenue_growth: isTHY ? 47.8 : 36.2,
          debt_to_equity: isTHY ? 1.30 : 0.72,
          pe: isTHY ? 2.66 : 4.18,
          current_ratio: isTHY ? 0.94 : 1.45,
          cluster_id: isTHY ? 0 : 1,
          cluster_name: isTHY ? "Yüksek Kârlı / Güçlü Büyüme" : "Kelepir Değer / Fırsat",
          cluster_color: isTHY ? "#10B981" : "#00F2FE",
          cluster_badge: isTHY ? "Büyüme & Kârlılık Lideri" : "İskontolu Değer"
        },
        clusters: [
          {
            id: 0,
            name: "Yüksek Kârlı / Güçlü Büyüme",
            badge: "Büyüme Lideri",
            color: "#10B981",
            description: "Yüksek ROE (>%25) ve çift haneli ciro büyümesine sahip lider şirketler.",
            strategy: "Momentum & Büyüme",
            risk_profile: "Düşük - Orta",
            company_count: 6,
            tickers: ["THYAO", "PGSUS", "BIMAS", "FROTO", "ASELS"],
            avg_roe: 33.8,
            avg_growth: 45.2,
            avg_pe: 7.2,
            avg_debt: 1.25
          },
          {
            id: 1,
            name: "Kelepir Değer / Fırsat",
            badge: "İskontolu Değer",
            color: "#00F2FE",
            description: "Düşük F/K (<6x) ve kontrollü borç ile iskontolu işlem gören şirketler.",
            strategy: "Deep Value",
            risk_profile: "Düşük",
            company_count: 5,
            tickers: ["KCHOL", "SAHOL", "TUPRS", "TOASO"],
            avg_roe: 22.4,
            avg_growth: 28.5,
            avg_pe: 4.1,
            avg_debt: 0.68
          },
          {
            id: 2,
            name: "Aşırı Kaldıraçlı / Riskli",
            badge: "Yüksek Borç / Risk",
            color: "#F43F5E",
            description: "Yüksek borçluluk ve zayıf cari oran nedeniyle refinansman riski taşıyan şirketler.",
            strategy: "Yakın İzleme / Hedging",
            risk_profile: "Yüksek",
            company_count: 4,
            tickers: ["PETKM", "ARCLK", "TAVHL"],
            avg_roe: 8.5,
            avg_growth: 21.0,
            avg_pe: 18.5,
            avg_debt: 2.25
          },
          {
            id: 3,
            name: "Durgun / Defansif",
            badge: "Defansif / Yatay",
            color: "#F59E0B",
            description: "Düşük ciro büyümesi ve sınırlı kârlılık ivmesine sahip defansif şirketler.",
            strategy: "Temettü Odaklı",
            risk_profile: "Orta",
            company_count: 6,
            tickers: ["EREGL", "KRDMD", "SISE", "BERA", "ENKAI"],
            avg_roe: 7.4,
            avg_growth: 14.2,
            avg_pe: 12.8,
            avg_debt: 0.55
          }
        ],
        scatter_plot: {
          title: "BIST Bilanço Rasyo Kümeleme Haritası",
          x_axis_title: "Özkaynak Kârlılığı (ROE %)",
          y_axis_title: "Borç / Özsermaye (D/E)",
          points: [
            { ticker: "THYAO", name: "Türk Hava Yolları", sector: "Havacılık / Ulaştırma", x_roe: 35.7, y_debt_equity: 1.30, size_market_cap: 434, pe: 2.66, revenue_growth: 47.8, current_ratio: 0.94, cluster_id: 0, cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_color: "#10B981", is_selected: true },
            { ticker: "PGSUS", name: "Pegasus", sector: "Havacılık / Ulaştırma", x_roe: 28.4, y_debt_equity: 1.85, size_market_cap: 252, pe: 5.40, revenue_growth: 52.1, current_ratio: 0.88, cluster_id: 0, cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_color: "#10B981", is_sector_peer: true },
            { ticker: "TAVHL", name: "TAV Havalimanları", sector: "Havacılık / Ulaştırma", x_roe: 18.2, y_debt_equity: 1.95, size_market_cap: 98, pe: 8.80, revenue_growth: 34.6, current_ratio: 1.15, cluster_id: 2, cluster_name: "Aşırı Kaldıraçlı / Riskli", cluster_color: "#F43F5E", is_sector_peer: true },
            { ticker: "KCHOL", name: "Koç Holding", sector: "Holding / Yatırım", x_roe: 19.5, y_debt_equity: 0.72, size_market_cap: 492, pe: 4.18, revenue_growth: 36.2, current_ratio: 1.45, cluster_id: 1, cluster_name: "Kelepir Değer", cluster_color: "#00F2FE" },
            { ticker: "SAHOL", name: "Sabancı Holding", sector: "Holding / Yatırım", x_roe: 17.8, y_debt_equity: 0.58, size_market_cap: 204, pe: 3.75, revenue_growth: 28.5, current_ratio: 1.52, cluster_id: 1, cluster_name: "Kelepir Değer", cluster_color: "#00F2FE" },
            { ticker: "BIMAS", name: "BİM Mağazalar", sector: "Perakende", x_roe: 38.6, y_debt_equity: 0.95, size_market_cap: 312, pe: 11.20, revenue_growth: 54.2, current_ratio: 0.85, cluster_id: 0, cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_color: "#10B981" },
            { ticker: "FROTO", name: "Ford Otosan", sector: "Otomotiv", x_roe: 44.5, y_debt_equity: 1.65, size_market_cap: 378, pe: 7.45, revenue_growth: 42.0, current_ratio: 1.08, cluster_id: 0, cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_color: "#10B981" },
            { ticker: "EREGL", name: "Ereğli Demir Çelik", sector: "Demir Çelik", x_roe: 8.2, y_debt_equity: 0.48, size_market_cap: 182, pe: 14.50, revenue_growth: 12.4, current_ratio: 2.15, cluster_id: 3, cluster_name: "Durgun / Defansif", cluster_color: "#F59E0B" },
            { ticker: "PETKM", name: "Petkim", sector: "Enerji / Kimya", x_roe: 3.8, y_debt_equity: 2.45, size_market_cap: 52, pe: 28.50, revenue_growth: 8.5, current_ratio: 0.82, cluster_id: 2, cluster_name: "Aşırı Kaldıraçlı / Riskli", cluster_color: "#F43F5E" },
            { ticker: "TUPRS", name: "Tüpraş", sector: "Enerji / Petrol", x_roe: 31.4, y_debt_equity: 0.65, size_market_cap: 318, pe: 4.60, revenue_growth: 24.5, current_ratio: 1.38, cluster_id: 1, cluster_name: "Kelepir Değer", cluster_color: "#00F2FE" },
            { ticker: "ASELS", name: "Aselsan", sector: "Savunma Sanayi", x_roe: 25.1, y_debt_equity: 0.88, size_market_cap: 298, pe: 10.50, revenue_growth: 45.0, current_ratio: 1.75, cluster_id: 0, cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_color: "#10B981" }
          ]
        },
        radar_chart: {
          title: `${stockTicker.toUpperCase()} vs Sektör & Küme`,
          categories: ["Kârlılık (ROE)", "Satış Büyümesi", "Finansal Güç", "Değerleme Cazibesi", "Likidite (Cari)"],
          selected_series: [71.4, 79.7, 60.7, 97.6, 13.3],
          sector_series: [54.8, 74.8, 40.2, 75.4, 21.0],
          cluster_series: [67.6, 75.3, 58.4, 82.5, 30.5],
          axes: [
            { axis: "Kârlılık (ROE)", selected: 71.4, sector_avg: 54.8, cluster_avg: 67.6, unit: "%", raw_selected: "%35.7", raw_sector: "%27.4" },
            { axis: "Satış Büyümesi", selected: 79.7, sector_avg: 74.8, cluster_avg: 75.3, unit: "%", raw_selected: "%47.8", raw_sector: "%44.8" },
            { axis: "Finansal Güç", selected: 60.7, sector_avg: 40.2, cluster_avg: 58.4, unit: "x", raw_selected: "1.30x", raw_sector: "1.70x" },
            { axis: "Değerleme Cazibesi", selected: 97.6, sector_avg: 75.4, cluster_avg: 82.5, unit: "x", raw_selected: "2.66x", raw_sector: "5.62x" },
            { axis: "Likidite (Cari)", selected: 13.3, sector_avg: 21.0, cluster_avg: 30.5, unit: "x", raw_selected: "0.94x", raw_sector: "0.99x" }
          ]
        },
        peers: {
          sector: isTHY ? "Havacılık / Ulaştırma" : "Holding / Yatırım",
          sector_peers: [
            { ticker: "PGSUS", name: "Pegasus Hava Taşımacılığı", sector: "Havacılık / Ulaştırma", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 28.4, revenue_growth: 52.1, debt_to_equity: 1.85, pe: 5.40, current_ratio: 0.88, market_cap: 252.0 },
            { ticker: "TAVHL", name: "TAV Havalimanları", sector: "Havacılık / Ulaştırma", cluster_name: "Aşırı Kaldıraçlı / Riskli", cluster_id: 2, roe: 18.2, revenue_growth: 34.6, debt_to_equity: 1.95, pe: 8.80, current_ratio: 1.15, market_cap: 98.5 }
          ],
          cluster_peers: [
            { ticker: "BIMAS", name: "BİM Birleşik Mağazalar", sector: "Perakende", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 38.6, revenue_growth: 54.2, debt_to_equity: 0.95, pe: 11.20, current_ratio: 0.85, market_cap: 312.0 },
            { ticker: "FROTO", name: "Ford Otomotiv", sector: "Otomotiv", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 44.5, revenue_growth: 42.0, debt_to_equity: 1.65, pe: 7.45, current_ratio: 1.08, market_cap: 378.0 },
            { ticker: "ASELS", name: "Aselsan Elektronik", sector: "Savunma Sanayi", cluster_name: "Yüksek Kârlı / Güçlü Büyüme", cluster_id: 0, roe: 25.1, revenue_growth: 45.0, debt_to_equity: 0.88, pe: 10.50, current_ratio: 1.75, market_cap: 298.0 }
          ]
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchClustering(ticker);
    }
  }, [ticker]);

  if (isLoading && !data) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center animate-pulse">
        <div className="flex items-center justify-center space-x-2 text-cyan-400">
          <Activity className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">BIST Finansal Kümeleri ve Sektör Haritası Modelleniyor...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { selected_company, clusters, scatter_plot, radar_chart, peers } = data;

  // Filter scatter points if a cluster is clicked
  const filteredPoints = selectedClusterFilter !== null
    ? scatter_plot.points.filter(p => p.cluster_id === selectedClusterFilter)
    : scatter_plot.points;

  // Radar data format for Recharts
  const radarRechartsData = radar_chart.axes.map(axis => ({
    subject: axis.axis,
    selected: axis.selected,
    sector: axis.sector_avg,
    cluster: axis.cluster_avg,
    fullMark: 100
  }));

  // Custom Scatter Tooltip
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p: CompanyPoint = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-zinc-700/80 rounded-xl p-3 shadow-xl text-xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-zinc-800">
            <span className="font-bold text-white font-mono">{p.ticker}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${p.cluster_color}22`, color: p.cluster_color }}>
              {p.cluster_name}
            </span>
          </div>
          <p className="text-zinc-300 font-medium">{p.name}</p>
          <p className="text-zinc-400 text-[11px] mb-2">{p.sector}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-zinc-300 font-mono text-[11px]">
            <span>ROE: <strong className="text-emerald-400">%{p.x_roe}</strong></span>
            <span>Borç/Öz: <strong className="text-zinc-100">{p.y_debt_equity}x</strong></span>
            <span>F/K: <strong className="text-cyan-400">{p.pe}x</strong></span>
            <span>Büyüme: <strong className="text-zinc-100">%{p.revenue_growth}</strong></span>
            <span>Cari: <strong className="text-zinc-100">{p.current_ratio}x</strong></span>
            <span>P.Değ: <strong className="text-zinc-100">₺{p.size_market_cap} Mrd</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Top Edge Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 opacity-90" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>BIST Şirket Kümeleme & Sektör Haritası (ML K-Means)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 font-mono">
                k=4 Küme
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              RobustScaler ile normalize edilmiş 5 rasyo (ROE, Satış Büyümesi, Borç/Özsermaye, F/K, Cari Oran) analizi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Crosshair className="w-3.5 h-3.5" />
            {selected_company.ticker} ({selected_company.cluster_badge})
          </span>
          <button
            onClick={() => fetchClustering(ticker)}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition"
            title="Kümeleri Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Financial Cluster Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-5">
        {clusters.map((cluster) => {
          const isFilterActive = selectedClusterFilter === cluster.id;
          const isSelectedCompanyCluster = selected_company.cluster_id === cluster.id;

          return (
            <div
              key={cluster.id}
              onClick={() => setSelectedClusterFilter(isFilterActive ? null : cluster.id)}
              className={`cursor-pointer rounded-xl p-3.5 border transition relative overflow-hidden flex flex-col justify-between ${
                isFilterActive
                  ? 'bg-zinc-900 border-white/40 ring-1 ring-white/20'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90'
              }`}
              style={{ borderTop: `3px solid ${cluster.color}` }}
            >
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-xs font-bold" style={{ color: cluster.color }}>
                    {cluster.name}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${cluster.color}15`, color: cluster.color }}
                  >
                    {cluster.company_count} Hisse
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 my-1">
                  {cluster.description}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 mt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Ort. ROE:</span>
                  <strong className="text-zinc-200 font-mono">%{cluster.avg_roe}</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ort. Büyüme:</span>
                  <strong className="text-zinc-200 font-mono">%{cluster.avg_growth}</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ort. F/K:</span>
                  <strong className="text-zinc-200 font-mono">{cluster.avg_pe}x</strong>
                </div>

                {/* Ticker pills */}
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {cluster.tickers.map((t) => (
                    <span
                      key={t}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTicker) onSelectTicker(t);
                      }}
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition ${
                        t === selected_company.ticker
                          ? 'bg-cyan-400 text-black font-extrabold shadow-sm'
                          : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid: Scatter Plot + Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-5">
        
        {/* Scatter Plot: ROE vs Debt to Equity */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                BIST Kümeleme Scatter Haritası (K-Means)
              </h3>
              <p className="text-[11px] text-zinc-500">
                X: ROE (%) | Y: Borç / Özkaynak (D/E) | Boyut: Piyasa Değeri
              </p>
            </div>
            {selectedClusterFilter !== null && (
              <button
                onClick={() => setSelectedClusterFilter(null)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>

          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <XAxis
                  type="number"
                  dataKey="x_roe"
                  name="ROE"
                  unit="%"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="y_debt_equity"
                  name="Borç/Öz"
                  unit="x"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                />
                <ZAxis type="number" dataKey="size_market_cap" range={[60, 400]} />
                <Tooltip content={<CustomScatterTooltip />} />
                <Scatter name="Şirketler" data={filteredPoints}>
                  {filteredPoints.map((entry, index) => {
                    const isSelected = entry.ticker === selected_company.ticker;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.cluster_color}
                        stroke={isSelected ? '#00F2FE' : '#FFFFFF'}
                        strokeWidth={isSelected ? 3 : 1}
                        opacity={isSelected ? 1 : 0.85}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
            <span>Düşük Risk / Yüksek Kârlılık (Sağ Alt)</span>
            <span>Yüksek Risk / Kaldıraç (Sol Üst)</span>
          </div>
        </div>

        {/* Radar Chart: 5 Normalized Financial Dimensions */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Finansal Boyut Radarı ({selected_company.ticker})
              </h3>
              <p className="text-[11px] text-zinc-500">
                Şirket vs Sektör Ortalaması vs Küme Ortalaması (0-100 Skala)
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-cyan-400">● {selected_company.ticker}</span>
              <span className="text-amber-400">● Sektör</span>
              <span className="text-emerald-400">● Küme</span>
            </div>
          </div>

          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarRechartsData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94A3B8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                
                {/* Cluster average */}
                <Radar
                  name="Küme Ortalaması"
                  dataKey="cluster"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.12}
                  strokeDasharray="4 4"
                />
                
                {/* Sector average */}
                <Radar
                  name="Sektör Ortalaması"
                  dataKey="sector"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.15}
                  strokeDasharray="2 2"
                />

                {/* Selected company */}
                <Radar
                  name={`${selected_company.ticker} (Şirket)`}
                  dataKey="selected"
                  stroke="#00F2FE"
                  fill="#00F2FE"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
            <span>Sektör: {peers.sector}</span>
            <span>Model: RobustScaler K-Means</span>
          </div>
        </div>

      </div>

      {/* Sector & Cluster Peers Comparison Table */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-zinc-800/60 gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Sektör ve Küme Akran Karşılaştırma Matrisi ({selected_company.ticker})
            </h3>
            <p className="text-[11px] text-zinc-500">
              {peers.sector} rakipleri ve {selected_company.cluster_name} grubundaki şirketler
            </p>
          </div>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {peers.sector} Sektörü
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Hisse</th>
                <th className="py-2.5 px-3">Şirket Adı</th>
                <th className="py-2.5 px-3">Sektör</th>
                <th className="py-2.5 px-3">Küme Grubu</th>
                <th className="py-2.5 px-3">ROE</th>
                <th className="py-2.5 px-3">Büyüme</th>
                <th className="py-2.5 px-3">Borç/Öz</th>
                <th className="py-2.5 px-3">F/K</th>
                <th className="py-2.5 px-3">Cari Oran</th>
                <th className="py-2.5 px-3">Piyasa Değeri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {/* Combine selected + sector peers + cluster peers */}
              {[
                selected_company,
                ...(peers.sector_peers || []),
                ...(peers.cluster_peers || [])
              ]
                .filter((v, i, a) => a.findIndex(t => t.ticker === v.ticker) === i)
                .map((peer, idx) => {
                  const isCurrent = peer.ticker === selected_company.ticker;
                  return (
                    <tr
                      key={idx}
                      onClick={() => onSelectTicker && onSelectTicker(peer.ticker)}
                      className={`hover:bg-zinc-800/40 transition cursor-pointer ${
                        isCurrent ? 'bg-cyan-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold font-mono text-zinc-100 flex items-center gap-1.5">
                        <span style={{ color: isCurrent ? '#00F2FE' : '#F1F5F9' }}>{peer.ticker}</span>
                        {isCurrent && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-400 text-black font-extrabold">
                            AKTİF
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300 truncate max-w-[150px]">{peer.name}</td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">{peer.sector}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: peer.cluster_id === 0 ? 'rgba(16, 185, 129, 0.15)' :
                                        peer.cluster_id === 1 ? 'rgba(0, 242, 254, 0.15)' :
                                        peer.cluster_id === 2 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: peer.cluster_id === 0 ? '#10B981' :
                                   peer.cluster_id === 1 ? '#00F2FE' :
                                   peer.cluster_id === 2 ? '#F43F5E' : '#F59E0B'
                          }}
                        >
                          {peer.cluster_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">%{peer.roe}</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-200">%{peer.revenue_growth}</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-300">{peer.debt_to_equity}x</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-400">{peer.pe}x</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-300">{peer.current_ratio}x</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-200">₺{peer.market_cap} Mrd</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SectorClusteringWidget;
