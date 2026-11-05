#!/usr/bin/env python3
"""Compile data/ -> app/src/data/bundle.json. Refuse tout ce qui n'est pas verifie/publie."""
import json, glob, os, sys

root = os.path.join(os.path.dirname(__file__), "..")
plants = [{k: p[k] for k in ("id", "fr", "latin", "part")} for p in json.load(open(f"{root}/data/plants.json", encoding="utf-8"))]
claims = [c for f in sorted(glob.glob(f"{root}/data/claims/*.json")) for c in json.load(open(f, encoding="utf-8"))]
bad = [c["id"] for c in claims if c["status"] not in ("verifie", "publie")]
if bad:
    sys.exit(f"affirmations non verifiees refusees: {bad}")
by = {}
for c in claims:
    row = {k: c.get(k) for k in ("id", "type", "statement", "severity", "population", "status", "reviewed_by")}
    row.update(source=c["source"]["title"], url=c["source"]["url"], quote=c["source"]["quote"])
    by.setdefault(c["plant"], []).append(row)
for p in plants:
    p["claims"] = by.get(p["id"], [])
os.makedirs(f"{root}/app/src/data", exist_ok=True)
json.dump({"plants": plants}, open(f"{root}/app/src/data/bundle.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(plants), "plantes,", len(claims), "affirmations")
