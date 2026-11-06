import re, subprocess, sys, time, xml.etree.ElementTree as ET
OUT = sys.argv[1]

def clear_anr():
    # Ferme les boites « ... ne répond pas » du système (émulateur lent au démarrage) qui masquent l'app.
    for _ in range(4):
        subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/a.xml'], capture_output=True)
        subprocess.run(['adb', 'pull', '/sdcard/a.xml', f'{OUT}/a.xml'], capture_output=True)
        try:
            r = ET.parse(f'{OUT}/a.xml').getroot()
        except Exception:
            return
        if not any("responding" in (n.get('text') or '') for n in r.iter('node')):
            return
        c = center(r, 'Wait')
        if c:
            subprocess.run(['adb', 'shell', 'input', 'tap', str(c[0]), str(c[1])])
        time.sleep(2)


def dump(name):
    clear_anr()
    subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/ui.xml'], capture_output=True)
    subprocess.run(['adb', 'pull', '/sdcard/ui.xml', f'{OUT}/{name}.xml'], capture_output=True)
    subprocess.run(f'adb exec-out screencap -p > {OUT}/{name}.png', shell=True)
    return ET.parse(f'{OUT}/{name}.xml').getroot()

def center(root, desc):
    for n in root.iter('node'):
        if n.get('content-desc') == desc or n.get('text') == desc:
            m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', n.get('bounds'))
            x1, y1, x2, y2 = map(int, m.groups())
            return (x1 + x2) // 2, (y1 + y2) // 2, (x1, y1, x2, y2)
    return None

def tap(root, desc):
    c = center(root, desc)
    if not c:
        return False
    subprocess.run(['adb', 'shell', 'input', 'tap', str(c[0]), str(c[1])])
    return True

def center_prefix(root, prefix):
    for n in root.iter('node'):
        d = n.get('content-desc') or ''
        if d.startswith(prefix):
            m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', n.get('bounds'))
            x1, y1, x2, y2 = map(int, m.groups())
            return (x1 + x2) // 2, (y1 + y2) // 2
    return None


def has_text(root, needle):
    return any(needle in ((n.get('text') or '') + ' ' + (n.get('content-desc') or '')) for n in root.iter('node'))


report = []
root = dump('01_plantes')
size = open(f'{OUT}/ecran.txt').read()
report.append(f'ecran: {size.strip()}')
for tab in ['Mélange', 'Sécurité', 'Armoire', 'Labo', 'Plantes']:
    c = center(root, tab)
    report.append(f'onglet {tab}: bounds={c[2] if c else "INTROUVABLE"}')
    ok = tap(root, tab)
    time.sleep(2.5)
    root = dump('tab_' + tab.lower().replace('é', 'e'))
    texts = [n.get('text') for n in root.iter('node') if n.get('text')]
    report.append(f'  tap={ok} textes={len(texts)} apercu={texts[:6]}')
# ouvre une fiche plante puis la referme
tap(root, 'Ouvrir la fiche Camomille matricaire'); time.sleep(2)
root = dump('fiche')
report.append('fiche ouverte: ' + str(bool(center(root, 'Fermer la fiche'))))
tap(root, 'Fermer la fiche'); time.sleep(1.5)
root = dump('apres_fiche')
# Sources
tap(root, 'Ouvrir Sources et méthode'); time.sleep(2)
root = dump('sources')
report.append('sources ouvert: ' + str(bool(center(root, 'Fermer Sources et méthode'))))
# --- interactions : le constat doit réagir et rester visible ---
root = dump('i00')
tap(root, 'Fermer Sources et méthode'); time.sleep(1.5)
root = dump('i0')
tap(root, 'Sécurité'); time.sleep(2); root = dump('i1')
report.append('securite: puce Millepertuis presente=' + str(bool(center(root, 'Millepertuis'))))
tap(root, 'Millepertuis'); time.sleep(2); root = dump('securite_apres')
report.append('securite: barre de constat visible apres ajout=' + str(has_text(root, 'Constat sur 1 plante')))
subprocess.run(['adb', 'shell', 'input', 'swipe', '540', '1800', '540', '700', '300']); time.sleep(1.5)
root = dump('securite_defile')
report.append('securite: barre toujours visible apres defilement=' + str(has_text(root, 'Constat sur 1 plante')))
tap(root, 'Mélange'); time.sleep(2); root = dump('m1')
tap(root, 'Aide au sommeil'); time.sleep(2); root = dump('melange_usage')
c = center_prefix(root, 'Ajouter ')
report.append('melange: bouton Ajouter present=' + str(bool(c)))
if c:
    subprocess.run(['adb', 'shell', 'input', 'tap', str(c[0]), str(c[1])]); time.sleep(2)
    root = dump('melange_apres')
    report.append('melange: barre de constat visible apres ajout=' + str(has_text(root, 'Constat sur 1 plante')))
tap(root, 'Armoire'); time.sleep(2); root = dump('a1')
tap(root, 'Enceinte'); time.sleep(1.5); root = dump('armoire_enceinte')
report.append('armoire: puce Enceinte active=' + str(any((n.get('content-desc') == 'Enceinte' and n.get('checked') == 'true') for n in root.iter('node'))))
# --- recherche par nom chinois / symptome, puis favoris -> verification de securite ---
tap(root, 'Plantes'); time.sleep(2); root = dump('p1')
tap(root, 'Rechercher une plante'); time.sleep(1)
subprocess.run(['adb', 'shell', 'input', 'text', 'Di%sHuang']); time.sleep(2); root = dump('recherche_pinyin')
report.append('plantes: recherche "Di Huang" trouve la rehmannia=' + str(bool(center(root, 'Ouvrir la fiche Rehmannia (racine)'))))
subprocess.run(['adb', 'shell', 'input', 'keyevent', '4']); time.sleep(1)
root = dump('p2')
tap(root, 'Rechercher une plante'); time.sleep(1)
for _ in range(8): subprocess.run(['adb', 'shell', 'input', 'keyevent', '67'])
subprocess.run(['adb', 'shell', 'input', 'text', 'sommeil']); time.sleep(2); root = dump('recherche_symptome')
report.append('plantes: recherche "sommeil" trouve la valeriane=' + str(any((n.get('content-desc') or '').startswith('Ouvrir la fiche Val') for n in root.iter('node'))))
c = center_prefix(root, 'Ajouter ')
if c:
    subprocess.run(['adb', 'shell', 'input', 'tap', str(c[0]), str(c[1])]); time.sleep(1.5)
root = dump('p3')
tap(root, 'Armoire'); time.sleep(2); root = dump('a2')
report.append('armoire: bouton Verifier mes favorites present=' + str(bool(center_prefix(root, 'Vérifier la sécurité'))))
tap(root, 'Vérifier la sécurité de mes plantes favorites'); time.sleep(2.5); root = dump('verif_favorites')
report.append('armoire -> securite: constat sur la selection=' + str(has_text(root, 'Constat sur 1 plante')))
tap(root, 'Labo'); time.sleep(2); root = dump('l1')
tap(root, 'Passiflore'); time.sleep(1.5); root = dump('labo_apres')
report.append('labo: calculateur visible=' + str(has_text(root, 'Fourchette EMA')))
open(f'{OUT}/rapport.txt', 'w', encoding='utf-8').write('\n'.join(report))
print('\n'.join(report))
