const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.json');
const logger = require('./utils/logger.js');
const handleRules = require('./handlers/rules.js');
const handleRoleAssign = require('./handlers/roleAssign.js');
const updateServerStatus = require('./handlers/status.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', async () => {
  logger.success(`Connecté en tant que ${client.user.tag}`);

  // Gestion du règlement
  await handleRules(client);

  // Statut Minecraft
  config.servers.forEach(server => {
    updateServerStatus(client, server, config);
    setInterval(() => {
      updateServerStatus(client, server, config);
    }, server.updateInterval || 60000);
  });
});

// Attribution du rôle à la réaction
client.on('messageReactionAdd', async (reaction, user) => {
  handleRoleAssign(reaction, user);
});

client.login(config.token);
