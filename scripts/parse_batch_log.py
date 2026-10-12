import re
import os
import sys

LOG_PATH = r"C:\Users\Sonu\.gemini\antigravity-ide\brain\f62f4ebe-81b4-4e9e-8676-dac6dcda0cfd\.system_generated\tasks\task-1625.log"

if not os.path.exists(LOG_PATH):
    print("Log file not found.")
    sys.exit(1)

with open(LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
    text = f.read()

processing_matches = re.findall(r"\[(\d+)/69\]\s+Processing:\s+([^|\n]+)\s+\((UC[^\)]+)\)", text)
generated_matches = re.findall(r"Generated:\s+Email=(\d+)\s+words\s+\(([^)]+)\),\s+DM=(\d+)\s+words\s+\(([^)]+)\)\s+\|\s+Provider:\s+([^\s]+)\s+\(([^)]+)\)", text)
failed_matches = re.findall(r"FAILED to generate for\s+(UC\S+)", text)
cache_hits = re.findall(r"\[CACHE HIT\]", text)
db_hits = re.findall(r"\[DB HIT\]", text)

print(f"Total processed attempted: {len(processing_matches)} / 69")
if processing_matches:
    last_idx, last_title, last_cid = processing_matches[-1]
    print(f"Latest attempt: [{last_idx}/69] {last_title.strip()} ({last_cid})")

print(f"Successful generations in this run: {len(generated_matches)}")
print(f"Cache/DB hits: {len(cache_hits) + len(db_hits)}")
print(f"Failed attempts in this run: {len(failed_matches)}")

if failed_matches:
    print(f"Failed Channel IDs: {failed_matches}")

for g in generated_matches[:5]:
    print(f" - E:{g[0]} ({g[1]}), DM:{g[2]} ({g[3]}) | {g[4]} ({g[5]})")
