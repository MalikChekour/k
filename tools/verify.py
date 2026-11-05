#!/usr/bin/env python3
"""Verifie que chaque affirmation clinique a une source REELLE.

Regles (stdlib uniquement, aucune installation) :
  - source.kind == "pmid" : le titre renvoye par PubMed doit correspondre au titre cite.
  - source.kind == "doc"  : le document (url) est telecharge et `quote` doit y figurer mot pour mot.
  - status == "publie"    : exige reviewed_by + reviewed_on.
Code de sortie != 0 si une seule affirmation echoue.
"""
import json, re, sys, glob, urllib.request, urllib.parse, io, subprocess, tempfile, os

UA = {"User-Agent": "apothecaria-verify/0.1 (contact: holder.8922@gmail.com)"}
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id="


def norm(s):
    s = s.lower().replace("­", "")
    s = re.sub(r"[^a-z0-9à-ÿ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def squash(s):
    """Sans espaces ni ponctuation : insensible aux coupures de mots et a la version de pdftotext."""
    return re.sub(r"[^a-z0-9à-ÿ]", "", s.lower().replace("­", ""))


def title_match(cited, actual):
    a, b = set(norm(cited).split()), set(norm(actual).split())
    if not a or not b:
        return 0.0
    return len(a & b) / min(len(a), len(b))


def http(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read()


def pubmed_titles(pmids):
    if not pmids:
        return {}
    d = json.loads(http(EUTILS + ",".join(pmids)))["result"]
    return {u: d[u].get("title", "") for u in d.get("uids", [])}


def pdf_text(raw):
    try:
        import pypdf
        r = pypdf.PdfReader(io.BytesIO(raw))
        return "\n".join(p.extract_text() or "" for p in r.pages)
    except ImportError:
        with tempfile.TemporaryDirectory() as t:
            p = os.path.join(t, "d.pdf")
            open(p, "wb").write(raw)
            return subprocess.run(["pdftotext", p, "-"], capture_output=True, text=True).stdout


_doc_cache = {}


def doc_text(url):
    if url not in _doc_cache:
        raw = http(url)
        _doc_cache[url] = pdf_text(raw) if raw[:4] == b"%PDF" else raw.decode("utf-8", "replace")
    return _doc_cache[url]


def check(claims, offline=False):
    errors = []
    pm = [str(c["source"]["pmid"]) for c in claims if c["source"]["kind"] == "pmid"]
    titles = {} if offline else pubmed_titles(sorted(set(pm)))
    for c in claims:
        cid, s = c["id"], c["source"]
        if c.get("status") == "publie" and not (c.get("reviewed_by") and c.get("reviewed_on")):
            errors.append(f"{cid}: publie sans relecteur")
        if offline:
            continue
        if s["kind"] == "pmid":
            actual = titles.get(str(s["pmid"]))
            if actual is None:
                errors.append(f"{cid}: PMID {s['pmid']} introuvable")
            elif title_match(s["title"], actual) < 0.6:
                errors.append(f"{cid}: PMID {s['pmid']} = «{actual[:70]}» ≠ titre cite «{s['title'][:70]}»")
        elif s["kind"] == "doc":
            try:
                txt = squash(doc_text(s["url"]))
            except Exception as e:
                errors.append(f"{cid}: document illisible ({e})")
                continue
            if squash(s["quote"]) not in txt:
                errors.append(f"{cid}: extrait absent du document {s['url']}")
        else:
            errors.append(f"{cid}: kind inconnu {s['kind']}")
    return errors


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    offline = "--offline" in sys.argv
    files = args or sorted(glob.glob(os.path.join(os.path.dirname(__file__), "..", "data", "claims", "*.json")))
    claims = [c for f in files for c in json.load(open(f, encoding="utf-8"))]
    errs = check(claims, offline)
    for e in errs:
        print("ECHEC", e)
        if os.environ.get("GITHUB_ACTIONS"):
            print("::error::" + e)
    print(f"{len(claims)} affirmations, {len(errs)} echec(s)")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
