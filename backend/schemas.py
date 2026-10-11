"""
QuantFlux Pydantic Schemas (v2)
Data Validation, Ingestion, and Response Payloads.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class FinancialStatementBase(BaseModel):
    ticker: str = Field(..., example="THYAO", description="Hisse senedi sembolü")
    period: str = Field(..., example="2023/12", description="Bilanço çeyrek dönemi (YYYY/MM)")
    period_end_date: date = Field(..., example="2023-12-31", description="Dönem kapanış tarihi")
    disclosure_date: datetime = Field(..., example="2024-03-08T18:45:00", description="KAP ilan tarihi ve saati")

    donen_varliklar: float = Field(..., ge=0, description="Dönen Varlıklar (TL)")
    duran_varliklar: float = Field(..., ge=0, description="Duran Varlıklar (TL)")
    toplam_varliklar: float = Field(..., ge=0, description="Toplam Varlıklar (TL)")
    
    kisa_vadeli_yuk: float = Field(..., ge=0, description="Kısa Vadeli Yükümlülükler (TL)")
    uzun_vadeli_yuk: float = Field(..., ge=0, description="Uzun Vadeli Yükümlülükler (TL)")
    ozkaynaklar: float = Field(..., description="Toplam Özkaynaklar (TL)")
    
    net_satislar: float = Field(..., description="Hasılat / Net Satışlar (TL)")
    favok: float = Field(..., description="FAVÖK / EBITDA (TL)")
    net_kar: float = Field(..., description="Net Dönem Kârı (TL)")

    @field_validator('disclosure_date')
    @classmethod
    def validate_look_ahead_bias(cls, v: datetime, info):
        """Look-Ahead Bias Kontrolü: İlan tarihi, dönem sonundan önce olamaz."""
        period_end = info.data.get('period_end_date')
        if period_end:
            # Disclosure date date part must be on or after period_end_date
            if v.date() < period_end:
                raise ValueError(
                    f"Look-Ahead Bias Hatası: KAP açıklanma tarihi ({v.date()}), "
                    f"dönem sonu tarihinden ({period_end}) önce olamaz!"
                )
        return v


class FinancialStatementResponse(FinancialStatementBase):
    id: int
    current_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    net_margin: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    is_balanced: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class CSVParseErrorDetail(BaseModel):
    row_number: int
    field: Optional[str] = None
    error_message: str
    raw_data: Optional[Dict[str, Any]] = None


class CSVUploadResult(BaseModel):
    success: bool
    filename: str
    ticker: str
    rows_parsed: int
    rows_inserted: int
    rows_updated: int
    warnings: List[str] = []
    errors: List[CSVParseErrorDetail] = []
    sample_records: List[Dict[str, Any]] = []


class PointInTimeQuery(BaseModel):
    ticker: str = Field(..., example="THYAO")
    as_of_date: date = Field(..., example="2024-04-15", description="Stratejinin işlem yaptığı an (Point-in-Time)")
