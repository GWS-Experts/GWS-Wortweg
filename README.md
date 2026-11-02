# GWS-Wortweg

Kostenlose Web-App, mit der Englischsprachige Deutsch lernen. Die Lektionen folgen einer Geschichte: Emma Clarke aus Leeds zieht nach Marzling und lernt Schritt für Schritt, den deutschen Alltag zu meistern.

## Funktionen (Version 1)

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

## Benutzerkonten (optional)

Ohne Konfiguration speichert die App den Fortschritt nur im Browser. Für Konten:

1. Die Migration in `supabase/migrations/` im Supabase-Projekt ausführen.
2. `.env.example` nach `.env.local` kopieren und `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` eintragen.
3. In Supabase unter Authentication → URL Configuration die Adresse der App als Site URL und Redirect URL (`…/account`) eintragen.
