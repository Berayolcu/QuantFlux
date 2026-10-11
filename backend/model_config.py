"""
QuantFlux Model Hyperparameter & Configuration Engine (v3.2)
Yönetilen Modeller:
- LSTM & Derin Öğrenme Zaman Serisi (Lookback, Tahmin Ufku, Güven Aralığı, Epochs)
- Risk & VaR Motoru (Student's t Serbestlik Derecesi df, Tarihsel Pencere, VaR Güven Düzeyi, GARCH/EWMA)
- Event Study Bilanço Sürprizi (Tahmin Penceresi, Olay Penceresi [-t, +t])
- Çok Faktörlü Panel Regresyon (VIF Eşik Değeri, Anlamlılık Düzeyi alpha, Newey-West)

Çift Yönlü Kalıcılık (Persistence):
- SQLite veritabanı (model_configs tablosu)
- LocalStorage ve frontend event veri yolu (quantflux:config-updated)
"""

import json
import sqlite3
import os
import copy
from datetime import datetime
from typing import Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "quantflux.db")

DEFAULT_CONFIG: Dict[str, Any] = {
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

# In-memory runtime cache
_RUNTIME_CONFIG = copy.deepcopy(DEFAULT_CONFIG)


def _init_sqlite_table():
    """SQLite veritabanında model_configs tablosunu doğrular veya oluşturur."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_key VARCHAR(50) UNIQUE NOT NULL,
                profile_name VARCHAR(100) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                parameters TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[ModelConfig] SQLite init warning: {e}")


def validate_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Konfigürasyon değerlerini sınır ve tip kontrolünden geçirir."""
    validated = copy.deepcopy(DEFAULT_CONFIG)
    
    # 1. Time Series
    ts = cfg.get("time_series", {})
    validated["time_series"]["lstm_lookback"] = max(10, min(365, int(ts.get("lstm_lookback", 60))))
    validated["time_series"]["forecast_horizon"] = max(1, min(90, int(ts.get("forecast_horizon", 20))))
    ci = float(ts.get("confidence_interval", 0.95))
    validated["time_series"]["confidence_interval"] = ci if ci in [0.90, 0.95, 0.99] else 0.95
    validated["time_series"]["lstm_epochs"] = max(10, min(500, int(ts.get("lstm_epochs", 100))))
    validated["time_series"]["learning_rate"] = float(ts.get("learning_rate", 0.001))
    validated["time_series"]["arima_auto"] = bool(ts.get("arima_auto", True))

    # 2. Risk & VaR
    rk = cfg.get("risk_var", {})
    # Student's t serbestlik derecesi df: > 2.0 olmalı ki sonlu varyans var olsun
    validated["risk_var"]["students_t_df"] = max(2.1, min(50.0, float(rk.get("students_t_df", 5.0))))
    validated["risk_var"]["history_window"] = max(30, min(1000, int(rk.get("history_window", 252))))
    vc = float(rk.get("var_confidence", 0.99))
    validated["risk_var"]["var_confidence"] = vc if vc in [0.95, 0.99, 0.999] else 0.99
    validated["risk_var"]["volatility_model"] = str(rk.get("volatility_model", "garch")).lower()
    validated["risk_var"]["ewma_lambda"] = max(0.80, min(0.99, float(rk.get("ewma_lambda", 0.94))))
    validated["risk_var"]["mc_paths"] = max(1000, min(200000, int(rk.get("mc_paths", 50000))))

    # 3. Event Study
    es = cfg.get("event_study", {})
    validated["event_study"]["estimation_window"] = max(30, min(252, int(es.get("estimation_window", 100))))
    validated["event_study"]["event_window_half"] = max(1, min(20, int(es.get("event_window_half", 5))))
    validated["event_study"]["benchmark"] = str(es.get("benchmark", "XU100")).upper()
    validated["event_study"]["capm_min_obs"] = max(20, min(150, int(es.get("capm_min_obs", 60))))

    # 4. Regression
    rg = cfg.get("regression", {})
    validated["regression"]["vif_threshold"] = max(1.5, min(20.0, float(rg.get("vif_threshold", 5.0))))
    alpha = float(rg.get("significance_alpha", 0.05))
    validated["regression"]["significance_alpha"] = alpha if alpha in [0.01, 0.05, 0.10] else 0.05
    validated["regression"]["cov_type"] = str(rg.get("cov_type", "newey-west")).lower()
    if "active_factors" in rg and isinstance(rg["active_factors"], list):
        validated["regression"]["active_factors"] = rg["active_factors"]

    # Meta
    profile_name = cfg.get("meta", {}).get("profile_name", "QuantFlux Production v3.2")
    validated["meta"] = {
        "profile_name": profile_name,
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "version": "3.2"
    }

    return validated


def get_active_model_config() -> Dict[str, Any]:
    """
    Aktif model hiperparametrelerini döndürür.
    Önce SQLite model_configs tablosunu yoklar, yoksa varsayılanı oluşturup kaydeder.
    """
    global _RUNTIME_CONFIG
    _init_sqlite_table()
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT parameters FROM model_configs WHERE config_key = 'default' LIMIT 1")
        row = cursor.fetchone()
        
        if row and row[0]:
            parsed = json.loads(row[0])
            _RUNTIME_CONFIG = validate_config(parsed)
            conn.close()
            return _RUNTIME_CONFIG
        else:
            # Varsayılan konfigürasyonu SQLite'a kaydet
            now_str = datetime.utcnow().isoformat() + "Z"
            default_json = json.dumps(DEFAULT_CONFIG, ensure_ascii=False)
            cursor.execute("""
                INSERT OR REPLACE INTO model_configs (config_key, profile_name, is_active, parameters, updated_at)
                VALUES ('default', 'QuantFlux Production v3.2', 1, ?, ?)
            """, (default_json, now_str))
            conn.commit()
            conn.close()
            _RUNTIME_CONFIG = copy.deepcopy(DEFAULT_CONFIG)
            return _RUNTIME_CONFIG
    except Exception as e:
        print(f"[ModelConfig] Read DB fallback: {e}")
        return _RUNTIME_CONFIG


def save_model_config(new_params: Dict[str, Any], profile_name: str = "QuantFlux Production v3.2") -> Dict[str, Any]:
    """
    Model konfigürasyonunu doğrular ve SQLite model_configs tablosuna kaydeder.
    """
    global _RUNTIME_CONFIG
    _init_sqlite_table()

    validated = validate_config(new_params)
    validated["meta"]["profile_name"] = profile_name
    _RUNTIME_CONFIG = validated

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat() + "Z"
        cfg_json = json.dumps(validated, ensure_ascii=False)
        cursor.execute("""
            INSERT INTO model_configs (config_key, profile_name, is_active, parameters, updated_at)
            VALUES ('default', ?, 1, ?, ?)
            ON CONFLICT(config_key) DO UPDATE SET
                profile_name = excluded.profile_name,
                parameters = excluded.parameters,
                updated_at = excluded.updated_at
        """, (profile_name, cfg_json, now_str))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[ModelConfig] Save DB warning: {e}")

    return validated


def reset_model_config() -> Dict[str, Any]:
    """Model ayarlarını fabrika varsayılanlarına sıfırlar."""
    global _RUNTIME_CONFIG
    _init_sqlite_table()

    _RUNTIME_CONFIG = copy.deepcopy(DEFAULT_CONFIG)
    _RUNTIME_CONFIG["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat() + "Z"
        cfg_json = json.dumps(DEFAULT_CONFIG, ensure_ascii=False)
        cursor.execute("""
            INSERT INTO model_configs (config_key, profile_name, is_active, parameters, updated_at)
            VALUES ('default', 'QuantFlux Production v3.2', 1, ?, ?)
            ON CONFLICT(config_key) DO UPDATE SET
                profile_name = 'QuantFlux Production v3.2',
                parameters = excluded.parameters,
                updated_at = excluded.updated_at
        """, (cfg_json, now_str))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[ModelConfig] Reset DB warning: {e}")

    return _RUNTIME_CONFIG


# Initial table verification on module import
_init_sqlite_table()
