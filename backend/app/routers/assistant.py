from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import AssistantQueryRequest, AssistantQueryResponse
from app.services.assistant import process_assistant_query

router = APIRouter(prefix="/api", tags=["Assistente Conversacional IA"])


@router.post("/assistant/query", response_model=AssistantQueryResponse)
def ask_sales_assistant(
    payload: AssistantQueryRequest,
    db: Session = Depends(get_db),
):
    return process_assistant_query(db, payload)
