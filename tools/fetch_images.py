#!/usr/bin/env python3
"""Candidats d'illustration pour chaque plante, depuis les banques deja utilisees pour les videos nature.

Usage : python tools/fetch_images.py [plant_id ...] [--out DIR] [--no-judge]
Cles lues dans l'ENVIRONNEMENT uniquement (jamais ecrites dans le depot) :
  PEXELS_API_KEY PIXABAY_API_KEY UNSPLASH_ACCESS_KEY OPENVERSE_CLIENT_ID/SECRET OPENROUTER_API_KEY

Garde-fous tires de l'experience des videos nature :
  - une source SANS cle est SIGNALEE (jamais un [] silencieux) ;
  - le libelle doit NOMMER la plante (mot entier) ; mots interdits en frontieres de mot ;
  - Openverse restreint a cc0/pdm (usage commercial + oeuvre derivee) ;
  - dedoublonnage par dHash (seuil 3) car une meme photo arrive sous plusieurs URL ;
  - juge visuel : False ET None sont des rejets (un juge muet ne valide jamais) ;
  - TOUT reste au statut "propose" : l'espece est verifiee par un humain sur la planche numerotee.
Les images ne sont PAS versionnees (licences banques) : seul le manifeste l'est.
"""
import json, os, re, sys, io, base64, urllib.request, urllib.parse, urllib.error

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UA = {"User-Agent": "apothecaria-images/0.1"}
REJECT = re.compile(r"\b(woman|women|man|men|girl|boy|child|kid|people|person|model|portrait|face|hand|hands|bikini|wedding|"
                    r"tea|teapot|cup|mug|bag|pill|pills|capsule|capsules|tablet|tablets|supplement|bottle|jar|oil|soap|candle|"
                    r"cosmetic|cream|lotion|spa|massage|drink|cocktail|bowl|dish|food|recipe|vector|illustration|drawing|icon|logo|"
                    r"3d|render|clipart|pattern|wallpaper|mockup|statue|monument|church|mountain|commune)\b", re.I)


def get_json(url, headers=None, data=None, timeout=30, tries=4):
    import time
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={**UA, **(headers or {})}, data=data)
            return json.load(urllib.request.urlopen(req, timeout=timeout))
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or i == tries - 1: raise
        except (TimeoutError, urllib.error.URLError):
            if i == tries - 1: raise
        time.sleep(3 * (i + 1))


def get_bytes(url, timeout=30):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def word_in(text, keys):
    t = text.lower()
    return any(re.search(rf"\b{re.escape(k)}", t) for k in keys)  # debut de mot : 'valerian' ~ 'valeriana'


def cand(provider, pid, page, thumb, label, author, lic, width=None):
    return dict(provider=provider, pid=str(pid), page_url=page, thumb_url=thumb, label=label or "", author=author or "", license=lic, width=width)


def pexels(q):
    k = os.environ.get("PEXELS_API_KEY")
    if not k: return None
    d = get_json("https://api.pexels.com/v1/search?" + urllib.parse.urlencode({"query": q, "per_page": 80}), {"Authorization": k})
    return [cand("pexels", p["id"], p["url"], p["src"]["medium"],
                 (p.get("alt") or "") + " " + p["url"].rstrip("/").rsplit("/", 1)[-1].replace("-", " "),  # alt souvent vide : on lit le slug
                 p.get("photographer"), "Pexels License", p.get("width")) for p in d.get("photos", [])]


def pixabay(q):
    k = os.environ.get("PIXABAY_API_KEY")
    if not k: return None
    d = get_json("https://pixabay.com/api/?" + urllib.parse.urlencode({"key": k, "q": q, "image_type": "photo", "per_page": 200, "safesearch": "true"}))
    return [cand("pixabay", h["id"], h["pageURL"], h["webformatURL"], h.get("tags"), h.get("user"), "Pixabay Content License", h.get("imageWidth")) for h in d.get("hits", [])]


def unsplash(q):
    k = os.environ.get("UNSPLASH_ACCESS_KEY")
    if not k: return None
    d = get_json("https://api.unsplash.com/search/photos?" + urllib.parse.urlencode({"query": q, "per_page": 30}), {"Authorization": f"Client-ID {k}"})
    return [cand("unsplash", r["id"], r["links"]["html"], r["urls"]["small"],
                 f'{r.get("alt_description") or ""} {r.get("description") or ""}', r["user"]["name"], "Unsplash License", r.get("width")) for r in d.get("results", [])]


_ov = {}


def openverse(q):
    cid, sec = os.environ.get("OPENVERSE_CLIENT_ID"), os.environ.get("OPENVERSE_CLIENT_SECRET")
    if not (cid and sec): return None
    if "t" not in _ov:  # OAuth obligatoire ; page_size > 20 => 401 trompeur
        body = urllib.parse.urlencode({"grant_type": "client_credentials", "client_id": cid, "client_secret": sec}).encode()
        _ov["t"] = get_json("https://api.openverse.org/v1/auth_tokens/token/", data=body)["access_token"]
    d = get_json("https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({"q": q, "license": "cc0,pdm", "page_size": 20}),
                 {"Authorization": "Bearer " + _ov["t"]})
    return [cand("openverse", r["id"], r.get("foreign_landing_url"), r.get("thumbnail") or r["url"],
                 f'{r.get("title") or ""} ' + " ".join(t["name"] for t in r.get("tags") or []), r.get("creator"), r.get("license"), r.get("width")) for r in d.get("results", [])]


