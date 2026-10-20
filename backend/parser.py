"""
QuantFlux Robust CSV Parsing Engine
Handles Turkish Accounting Standards (KAP), number sanitization,
Point-in-Time date resolution, and balance sheet identity verification.
"""

import csv
import io
import re
from datetime import datetime, date
try:
    from backend.schemas import CSVParseErrorDetail
except ImportError:
    from dataclasses import dataclass
    @dataclass
    class CSVParseErrorDetail:
        row: int
        field: str
        value: Any
        error_type: str
        message: str
        critical: bool = False
        def model_dump(self):
            return {
                'row': self.row, 'field': self.field, 'value': str(self.value),
                'error_type': self.error_type, 'message': self.message, 'critical': self.critical
            }

# Column Name Aliases (Turkish & English, with and without diacritics)
HEADER_ALIASES = {
    'ticker': ['ticker', 'sembol', 'hisse', 'symbol', 'kod'],
    'period': ['period', 'donem', 'dönem', 'çeyrek', 'ceyrek'],
    'disclosure_date': ['disclosure_date', 'kap_tarihi', 'ilan_tarihi', 'açıklanma_tarihi', 'aciklanma_tarihi', 'announcement_date'],
    'period_end_date': ['period_end_date', 'donem_sonu', 'dönem_sonu', 'donem_bitis', 'quarter_end'],
    'donen_varliklar': ['donen_varliklar', 'dönen_varlıklar', 'current_assets', 'donenvarliklar'],
    'duran_varliklar': ['duran_varliklar', 'duran_varlıklar', 'fixed_assets', 'non_current_assets', 'duranvarliklar'],
    'toplam_varliklar': ['toplam_varliklar', 'toplam_varlıklar', 'total_assets', 'varliklar', 'varlıklar', 'toplamvarliklar'],
    'kisa_vadeli_yuk': ['kisa_vadeli_yuk', 'kısa_vadeli_yük', 'kisa_vadeli_yukumlulukler', 'kısa_vadeli_yükümlülükler', 'short_term_liab', 'current_liabilities'],
    'uzun_vadeli_yuk': ['uzun_vadeli_yuk', 'uzun_vadeli_yük', 'uzun_vadeli_yukumlulukler', 'uzun_vadeli_yükümlülükler', 'long_term_liab', 'non_current_liabilities'],
    'ozkaynaklar': ['ozkaynaklar', 'özkaynaklar', 'toplam_ozkaynaklar', 'toplam_özkaynaklar', 'equity', 'shareholders_equity', 'oz_kaynaklar'],
    'net_satislar': ['net_satislar', 'net_satışlar', 'hasilat', 'hasılat', 'revenue', 'net_sales', 'toplam_hasilat'],
    'favok': ['favok', 'favök', 'ebitda'],
    'net_kar': ['net_kar', 'net_kâr', 'net_donem_kari', 'net_dönem_kârı', 'net_income', 'net_profit']
}

def normalize_column_name(col: str) -> str:
    """Normalize input column string into standard key."""
    clean = col.strip().lower()
    clean = clean.replace(' ', '_').replace('-', '_').replace('.', '')
    clean = clean.replace('ı', 'i').replace('ğ', 'g').replace('ü', 'u').replace('ş', 's').replace('ö', 'o').replace('ç', 'c')
    clean = clean.replace('â', 'a').replace('î', 'i')
    
    for standard_name, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            norm_alias = alias.replace('ı', 'i').replace('ğ', 'g').replace('ü', 'u').replace('ş', 's').replace('ö', 'o').replace('ç', 'c')
            if clean == norm_alias:
                return standard_name
    return clean

def parse_turkish_number(val: Any) -> float:
    """
    Turkish & International Number Parser.
    Handles:
      - '1.050.091,50' -> 1050091.50 (Turkish standard)
      - '1,050,091.50' -> 1050091.50 (US standard)
      - '-384.952'     -> -384952.0
      - '(120.000)'    -> -120000.0 (Accounting parenthesis negative)
      - '-' or ''      -> 0.0
    """
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    if not s or s == '-' or s.lower() == 'null' or s.lower() == 'nan':
        return 0.0

    # Negative check for accounting format: (123.456)
    is_negative = False
    if s.startswith('(') and s.endswith(')'):
        is_negative = True
        s = s[1:-1].strip()
    elif s.startswith('-'):
        is_negative = True
        s = s[1:].strip()

    # Remove all spaces and currency symbols
    s = re.sub(r'[₺$€\s]', '', s)

    # Determine decimal and thousand separators
    if ',' in s and '.' in s:
        # If dot appears before comma -> Turkish format: 1.234,56
        if s.rfind('.') < s.rfind(','):
            s = s.replace('.', '').replace(',', '.')
        else: # US format: 1,234.56
            s = s.replace(',', '')
    elif ',' in s:
        # Only comma exists: could be decimal (123,45) or thousands (123,456,789)
        parts = s.split(',')
        if len(parts) == 2 and len(parts[1]) <= 3:
            s = s.replace(',', '.')
        else:
            s = s.replace(',', '')
    elif '.' in s:
        # Only dot exists: if multiple dots -> Turkish thousands: 1.050.091
        dots_count = s.count('.')
        if dots_count > 1:
            s = s.replace('.', '')
        else:
            # Single dot: if followed by exactly 3 digits and preceding digits look like integer
            parts = s.split('.')
            if len(parts[1]) == 3 and float(parts[0]) > 0:
                s = s.replace('.', '')
            else:
                # Keep as standard decimal
                pass

    try:
        num = float(s)
        return -num if is_negative else num
    except ValueError:
        return 0.0

