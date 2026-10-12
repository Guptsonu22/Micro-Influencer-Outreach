import asyncio
import os
import sys
import json

sys.path.insert(0, os.getcwd())
from backend.app.core.database import db_manager

async def inspect():
    await db_manager.connect_to_database()
    messages = await db_manager.list_generated_messages(limit=200)
    
    with open("data/real_influencers_export.json", "r", encoding="utf-8") as f:
        creators = json.load(f)
    
    qualifying = [c for c in creators if (c.get("classification") or {}).get("is_qualified") is True]
    qual_cids = {c["channel_id"]: c for c in qualifying}
    
    matched = []
    word_count_failures = []
    synthetic_msgs = []
    
    for m in messages:
        cid = m.get("channel_id")
        if cid in qual_cids:
            c = qual_cids[cid]
            ew = m.get("email_word_count", 0)
            dw = m.get("dm_word_count", 0)
            e_ok = 60 <= ew <= 90
            d_ok = 15 <= dw <= 30
            matched.append((cid, c.get("title"), ew, dw, m.get("provider_name"), m.get("model_name"), m.get("is_mock")))
            if not (e_ok and d_ok):
                word_count_failures.append((cid, ew, dw))
        elif str(cid).startswith("UC_SYNTHETIC"):
            synthetic_msgs.append(cid)
            
    print(f"Total qualifying creators: {len(qualifying)}")
    print(f"Total messages in DB: {len(messages)}")
    print(f"Qualifying creators with messages: {len(matched)}")
    print(f"Synthetic messages in DB: {len(synthetic_msgs)}")
    print(f"Word count violations: {len(word_count_failures)}")
    
    for item in matched[:10]:
        print(f" - {item[0]} | {item[1]} | E:{item[2]} words | DM:{item[3]} words | {item[4]} ({item[5]}, mock={item[6]})")
        
    await db_manager.close_database_connection()

if __name__ == "__main__":
    asyncio.run(inspect())
