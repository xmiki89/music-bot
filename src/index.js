require('dotenv').config();

const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  NoSubscriberBehavior,
} = require('@discordjs/voice');

const playdl = require('play-dl');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Additional diagnostics to capture runtime errors and promise rejections.
client.on('error', (err) => {
  console.error('Discord client error:', err);
});

client.on('shardError', (err) => {
  console.error('Discord shard error:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

const queue = new Map();

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
];

function getGuildState(guildId, channel = null) {
  if (!queue.has(guildId)) {
    queue.set(guildId, {
      connection: null,
      player: null,
      textChannel: channel,
      songs: [],
      isPlaying: false,
    });
  }

  const state = queue.get(guildId);
  if (channel) state.textChannel = channel;

  return state;
}

async function registerCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId || !guildId) {
    console.warn('WARN: DISCORD_TOKEN, CLIENT_ID oder GUILD_ID fehlen. Slash-Commands werden nicht registriert.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands.map((command) => command.toJSON()),
    });

    console.log('Slash-Commands erfolgreich registriert.');
  } catch (error) {
    console.error('Fehler beim Registrieren der Slash-Commands:', error.message);
  }
}

async function resolveSong(query) {
  const isUrl = /^https?:\/\//i.test(query);

  if (isUrl) {
    const info = await playdl.search(query, { limit: 1 });
    if (!info.length) {
      throw new Error('Kein passendes Ergebnis gefunden.');
    }

    return {
      title: info[0].title,
      url: info[0].url,
    };
  }

  const results = await playdl.search(query, { limit: 1 });
  if (!results.length) {
    throw new Error('Kein Song mit diesem Namen gefunden.');
  }

  return {
    title: results[0].title,
    url: results[0].url,
  };
}

async function playNext(guildId) {
  const state = queue.get(guildId);
  if (!state || state.songs.length === 0) {
    state.isPlaying = false;
    return;
  }

  const song = state.songs[0];
  const stream = await playdl.stream(song.url, { quality: 2 });
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
  });

  state.player.play(resource);
  state.isPlaying = true;
  state.songs.shift();

  if (state.textChannel) {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Jetzt läuft')
      .setDescription(`[${song.title}](${song.url})`);

    state.textChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

client.once(Events.ClientReady, () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
  registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guildId, channel } = interaction;

  try {
    if (commandName === 'join') {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'Du musst in einem Sprachkanal sein.', ephemeral: true });
      }

      const state = getGuildState(guildId, channel);

      if (!state.connection) {
        state.connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
      }

      if (!state.player) {
        state.player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
          },
        });

        state.connection.subscribe(state.player);

        state.player.on('stateChange', (oldState, newState) => {
          if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
            const guildState = queue.get(guildId);
            if (guildState && guildState.songs.length > 0) {
              playNext(guildId).catch((error) => {
                console.error('Fehler beim Abspielen des nächsten Songs:', error.message);
              });
            } else {
              guildState.isPlaying = false;
            }
          }
        });
      }

      return interaction.reply({ content: `Verbunden mit <#${voiceChannel.id}>.`, ephemeral: true });
    }

    if (commandName === 'leave') {
      const state = queue.get(guildId);
      if (!state || !state.connection) {
        return interaction.reply({ content: 'Der Bot ist in keinem Sprachkanal.', ephemeral: true });
      }

      state.songs = [];
      state.connection.destroy();
      queue.delete(guildId);
      return interaction.reply({ content: 'Ich verlasse den Sprachkanal.', ephemeral: true });
    }

    if (commandName === 'play') {
      const query = interaction.options.getString('query');
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({ content: 'Du musst in einem Sprachkanal sein.', ephemeral: true });
      }

      const state = getGuildState(guildId, channel);
      if (!state.connection) {
        state.connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
      }

      if (!state.player) {
        state.player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
          },
        });

        state.connection.subscribe(state.player);

        state.player.on('stateChange', (oldState, newState) => {
          if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
            const guildState = queue.get(guildId);
            if (guildState && guildState.songs.length > 0) {
              playNext(guildId).catch((error) => {
                console.error('Fehler beim Abspielen des nächsten Songs:', error.message);
              });
            } else {
              guildState.isPlaying = false;
            }
          }
        });
      }

      const song = await resolveSong(query);
      state.songs.push(song);

      await interaction.reply({ content: `Song zur Warteschlange hinzugefügt: **${song.title}**`, ephemeral: false });

      if (!state.isPlaying) {
        await playNext(guildId);
      }

      return;
    }

    if (commandName === 'pause') {
      const state = queue.get(guildId);
      if (!state || !state.player) {
        return interaction.reply({ content: 'Es läuft gerade kein Lied.', ephemeral: true });
      }

      state.player.pause();
      return interaction.reply({ content: 'Wiedergabe pausiert.', ephemeral: true });
    }

    if (commandName === 'resume') {
      const state = queue.get(guildId);
      if (!state || !state.player) {
        return interaction.reply({ content: 'Es läuft gerade kein Lied.', ephemeral: true });
      }

      state.player.unpause();
      return interaction.reply({ content: 'Wiedergabe fortgesetzt.', ephemeral: true });
    }

    if (commandName === 'skip') {
      const state = queue.get(guildId);
      if (!state || !state.player) {
        return interaction.reply({ content: 'Es läuft gerade kein Lied.', ephemeral: true });
      }

      state.player.stop();
      return interaction.reply({ content: 'Lied übersprungen.', ephemeral: true });
    }

    if (commandName === 'stop') {
      const state = queue.get(guildId);
      if (!state || !state.player) {
        return interaction.reply({ content: 'Es läuft gerade kein Lied.', ephemeral: true });
      }

      state.songs = [];
      state.player.stop();
      return interaction.reply({ content: 'Wiedergabe gestoppt und Warteschlange geleert.', ephemeral: true });
    }
  } catch (error) {
    console.error('Interaktionsfehler:', error);
    return interaction.reply({ content: `Fehler: ${error.message}`, ephemeral: true });
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN fehlt. Setze die Umgebungsvariable DISCORD_TOKEN.');
  process.exit(1);
}