MAXC = 40
MIN_W = 1000  # px ; la photo doit rester nette en feuille plein ecran
PROVIDERS = [("openverse", openverse), ("pexels", pexels), ("pixabay", pixabay), ("unsplash", unsplash)]


def dhash(img):
    g = img.convert("L").resize((9, 8))
    px = list(g.getdata())
    return sum(1 << i for i, (a, b) in enumerate((px[r * 9 + c], px[r * 9 + c + 1]) for r in range(8) for c in range(8)) if a > b)



# Espèces proches qu'un juge visuel confond : on les NOMME dans la question pour forcer la réponse NON (critère des vidéos nature :
# un intrus qui résiste se bannit par son libellé, on ne retente pas le même texte).
LOOK = {
    "Matricaria recutita": "scentless mayweed (Tripleurospermum), oxeye daisy, other daisies, Roman chamomile (Chamaemelum)",
    "Valeriana officinalis": "Centranthus (red valerian), other Valeriana, Sambucus elder flowers, Achillea, Angelica",
    "Hypericum perforatum": "ornamental Hypericum (calycinum, androsaemum, hidcote), buttercups, other yellow flowers",
    "Passiflora incarnata": "Passiflora caerulea (blue passion flower, white petals with blue-purple ring), other Passiflora species",
    "Melissa officinalis": "mint, Lamium (dead-nettle), Stachys, nettle, Monarda, catmint",
    "Crataegus spp.": "rowan Sorbus, Cotoneaster, Pyracantha, rose hips, ornamental pink-flowered cultivars",
    "Curcuma longa": "ginger, galangal, ornamental Curcuma or Alpinia flowers, spice market stalls, cinnamon, saffron",
    "Rhodiola rosea": "Sedum, Sempervivum, other succulents",
    "Ginkgo biloba": "maple, other fan-shaped leaves, ginkgo supplements",
    "Silybum marianum": "Cirsium, Carduus, Onopordum, artichoke, other thistles",
    "Urtica dioica": "Lamium, Stachys, mint, other serrated leaves",
    "Filipendula ulmaria": "Astilbe, elderflower, Aruncus, Spiraea, Achillea, Queen Anne's lace",
    "Zingiber officinale": "turmeric, galangal, ornamental ginger flowers",
    "Mentha x": "Melissa, Lamium, Stachys, other mints, basil",
    "Foeniculum vulgare": "dill, Queen Anne's lace, Angelica, hogweed, fennel bulb vegetable",
    "Thymus vulgaris": "oregano, creeping thyme ornamental, marjoram, other Lamiaceae",
    "Lavandula angustifolia": "Lavandula stoechas (with ears), Salvia, Nepeta, lavandin fields as pure landscape",
    "Tilia cordata": "other trees, maple, linden lumber",
    "Harpagophytum procumbens": "dried tea or capsule products, other thorny fruits",
    "Echinacea purpurea": "Rudbeckia, Helianthus, Gaillardia, other daisy-like flowers",
    "Rosmarinus officinalis": "lavender, Santolina, juniper, other needle-like leaves",
    "Salvia officinalis": "Salvia nemorosa and other ornamental sages, lamb's ear (Stachys byzantina), mullein",
    "Calendula officinalis": "Tagetes marigold, Gazania, Chrysanthemum, dahlia",
    "Taraxacum officinale": "hawkweed, Hypochaeris, Sonchus, coltsfoot, other yellow composites",
    "Sambucus nigra": "Sambucus racemosa red elder, Ligustrum, Angelica, hogweed, Viburnum",
    "Plantago lanceolata": "Plantago major (broadleaf), Plantago media, grass",
    "Cynara scolymus": "cardoon flower in a different context is ok, but not Cirsium, Carduus, Silybum or Echinops",
}

_JC = {}


def judge_cached(c, jpeg, latin, path):
    if not _JC and os.path.exists(path): _JC.update(json.load(open(path)))
    k = f'v3:{c["provider"]}:{c["pid"]}:{latin}'
    if k not in _JC or _JC[k] is None or None in _JC[k]:
        _JC[k] = list(judge(jpeg, latin))
        json.dump(_JC, open(path, "w"))
    return tuple(_JC[k])


