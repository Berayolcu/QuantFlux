"""
QuantFlux Algorithmic Risk Engine & Big Data Stream (v3.2)
Python Backend API Server (Native Standard Library + FastAPI Compatibility)
"""

import http.server
import socketserver
import json
import re
import os
import sys
import math
import urllib.parse

PORT = int(os.environ.get('PORT', 8080))
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKSPACE_DIR not in sys.path:
    sys.path.insert(0, WORKSPACE_DIR)

import unicodedata

FILES = {
    'THYAO': 'TÜRK HAVA YOLLARI A.O..xls',
    'KCHOL': 'KOÇ HOLDİNG A.Ş..xls',
    'AGHOL': 'AG ANADOLU GRUBU HOLDİNG A.Ş..xls',
    'BERA': 'BERA HOLDİNG A.Ş..xls'
}

COMPANY_META = {
    'THYAO': {'name': 'Türk Hava Yolları A.O.', 'sector': 'Havacılık / Ulaştırma', 'bist': 'BIST 30', 'price': 314.50, 'shares': 1380000000},
    'KCHOL': {'name': 'Koç Holding A.Ş.', 'sector': 'Holding / Yatırım', 'bist': 'BIST 30', 'price': 228.00, 'shares': 2535900000},
    'AGHOL': {'name': 'AG Anadolu Grubu Holding A.Ş.', 'sector': 'Holding / İçecek & Perakende', 'bist': 'BIST 30', 'price': 342.25, 'shares': 2435345000},
    'BERA': {'name': 'Bera Holding A.Ş.', 'sector': 'İmalat / Çeşitlendirilmiş', 'bist': 'BIST 100', 'price': 21.80, 'shares': 683200000}
}

DYNAMIC_COMPANIES = {}

def clean_key(s):
    s = s.lower()
    return s.replace('â', 'a').replace('î', 'i').replace('û', 'u').replace('ı', 'i').replace('ö', 'o').replace('ü', 'u').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')

def parse_period_sort_key(period_str):
    if not period_str:
        return 0
    m = re.search(r'(\d{4})[^\d]?(\d{1,2})?', str(period_str).strip())
    if not m:
        return 0
    y = int(m.group(1))
    q = int(m.group(2)) if m.group(2) else 12
    return y * 100 + q

def derive_dates_from_period(period_str):
    str_val = str(period_str or '2026/06').strip()
    m = re.search(r'(\d{4})[^\d]?(\d{1,2})?', str_val)
    year = int(m.group(1)) if m else 2026
    month = int(m.group(2)) if m and m.group(2) else 6
    if month <= 3:
        return f"{year}-03-31", f"{year}-05-10"
    elif month <= 6:
        return f"{year}-06-30", f"{year}-08-14"
    elif month <= 9:
        return f"{year}-09-30", f"{year}-11-08"
    else:
        return f"{year}-12-31", f"{year + 1}-03-04"

