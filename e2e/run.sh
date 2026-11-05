#!/usr/bin/env bash
# Test de fumée sur émulateur : installe l'APK, ouvre chaque onglet, capture écran + arbre d'accessibilité + journal.
set -u
OUT=/tmp/e2e; mkdir -p "$OUT"
APK=app/android/app/build/outputs/apk/release/app-release.apk
adb install -r "$APK" > "$OUT/install.txt" 2>&1; cat "$OUT/install.txt"
adb logcat -c
adb shell monkey -p com.apothecaria.app -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
sleep 15
shot() { adb exec-out screencap -p > "$OUT/$1.png"; adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/$1.xml" > /dev/null 2>&1; }
shot 00_accueil
adb shell wm size > "$OUT/ecran.txt"
python3 e2e/tap.py "$OUT" || true
adb logcat -d -v time '*:E' 'ReactNativeJS:V' 'AndroidRuntime:V' > "$OUT/logcat.txt" 2>&1
grep -c "FATAL EXCEPTION" "$OUT/logcat.txt" > "$OUT/crashs.txt" || true
