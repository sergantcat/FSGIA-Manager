require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
  ActivityType,
  PresenceUpdateStatus,
} = require('discord.js');

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
const slashCommands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    slashCommands.push(command.data.toJSON());
  } else {
    console.warn(`[WARNING] ${file} is missing "data" or "execute".`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.name) {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  console.log(`Registering ${slashCommands.length} slash command(s)...`);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: slashCommands },
  );

  console.log('Slash commands registered.');
}

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Anti-timeout: Update bot status every 5 minutes
  setInterval(() => {
    client.user.setPresence({
      status: PresenceUpdateStatus.Online,
      activities: [
        {
          name: 'Appeals | /deploy',
          type: ActivityType.Watching,
        },
      ],
    });
    console.log('[ANTI-TIMEOUT] Updated bot status');
  }, 5 * 60 * 1000); // Every 5 minutes

  // Initial presence setup
  client.user.setPresence({
    status: PresenceUpdateStatus.Online,
    activities: [
      {
        name: 'Appeals | /deploy',
        type: ActivityType.Watching,
      },
    ],
  });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`No command found for ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const reply = {
      content: 'There was an error while running this command.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Anti-timeout: Handle disconnections and auto-reconnect
client.on('disconnect', () => {
  console.warn('[ANTI-TIMEOUT] Bot disconnected, attempting to reconnect...');
});

client.on('error', (error) => {
  console.error('[ERROR]', error);
});

client.on('warn', (info) => {
  console.warn('[WARNING]', info);
});

// Heartbeat monitor
let lastHeartbeat = Date.now();
client.on('shardHeartbeatAck', () => {
  lastHeartbeat = Date.now();
});

// Check heartbeat every 30 seconds
setInterval(() => {
  const now = Date.now();
  if (now - lastHeartbeat > 60000) {
    console.warn('[ANTI-TIMEOUT] No heartbeat received in 60 seconds, connection may be stale');
  }
}, 30000);

async function startBot() {
  let attempt = 0;
  const maxAttempts = 5;
  const baseDelay = 5000; // 5 seconds

  while (attempt < maxAttempts) {
    try {
      console.log(`[ANTI-TIMEOUT] Starting bot (attempt ${attempt + 1}/${maxAttempts})...`);
      await registerCommands();
      await client.login(process.env.DISCORD_TOKEN);
      break; // Success, exit loop
    } catch (error) {
      attempt++;
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      
      if (attempt < maxAttempts) {
        console.error(`Failed to start bot (attempt ${attempt}), retrying in ${delay / 1000} seconds...`);
        console.error(error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Failed to start bot after all retry attempts:', error);
        process.exit(1);
      }
    }
  }
}

startBot();