def normalize_company_data(raw):
    """
    Universal Data Contract Normalizer.
    Guarantees that statements are sorted strictly descending (newest quarter at index 0)
    and all financial keys follow standard format.
    """
    if not raw:
        return None
    ticker = str(raw.get('ticker') or raw.get('symbol') or 'GENERIC').upper()
    name = raw.get('name') or f"{ticker} A.Ş."
    sector = raw.get('sector') or 'BIST Genel'
    bist = raw.get('bist') or 'BIST 100'
    price = float(raw.get('price', 100.0))
    shares = float(raw.get('shares', 1000000000))

    raw_stmts = raw.get('statements') or raw.get('data') or raw.get('records') or []
    norm_stmts = []

    for idx, s in enumerate(raw_stmts):
        p = str(s.get('period') or f"Dönem {idx + 1}").strip()
        def_end, def_disc = derive_dates_from_period(p)
        p_end = str(s.get('period_end_date') or def_end)[:10]
        p_disc = str(s.get('disclosure_date') or def_disc)[:19]

        ca = float(s.get('donen_varliklar', s.get('currentAssets', 0.0)) or 0.0)
        fa = float(s.get('duran_varliklar', s.get('fixedAssets', 0.0)) or 0.0)
        ta = float(s.get('toplam_varliklar', s.get('totalAssets', 0.0)) or 0.0)
        if ta <= 0:
            ta = ca + fa

        stl = float(s.get('kisa_vadeli_yuk', s.get('shortTermLiab', 0.0)) or 0.0)
        ltl = float(s.get('uzun_vadeli_yuk', s.get('longTermLiab', 0.0)) or 0.0)
        total_liab = float(s.get('totalLiab', 0.0) or (stl + ltl))
        eq = float(s.get('ozkaynaklar', s.get('equity', 0.0)) or 0.0)
        rev = float(s.get('net_satislar', s.get('revenue', 0.0)) or 0.0)
        ni = float(s.get('net_kar', s.get('netIncome', 0.0)) or 0.0)
        fav = float(s.get('favok', s.get('ebitda', 0.0)) or (ni * 1.25 if ni != 0 else rev * 0.20))

        norm_stmts.append({
            'period': p,
            'period_end_date': p_end,
            'disclosure_date': p_disc,
            'donen_varliklar': ca,
            'duran_varliklar': fa,
            'toplam_varliklar': ta,
            'kisa_vadeli_yuk': stl,
            'uzun_vadeli_yuk': ltl,
            'totalLiab': total_liab,
            'ozkaynaklar': eq,
            'net_satislar': rev,
            'favok': fav,
            'net_kar': ni,
            'currentAssets': ca,
            'fixedAssets': fa,
            'totalAssets': ta,
            'shortTermLiab': stl,
            'longTermLiab': ltl,
            'equity': eq,
            'revenue': rev,
            'ebitda': fav,
            'netIncome': ni,
            'currentRatio': round(ca / stl, 2) if stl > 0 else 1.0,
            'debtToEquity': round(total_liab / eq, 2) if eq > 0 else 1.0,
            'roe': round((ni / eq) * 100, 1) if eq > 0 else 0.0,
            'netMargin': round((ni / rev) * 100, 1) if rev > 0 else 0.0
        })

    # STRICT AUTO-SORT: Descending order (statements[0] is newest quarter)
    norm_stmts.sort(key=lambda item: parse_period_sort_key(item.get('period')), reverse=True)
    periods = [st['period'] for st in norm_stmts]

    return {
        'ticker': ticker,
        'name': name,
        'sector': sector,
        'bist': bist,
        'price': price,
        'shares': shares,
        'periods': periods,
        'statements': norm_stmts,
        'data': norm_stmts
    }

def generate_generic_company_data(ticker, name=None, sector=None):
    t = str(ticker or 'GENERIC').upper()
    meta = COMPANY_META.get(t, {})
    n = name or meta.get('name', f"{t} Sanayi ve Ticaret A.Ş.")
    s = sector or meta.get('sector', 'BIST İmalat / Genel')
    p = meta.get('price', 85.50)
    sh = meta.get('shares', 1200000000)

    raw_statements = [
        {
            'period': '2026/06', 'period_end_date': '2026-06-30', 'disclosure_date': '2026-08-14 18:30:00',
            'donen_varliklar': 245000000000.0, 'duran_varliklar': 380000000000.0, 'toplam_varliklar': 625000000000.0,
            'kisa_vadeli_yuk': 210000000000.0, 'uzun_vadeli_yuk': 165000000000.0, 'ozkaynaklar': 250000000000.0,
            'net_satislar': 290000000000.0, 'favok': 62000000000.0, 'net_kar': 38500000000.0
        },
        {
            'period': '2025/12', 'period_end_date': '2025-12-31', 'disclosure_date': '2026-03-02 18:45:00',
            'donen_varliklar': 215000000000.0, 'duran_varliklar': 330000000000.0, 'toplam_varliklar': 545000000000.0,
            'kisa_vadeli_yuk': 185000000000.0, 'uzun_vadeli_yuk': 145000000000.0, 'ozkaynaklar': 215000000000.0,
            'net_satislar': 480000000000.0, 'favok': 98000000000.0, 'net_kar': 54000000000.0
        },
        {
            'period': '2024/12', 'period_end_date': '2024-12-31', 'disclosure_date': '2025-03-04 18:40:00',
            'donen_varliklar': 170000000000.0, 'duran_varliklar': 260000000000.0, 'toplam_varliklar': 430000000000.0,
            'kisa_vadeli_yuk': 150000000000.0, 'uzun_vadeli_yuk': 110000000000.0, 'ozkaynaklar': 170000000000.0,
            'net_satislar': 360000000000.0, 'favok': 72000000000.0, 'net_kar': 41000000000.0
        },
        {
            'period': '2023/12', 'period_end_date': '2023-12-31', 'disclosure_date': '2024-03-05 18:45:00',
            'donen_varliklar': 125000000000.0, 'duran_varliklar': 195000000000.0, 'toplam_varliklar': 320000000000.0,
            'kisa_vadeli_yuk': 115000000000.0, 'uzun_vadeli_yuk': 85000000000.0, 'ozkaynaklar': 120000000000.0,
            'net_satislar': 250000000000.0, 'favok': 51000000000.0, 'net_kar': 29000000000.0
        }
    ]

    return normalize_company_data({
        'ticker': t,
        'name': n,
        'sector': s,
        'bist': meta.get('bist', 'BIST 100'),
        'price': p,
        'shares': sh,
        'statements': raw_statements
    })

