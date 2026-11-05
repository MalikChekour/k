"""Le verificateur doit REJETER les fausses sources. Lancer : python tests/test_verify.py"""
import json, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import verify

here = os.path.dirname(__file__)
good = json.load(open(os.path.join(here, "..", "data", "claims", "matricaria_recutita.json"), encoding="utf-8"))

# 1. extrait trafique -> echec
bad = json.loads(json.dumps(good[:1]))
bad[0]["source"]["quote"] += " Aucun risque avec les anticoagulants."
assert verify.check(bad), "extrait invente accepte !"

# 2. faux PMID du prototype -> 7 echecs sur 10
proto = json.load(open(os.path.join(here, "prototype_refs.json"), encoding="utf-8"))
assert len(verify.check(proto)) == 7

# 3. publie sans relecteur -> echec (hors ligne)
pub = json.loads(json.dumps(good[:1])); pub[0]["status"] = "publie"
assert verify.check(pub, offline=True)

# 4. affirmations reelles -> 0 echec
assert verify.check(good) == []
print("4/4 tests OK")
