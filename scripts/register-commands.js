require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('DISCORD_TOKEN, CLIENT_ID oder GUILD_ID fehlen in der .env');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder().setName('join').setDescription('Bot in deinen Sprachkanal holen.'),
  new SlashCommandBuilder().setName('leave').setDescription('Bot verlässt den Sprachkanal.'),
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Spielt ein Lied ab.')
    .addStringOption((option) =>
      option.setName('query').setDescription('YouTube-Link oder Songtitel').setRequired(true)
    ),
  new SlashCommandBuilder().setName('pause').setDescription('Pausiert die Wiedergabe.'),
  new SlashCommandBuilder().setName('resume').setDescription('Setzt die Wiedergabe fort.'),
  new SlashCommandBuilder().setName('skip').setDescription('Überspringt das aktuelle Lied.'),
  new SlashCommandBuilder().setName('stop').setDescription('Stoppt die Wiedergabe und leert die Warteschlange.'),
  new SlashCommandBuilder()
    .setName('io')
    .setDescription('Bot Ein-/Ausgabe aktivieren/deaktivieren')
    .addBooleanOption((option) =>
      option.setName('enabled').setDescription('true=aktivieren, false=deaktivieren').setRequired(true)
    ),
  new SlashCommandBuilder().setName('restart').setDescription('Startet den Bot neu (Admins oder OWNER_ID).'),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Registriere Slash-Commands...');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Slash-Commands erfolgreich registriert.');
  } catch (err) {
    console.error('Fehler beim Registrieren der Slash-Commands:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
