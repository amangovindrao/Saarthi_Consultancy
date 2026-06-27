import os

from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


PRIMARY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./consultant_ai.db",
)
FALLBACK_DATABASE_URL = "sqlite:///./consultant_ai.db"


def _build_engine(database_url: str):
    engine_kwargs = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(database_url, **engine_kwargs)


engine = _build_engine(PRIMARY_DATABASE_URL)
ACTIVE_DATABASE_URL = PRIMARY_DATABASE_URL
try:
    with engine.connect():
        pass
except SQLAlchemyError as exc:
    print(f"[database] Primary DB unavailable ({PRIMARY_DATABASE_URL}): {exc}")
    print(f"[database] Falling back to SQLite at {FALLBACK_DATABASE_URL}")
    ACTIVE_DATABASE_URL = FALLBACK_DATABASE_URL
    engine = _build_engine(FALLBACK_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
