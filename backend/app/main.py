from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import client
from app.routes import jobs

app = FastAPI(title="TrustEscrow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)


@app.get("/")
async def root():
    return {"status": "TrustEscrow API is running"}


@app.get("/health/db")
async def health_check_db():
    try:
        await client.admin.command("ping")
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "detail": str(e)}