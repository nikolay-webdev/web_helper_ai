# Kurzanleitung

## Erweiterung laden

1. Öffnen Sie `chrome://extensions`.
2. Aktivieren Sie den Entwicklermodus.
3. Wählen Sie „Entpackte Erweiterung laden“ und den Projektordner.
4. Öffnen Sie eine normale Webseite und starten Sie Web Helper AI über das Erweiterungssymbol oder `Ctrl+Shift+X`.

## KI-API-Schlüssel einrichten

Öffnen Sie `chrome://extensions` → Web Helper AI → „Details“ → „Erweiterungsoptionen“. Geben Sie dort den eigenen Schlüssel im Bereich „KI-API-Schlüssel“ ein und klicken Sie auf „Speichern“. Der Wert wird lokal in `chrome.storage.local` gespeichert und nicht angezeigt. Mit „Löschen“ kann er entfernt werden.

## Aufgaben lösen

- Text markieren und `Shift+Y` drücken.
- Antwort mit „Prüfen“ erneut bewerten.
- Für eine Bildaufgabe mit `Shift+R` den Bereich einstellen und mit `Shift+A` senden.
- Mit `Ctrl+Shift+R` den Rahmen ausblenden, ohne den gespeicherten Bereich zu ändern.
- Mit `Shift+Q` das Fenster ein- oder ausblenden.

## Manuelle Checkliste

- Die Erweiterung lässt sich ohne Manifest-Fehler laden.
- Das Fenster erscheint nach dem Start über Symbol und `Ctrl+Shift+X`.
- Ein Schlüssel kann gespeichert, nach einem Browserneustart verwendet und gelöscht werden.
- Markierter Text wird gesendet und die Antwort wird angezeigt.
- Die erneute Prüfung und die Markierung von Optionen funktionieren auf einer geeigneten Testseite.
- Screenshot-Bereich, Verschieben, Skalieren, Transparenz, Einklappen und Schließen funktionieren.
- Tastaturbefehle funktionieren außerhalb editierbarer Felder.
- Abbruch, Netzwerkfehler, fehlender Schlüssel und ungültige API-Antworten werden auf Deutsch angezeigt.
- Keine veröffentlichten Dateien enthalten einen Schlüssel.

## Sicherheit

Der lokale Schlüssel ist kein vollständig geschützter Geheimnisspeicher. Übertragen Sie keine vertraulichen Inhalte und prüfen Sie die Erweiterung vor einer Veröffentlichung manuell.
