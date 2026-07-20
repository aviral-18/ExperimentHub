"""FastAPI application entrypoint.

Wires routers, CORS and table creation. On first boot with an empty database it
auto-seeds a demo account and a portfolio of analysed experiments so the app is
immediately explorable.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import Base, SessionLocal, engine
from app.api.routes import analysis, auth, catalog, dashboard, experiments, reports

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("experimentos")

app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Product Experimentation & A/B Testing Platform — statistically correct, "
                "fully simulated, launch-decision-ready.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (all under the versioned prefix).
for r in (auth.router, experiments.router, analysis.router, catalog.router,
          dashboard.router, reports.router):
    app.include_router(r, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
def on_startup() -> None:
    # Import models so their tables are registered before create_all.
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")

    # Auto-seed on an empty database for an instant demo experience.
    from app.models.user import User
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            from app.seed import seed_database
            logger.info("Empty database detected — seeding demo data…")
            seed_database(db)
            logger.info("Seed complete.")
    finally:
        db.close()


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}


@app.get(f"{settings.API_V1_PREFIX}/health", tags=["system"])
def health_v1() -> dict:
    return {"status": "ok"}
