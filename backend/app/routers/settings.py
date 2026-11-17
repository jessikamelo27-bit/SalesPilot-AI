from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import AppSetting, ImportBatch, SaleRecord
from app.schemas import SettingsResponse, SettingsUpdateRequest
from app.services.assistant import get_runtime_ai_config

router = APIRouter(prefix="/api", tags=["Configurações"])


def _mask_secret(secret: str) -> str:
    s = (secret or "").strip()
    if not s:
        return "Não configurada"
    if len(s) <= 8:
        return "****"
    return f"{s[:4]}...{s[-4:]}"


def _upsert_setting(db: Session, key: str, value: str):
    existing = db.get(AppSetting, key)
    if existing:
        existing.value = value
        existing.updated_at = datetime.now(timezone.utc)
    else:
        db.add(AppSetting(key=key, value=value))


@router.get("/settings", response_model=SettingsResponse)
def read_settings(db: Session = Depends(get_db)):
    cfg = get_runtime_ai_config(db)
    total_count = db.execute(select(func.count(SaleRecord.id))).scalar() or 0
    demo_count = db.execute(select(func.count(SaleRecord.id)).where(SaleRecord.is_demo.is_(True))).scalar() or 0
    real_count = int(total_count) - int(demo_count)

    openai_key = (cfg.get("openai_api_key") or "").strip()
    gemini_key = (cfg.get("gemini_api_key") or "").strip()

    return SettingsResponse(
        ai_provider=cfg.get("ai_provider", "deterministic"),
        openai_configured=bool(openai_key),
        openai_key_masked=_mask_secret(openai_key),
        openai_model=cfg.get("openai_model", "gpt-4o-mini"),
        gemini_configured=bool(gemini_key),
        gemini_key_masked=_mask_secret(gemini_key),
        gemini_model=cfg.get("gemini_model", "gemini-2.5-flash"),
        max_upload_size_mb=settings.max_upload_size_mb,
        total_records=int(total_count),
        demo_records=int(demo_count),
        real_records=real_count,
    )


@router.put("/settings", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdateRequest, db: Session = Depends(get_db)):
    if payload.ai_provider is not None:
        prov = payload.ai_provider.strip().lower()
        if prov not in ("deterministic", "openai", "gemini"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provedor inválido. Use 'deterministic', 'openai' ou 'gemini'.",
            )
        _upsert_setting(db, "ai_provider", prov)

    if payload.openai_model is not None and payload.openai_model.strip():
        _upsert_setting(db, "openai_model", payload.openai_model.strip())

    if payload.gemini_model is not None and payload.gemini_model.strip():
        _upsert_setting(db, "gemini_model", payload.gemini_model.strip())

    if payload.openai_api_key is not None:
        # Allow clearing key with empty string or setting new key (ignore if masked placeholder passed)
        if "..." not in payload.openai_api_key:
            _upsert_setting(db, "openai_api_key", payload.openai_api_key.strip())

    if payload.gemini_api_key is not None:
        if "..." not in payload.gemini_api_key:
            _upsert_setting(db, "gemini_api_key", payload.gemini_api_key.strip())

    db.commit()
    return read_settings(db)


@router.delete("/settings/real-data")
def clear_user_real_data(db: Session = Depends(get_db)):
    """Clears only imported user data (is_demo=False) if the user explicitly requests a reset in Settings."""
    deleted = db.execute(delete(SaleRecord).where(SaleRecord.is_demo.is_(False))).rowcount
    db.execute(delete(ImportBatch).where(ImportBatch.is_demo.is_(False)))
    db.commit()
    return {"status": "cleared_real_data", "deleted_real_records": int(deleted or 0)}
