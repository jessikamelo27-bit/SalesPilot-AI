from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from app.database import Base


class ImportBatch(Base):
    """Represents a file upload or synthetic demo batch."""

    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), index=True, nullable=False)
    total_rows = Column(Integer, default=0, nullable=False)
    valid_rows = Column(Integer, default=0, nullable=False)
    invalid_rows = Column(Integer, default=0, nullable=False)
    duplicate_rows = Column(Integer, default=0, nullable=False)
    has_cost_column = Column(Boolean, default=True, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    status = Column(String(32), default="pending", nullable=False)  # pending | confirmed | cancelled
    quality_report_json = Column(Text, nullable=True)
    staged_records_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class SaleRecord(Base):
    """Represents a validated commercial transaction line item."""

    __tablename__ = "sale_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=True, index=True)
    sale_date = Column(Date, nullable=False, index=True)
    order_id = Column(String(100), nullable=False, index=True)
    product = Column(String(200), nullable=False, index=True)
    category = Column(String(120), nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float, default=0.0, nullable=False)
    unit_cost = Column(Float, nullable=True)
    salesperson = Column(String(150), nullable=False, index=True)
    region = Column(String(120), nullable=False, index=True)
    payment_method = Column(String(100), nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False, index=True)
    row_hash = Column(String(64), nullable=False, index=True)


class AppSetting(Base):
    """Stores runtime application settings."""

    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
