"""
QuantFlux Database Models (SQLAlchemy ORM)
Point-in-Time Financial Statement and Market Price Architecture.
Eliminates Look-Ahead Bias by strictly separating `period_end_date` from `disclosure_date`.
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Boolean, Text,
    Index, UniqueConstraint, func
)
from datetime import datetime, date
import json
from backend.database import Base

class FinancialStatement(Base):
    """
    KAP / UFRS Uyumlu Çeyreklik Bilanço ve Gelir Tablosu Veri Modeli.
    Look-Ahead Bias'ı önlemek için 'period_end_date' ve 'disclosure_date' ayrılmıştır.
    """
    __tablename__ = "financial_statements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String(20), nullable=False, index=True)
    period = Column(String(20), nullable=False, index=True)  # Örn: 2023/12
    
    # --- Point-in-Time Zaman Damgaları (Look-Ahead Bias Koruması) ---
    period_end_date = Column(Date, nullable=False, index=True)      # Çeyrek kapanış tarihi (örn: 2023-12-31)
    disclosure_date = Column(DateTime, nullable=False, index=True)  # KAP ilan tarihi (örn: 2024-03-08 18:45:00)

    # --- Bilanço Kalemleri (TL) ---
    donen_varliklar = Column(Float, nullable=False, default=0.0)      # Dönen Varlıklar (Current Assets)
    duran_varliklar = Column(Float, nullable=False, default=0.0)      # Duran Varlıklar (Fixed Assets)
    toplam_varliklar = Column(Float, nullable=False, default=0.0)     # Toplam Varlıklar (Total Assets)
    
    kisa_vadeli_yuk = Column(Float, nullable=False, default=0.0)      # Kısa Vadeli Yükümlülükler (Current Liab)
    uzun_vadeli_yuk = Column(Float, nullable=False, default=0.0)      # Uzun Vadeli Yükümlülükler (Long-term Liab)
    ozkaynaklar = Column(Float, nullable=False, default=0.0)          # Toplam Özkaynaklar (Shareholders' Equity)

    # --- Gelir Tablosu Kalemleri (TL) ---
    net_satislar = Column(Float, nullable=False, default=0.0)         # Hasılat / Net Satışlar (Revenue)
    favok = Column(Float, nullable=False, default=0.0)                # FAVÖK (EBITDA)
    net_kar = Column(Float, nullable=False, default=0.0)              # Net Dönem Kârı / Zararı (Net Income)

    # --- Önceden Hesaplanmış Finansal Rasyolar (Ratios) ---
    current_ratio = Column(Float, nullable=True)     # Cari Oran: donen_varliklar / kisa_vadeli_yuk
    debt_to_equity = Column(Float, nullable=True)    # Kaldıraç: (kisa_vadeli_yuk + uzun_vadeli_yuk) / ozkaynaklar
    net_margin = Column(Float, nullable=True)        # Net Kâr Marjı %: net_kar / net_satislar * 100
    roe = Column(Float, nullable=True)               # Özkaynak Kârlılığı %: net_kar / ozkaynaklar * 100
    roa = Column(Float, nullable=True)               # Aktif Kârlılığı %: net_kar / toplam_varliklar * 100

    # --- Doğrulama ve Audit Metadata ---
    is_balanced = Column(Boolean, default=True)      # Muhasebe eşitliği: Toplam Aktif == Toplam Pasif
    source_filename = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('ticker', 'period', name='uq_financial_ticker_period'),
        Index('ix_pit_lookup', 'ticker', 'disclosure_date'),
    )

    def calculate_ratios(self):
        """Finansal rasyoları otomatik türetir."""
        if self.kisa_vadeli_yuk and self.kisa_vadeli_yuk > 0:
            self.current_ratio = round(self.donen_varliklar / self.kisa_vadeli_yuk, 4)
        if self.ozkaynaklar and self.ozkaynaklar > 0:
            total_liab = (self.kisa_vadeli_yuk or 0) + (self.uzun_vadeli_yuk or 0)
            self.debt_to_equity = round(total_liab / self.ozkaynaklar, 4)
            self.roe = round((self.net_kar / self.ozkaynaklar) * 100, 2)
        if self.net_satislar and self.net_satislar > 0:
            self.net_margin = round((self.net_kar / self.net_satislar) * 100, 2)
        if self.toplam_varliklar and self.toplam_varliklar > 0:
            self.roa = round((self.net_kar / self.toplam_varliklar) * 100, 2)


class PriceBar(Base):
    """
    Hisse Senedi Günlük Fiyat Verisi (OHLCV).
    Point-in-Time bilanço verileriyle eşleştirilebilir.
    """
    __tablename__ = "price_bars"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String(20), nullable=False, index=True)
    timestamp = Column(Date, nullable=False, index=True)  # İşlem günü (YYYY-MM-DD)
    
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    adj_close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False, default=0.0)

    __table_args__ = (
        UniqueConstraint('ticker', 'timestamp', name='uq_price_ticker_timestamp'),
        Index('ix_price_lookup', 'ticker', 'timestamp'),
    )


class ModelConfig(Base):
    """
    Kantitatif Model Hiperparametreleri ve Konfigürasyon Tablosu (v3.2).
    LSTM lookback, Student's t df, Event study penceresi ve VIF eşik değerlerini saklar.
    LocalStorage ve API çift yönlü senkronizasyonunu destekler.
    """
    __tablename__ = "model_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    config_key = Column(String(50), unique=True, index=True, default="default", nullable=False)
    profile_name = Column(String(100), default="QuantFlux Production v3.2", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Tüm model hiperparametrelerini içeren JSON dizesi
    parameters = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    @classmethod
    def get_default_parameters(cls) -> dict:
        return {
            "time_series": {
                "lstm_lookback": 60,
                "forecast_horizon": 20,
                "confidence_interval": 0.95,
                "lstm_epochs": 100,
                "learning_rate": 0.001,
                "batch_size": 32,
                "arima_auto": True
            },
            "risk_var": {
                "students_t_df": 5.0,
                "history_window": 252,
                "var_confidence": 0.99,
                "volatility_model": "garch",
                "ewma_lambda": 0.94,
                "mc_paths": 50000
            },
            "event_study": {
                "estimation_window": 100,
                "event_window_half": 5,
                "benchmark": "XU100",
                "capm_min_obs": 60
            },
            "regression": {
                "vif_threshold": 5.0,
                "significance_alpha": 0.05,
                "cov_type": "newey-west",
                "active_factors": ["MKT", "SMB", "HML", "MOM", "USD_TRY", "INTEREST_RATE"]
            },
            "meta": {
                "profile_name": "QuantFlux Production v3.2",
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "version": "3.2"
            }
        }

    def to_dict(self) -> dict:
        try:
            params = json.loads(self.parameters)
        except Exception:
            params = self.get_default_parameters()
        return {
            "id": self.id,
            "config_key": self.config_key,
            "profile_name": self.profile_name,
            "is_active": self.is_active,
            "parameters": params,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

