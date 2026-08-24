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
