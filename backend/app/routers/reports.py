from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ExecutiveReportResponse, FilterParams
from app.services.reporter import export_report_csv, export_report_pdf, generate_executive_report

router = APIRouter(prefix="/api", tags=["Relatórios Executivos"])


def _build_filters(
    start_date: Optional[date],
    end_date: Optional[date],
    category: Optional[str],
    product: Optional[str],
    salesperson: Optional[str],
    region: Optional[str],
    include_demo: bool,
) -> FilterParams:
    return FilterParams(
        start_date=start_date,
        end_date=end_date,
        category=category if category not in ("", "all") else None,
        product=product if product not in ("", "all") else None,
        salesperson=salesperson if salesperson not in ("", "all") else None,
        region=region if region not in ("", "all") else None,
        include_demo=include_demo,
    )


@router.get("/reports/executive", response_model=ExecutiveReportResponse)
def get_executive_report(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    category: Optional[str] = Query(default=None),
    product: Optional[str] = Query(default=None),
    salesperson: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    include_demo: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    filters = _build_filters(start_date, end_date, category, product, salesperson, region, include_demo)
    return generate_executive_report(db, filters)


@router.get("/reports/export/csv")
def download_report_csv(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    category: Optional[str] = Query(default=None),
    product: Optional[str] = Query(default=None),
    salesperson: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    include_demo: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    filters = _build_filters(start_date, end_date, category, product, salesperson, region, include_demo)
    csv_bytes = export_report_csv(db, filters)
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="relatorio_executivo_salespilot.csv"'},
    )


@router.get("/reports/export/pdf")
def download_report_pdf(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    category: Optional[str] = Query(default=None),
    product: Optional[str] = Query(default=None),
    salesperson: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    include_demo: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    filters = _build_filters(start_date, end_date, category, product, salesperson, region, include_demo)
    pdf_bytes = export_report_pdf(db, filters)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="relatorio_executivo_salespilot.pdf"'},
    )
