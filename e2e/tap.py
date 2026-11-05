import re, subprocess, sys, time, xml.etree.ElementTree as ET
OUT = sys.argv[1]

def dump(name):
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
open(f'{OUT}/rapport.txt', 'w', encoding='utf-8').write('\n'.join(report))
print('\n'.join(report))
