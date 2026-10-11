"""
QuantFlux Financials Router (FastAPI)
CSV Upload, Validation, Bulk Insertion, and Point-in-Time Data Access.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from typing import Optional, List
from datetime import date, datetime
import io

from backend.database import get_db
from backend.models import FinancialStatement
from backend.schemas import CSVUploadResult, FinancialStatementResponse, PointInTimeQuery
from backend.parser import parse_financials_csv

router = APIRouter(prefix="/api/financials", tags=["Financial Statements"])

# KAP Uyumlu Örnek THYAO Bilanço CSV Şablonu
SAMPLE_THYAO_CSV = """period,disclosure_date,donen_varliklar,duran_varliklar,toplam_varliklar,kisa_vadeli_yuk,uzun_vadeli_yuk,ozkaynaklar,net_satislar,favok,net_kar
2026/06,2026-08-12 18:30:00,512191000000,1847846000000,2360037000000,566751000000,774833000000,1018453000000,585069000000,109375000000,18766000000
2025/12,2026-03-04 18:45:00,436412000000,1560333000000,1996745000000,442076000000,643413000000,911256000000,955472000000,186540000000,118117000000
2024/12,2025-03-06 18:40:00,341910000000,1057696000000,1399606000000,339533000000,380061000000,680012000000,745430000000,142908000000,113357000000
2023/12,2024-03-08 18:45:00,253043000000,797048000000,1050091000000,267956000000,325023000000,457112000000,504398000000,119446000000,162998000000
2022/12,2023-03-01 18:15:00,185000000000,620000000000,805000000000,140000000000,380000000000,285000000000,311000000000,82000000000,110000000000
2021/12,2022-03-01 18:00:00,120000000000,410000000000,530000000000,110000000000,260000000000,160000000000,158000000000,45000000000,42000000000
"""

@router.get("/sample-csv", summary="KAP Formatında Örnek THYAO Bilanço CSV Şablonu İndir")
def get_sample_csv():
    """
    Kullanıcının terminal arayüzünden indirebileceği standart CSV şablonunu üretir.
    Türkiye muhasebe standartlarına ve KAP formatına tam uyumludur.
    """
    return Response(
        content=SAMPLE_THYAO_CSV.strip(),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="THYAO_bilanco_sample.csv"'
        }
    )

@router.post("/upload-csv", response_model=CSVUploadResult, summary="Bilanço CSV Dosyasını Doğrula ve Veritabanına Yükle")
async def upload_financials_csv(
    file: UploadFile = File(...),
    ticker: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Yüklenen CSV dosyasını ayrıştırır, doğrular ve veritabanına bulk-insert / upsert eder.
    Look-Ahead Bias denetimi ve Muhasebe Eşitliği doğrulaması içerir.
    """
    if not file.filename.lower().endswith(('.csv', '.txt')):
        raise HTTPException(
            status_code=400, 
            detail="Geçersiz dosya formatı. Lütfen .csv uzantılı dosya yükleyin."
        )

    try:
        content_bytes = await file.read()
        content = content_bytes.decode('utf-8', errors='replace')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Dosya okuma hatası: {str(e)}")

    # Default ticker resolution (from form or filename)
    inferred_ticker = ticker
    if not inferred_ticker:
        inferred_ticker = file.filename.split('_')[0].split('.')[0].upper()
        if not inferred_ticker or len(inferred_ticker) > 10:
            inferred_ticker = "THYAO"

    # Execute parser engine
    records, errors, warnings = parse_financials_csv(
        csv_content=content,
        default_ticker=inferred_ticker,
        source_filename=file.filename
    )

    if not records and errors:
        return CSVUploadResult(
            success=False,
            filename=file.filename,
            ticker=inferred_ticker,
            rows_parsed=0,
            rows_inserted=0,
            rows_updated=0,
            warnings=warnings,
            errors=errors
        )

    # Bulk-Upsert Database Execution
    inserted_count = 0
    updated_count = 0

    for rec in records:
        existing = db.query(FinancialStatement).filter(
            FinancialStatement.ticker == rec['ticker'],
            FinancialStatement.period == rec['period']
        ).first()

        if existing:
            # Update existing record
            for k, v in rec.items():
                setattr(existing, k, v)
            existing.calculate_ratios()
            updated_count += 1
        else:
            # Insert new record
            statement = FinancialStatement(**rec)
            statement.calculate_ratios()
            db.add(statement)
            inserted_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Veritabanı kayıt hatası: {str(e)}")

    sample_preview = records[:4]
    for s in sample_preview:
        # Convert dates to string for JSON serialization
        s['period_end_date'] = str(s['period_end_date'])
        s['disclosure_date'] = str(s['disclosure_date'])

    return CSVUploadResult(
        success=True,
        filename=file.filename,
        ticker=inferred_ticker,
        rows_parsed=len(records),
        rows_inserted=inserted_count,
        rows_updated=updated_count,
        warnings=warnings,
        errors=errors,
        sample_records=sample_preview
    )

@router.get("/statements/{ticker}", response_model=List[FinancialStatementResponse], summary="Şirketin Bilanço Geçmişini Getir")
def get_financial_statements(ticker: str, db: Session = Depends(get_db)):
    """Veritabanındaki çeyreklik bilançoları kronolojik olarak listeler."""
    statements = db.query(FinancialStatement).filter(
        FinancialStatement.ticker == ticker.upper()
    ).order_by(FinancialStatement.period_end_date.desc()).all()
    return statements

@router.get("/point-in-time", summary="Point-in-Time Bilanço Sorgusu (Look-Ahead Bias Önleme)")
def get_point_in_time_financials(
    ticker: str = Query(..., example="THYAO"),
    as_of_date: date = Query(..., example="2024-04-15", description="Stratejinin çalıştığı an"),
    db: Session = Depends(get_db)
):
    """
    Belirli bir işlem gününde ('as_of_date') piyasanın YALNIZCA kamuya açık olarak
    bildiği en güncel bilançoyu döndürür (disclosure_date <= as_of_date).
    Look-Ahead Bias'ı kesin olarak bertaraf eder.
    """
    as_of_dt = datetime.combine(as_of_date, datetime.max.time())
    
    statement = db.query(FinancialStatement).filter(
        and_(
            FinancialStatement.ticker == ticker.upper(),
            FinancialStatement.disclosure_date <= as_of_dt
        )
    ).order_by(FinancialStatement.disclosure_date.desc()).first()

    if not statement:
        raise HTTPException(
            status_code=404, 
            detail=f"{ticker} için {as_of_date} tarihinde henüz kamuya açıklanmış (KAP) bir bilanço bulunamadı."
        )

    return {
        "ticker": ticker.upper(),
        "as_of_date": as_of_date,
        "latest_known_period": statement.period,
        "disclosure_date": statement.disclosure_date,
        "days_since_disclosure": (as_of_date - statement.disclosure_date.date()).days,
        "financial_data": {
            "net_satislar": statement.net_satislar,
            "favok": statement.favok,
            "net_kar": statement.net_kar,
            "ozkaynaklar": statement.ozkaynaklar,
            "current_ratio": statement.current_ratio,
            "debt_to_equity": statement.debt_to_equity,
            "roe": statement.roe
        }
    }
