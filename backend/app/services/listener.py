import json
import asyncio
from web3 import Web3
from app.config import SEPOLIA_RPC_URL, FACTORY_ADDRESS
from app.database import jobs_collection, events_collection

with open("app/contracts/EscrowABI.json") as f:
    ESCROW_ABI = json.load(f)

with open("app/contracts/EscrowFactoryABI.json") as f:
    FACTORY_ABI = json.load(f)

w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC_URL))
factory = w3.eth.contract(address=Web3.to_checksum_address(FACTORY_ADDRESS), abi=FACTORY_ABI)

STATUS_MAP = {
    "JobFunded": 1,
    "Delivered": 2,
    "Confirmed": 3,
    "Disputed": 4,
    "Resolved": 5,
    "Refunded": 6,
}

# Tracks active event filters per job contract address, so we can watch
# every job the factory has ever created, not just one hardcoded address.
job_filters = {}


async def log_event(contract_address: str, event_name: str, event):
    await events_collection.insert_one({
        "event": event_name,
        "contract_address": contract_address,
        "block_number": event["blockNumber"],
        "tx_hash": event["transactionHash"].hex(),
        "args": dict(event["args"]),
    })
    print(f"[EVENT] {event_name} at {contract_address} (block {event['blockNumber']})")


async def upsert_job_status(contract_address: str, event_name: str, event):
    new_status = STATUS_MAP.get(event_name)
    if new_status is None:
        return

    update_fields = {"status": new_status}

    # JobFunded carries the funded amount (in wei) — store as string to
    # avoid JS/JSON precision loss on large values. The contract also sets
    # deliveryDeadline = block.timestamp + DELIVERY_WINDOW at funding time,
    # but that's not in the event args, so we read it directly from the
    # contract's public state instead.
    if event_name == "JobFunded":
        amount_wei = event["args"].get("amount")
        if amount_wei is not None:
            update_fields["amount"] = str(amount_wei)

        job_contract = w3.eth.contract(
            address=Web3.to_checksum_address(contract_address), abi=ESCROW_ABI
        )
        update_fields["delivery_deadline"] = job_contract.functions.deliveryDeadline().call()

    await jobs_collection.update_one(
        {"contract_address": contract_address},
        {"$set": update_fields},
    )


async def handle_job_created(event):
    job_address = event["args"]["jobAddress"]
    client = event["args"]["client"]
    freelancer = event["args"]["freelancer"]
    arbiter = event["args"]["arbiter"]

    await log_event(FACTORY_ADDRESS, "JobCreated", event)

    await jobs_collection.update_one(
        {"contract_address": job_address},
        {"$set": {
            "contract_address": job_address,
            "client": client,
            "freelancer": freelancer,
            "arbiter": arbiter,
            "status": 0,  # Created
        }},
        upsert=True,
    )

    start_watching_job(job_address)
    print(f"[NEW JOB] {job_address} (client={client}, freelancer={freelancer}, arbiter={arbiter})")


def start_watching_job(job_address: str):
    if job_address in job_filters:
        return  # already watching this job

    job_contract = w3.eth.contract(address=Web3.to_checksum_address(job_address), abi=ESCROW_ABI)

    job_filters[job_address] = {
        "JobFunded": job_contract.events.JobFunded.create_filter(from_block="latest"),
        "Delivered": job_contract.events.Delivered.create_filter(from_block="latest"),
        "Confirmed": job_contract.events.Confirmed.create_filter(from_block="latest"),
        "Disputed": job_contract.events.Disputed.create_filter(from_block="latest"),
        "Resolved": job_contract.events.Resolved.create_filter(from_block="latest"),
        "Refunded": job_contract.events.Refunded.create_filter(from_block="latest"),
    }


async def poll_events():
    print("Starting event listener. Watching factory:", FACTORY_ADDRESS)

    job_created_filter = factory.events.JobCreated.create_filter(from_block="latest")

    while True:
        for event in job_created_filter.get_new_entries():
            await handle_job_created(event)

        for job_address, filters in job_filters.items():
            for event_name, event_filter in filters.items():
                for event in event_filter.get_new_entries():
                    await log_event(job_address, event_name, event)
                    await upsert_job_status(job_address, event_name, event)

        await asyncio.sleep(5)