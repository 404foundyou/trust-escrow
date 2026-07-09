from pydantic import BaseModel, Field
from typing import Optional
from enum import IntEnum
from datetime import datetime


class JobStatus(IntEnum):
    Created = 0
    Funded = 1
    Delivered = 2
    Confirmed = 3
    Disputed = 4
    Resolved = 5
    Refunded = 6


class Job(BaseModel):
    contract_address: str = Field(..., description="On-chain address of this job's Escrow contract")
    client: str
    freelancer: str
    arbiter: str
    amount: Optional[str] = None  # stored as string since wei values can exceed JS/JSON safe integer range
    status: JobStatus = JobStatus.Created
    delivery_deadline: Optional[int] = None  # unix timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True