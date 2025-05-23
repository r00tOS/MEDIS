# 🚑 MEDIS

## Projektbeschreibung

MEDIS ist eine webbasierte Anwendung zur Überwachung und Dokumentation von Einsatzkräften bei Veranstaltungen oder Einsätzen.

> Einsatzbereiche:  
> Sanitätsdienste, Feuerwehr, Sicherheitsdienste, Event-Management

---

## 🚀 Nutzung / Installation

Die Software kann ohne Server direkt genutzt werden: Öffne einfach die Datei `medis.html` im Browser (empfohlen: Chrome oder Edge). Es sind keine weiteren Installationen oder Konfigurationen erforderlich – lediglich JavaScript und die LocalStorage-Funktionalität müssen im Browser aktiviert sein.

Für den PDF-Export wird eine Internetverbindung benötigt, da die Bibliothek jsPDF online geladen wird. Das benötigte JavaScript ist bereits in `medis.html` eingebunden, sodass die Anwendung sofort einsatzbereit ist.

---

## 🛠 Features

### ✅ Truppverwaltung

- Anlegen und Bearbeiten von Trupps
- Verschiedene Status:
  - `Nicht Einsatzbereit`
  - `Einsatzbereit in UHS`
  - `Einsatzbereit unterwegs`
  - `Einsatzbereit in Rückhaltung`
  - `Streife` (mit Einsatzort)
  - `Patient` (mit Patientennummer)
  - `Spielfeldrand`
- Automatische Zeiterfassung (Einsatzzeit & Pausenzeit)
- Historie der Einsatzorte und Patienten

---

### 🔢 Automatische Patientennummerierung

- Automatische Vergabe der nächsten freien Patientennummer beim Statuswechsel auf `Patient`
- Manuelle Korrektur der nächsten Nummer möglich
- Speicherung der Nummer im Browser (`LocalStorage`)
- Rücksetzen der Nummer über "Alle Trupps löschen"

---

### 📄 PDF-Export

- Erstellung eines übersichtlichen Einsatz-Reports als PDF
- Enthält:
  - Truppname
  - Gesamte Pausenzeit
  - Historie Einsatzorte
  - Historie Patienten
- Optimierte Seitenumbrüche

---

### 🖥 Bedienkomfort

- Automatische Speicherung der Daten im Browser
- Responsive Design
- Animationen bei Statuswechsel und Truppänderungen

---

## 📦 Verwendete Technologien

- HTML5
- CSS3
- Vanilla JavaScript
- jsPDF (für PDF-Export)
- LocalStorage (lokale Datenspeicherung)

---

### 📸 Screenshots

**Truppübersicht:**  
Zeigt alle verfügbaren Trupps, deren aktuellen Status und die jeweilige Zeit im Status.
![Truppübersicht](https://i.imgur.com/bumlYnh.png)

**Patientenübersicht:**  
Listet alle erfassten Patienten auf und ermöglicht das Hinzufügen sowie die Dokumentation weiterer Informationen.
![Patientenübersicht](https://i.imgur.com/63NntRl.png)

**Dashboard:**  
Bietet einen umfassenden Überblick über den gesamten Einsatzverlauf und alle relevanten Daten.
![Dashboard](https://i.imgur.com/HmZO7tv.png)

---

## 👨‍💻 Entwickler

Projektleitung & Umsetzung:  
Chris Rossol
