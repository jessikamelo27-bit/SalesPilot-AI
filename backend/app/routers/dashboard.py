from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import DashboardResponse, FilterOptionsResponse, FilterParams
from app.services.metrics import get_dashboard_data, get_filter_options

router = APIRouter(prefix="/api", tags=["Dashboard & Filters"])


@router.get("/dashboard", response_model=DashboardResponse)
def read_dashboard(
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
    return get_dashboard_data(db, filters)


@router.get("/filters", response_model=FilterOptionsResponse)
def read_filter_options(db: Session = Depends(get_db)):
    return get_filter_options(db)
