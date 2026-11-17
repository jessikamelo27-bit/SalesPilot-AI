from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import AnalysisResponse, FilterParams
from app.services.analyzer import run_intelligent_analysis

router = APIRouter(prefix="/api", tags=["Análise Inteligente"])


@router.get("/analysis", response_model=AnalysisResponse)
def get_intelligent_analysis(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    category: Optional[str] = Query(default=None),
    product: Optional[str] = Query(default=None),
    salesperson: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    include_demo: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    filters = FilterParams(
        start_date=start_date,
        end_date=end_date,
        category=category if category not in ("", "all") else None,
        product=product if product not in ("", "all") else None,
        salesperson=salesperson if salesperson not in ("", "all") else None,
        region=region if region not in ("", "all") else None,
        include_demo=include_demo,
    )
    return run_intelligent_analysis(db, filters)
