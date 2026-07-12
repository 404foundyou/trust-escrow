import json
import asyncio
from web3 import Web3
from app.config import SEPOLIA_RPC_URL, CONTRACT_ADDRESS
from app.database import jobs_collection, events_collection

with open("app/contracts/EscrowABI.json") as f:
    CONTRACT_ABI = json.load(f)

w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC_URL))
contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)

STATUS_MAP = {
    "JobFunded": 1,
    "Delivered": 2,
    "Confirmed": 3,
    "Disputed": 4,
    "Resolved": 5,
    "Refunded": 6,
}


async def log_event(event_name: str, event):
    await events_collection.insert_one({
        "event": event_name,
        "contract_address": CONTRACT_ADDRESS,
        "block_number": event["blockNumber"],
        "tx_hash": event["transactionHash"].hex(),
        "args": dict(event["args"]),
    })
    print(f"[EVENT] {event_name} at block {event['blockNumber']}")


async def upsert_job_status(event_name: str, event):
    new_status = STATUS_MAP.get(event_name)
    if new_status is None:
        return

    await jobs_collection.update_one(
        {"contract_address": CONTRACT_ADDRESS},
        {"$set": {"status": new_status}},
        upsert=True,
    )


async def poll_events():
    print("Starting event listener for contract:", CONTRACT_ADDRESS)

    event_filters = {
        "JobFunded": contract.events.JobFunded.create_filter(from_block="latest"),
        "Delivered": contract.events.Delivered.create_filter(from_block="latest"),
        "Confirmed": contract.events.Confirmed.create_filter(from_block="latest"),
        "Disputed": contract.events.Disputed.create_filter(from_block="latest"),
        "Resolved": contract.events.Resolved.create_filter(from_block="latest"),
        "Refunded": contract.events.Refunded.create_filter(from_block="latest"),
    }

    while True:
        for event_name, event_filter in event_filters.items():
            for event in event_filter.get_new_entries():
                await log_event(event_name, event)
                await upsert_job_status(event_name, event)

        await asyncio.sleep(5)