def judge(jpeg, latin):
    """-> (espece, personne) ; espece True/False/None, personne True/False/None. None = indisponible = REJET cote appelant."""
    k = os.environ.get("OPENROUTER_API_KEY")
    if not k: return (None, None)
    body = json.dumps({"model": "google/gemini-2.5-flash", "max_tokens": 12, "messages": [{"role": "user", "content": [
        {"type": "text", "text": f"Question 1: is the main subject specifically {latin} (the exact species, not just the genus), shown as a living or dried plant "
                                 f"(not a drink, product, pill)? Answer NO if it could be a look-alike such as: {LOOK.get(latin, 'other species of the same family')}. "
                                 "Answer UNSURE if the diagnostic features are not clearly visible. Question 2: is any person, hand, finger or body part visible? "
                                 "Reply exactly in this format: SPECIES=YES|NO|UNSURE PERSON=YES|NO"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(jpeg).decode()}}]}]}).encode()
    try:
        r = get_json("https://openrouter.ai/api/v1/chat/completions", {"Authorization": "Bearer " + k, "Content-Type": "application/json"}, body, 60)
        a = r["choices"][0]["message"]["content"].upper()
        sp = re.search(r"SPECIES\s*=\s*(YES|NO|UNSURE)", a); pe = re.search(r"PERSON\s*=\s*(YES|NO)", a)
        return (None if not sp or sp.group(1) == "UNSURE" else sp.group(1) == "YES", None if not pe else pe.group(1) == "YES")
    except Exception:
        return (None, None)


def sheet(items, path):
    from PIL import Image, ImageDraw
    n, cols, T = len(items), 5, 240
    out = Image.new("RGB", (cols * T, ((n + cols - 1) // cols) * T), "#111")
    d = ImageDraw.Draw(out)
    for i, it in enumerate(items):
        im = Image.open(io.BytesIO(it["_jpg"])).convert("RGB")
        w, h = im.size; s = max(T / w, T / h); im = im.resize((int(w * s) + 1, int(h * s) + 1))
        x, y = (i % cols) * T, (i // cols) * T
        out.paste(im.crop(((im.width - T) // 2, (im.height - T) // 2, (im.width + T) // 2, (im.height + T) // 2)), (x, y))
        d.rectangle([x, y, x + 46, y + 28], fill="#000"); d.text((x + 6, y + 6), f"{i:02d}", fill="#FFD84D")
        d.text((x + 4, y + T - 14), f'{it["provider"][:3]} {"J" if it["judge"] else "?"}', fill="#fff")
    out.save(path, quality=88)


def main():
    from PIL import Image
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    outdir = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(ROOT, "images_cache")
    if "--out" in sys.argv: args.remove(outdir)
    use_judge = "--no-judge" not in sys.argv
    os.makedirs(outdir, exist_ok=True); os.makedirs(os.path.join(ROOT, "data", "images"), exist_ok=True)
    plants = [p for p in json.load(open(os.path.join(ROOT, "data", "plants.json"), encoding="utf-8")) if not args or p["id"] in args]
    for p in plants:
        latin = " ".join(p["latin"].split()[:2])  # genre + espece, sans auteur
        pool, muettes, brut = [], set(), 0
        for name, fn in PROVIDERS:
            for q in p["queries"]:
                try: r = fn(q)
                except Exception as e: print(f"  ! {name} '{q}': {e}"); r = []
                if r is None: muettes.add(name); break
                brut += len(r); pool += r
        kept, seen_ids, hashes, gis = [], set(), [], {}
        rej = dict(label=0, interdit=0, petite=0, doublon=0, juge=0, humain=0, illisible=0)
        for c in pool:
            key = (c["provider"], c["pid"])
            if key in seen_ids: continue
            seen_ids.add(key)
            if not word_in(c["label"], p["keys"]): rej["label"] += 1; continue
            gis[c["provider"]] = gis.get(c["provider"], 0) + 1  # gisement : photos qui NOMMENT la plante
            if REJECT.search(c["label"]): rej["interdit"] += 1; continue
            if c.get("width") and c["width"] < MIN_W: rej["petite"] += 1; continue
            try: jpg = get_bytes(c["thumb_url"]); im = Image.open(io.BytesIO(jpg)); h = dhash(im)
            except Exception: rej["illisible"] += 1; continue
            if any(bin(h ^ x).count("1") <= 3 for x in hashes): rej["doublon"] += 1; continue
            j, pers = judge_cached(c, jpg, latin, os.path.join(outdir, "judge_cache.json")) if use_judge else (None, None)
            if use_judge and pers is not False: rej["humain"] += 1; continue  # humain OU juge muet = rejet
            if use_judge and j is not True: rej["juge"] += 1; continue
            hashes.append(h); kept.append({**c, "dhash": f"{h:016x}", "judge": j is True, "status": "propose", "_jpg": jpg})
        by = {}
        for c in kept: by.setdefault(c["provider"], []).append(c)
        kept = [c for grp in zip(*[by[k] for k in by]) for c in grp] if len(by) > 1 else kept
        kept = (kept + [c for v in by.values() for c in v if c not in kept])[:MAXC]
        print(f'{p["id"]}: brut {brut} -> retenus {len(kept)} | gisement nomme {gis} | rejets {rej}' + (f" | SOURCES MUETTES: {sorted(muettes)}" if muettes else ""))
        if kept: sheet(kept, os.path.join(outdir, f'planche_{p["id"]}.jpg'))
        json.dump([{k: v for k, v in c.items() if k != "_jpg"} | {"index": i} for i, c in enumerate(kept)],
                  open(os.path.join(ROOT, "data", "images", f'{p["id"]}.json'), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
