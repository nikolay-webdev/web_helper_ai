# Web Helper AI

Web Helper AI ist eine lokale Chrome-Erweiterung, die markierte Aufgaben auf Webseiten an eine KI-API sendet und die Antwort in einem verschiebbaren Fenster anzeigt. Das Projekt ist als persönliches Lern- und Portfolio-Projekt für JavaScript und Chrome Extensions API gedacht.

## Projektübersicht

Die Erweiterung unterstützt Textaufgaben und optional einen ausgewählten Screenshot-Bereich. Antworten können erneut geprüft werden; erkannte richtige Antwortoptionen werden auf der Seite markiert.

## Motivation

Das Projekt verbindet DOM- und Event-Programmierung, asynchrone JavaScript-Logik, Shadow DOM, Chrome Extensions API und die Anbindung einer externen KI-API in einer kleinen, nachvollziehbaren Anwendung.

## Funktionen

- markierten Aufgabentext an die KI senden;
- einen gespeicherten Screenshot-Bereich an die KI senden;
- Antworten erneut prüfen;
- passende Antwortoptionen auf der Webseite markieren;
- verschiebbares, skalierbares und einklappbares Antwortfenster;
- Transparenz und Anzeigezustand speichern;
- laufende Anfragen abbrechen;
- Tastaturbefehle und Erweiterungssymbol unterstützen;
- KI-API-Schlüssel lokal in `chrome.storage.local` speichern, ändern und löschen.

## Technologien

- JavaScript ohne zusätzliches Framework;
- Chrome Extensions Manifest V3;
- Chrome APIs: `scripting`, `storage`, `tabs`, `commands`;
- Shadow DOM, DOM Events, `fetch` im Service Worker;
- kompatible Chat-Completions-API mit Text- und Bildnachrichten.

## Projektstruktur

| Datei | Zweck |
| --- | --- |
| `manifest.json` | Manifest-V3-Konfiguration, Berechtigungen und Tastaturbefehl |
| `background.js` | Service Worker, lokaler Schlüsselzugriff, API-Anfragen, Screenshots und Nachrichtenweiterleitung |
| `ai-puzzle-assistant.snippet.js` | Benutzeroberfläche, Seitenauswahl, Markierungen und Ereignislogik |
| `ai-puzzle-hotkeys.js` | Früher Tastatur-Listener für Seiten und Frames |
| `ANLEITUNG.md` | Kurzanleitung für Installation und Verwendung |
| `.gitignore` | Ausschlüsse für lokale Schlüssel und internes Material |

## Installation

1. Öffnen Sie `chrome://extensions`.
2. Aktivieren Sie den Entwicklermodus.
3. Klicken Sie auf „Entpackte Erweiterung laden“.
4. Wählen Sie den Projektordner aus.
5. Öffnen Sie eine Webseite mit einer Aufgabe und starten Sie die Erweiterung über das Symbol oder den Tastaturbefehl.

## Einrichtung

1. Öffnen Sie das Fenster des Assistenten und klappen Sie es bei Bedarf aus.
2. Geben Sie im Bereich „KI-API-Schlüssel“ Ihren eigenen Schlüssel ein.
3. Klicken Sie auf „Speichern“.
4. Der Schlüssel wird ausschließlich lokal in `chrome.storage.local` gespeichert. Der Wert wird danach nicht wieder in der Oberfläche angezeigt.
5. Mit „Löschen“ kann der lokale Schlüssel entfernt werden.

Der konkrete API-Endpunkt und die verwendeten Modellnamen sind derzeit in der Erweiterung konfiguriert. Das Projekt stellt keine allgemeine Unterstützung für beliebige Anbieter dar.

## Verwendung

Markieren Sie den Aufgabentext auf der Webseite und drücken Sie `Shift+Y`. Die Antwort erscheint im Fenster. Mit „Prüfen“ kann die letzte Antwort erneut bewertet werden. Für Bildaufgaben konfigurieren Sie mit `Shift+R` den Screenshot-Bereich und senden ihn mit `Shift+A`.

Das Fenster lässt sich an der Kopfzeile verschieben, am unteren rechten Griff skalieren, einklappen und schließen. Die lokale Seiteneinstellung enthält unter anderem Position, Größe, Transparenz und Screenshot-Bereich.

