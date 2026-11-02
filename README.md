# GWS-Wortweg

Kostenlose Web-App, mit der Englischsprachige Deutsch lernen. Die Lektionen folgen einer Geschichte: Emma Clarke aus Leeds zieht nach Marzling und lernt Schritt für Schritt, den deutschen Alltag zu meistern.

## Funktionen (Version 1)

- 18 Lektionen auf vier Niveaus (A1: 6, A2: 4, B1: 4, B2: 4), auf der Startseite per Reiter wählbar
- Lektionen mit Szene, neuen Wörtern, Grammatik-Tipp, Übungen und Mini-Gespräch
- Fünf Übungstypen: Auswahl, Lückentext, Sätze ordnen, Hören und Tippen, Paare finden
- Sprachausgabe für alle deutschen Sätze (über die Sprachausgabe des Browsers)
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
