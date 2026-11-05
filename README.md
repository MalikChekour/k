# Apothecaria
Regle : aucune affirmation clinique sans source verifiee. `python tools/verify.py` (stdlib seule) controle chaque PMID
(titre PubMed) et chaque extrait (present mot pour mot dans le document EMA). Statuts : propose > verifie > publie
(publie exige un relecteur humain). Le prototype (Antigravity) est archive, non reutilise : 7/10 de ses PMID sont faux.
