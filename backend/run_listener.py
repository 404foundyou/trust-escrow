import asyncio
from app.services.listener import poll_events

if __name__ == "__main__":
    asyncio.run(poll_events())