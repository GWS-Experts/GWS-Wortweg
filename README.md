# GWS-Wortweg

Kostenlose Web-App, mit der Englischsprachige Deutsch lernen. Die Lektionen folgen einer Geschichte: Emma Clarke aus Leeds zieht nach Marzling und lernt Schritt für Schritt, den deutschen Alltag zu meistern.

## Funktionen (Version 1)

- 18 Lektionen auf vier Niveaus (A1: 6, A2: 4, B1: 4, B2: 4), auf der Startseite per Reiter wählbar
- Lektionen mit Szene, neuen Wörtern, Grammatik-Tipp, Übungen und Mini-Gespräch
- Fünf Übungstypen: Auswahl, Lückentext, Sätze ordnen, Hören und Tippen, Paare finden
- Sprachausgabe für alle deutschen Sätze (über die Sprachausgabe des Browsers)
- Aussprache-Training mit Mikrofon: in jeder Lektion drei Sätze nachsprechen (überspringbar) und eine eigene Übungsseite `/speak` mit Sätzen aus allen Lektionen eines Niveaus. Die App zeigt Wort für Wort, was sie verstanden hat. Nutzt die Spracherkennung des Browsers (Chrome, Edge, Safari; Firefox kann es nicht und bekommt einen Hinweis).
- KI-Tutor „Lena“ (`/tutor`): freies Gespräch auf Deutsch per Tippen oder Sprechen, passend zum Niveau A1–B2, mit Themen und Rollenspielen. Lena korrigiert die wichtigsten Fehler, liest Antworten vor und zeigt auf Wunsch die englische Übersetzung. Nur mit Anmeldung, höchstens 30 Nachrichten pro Tag.
- Wortwiederholung nach 1, 3, 7, 14 und 30 Tagen
- Tagesziel, Lernserie und XP
- Fortschritt wird im Browser gespeichert; mit Supabase optional auch im Benutzerkonto (Anmeldung per E-Mail-Link)
- Auf dem Handy als App installierbar (Web-App-Manifest)

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:3000
npm run validate   # Lerninhalte prüfen
npm run lint
npm run build
```

Die Lerninhalte liegen in [`content/`](content/README.md).

## Benutzerkonten

Die App speichert den Fortschritt immer im Browser und, wenn jemand angemeldet ist, zusätzlich in Supabase:

1. Die Migration in `supabase/migrations/` ist im Supabase-Projekt `wsqsehgqbctdzdiplglw` bereits ausgeführt (Tabelle `progress` mit Row Level Security).
2. URL und Schlüssel sind in `src/lib/supabase.ts` hinterlegt, Vercel braucht keine weiteren Einstellungen. Umgebungsvariablen (siehe `.env.example`) überschreiben sie; leere Werte schalten Konten ab.
3. In Supabase unter Authentication → URL Configuration die Adresse der App als Site URL und Redirect URL (`…/account`) eintragen.

## KI-Tutor

Der Tutor ruft über `src/app/api/tutor/route.ts` das Claude-Modell von Anthropic auf (Standard: `claude-opus-5-5`, mit automatischem Ausweichmodell, falls eine Anfrage abgelehnt wird).

1. In Vercel unter Settings → Environment Variables `ANTHROPIC_API_KEY` eintragen und neu deployen. Ohne Schlüssel zeigt die Tutor-Seite nur einen Hinweis.
2. Optional `TUTOR_MODEL` setzen, z. B. `claude-haiku-5-5`, um Kosten zu sparen.
3. Das Tageslimit (30 Nachrichten pro Person) zählt die Funktion `tutor_use()` in Supabase (Migration `supabase/migrations/20261102120000_tutor_usage.sql`, bereits ausgeführt). Den Wert ändert man dort in `daily_limit` und in `src/lib/tutor.ts`.
