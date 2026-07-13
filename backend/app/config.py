import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
SEPOLIA_RPC_URL = os.getenv("SEPOLIA_RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
FACTORY_ADDRESS = os.getenv("FACTORY_ADDRESS")

if not MONGO_URI:
    raise ValueError("MONGO_URI is not set in .env")
if not SEPOLIA_RPC_URL:
    raise ValueError("SEPOLIA_RPC_URL is not set in .env")
if not CONTRACT_ADDRESS:
    raise ValueError("CONTRACT_ADDRESS is not set in .env")
if not FACTORY_ADDRESS:
    raise ValueError("FACTORY_ADDRESS is not set in .env")