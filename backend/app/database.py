from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()

jobs_collection = db["jobs"]
events_collection = db["events"]