## Tastenkombinationen

| Aktion | Tastenkombination |
| --- | --- |
| Markierten Text lösen | `Shift+Y` |
| Screenshot-Bereich senden | `Shift+A` |
| Screenshot-Bereich bearbeiten | `Shift+R` |
| Screenshot-Rahmen ein-/ausblenden | `Ctrl+Shift+R` |
| Fenster ein-/ausblenden | `Shift+Q` |
| Erweiterung starten | `Ctrl+Shift+X` |
| Transparenz erhöhen/verringern | `Shift++` / `Shift+-` |

Tastaturbefehle werden in Eingabefeldern und editierbaren Seitenelementen nicht verarbeitet. Chrome kann Erweiterungsbefehle auf manchen Seiten oder Betriebssystemen anders belegen.

## Technische Umsetzung

Das Erweiterungssymbol und der Erweiterungs-Tastaturbefehl starten das Hauptskript über `chrome.scripting.executeScript` in einer isolierten Welt. Die Oberfläche wird in einem Shadow DOM erzeugt. `ai-puzzle-hotkeys.js` fängt frühe Tastaturereignisse auch in Frames ab und leitet Aktionen an den Hauptkontext weiter.

Der Service Worker ist für den Netzwerkzugriff zuständig. Er liest den Schlüssel direkt aus `chrome.storage.local`, setzt den Authorization-Header und gibt niemals den Schlüssel an den Seitenkontext oder an die Antwort zurück. Aktive Anfragen werden über eine ID verwaltet und können auch im Service Worker abgebrochen werden.

## Datenschutz und Sicherheit

Der Schlüssel wird bewusst lokal auf dem Gerät gespeichert. Das ist für dieses persönliche Lernprojekt eine einfache Architektur, aber kein vollständig geschützter Geheimnisspeicher: Eine lokale Browser-Erweiterung kann nicht dieselbe Geheimhaltung wie ein serverseitiger Secret-Store garantieren.

Übertragen Sie keine Passwörter, Zahlungsdaten oder andere vertrauliche Inhalte. Prüfen Sie vor einer Veröffentlichung alle Dateien und die Git-Historie. Da ein früherer Entwicklungsstand bereits einen Schlüssel enthielt, muss der Eigentümer vor einer öffentlichen Veröffentlichung den Schlüssel im Anbieter-Konto ersetzen und die Historie mit einer geprüften Sicherung bereinigen. Ein Force Push oder eine Änderung der Repository-Sichtbarkeit ist nicht Bestandteil dieses Projektschritts.

Lokale Dateien wie `.env` und das interne technische Briefing werden durch `.gitignore` ausgeschlossen. Die Repository-Historie muss separat und bewusst bereinigt werden.

## Bekannte Einschränkungen

- Die Chrome-Erweiterung muss auf der aktuellen Seite gestartet werden; einige interne Chrome-Seiten erlauben keine Skripteinjektion.
- Die API-Verfügbarkeit und die Kostenlimits des konfigurierten Anbieters liegen außerhalb des Projekts.
- Das lokale Speichern eines API-Schlüssels ist für ein persönliches Lernprojekt geeignet, aber nicht mit einem verwalteten Unternehmens-Secret-Store gleichzusetzen.
- Der DevTools-Snippet-Modus bleibt als UI-Kompatibilität erhalten, führt aber ohne Erweiterung keine KI-API-Anfragen aus.
- Die Erkennung und Markierung von Antwortoptionen hängt vom HTML-Aufbau der jeweiligen Webseite ab.

## Weiterentwicklung

- eine kleine Optionsseite statt der eingebetteten Schlüsseleinstellungen;
- automatisierte Tests für Nachrichtenfluss, Antwortparser und Einstellungen;
- konfigurierbare API-Endpunkte und Modelle über eine klar validierte Optionsseite;
- bessere Barrierefreiheit und Internationalisierung;
- eine dokumentierte Bereinigung der alten Git-Historie vor der Veröffentlichung.

## Teststatus

Automatisierte Chrome-End-to-End-Tests wurden in dieser Umgebung nicht ausgeführt. Vor einer Veröffentlichung sollte die manuelle Checkliste aus `ANLEITUNG.md` vollständig in Chrome abgearbeitet werden.
