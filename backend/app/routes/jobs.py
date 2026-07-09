from fastapi import APIRouter, HTTPException
from app.database import jobs_collection
from app.models.job import Job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
async def list_jobs():
    jobs = await jobs_collection.find().to_list(length=100)
    for job in jobs:
        job["_id"] = str(job["_id"])
    return jobs


@router.get("/{contract_address}")
async def get_job(contract_address: str):
    job = await jobs_collection.find_one({"contract_address": contract_address})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["_id"] = str(job["_id"])
    return job


@router.get("/by-address/{wallet_address}")
async def get_jobs_for_address(wallet_address: str):
    jobs = await jobs_collection.find({
        "$or": [
            {"client": wallet_address},
            {"freelancer": wallet_address},
            {"arbiter": wallet_address},
        ]
    }).to_list(length=100)
    for job in jobs:
        job["_id"] = str(job["_id"])
    return jobs