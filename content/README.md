# Lerninhalte von GWS-Wortweg

Die Lektionen liegen als JSON-Dateien in diesem Ordner. Die App lädt sie direkt, neue Inhalte brauchen also keine Programmierung.

- `index.json` legt fest, welche Lektionen es pro Level gibt und in welcher Reihenfolge.
- `characters.json` beschreibt die Geschichte in Marzling und die Figuren.
- `a1/`, `a2/`, `b1/`, `b2/` enthalten je eine Datei pro Lektion (`lesson-XX.json`). Das Feld `level` muss zum Ordner passen.

Nach jeder Änderung prüfen: `node scripts/validate-content.mjs`

## Aufbau einer Lektion

| Feld | Inhalt |
| --- | --- |
| `id`, `level`, `order` | Eindeutige Kennung (z. B. `a1-03`), Level und Reihenfolge |
| `title_de`, `title_en`, `goal_en` | Titel und Lernziel |
| `scene` | Einstiegsdialog: `setting_en` und `lines` mit `speaker` (Figur aus `characters.json`), `de`, `en` |
| `vocabulary` | Neue Wörter: `id`, `de`, `article` und `plural` bei Nomen, `type`, `en`, `example_de`, `example_en`, optional `note_en` |
| `grammar` | Ein Grammatik-Tipp: `title_en`, `explanation_en`, optional `table`, `examples` |
| `exercises` | Übungen, siehe unten |
| `dialogue` | Mini-Gespräch: Zeilen der Figuren und Lernenden-Züge (`learner: true`) mit genau einer richtigen Antwort und Feedback zu jeder Option |

## Übungstypen

| `type` | Felder |
| --- | --- |
| `multiple_choice` | `prompt_en`, `options`, `answer` (Index der richtigen Option) |
| `gap_fill` | `sentence_de` mit `___`, `options`, `answer` (Text), `translation_en` |
| `word_order` | `words` (gemischt), `answer` (richtiger Satz), `translation_en` |
| `listen_type` | `text_de` (wird vorgelesen), `accept` (erlaubte Eingaben), `translation_en` |
| `match_pairs` | `pairs` mit `de` und `en` |

## Lektionen

### A1

| Nr. | Titel | Thema | Grammatik |
| --- | --- | --- | --- |
| 1 | Hallo, ich bin Emma! | Begrüßen, vorstellen | sein, heißen, kommen |
| 2 | In der Bäckerei | Bestellen, Zahlen 1–10 | möchten, einen/eine |
| 3 | Meine neue Wohnung | Zimmer und Möbel | der, die, das |
| 4 | Am Bahnhof Marzling | S-Bahn, Uhrzeit | W-Fragen |
| 5 | Im Supermarkt | Lebensmittel, Preise | Pluralformen |
| 6 | Mein erster Arbeitstag | Beruf, Wohnort | Regelmäßige Verben im Präsens |

### A2

| Nr. | Titel | Thema | Grammatik |
| --- | --- | --- | --- |
| 1 | Beim Arzt | Krankheit, Apotheke | Modalverben |
| 2 | Mein Wochenende an der Isar | Freizeit, Ausflug nach Freising | Perfekt |
| 3 | Im Landratsamt | Führerschein umschreiben, Behörde | Trennbare Verben |
| 4 | Auf dem Volksfest | Vorlieben, Geschenke | Dativ |

### B1

| Nr. | Titel | Thema | Grammatik |
| --- | --- | --- | --- |
| 1 | Die Heizung ist kaputt | Probleme in der Wohnung | Nebensätze mit weil, dass, wenn, ob |
| 2 | Ein Jahr in Marzling | Rückblick, Blogeintrag | Präteritum |
| 3 | Im Verein | Hobbys, Sportverein | Reflexive Verben, Verben mit Präposition |
| 4 | Ich hätte da einen Vorschlag | Bürgerversammlung, Meinung sagen | Konjunktiv II |

### B2

| Nr. | Titel | Thema | Grammatik |
| --- | --- | --- | --- |
| 1 | Eine Beschwerde schreiben | Formelle E-Mail, Reklamation | Passiv |
| 2 | Stadt oder Land? | Argumentieren | obwohl, trotzdem, während, je … desto |
| 3 | In der Zeitung | Zeitungsartikel, Interview | Relativsätze |
| 4 | Das Vorstellungsgespräch | Bewerbung, Beruf | Indirekte Rede (Konjunktiv I) |
