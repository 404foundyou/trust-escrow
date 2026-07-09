from fastapi import FastAPI
from app.database import client

app = FastAPI(title="TrustEscrow API")


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