console.log(`DISCORD_TOKEN vorhanden (Länge ${token.length}) maskiert: ${token.slice(0, 4)}...${token.slice(-4)}`);
console.log('Attempting Discord login...');

// Attempt login with retries, exponential backoff, and handling for 429 Retry-After.
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function validateToken() {
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` },
    });
    return res;
  } catch (e) {
    console.error('Token validation request failed:', e && e.message ? e.message : e);
    return null;
  }
}

async function attemptLoginWithRetries() {
  const maxAttempts = 5;
  let backoff = 2000; // 2s
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Login attempt ${attempt}/${maxAttempts}`);

    const validation = await validateToken();
    if (validation) {
      if (validation.status === 200) {
        console.log('Token validation OK (200). Proceeding to login.');
        try {
          const loginTimeoutMs = 60000; // 60s
          await Promise.race([
            client.login(token),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Login timed out')), loginTimeoutMs)),
          ]);
          console.log('Discord login promise resolved. Waiting for Ready event...');
          return true;
        } catch (err) {
          console.error(`Login attempt ${attempt} failed:`, err && err.message ? err.message : err);
        }
      } else if (validation.status === 401) {
        console.error('Token invalid (401). Regenerate the token in the Developer Portal and update Render.');
        process.exit(1);
      } else if (validation.status === 429) {
        const ra = validation.headers.get('retry-after');
        const waitMs = ra ? Math.ceil(parseFloat(ra) * 1000) : backoff;
        console.error(`Token validation rate-limited (429). Retry-After: ${ra}. Waiting ${waitMs}ms.`);
        await sleep(waitMs);
        backoff *= 2;
        continue;
      } else {
        console.error('Unexpected token validation status:', validation.status);
      }
    } else {
      console.error('Token validation failed (network). Will retry after backoff.');
    }

    await sleep(backoff);
    backoff *= 2;
  }

  console.error('All login attempts failed. Exiting.');
  process.exit(1);
}

attemptLoginWithRetries();

// Minimaler HTTP-Server für Healthchecks und um auf einer festen Portnummer zu lauschen.
const http = require('http');
const listenPort = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(listenPort, '0.0.0.0', () => {
  console.log(`Health server listening on port ${listenPort}`);
});
