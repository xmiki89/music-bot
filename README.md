# Discord Music Bot

Ein einfacher Discord Music Bot mit Discord.js und @discordjs/voice.

## Voraussetzungen

- Node.js 18 oder höher
- Ein Discord-Bot-Token
- FFmpeg auf dem System installiert

## Installation

```bash
npm install
```

## Konfiguration

1. Kopiere `.env.example` nach `.env`
2. Fülle deine Werte ein:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
3. Starte den Bot:

```bash
npm start
```

## Befehle

- `/join` – Bot in deinen Sprachkanal holen
- `/play <URL oder Songtitel>` – Lied abspielen
- `/pause` – Wiedergabe pausieren
- `/resume` – Wiedergabe fortsetzen
- `/skip` – Aktuelles Lied überspringen
- `/stop` – Warteschlange leeren und stoppen
- `/leave` – Kanal verlassen

## Wichtig

Du musst den Bot in deinen Server einladen und ihm die Berechtigungen für Sprachkanäle geben.

## Deploy auf Render (oder andere PaaS)

- Setze `DISCORD_TOKEN`, `CLIENT_ID` und `GUILD_ID` als sichere Environment Variables in der Service-Konfiguration (nicht per `.env` in Git).
- Nach dem Setzen neu deployen/restarten.
- Wenn dein Token kompromittiert wurde: regeneriere es im Discord Developer Portal und aktualisiere die Environment Variable.

Beispiel: Entferne lokale `.env` aus dem Repository und stoppe die Versionskontrolle für die Datei:

```bash
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Remove .env and add to .gitignore"
git push
```

Wenn du die `.env` bereits in die Historie gepusht hast, verwende `bfg` oder `git filter-repo` um sensible Daten aus der Historie zu entfernen.
