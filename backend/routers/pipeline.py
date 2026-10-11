"""
QuantFlux Big Data Stream & Pipeline Router (FastAPI)
Exposes endpoints for:
  - Triggering BIST 100 Background ETL Tasks
  - Polling Real-Time Active Data Source Status (KAP, Yahoo, WebSocket)
  - Streaming Terminal Console Logs
  - Fetching Ingested Disclosures
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from typing import Dict, Any, List, Optional
import uuid

from backend.pipeline import pipeline_instance, log_bus, BIST100_UNIVERSE

router = APIRouter(prefix="/api/pipeline", tags=["Big Data Pipeline"])


@router.get("/status", summary="Aktif Veri Kaynakları ve Pipeline Durumu")
def get_pipeline_status() -> Dict[str, Any]:
    """
    KAP Scraper, Yahoo Finance API ve BIST WebSocket bağlantı sağlık durumlarını,
    pipeline ilerlemesini ve son çekilen bilançoları döndürür.
    """
    return pipeline_instance.get_data_sources_status()


@router.post("/sync-bist100", summary="BIST 100 Verilerini Arka Planda Güncelle")
def trigger_bist100_sync(
    background_tasks: BackgroundTasks,
    tickers: Optional[str] = Query(None, description="Virgülle ayrılmış hisse kodları (boşsa varsayılan BIST 30)")
) -> Dict[str, Any]:
    """
    BIST hisselerinin UFRS çeyreklik bilançolarını ve günlük fiyat serilerini
    arka planda asenkron olarak çeken pipeline görevini tetikler.
    """
    if pipeline_instance.is_running:
        return {
            "success": False,
            "status": "already_running",
            "message": "Halihazırda devam eden bir senkronizasyon görevi bulunmaktadır.",
            "current_task_id": pipeline_instance.current_task_id,
            "progress": pipeline_instance.progress_percent
        }

    task_id = str(uuid.uuid4())
    ticker_list = [t.strip().upper() for t in tickers.split(",")] if tickers else None

    # Dispatch to FastAPI BackgroundTasks worker
    background_tasks.add_task(pipeline_instance.run_sync_task, task_id, ticker_list)

    return {
        "success": True,
        "status": "started",
        "task_id": task_id,
        "message": "BIST 100 asenkron veri senkronizasyonu başlatıldı.",
        "target_tickers": ticker_list if ticker_list else [x["ticker"] for x in BIST100_UNIVERSE[:10]]
    }


@router.get("/logs", summary="Akan Veri Loglarını Getir")
def get_stream_logs(limit: int = Query(60, ge=1, le=200)) -> Dict[str, Any]:
    """
    Terminal konsolunda anlık akması için bellek içi ring-buffer loglarını döndürür.
    """
    logs = log_bus.get_logs(limit=limit)
    return {
        "count": len(logs),
        "is_running": pipeline_instance.is_running,
        "progress": pipeline_instance.progress_percent,
        "logs": logs
    }


@router.post("/clear-logs", summary="Terminal Konsol Loglarını Temizle")
def clear_stream_logs():
    """Terminal log tampon belleğini sıfırlar."""
    log_bus.clear()
    log_bus.append("TERMINAL", "Log tampon belleği kullanıcı tarafından temizlendi.", "INFO")
    return {"success": True, "message": "Loglar temizlendi."}


@router.get("/universe", summary="BIST 100 Takip Edilen Hisse Evreni")
def get_bist_universe():
    """Pipeline tarafından periyodik olarak taranan hisse listesini döner."""
    return {
        "count": len(BIST100_UNIVERSE),
        "universe": BIST100_UNIVERSE
    }