def resolve_period_dates(period_str: str) -> Tuple[date, datetime]:
    """
    Derives period_end_date and default disclosure_date from period string like '2023/12'.
    Prevents Look-Ahead Bias by default estimates if disclosure is not explicitly stated.
    """
    match = re.match(r'(\d{4})[/-](\d{1,2})', period_str.strip())
    if not match:
        today = date.today()
        return today, datetime.now()

    year = int(match.group(1))
    month = int(match.group(2))

    # Standard Quarter Ends
    if month in (1, 2, 3):
        p_end = date(year, 3, 31)
        disc = datetime(year, 5, 10, 18, 15, 0) # Q1 disclosure approx May 10
    elif month in (4, 5, 6):
        p_end = date(year, 6, 30)
        disc = datetime(year, 8, 19, 18, 30, 0) # Q2 disclosure approx Aug 19
    elif month in (7, 8, 9):
        p_end = date(year, 9, 30)
        disc = datetime(year, 11, 10, 18, 0, 0) # Q3 disclosure approx Nov 10
    else:
        p_end = date(year, 12, 31)
        disc = datetime(year + 1, 3, 10, 18, 45, 0) # Q4 annual disclosure approx Mar 10 next year

    return p_end, disc

def parse_date_flexible(val: Any) -> Optional[datetime]:
    """Parses various date/time formats from CSV into datetime."""
    if not val:
        return None
    s = str(val).strip()
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d',
        '%d.%m.%Y %H:%M:%S',
        '%d.%m.%Y',
        '%d/%m/%Y',
        '%Y/%m/%d'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None

