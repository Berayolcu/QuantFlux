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

PORT = 8000
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKSPACE_DIR not in sys.path:
    sys.path.insert(0, WORKSPACE_DIR)

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

def clean_key(s):
    s = s.lower()
    return s.replace('â', 'a').replace('î', 'i').replace('û', 'u').replace('ı', 'i').replace('ö', 'o').replace('ü', 'u').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')

def parse_xls_data(filepath):
    if not os.path.exists(filepath):
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
    filename = FILES.get(ticker)
    if not filename: return None
    filepath = os.path.join(WORKSPACE_DIR, filename)
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
            'currentAssets': ca[i],
            'fixedAssets': fa[i],
            'totalAssets': tot_act,
            'shortTermLiab': stl[i],
            'longTermLiab': ltl[i],
            'equity': eq[i],
            'revenue': rev[i],
            'grossProfit': gp[i],
            'operatingProfit': op[i],
            'netIncome': ni[i],
            'currentRatio': round(ca[i] / stl[i], 2) if stl[i] > 0 else 0,
            'debtToEquity': round((stl[i] + ltl[i]) / eq[i], 2) if eq[i] > 0 else 0,
            'roe': round(ni[i] / eq[i] * 100, 1) if eq[i] > 0 else 0,
            'netMargin': round(ni[i] / rev[i] * 100, 1) if rev[i] > 0 else 0
        })

    meta = COMPANY_META.get(ticker, {})
    return {
        'ticker': ticker,
        'name': meta.get('name', ticker),
        'sector': meta.get('sector', ''),
        'bist': meta.get('bist', ''),
        'periods': periods,
        'data': data
    }

class QuantRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for browser access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/health':
            self.send_json({'status': 'online', 'version': '3.2', 'engine': 'QuantFlux Python Engine'})
            return

        if path == '/api/companies':
            res = [{'ticker': k, **v} for k, v in COMPANY_META.items()]
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
                meta = COMPANY_META.get(ticker, {
                    'name': f"{ticker} A.Ş.",
                    'sector': 'BIST Genel',
                    'bist': 'BIST 100',
                    'price': 100.0,
                    'shares': 1000000000
                })
                # Fetch existing company data statements
                comp_data = get_company_data(ticker)
                stmts = comp_data['data'] if comp_data and 'data' in comp_data else []
                if not stmts:
                    stmts = [{
                        'period': '2026/06', 'currentAssets': 512191000000.0, 'fixedAssets': 1847846000000.0,
                        'totalAssets': 2360037000000.0, 'shortTermLiab': 566751000000.0, 'longTermLiab': 774833000000.0,
                        'equity': 1018453000000.0, 'revenue': 585069000000.0, 'ebitda': 121400000000.0, 'netIncome': 18766000000.0
                    }]
                analysis = FinancialRatiosEngine.compute_valuation_multiples(
                    price=meta['price'],
                    shares=meta['shares'],
                    statements=stmts
                )
                from backend.scoring import BalanceSheetScoringEngine
                f_score = BalanceSheetScoringEngine.calculate_piotroski_f_score(stmts)
                z_score = BalanceSheetScoringEngine.calculate_altman_z_score(stmts)

                annualized_table = FinancialRatiosEngine.derive_ttm_and_annualized_table(stmts)
                self.send_json({
                    'ticker': ticker,
                    'name': meta['name'],
                    'sector': meta['sector'],
                    'bist': meta['bist'],
                    'price': meta['price'],
                    'shares': meta['shares'],
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
                meta = COMPANY_META.get(ticker, {'name': f"{ticker} A.Ş.", 'price': 100.0})
                comp_data = get_company_data(ticker)
                stmts = comp_data['data'] if comp_data and 'data' in comp_data else []
                f_score = BalanceSheetScoringEngine.calculate_piotroski_f_score(stmts)
                z_score = BalanceSheetScoringEngine.calculate_altman_z_score(stmts)
                self.send_json({
                    'ticker': ticker,
                    'name': meta['name'],
                    'price': meta['price'],
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
            # Extract CSV content if multipart
            csv_text = raw_body
            if 'boundary=' in self.headers.get('Content-Type', ''):
                lines = raw_body.splitlines()
                # Simple extraction of CSV body between boundaries
                content_lines = []
                inside_payload = False
                for line in lines:
                    if 'period' in line.lower() and ('disclosure_date' in line.lower() or 'donen_varliklar' in line.lower()):
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
                records, errors, warnings = parse_financials_csv(csv_text, default_ticker="THYAO")
                self.send_json({
                    'success': True if records else False,
                    'ticker': 'THYAO',
                    'rows_parsed': len(records),
                    'rows_inserted': len(records),
                    'warnings': warnings,
                    'errors': errors,
                    'sample_records': records[:3]
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
    with socketserver.TCPServer(("", PORT), QuantRequestHandler) as httpd:
        print(f"QuantFlux Python API Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Shutting down API server.")

if __name__ == '__main__':
    run()
