"""
QuantFlux Algorithmic Risk Engine & Big Data Stream (v3.2)
FastAPI Python Application
Run with: uvicorn backend.fastapi_app:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os, json, math

from backend.database import init_db
from backend.routers.financials import router as financials_router
from backend.routers.pipeline import router as pipeline_router
from backend.routers.terminal import router as terminal_router

app = FastAPI(
    title="QuantFlux Algorithmic Risk Engine API",
    version="3.2",
    description="Big Data Stream, Financial Statement Analytics, Event Study, and Multi-Factor Econometrics API."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables
@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"Database init error: {e}")

# Mount Routers
app.include_router(financials_router)
app.include_router(pipeline_router)
app.include_router(terminal_router)

class MacroStressRequest(BaseModel):
    ticker: str = "THYAO"
    fxShock: float = 0.0      # USD/TRY change %
    costShock: float = 0.0    # COGS change %
    rateShock: float = 0.0    # Policy rate shock in bps
    revShock: float = 0.0     # Volume/Revenue shock %

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "QuantFlux v3.2 Risk Engine",
        "timestamp": "2026-10-11T16:33:18Z"
    }

@app.get("/api/companies")
def get_companies():
    return [
        {"ticker": "THYAO", "name": "Türk Hava Yolları A.O.", "sector": "Havacılık / Ulaştırma", "bist": "BIST 30"},
        {"ticker": "KCHOL", "name": "Koç Holding A.Ş.", "sector": "Holding / Yatırım", "bist": "BIST 30"},
        {"ticker": "AGHOL", "name": "AG Anadolu Grubu Holding A.Ş.", "sector": "Holding / İçecek & Perakende", "bist": "BIST 30"},
        {"ticker": "BERA", "name": "Bera Holding A.Ş.", "sector": "İmalat / Çeşitlendirilmiş", "bist": "BIST 100"}
    ]

@app.post("/api/stress-test")
def run_stress_test(req: MacroStressRequest):
    # Quant macroeconomic transmission model
    base_net = 18.766e9 if req.ticker == "THYAO" else 46.868e9
    base_rev = 585.069e9
    base_cost = 542.482e9

    stressed_rev = base_rev * (1 + req.revShock / 100)
    stressed_cost = base_cost * (1 + (req.costShock / 100) + (req.fxShock / 100 * 0.35))
    fx_cash_hedge = base_net * (req.fxShock / 100) * 0.4
    rate_impact = base_cost * (req.rateShock / 10000) * 0.08

    stressed_net = base_net + (stressed_rev - base_rev) - (stressed_cost - base_cost) + fx_cash_hedge - rate_impact
    diff_pct = ((stressed_net - base_net) / base_net) * 100

    vol_multiplier = 1 + (abs(req.fxShock) + req.costShock + abs(req.rateShock) / 100) / 80
    stressed_var = abs(stressed_net) * 0.045 * vol_multiplier

    return {
        "ticker": req.ticker,
        "baseNetIncome": base_net,
        "stressedNetIncome": stressed_net,
        "netIncomeChangePct": round(diff_pct, 2),
        "stressedVaR99": round(stressed_var, 2),
        "stressedCVaR": round(stressed_var * 1.35, 2),
        "liquidityStatus": "STABLE" if stressed_net > 0 else "DISTRESSED"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.fastapi_app:app", host="0.0.0.0", port=8000, reload=True)
