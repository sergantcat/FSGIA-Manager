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
  ContainerBuilder,
  MessageFlags,
  PresenceUpdateStatus,
  TextDisplayBuilder,
} = require('discord.js');

const COMPONENTS_V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL_V2 = MessageFlags.Ephemeral | COMPONENTS_V2;

function createErrorContainer() {
  return new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# Command Failed\nThere was an error while running this command.',
      ),
    );
}

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'DATABASE_URL'];

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
    
  client.user.setStatus({
    status: PresenceUpdateStatus.Custom,
    activities: [
      {
        name: 'FSGIA Manager',
        type: ActivityType.Playing,
        text: 'Handling Appeals ',
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
      components: [createErrorContainer()],
      flags: EPHEMERAL_V2,
    };

    if (interaction.deferred) {
      await interaction.editReply({
        components: [createErrorContainer()],
        flags: COMPONENTS_V2,
      });
    } else if (interaction.replied) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

async function startBot() {
  let attempt = 0;
  const maxAttempts = 5;
  const baseDelay = 5000; // 5 seconds

  while (attempt < maxAttempts) {
    try {
      
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
