import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.getcwd())
load_dotenv()

from backend.app.core.database import db_manager
from backend.app.services.llm_service import personalization_service

async def test_single():
    await db_manager.connect_to_database()
    creators = await db_manager.list_creators(limit=10, is_synthetic=False)
    qualifying = [c for c in creators if (c.get("classification") or {}).get("is_qualified") is True]
    print(f"Found {len(qualifying)} qualifying real creators in first batch")
    if qualifying:
        target = qualifying[0]
        print(f"Testing on creator: {target.get('title')} ({target.get('channel_id')})")
        result = await personalization_service.generate_outreach_copy(target)
        print("Generated successfully!")
        print(f"Model: {result['model_name']} (mock={result['is_mock']})")
        print(f"Email words: {result['email_word_count']}")
        print(f"DM words: {result['dm_word_count']}")
        print("Subject:", result["email_subject"])
        print("Email Body:\n", result["email_body"])
        print("Instagram DM:\n", result["instagram_dm"])
    await db_manager.close_database_connection()

if __name__ == "__main__":
    asyncio.run(test_single())