def resolve_file_path(filename):
    """Locates file checking workspace root, xls folder, and Unicode variations."""
    if not filename:
        return None
    candidates = [
        os.path.join(WORKSPACE_DIR, filename),
        os.path.join(WORKSPACE_DIR, 'xls', filename)
    ]
    for c in candidates:
        if os.path.exists(c):
            return c

    # Normalize unicode check
    norm_fn = unicodedata.normalize('NFC', filename)
    for check_dir in [WORKSPACE_DIR, os.path.join(WORKSPACE_DIR, 'xls')]:
        if os.path.exists(check_dir):
            for entry in os.listdir(check_dir):
                if unicodedata.normalize('NFC', entry) == norm_fn or entry.lower() == filename.lower():
                    return os.path.join(check_dir, entry)
    return None

def parse_xls_data(filepath):
    if not filepath or not os.path.exists(filepath):
        return [], 'TL', {}
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', content, re.DOTALL | re.IGNORECASE)
    periods, unit, items = [], 'TL', {}
    for r in rows:
        cols = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.DOTALL | re.IGNORECASE)
        clean = [re.sub(r'<[^>]+>', '', c).strip() for c in cols]
        if not clean or not any(clean): continue
        row_title = clean[0]
        if 'FİNANSAL DURUM TABLOSU' in row_title:
            periods = clean[1:]
        elif 'Sunum Para Birimi' in row_title:
            unit = clean[1] if len(clean) > 1 else 'TL'
        else:
            values = []
            for val in clean[1:]:
                v_clean = val.replace(' ', '')
                if not v_clean or v_clean == '-':
                    values.append(0.0)
                else:
                    try:
                        values.append(float(v_clean.replace('.', '').replace(',', '.')))
                    except:
                        values.append(0.0)
            items[clean_key(row_title)] = values
    return periods, unit, items

def get_company_data(ticker):
    ticker_clean = str(ticker).upper()
    if ticker_clean in DYNAMIC_COMPANIES:
        return DYNAMIC_COMPANIES[ticker_clean]

    filename = FILES.get(ticker_clean)
    filepath = resolve_file_path(filename) if filename else None

    if filepath and os.path.exists(filepath):
        periods, unit, items = parse_xls_data(filepath)
        mult = 1.0
        if '1000000' in unit: mult = 1000000.0
        elif '1000' in unit: mult = 1000.0

        def get_row(keys):
            for k in keys:
                ck = clean_key(k)
                for item_k, v in items.items():
                    if ck in item_k:
                        return [x * mult for x in v]
            return [0.0] * len(periods)

        ca = get_row(['donen varliklar'])
        fa = get_row(['duran varliklar'])
        ta = get_row(['toplam varliklar', 'varliklar'])
        stl = get_row(['kisa vadeli yukumlulukler'])
        ltl = get_row(['uzun vadeli yukumlulukler'])
        eq = get_row(['toplam ozkaynaklar', 'ana ortakliga ait ozkaynaklar'])
        rev = get_row(['hasilat', 'toplam hasilat'])
        gp = get_row(['brut kar', 'ticari faaliyetlerden brut kar'])
        op = get_row(['esas faaliyet kari'])
        ni = get_row(['net donem kari', 'surdurulen faaliyetler donem kari'])

        data = []
        for i, p in enumerate(periods):
            tot_act = ta[i] if ta[i] > 0 else (ca[i] + fa[i])
            data.append({
                'period': p,
                'donen_varliklar': ca[i],
                'duran_varliklar': fa[i],
                'toplam_varliklar': tot_act,
                'kisa_vadeli_yuk': stl[i],
                'uzun_vadeli_yuk': ltl[i],
                'ozkaynaklar': eq[i],
                'net_satislar': rev[i],
                'favok': op[i] * 1.25 if op[i] > 0 else (ni[i] * 1.25 if ni[i] > 0 else 0.0),
                'net_kar': ni[i]
            })

        meta = COMPANY_META.get(ticker_clean, {})
        normalized = normalize_company_data({
            'ticker': ticker_clean,
            'name': meta.get('name', f"{ticker_clean} A.Ş."),
            'sector': meta.get('sector', 'BIST Genel'),
            'bist': meta.get('bist', 'BIST 100'),
            'price': meta.get('price', 100.0),
            'shares': meta.get('shares', 1000000000),
            'statements': data
        })
        return normalized

    # Generic & file-independent universal fallback for any stock
    return generate_generic_company_data(ticker_clean)

class QuantRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for browser access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ['/', '/index.html']:
            self.send_response(302)
            self.send_header('Location', '/pulsedata-ops/index.html')
            self.end_headers()
            return

        if path == '/health':
            self.send_json({'status': 'online', 'version': '3.2', 'engine': 'QuantFlux Python Engine'})
            return

        if path == '/api/companies':
            res = [{'ticker': k, **v} for k, v in COMPANY_META.items()]
            for dk, dv in DYNAMIC_COMPANIES.items():
                if dk not in COMPANY_META and dk != 'CUSTOM':
                    res.append({
                        'ticker': dk,
                        'name': dv.get('name', f"{dk} A.Ş."),
                        'sector': dv.get('sector', 'Özel Analiz / BIST'),
                        'bist': dv.get('bist', 'PORTFÖY'),
                        'price': dv.get('price', 100.0),
                        'shares': dv.get('shares', 1000000000)
                    })
            self.send_json(res)
            return

        if path == '/api/financials/sample-csv':
            sample_path = os.path.join(WORKSPACE_DIR, 'sample_data', 'THYAO_bilanco_sample.csv')
            if os.path.exists(sample_path):
                with open(sample_path, 'rb') as f:
                    csv_data = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv; charset=utf-8')
                self.send_header('Content-Disposition', 'attachment; filename="THYAO_bilanco_sample.csv"')
                self.send_header('Content-Length', str(len(csv_data)))
                self.end_headers()
                self.wfile.write(csv_data)
                return
            else:
                self.send_error(404, "Sample CSV not found")
                return

        if path.startswith('/api/terminal/overview/'):
            ticker = path.split('/')[-1].upper()
            try:
                from backend.ratios import FinancialRatiosEngine
                from backend.scoring import BalanceSheetScoringEngine

                comp_data = get_company_data(ticker)
                stmts = comp_data.get('statements', comp_data.get('data', [])) if comp_data else []
                if not stmts:
                    comp_data = generate_generic_company_data(ticker)
                    stmts = comp_data['statements']

                price = comp_data.get('price', 100.0)
                shares = comp_data.get('shares', 1000000000)

                analysis = FinancialRatiosEngine.compute_valuation_multiples(
                    price=price,
                    shares=shares,
                    statements=stmts
                )
                f_score = BalanceSheetScoringEngine.calculate_piotroski_f_score(stmts)
                z_score = BalanceSheetScoringEngine.calculate_altman_z_score(stmts)
                annualized_table = FinancialRatiosEngine.derive_ttm_and_annualized_table(stmts)

                self.send_json({
                    'ticker': ticker,
                    'name': comp_data.get('name', f"{ticker} A.Ş."),
                    'sector': comp_data.get('sector', 'BIST Genel'),
                    'bist': comp_data.get('bist', 'BIST 100'),
                    'price': price,
                    'shares': shares,
                    'market_cap': analysis.get('market_cap'),
                    'market_cap_formatted': analysis.get('market_cap_formatted'),
                    'enterprise_value': analysis.get('enterprise_value'),
                    'enterprise_value_formatted': analysis.get('enterprise_value_formatted'),
                    'kpis': analysis.get('kpis', {}),
                    'multiples': analysis.get('multiples', {}),
                    'annualized_balance_sheet': annualized_table,
                    'scores': {
                        'piotroski_f': f_score,
                        'altman_z': z_score
                    }
                })
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        if path.startswith('/api/terminal/scores/'):
            ticker = path.split('/')[-1].upper()
            try:
                from backend.scoring import BalanceSheetScoringEngine
                comp_data = get_company_data(ticker)
                stmts = comp_data.get('statements', comp_data.get('data', [])) if comp_data else []
                if not stmts:
                    comp_data = generate_generic_company_data(ticker)
                    stmts = comp_data['statements']
                f_score = BalanceSheetScoringEngine.calculate_piotroski_f_score(stmts)
                z_score = BalanceSheetScoringEngine.calculate_altman_z_score(stmts)
                self.send_json({
                    'ticker': ticker,
                    'name': comp_data.get('name', f"{ticker} A.Ş."),
                    'price': comp_data.get('price', 100.0),
                    'piotroski_f': f_score,
                    'altman_z': z_score
                })
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        if path.startswith('/api/terminal/clustering/'):
            ticker = path.split('/')[-1].upper()
            try:
                from backend.clustering import FinancialClusterEngine
                result = FinancialClusterEngine.get_sector_map_and_peers(ticker)
                self.send_json(result)
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        if path.startswith('/api/terminal/event-study/'):
            try:
                parsed_url = urllib.parse.urlparse(self.path)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                quarter_val = query_params.get('quarter', [None])[0]
                ticker = parsed_url.path.split('/')[-1].upper()
                from backend.event_study import EventStudyEngine
                result = EventStudyEngine.calculate_event_study(ticker, quarter_val)
                self.send_json(result)
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        if path.startswith('/api/terminal/regression/') or path.startswith('/api/terminal/factors/'):
            try:
                parsed_url = urllib.parse.urlparse(self.path)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                vif_thresh = float(query_params.get('vif_threshold', [5.0])[0])
                ticker = parsed_url.path.split('/')[-1].upper()
                from backend.multifactor import MultiFactorRegressionEngine
                result = MultiFactorRegressionEngine.run_regression_and_vif(ticker, vif_thresh)
                self.send_json(result)
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        if path.startswith('/api/terminal/stress-test/'):
            try:
                parsed_url = urllib.parse.urlparse(self.path)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                cogs_val = float(query_params.get('cogs', [0.0])[0])
                fx_val = float(query_params.get('fx', [0.0])[0])
                rate_val = float(query_params.get('rate', [0.0])[0])
                demand_val = float(query_params.get('demand', [0.0])[0])
                ticker = parsed_url.path.split('/')[-1].upper()
                from backend.stress_test import StressTestingEngine
                result = StressTestingEngine.simulate_stress_scenario(
                    ticker=ticker,
                    cogs_increase_pct=cogs_val,
                    fx_shock_pct=fx_val,
                    interest_rate_hike_bps=rate_val,
                    demand_contraction_pct=demand_val
                )
                self.send_json(result)
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        if path.startswith('/api/financials/'):
            ticker = path.split('/')[-1].upper()
            data = get_company_data(ticker)
            if data:
                self.send_json(data)
            else:
                self.send_error(404, f"Ticker {ticker} not found")
            return

        if path == '/api/pipeline/status':
            try:
                from backend.pipeline import pipeline_instance
                self.send_json(pipeline_instance.get_data_sources_status())
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        if path == '/api/pipeline/logs':
            try:
                from backend.pipeline import log_bus, pipeline_instance
                self.send_json({
                    'count': len(log_bus.get_logs()),
                    'is_running': pipeline_instance.is_running,
                    'progress': pipeline_instance.progress_percent,
                    'logs': log_bus.get_logs(60)
                })
            except Exception as e:
                self.send_json({'error': str(e), 'logs': []})
            return

        if path in ['/api/model-configs/active', '/api/terminal/model-configs/active']:
            try:
                from backend.model_config import get_active_model_config
                self.send_json(get_active_model_config())
            except Exception as e:
                self.send_json({'error': str(e)})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/pipeline/sync-bist100':
            import uuid, threading
            from backend.pipeline import pipeline_instance
            if pipeline_instance.is_running:
                self.send_json({
                    'success': False,
                    'status': 'already_running',
                    'message': 'Senkronizasyon işlemi halihazırda yürütülüyor.',
                    'progress': pipeline_instance.progress_percent
                })
                return
            task_id = str(uuid.uuid4())
            threading.Thread(target=pipeline_instance.run_sync_task, args=(task_id, None), daemon=True).start()
            self.send_json({
                'success': True,
                'status': 'started',
                'task_id': task_id,
                'message': 'BIST 100 asenkron veri senkronizasyonu başlatıldı.'
            })
            return

        if path == '/api/pipeline/clear-logs':
            from backend.pipeline import log_bus
            log_bus.clear()
            self.send_json({'success': True, 'message': 'Loglar temizlendi.'})
            return

        if path == '/api/financials/upload-csv':
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length).decode('utf-8', errors='replace')
            csv_text = raw_body
            filename = "uploaded.csv"
            # Extract CSV content if multipart
            if 'boundary=' in self.headers.get('Content-Type', ''):
                lines = raw_body.splitlines()
                content_lines = []
                inside_payload = False
                for line in lines:
                    if 'filename=' in line:
                        m_fn = re.search(r'filename="([^"]+)"', line)
                        if m_fn:
                            filename = m_fn.group(1)
                    if 'period' in line.lower() and ('disclosure_date' in line.lower() or 'donen_varliklar' in line.lower() or 'current_assets' in line.lower()):
                        inside_payload = True
                    if inside_payload:
                        if line.startswith('------'):
                            break
                        content_lines.append(line)
                if content_lines:
                    csv_text = '\n'.join(content_lines)

            # Try to parse using parser engine
            try:
                from backend.parser import parse_financials_csv
                records, errors, warnings = parse_financials_csv(csv_text, default_ticker="CUSTOM", source_filename=filename)
                ticker = records[0].get('ticker', 'CUSTOM') if records else 'CUSTOM'
                norm_comp = normalize_company_data({
                    'ticker': ticker,
                    'name': f"{ticker} A.Ş. (Yüklenen Bilanço)",
                    'sector': 'Özel Analiz / BIST',
                    'bist': 'PORTFÖY',
                    'price': 100.0,
                    'shares': 1000000000,
                    'statements': records
                })
                DYNAMIC_COMPANIES[ticker] = norm_comp
                DYNAMIC_COMPANIES['CUSTOM'] = norm_comp

                self.send_json({
                    'success': True if records else False,
                    'ticker': ticker,
                    'rows_parsed': len(records),
                    'rows_inserted': len(records),
                    'warnings': warnings,
                    'errors': errors,
                    'sample_records': records[:3],
                    'company': norm_comp
                })
            except Exception as e:
                self.send_json({'success': False, 'error': str(e)})
            return

        if path in ['/api/model-configs/save', '/api/terminal/model-configs/save']:
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                raw_body = self.rfile.read(content_length).decode('utf-8', errors='replace')
                payload = json.loads(raw_body) if raw_body else {}
                from backend.model_config import save_model_config
                profile = payload.get("meta", {}).get("profile_name", "QuantFlux Production v3.2")
                saved = save_model_config(payload, profile_name=profile)
                self.send_json({
                    'success': True,
                    'message': 'Model hiperparametreleri başarıyla veritabanına kaydedildi ve uygulandı.',
                    'config': saved
                })
            except Exception as e:
                self.send_json({'success': False, 'error': str(e)})
            return

        if path in ['/api/model-configs/reset', '/api/terminal/model-configs/reset']:
            try:
                from backend.model_config import reset_model_config
                resetted = reset_model_config()
                self.send_json({
                    'success': True,
                    'message': 'Model konfigürasyonu varsayılan fabrika ayarlarına sıfırlandı.',
                    'config': resetted
                })
            except Exception as e:
                self.send_json({'success': False, 'error': str(e)})
            return

        self.send_error(404, "Endpoint not found")

    def send_json(self, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), QuantRequestHandler) as httpd:
        print(f"QuantFlux Python API Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Shutting down API server.")

if __name__ == '__main__':
    run()