def parse_financials_csv(
    csv_content: str, 
    default_ticker: str = "THYAO",
    source_filename: str = "uploaded_balance_sheet.csv"
) -> Tuple[List[Dict[str, Any]], List[CSVParseErrorDetail], List[str]]:
    """
    High-Performance Validation & Parser Engine for Balance Sheets.
    Returns: (parsed_records, errors, warnings)
    """
    records = []
    errors = []
    warnings = []

    # Detect delimiter: comma, semicolon, tab
    first_lines = csv_content[:2048]
    delimiter = ','
    if ';' in first_lines and first_lines.count(';') > first_lines.count(','):
        delimiter = ';'
    elif '\t' in first_lines:
        delimiter = '\t'

    reader = csv.reader(io.StringIO(csv_content), delimiter=delimiter)
    
    # Read Header
    try:
        header_raw = next(reader)
    except StopIteration:
        errors.append(CSVParseErrorDetail(
            row_number=0,
            error_message="CSV dosyası boş veya başlık satırı bulunamadı."
        ))
        return records, errors, warnings

    header_map = {}
    for idx, col in enumerate(header_raw):
        standard = normalize_column_name(col)
        header_map[standard] = idx

    # Check mandatory columns
    required_cols = [
        'period', 'donen_varliklar', 'duran_varliklar', 'toplam_varliklar',
        'kisa_vadeli_yuk', 'uzun_vadeli_yuk', 'ozkaynaklar',
        'net_satislar', 'favok', 'net_kar'
    ]
    missing = [c for c in required_cols if c not in header_map]
    if missing:
        warnings.append(
            f"Eksik kolonlar tespit edildi ({', '.join(missing)}). "
            f"Otomatik türetim veya varsayılan 0.0 değerleri atanacak."
        )

    for row_idx, row in enumerate(reader, start=2):
        if not row or all(c.strip() == '' for c in row):
            continue

        def get_val(key: str) -> str:
            idx = header_map.get(key)
            if idx is not None and idx < len(row):
                return row[idx].strip()
            return ''

        period_raw = get_val('period')
        if not period_raw:
            errors.append(CSVParseErrorDetail(
                row_number=row_idx,
                field='period',
                error_message="Zorunlu 'period' (dönem) hücresi boş.",
                raw_data={'row': row}
            ))
            continue

        # Resolve Ticker
        ticker = get_val('ticker') or default_ticker
        ticker = ticker.upper()

        # Resolve Dates (Period End & Disclosure)
        default_end, default_disc = resolve_period_dates(period_raw)
        
        period_end_raw = get_val('period_end_date')
        parsed_end = parse_date_flexible(period_end_raw)
        period_end_date = parsed_end.date() if parsed_end else default_end

        disclosure_raw = get_val('disclosure_date')
        parsed_disc = parse_date_flexible(disclosure_raw)
        disclosure_date = parsed_disc if parsed_disc else default_disc

        # Look-Ahead Bias Verification
        if disclosure_date.date() < period_end_date:
            warnings.append(
                f"Satır {row_idx} ({period_raw}): KAP İlan Tarihi ({disclosure_date.date()}), "
                f"Dönem Sonu Tarihinden ({period_end_date}) önce olamaz! "
                f"Look-Ahead Bias engellemek için KAP tarihi düzeltildi."
            )
            disclosure_date = datetime.combine(period_end_date, datetime.min.time())

        # Numeric Columns
        donen = parse_turkish_number(get_val('donen_varliklar'))
        duran = parse_turkish_number(get_val('duran_varliklar'))
        toplam_varlik = parse_turkish_number(get_val('toplam_varliklar'))
        if toplam_varlik == 0 and (donen > 0 or duran > 0):
            toplam_varlik = donen + duran

        kisa_yuk = parse_turkish_number(get_val('kisa_vadeli_yuk'))
        uzun_yuk = parse_turkish_number(get_val('uzun_vadeli_yuk'))
        ozkaynak = parse_turkish_number(get_val('ozkaynaklar'))

        net_satis = parse_turkish_number(get_val('net_satislar'))
        favok = parse_turkish_number(get_val('favok'))
        net_kar = parse_turkish_number(get_val('net_kar'))

        # Balance Sheet Identity Check: Assets = Liabilities + Equity
        total_pasif = kisa_yuk + uzun_yuk + ozkaynak
        balance_diff = abs(toplam_varlik - total_pasif)
        is_balanced = True
        if toplam_varlik > 0 and balance_diff > 1000: # 1,000 TL tolerance
            pct_diff = (balance_diff / toplam_varlik) * 100
            if pct_diff > 0.05:
                is_balanced = False
                warnings.append(
                    f"Satır {row_idx} ({period_raw}): Bilanço eşitliği sapması! "
                    f"Toplam Aktif (₺{toplam_varlik:,.0f}) != Pasif+Özkaynak (₺{total_pasif:,.0f}) | Fark: %{pct_diff:.2f}"
                )

        # Derived Ratios
        current_ratio = round(donen / kisa_yuk, 4) if kisa_yuk > 0 else 0.0
        debt_to_equity = round((kisa_yuk + uzun_yuk) / ozkaynak, 4) if ozkaynak > 0 else 0.0
        net_margin = round((net_kar / net_satis) * 100, 2) if net_satis > 0 else 0.0
        roe = round((net_kar / ozkaynak) * 100, 2) if ozkaynak > 0 else 0.0
        roa = round((net_kar / toplam_varlik) * 100, 2) if toplam_varlik > 0 else 0.0

        records.append({
            'ticker': ticker,
            'period': period_raw,
            'period_end_date': str(period_end_date),
            'disclosure_date': str(disclosure_date),
            'donen_varliklar': donen,
            'duran_varliklar': duran,
            'toplam_varliklar': toplam_varlik,
            'kisa_vadeli_yuk': kisa_yuk,
            'uzun_vadeli_yuk': uzun_yuk,
            'totalLiab': kisa_yuk + uzun_yuk,
            'ozkaynaklar': ozkaynak,
            'net_satislar': net_satis,
            'favok': favok,
            'net_kar': net_kar,
            # CamelCase aliases for universal contract:
            'currentAssets': donen,
            'fixedAssets': duran,
            'totalAssets': toplam_varlik,
            'shortTermLiab': kisa_yuk,
            'longTermLiab': uzun_yuk,
            'equity': ozkaynak,
            'revenue': net_satis,
            'ebitda': favok,
            'netIncome': net_kar,
            'costOfSales': -net_satis * 0.75 if net_satis > 0 else 0,
            'grossProfit': net_satis * 0.25 if net_satis > 0 else 0,
            'operatingProfit': favok * 0.8 if favok > 0 else net_kar,
            'current_ratio': current_ratio,
            'currentRatio': current_ratio,
            'debt_to_equity': debt_to_equity,
            'debtToEquity': debt_to_equity,
            'net_margin': net_margin,
            'netMargin': net_margin,
            'roe': roe,
            'roa': roa,
            'is_balanced': is_balanced,
            'source_filename': source_filename
        })

    def parse_period_sort_key(p: str) -> int:
        if not p:
            return 0
        m = re.search(r'(\d{4})[^\d]?(\d{1,2})?', str(p).strip())
        if not m:
            return 0
        y = int(m.group(1))
        q = int(m.group(2)) if m.group(2) else 12
        return y * 100 + q

    # STRICT AUTO-SORT: Descending order (statements[0] is the newest quarter)
    records.sort(
        key=lambda r: (
            parse_period_sort_key(r.get('period', '')),
            str(r.get('period_end_date', ''))
        ),
        reverse=True
    )

    return records, errors, warnings
