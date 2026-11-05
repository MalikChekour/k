#!/usr/bin/env python3
"""Compile data/ -> app/src/data/bundle.json.

Refus (le build echoue, rien n'est publie) :
  - affirmation non verifiee ;
  - regle d'interaction dont l'affirmation n'existe pas, ou d'une autre plante, ou dont la gravite differe de l'affirmation ;
  - classe de medicament inconnue ;
  - affirmation de type interaction/warning/contraindication sans aucun moyen d'etre affichee (ni profil, ni regle).
"""
import json, glob, os, sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
load = lambda p: json.load(open(os.path.join(root, p), encoding="utf-8"))

plants = [{k: p[k] for k in ("id", "fr", "latin", "part")} for p in load("data/plants.json")]
plant_ids = {p["id"] for p in plants}
claims = [c for f in sorted(glob.glob(os.path.join(root, "data", "claims", "*.json"))) for c in json.load(open(f, encoding="utf-8"))]
meds, rules = load("data/medications.json"), load("data/rules.json")
errors = []

by_id = {c["id"]: c for c in claims}
if len(by_id) != len(claims):
    errors.append("identifiants d'affirmation en double")
for c in claims:
    if c["status"] not in ("verifie", "publie"):
        errors.append(f"{c['id']}: statut {c['status']} refuse")
    if c["plant"] not in plant_ids:
        errors.append(f"{c['id']}: plante inconnue {c['plant']}")

class_ids = {k["id"] for k in meds["classes"]}
ruled = set()
for r in rules:
    c = by_id.get(r["claim"])
    if c is None: errors.append(f"regle {r['plant']}/{r['class']}: affirmation {r['claim']} introuvable"); continue
    if c["plant"] != r["plant"]: errors.append(f"regle {r['claim']}: plante {r['plant']} != {c['plant']}")
    if r["class"] not in class_ids: errors.append(f"regle {r['claim']}: classe inconnue {r['class']}")
    ruled.add(r["claim"])

for c in claims:
    if c["type"] in ("interaction", "warning", "contraindication") and c["severity"] not in ("aucune_rapportee", "donnees_absentes"):
        if not c.get("applies_to") and c["id"] not in ruled:
            errors.append(f"{c['id']}: affirmation orpheline (ni profil applies_to ni regle) : jamais affichee")

if errors:
    sys.exit("BUILD REFUSE :\n  " + "\n  ".join(errors))

by_plant = {}
for c in claims:
    row = {k: c.get(k) for k in ("id", "type", "statement", "severity", "population", "status", "reviewed_by", "applies_to")}
    row.update(source=c["source"]["title"], url=c["source"]["url"], quote=c["source"]["quote"])
    by_plant.setdefault(c["plant"], []).append(row)
for p in plants:
    p["claims"] = by_plant.get(p["id"], [])

out = {"plants": plants, "classes": meds["classes"], "rules": [{"plant": r["plant"], "class": r["class"], "claim": r["claim"]} for r in rules]}
os.makedirs(os.path.join(root, "app", "src", "data"), exist_ok=True)
json.dump(out, open(os.path.join(root, "app", "src", "data", "bundle.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(plants)} plantes, {len(claims)} affirmations, {len(rules)} règles, {len(meds['classes'])} classes")
