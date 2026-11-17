from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import ImportBatch
from app.schemas import ImportBatchInfo, ImportPreviewResponse
from app.services.demo_generator import clear_demo_data, load_demo_data
from app.services.importer import analyze_and_stage_import, cancel_import_batch, confirm_import_batch

router = APIRouter(prefix="/api", tags=["Importação & Demonstração"])

ALLOWED_EXTENSIONS = (".csv", ".xlsx", ".xls")


@router.post("/imports/upload", response_model=ImportPreviewResponse)
async def upload_sales_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome do arquivo não informado.",
        )

    lower_name = file.filename.lower()
    if not lower_name.endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de arquivo inválido. Envie apenas arquivos .CSV ou .XLSX.",
        )

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio.",
        )

    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"O arquivo excede o tamanho máximo permitido de {settings.max_upload_size_mb} MB.",
        )

    try:
        return analyze_and_stage_import(db=db, file_bytes=file_bytes, filename=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não foi possível processar a planilha enviada: {str(exc)}",
        ) from exc


@router.post("/imports/{batch_id}/confirm")
def confirm_import(batch_id: int, db: Session = Depends(get_db)):
    try:
        return confirm_import_batch(db, batch_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/imports/{batch_id}/cancel")
def cancel_import(batch_id: int, db: Session = Depends(get_db)):
    try:
        return cancel_import_batch(db, batch_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/imports/batches", response_model=List[ImportBatchInfo])
def list_import_batches(db: Session = Depends(get_db)):
    batches = db.execute(select(ImportBatch).order_by(ImportBatch.created_at.desc()).limit(30)).scalars().all()
    return batches


@router.get("/imports/template")
def download_sample_template():
    csv_content = (
        "Data da venda,Numero do pedido,Produto,Categoria,Quantidade vendida,Preco unitario,Desconto,Custo do produto,Vendedor,Regiao,Forma de pagamento\n"
        "2026-10-05,PED-9001,Enterprise Cloud Suite Pro,Cloud & Infraestrutura,3,3200.00,200.00,1120.00,Mariana Costa,Sudeste,PIX Corporativo\n"
        "2026-10-08,PED-9002,ShieldZero Endpoint Security,Licenças & Cibersegurança,5,1850.00,0.00,555.00,Rafael Mendes,Sul,Boleto Faturado 30d\n"
        "2026-10-12,PED-9003,Implantação BI & Data Ops,Serviços & Consultoria,2,3600.00,150.00,1980.00,Camila Albuquerque,Nordeste,Cartão Corporativo\n"
    )
    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="modelo_importacao_salespilot.csv"'},
    )


@router.post("/demo/load")
def load_demonstration_dataset(db: Session = Depends(get_db)):
    return load_demo_data(db)


@router.post("/demo/clear")
def clear_demonstration_dataset(db: Session = Depends(get_db)):
    return clear_demo_data(db)
