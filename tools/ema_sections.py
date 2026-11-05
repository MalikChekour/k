#!/usr/bin/env python3
"""Affiche les sections de securite (4.3 a 4.6) d'une monographie EMA pour aider a ecrire des extraits EXACTS.
Usage : python tools/ema_sections.py fichier.pdf [taille]"""
import re, subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")
n = int(sys.argv[2]) if len(sys.argv) > 2 else 700
t = re.sub(r"\s+", " ", subprocess.run(["pdftotext", "-enc", "UTF-8", sys.argv[1], "-"], capture_output=True, text=True, encoding="utf-8").stdout)
for k in ("4.3. Contraindications", "4.4. Special warnings", "4.5. Interactions", "4.6. Fertility"):
    i = [m.start() for m in re.finditer(re.escape(k), t)]
    i = i[-1] if i else -1  # derniere occurrence : la premiere est dans le sommaire
    print(f"## {k}\n{t[i:i+n] if i >= 0 else 'ABSENTE'}\n")
