import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import SaleRecord
from app.routers import analysis, assistant, dashboard, data_import, reports, settings as settings_router
from app.services.demo_generator import load_demo_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("salespilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.execute(select(func.count(SaleRecord.id))).scalar() or 0
        if count == 0:
            logger.info("Initializing synthetic demonstration dataset for first-run showcase...")
            load_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Plataforma Inteligente de Business Intelligence e Análise de Vendas com IA Conversacional.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(data_import.router)
app.include_router(analysis.router)
app.include_router(assistant.router)
app.include_router(reports.router)
app.include_router(settings_router.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}
