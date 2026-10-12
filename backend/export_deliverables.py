"""Exports data deliverables directly from the active FastAPI backend."""

import os
import json
import urllib.request

base_url = "http://127.0.0.1:8000/api/v1"
os.makedirs("data", exist_ok=True)

# 1. Fetch Influencers CSV export
print("[INFO] Fetching influencers CSV export...")
urllib.request.urlretrieve(f"{base_url}/influencers/export?format=csv", "data/influencers_dataset.csv")
print("Saved data/influencers_dataset.csv")

# 2. Fetch Influencers JSON export
print("[INFO] Fetching influencers JSON export...")
urllib.request.urlretrieve(f"{base_url}/influencers/export?format=json", "data/influencers_dataset.json")
print("Saved data/influencers_dataset.json")

# 3. Fetch Outreach history CSV export
print("[INFO] Fetching outreach history CSV export...")
urllib.request.urlretrieve(f"{base_url}/outreach/export?format=csv", "data/outreach_tracker_history.csv")
print("Saved data/outreach_tracker_history.csv")

# 4. Fetch Sample personalized messages
print("[INFO] Fetching sample personalized messages...")
req = urllib.request.Request(f"{base_url}/messages?limit=20")
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        with open("data/sample_personalized_messages.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    print("Saved data/sample_personalized_messages.json")
except Exception as exc:
    print(f"[WARN] No generated messages endpoint response: {exc}")
