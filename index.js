const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.json');
const logger = require('./utils/logger.js');
const handleRules = require('./handlers/rules.js');
const handleRoleAssign = require('./handlers/roleAssign.js');
const updateServerStatus = require('./handlers/status.js');
const { sendGradesEmbedIfNeeded, handleGradesReaction } = require('./handlers/gradesAssign.js');
const express = require('express');

const app = express();
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

// === Keep Alive route ===
app.get('/', (req, res) => {
  res.send('Le bot est en ligne');
});

// === Start HTTP server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Express server is running on port ${PORT}`);
});

// === Discord bot startup ===
client.once('ready', async () => {
  logger.success(`Connecté en tant que ${client.user.tag}`);

  // Gestion du règlement
  await handleRules(client);

  // Grades
  await upsertGradesEmbed(client);

  // Statut Minecraft (pour chaque serveur)
  config.servers.forEach(server => {
    upsertServerStatusMessage(client, server, config);
    setInterval(() => {
      upsertServerStatusMessage(client, server, config);
    }, server.updateInterval || 60000);
  });

  // Envoi automatique de l'embed des grades si besoin
  await sendGradesEmbedIfNeeded(client);
});

// Attribution du rôle à la réaction (Règlement + Grades)
client.on('messageReactionAdd', async (reaction, user) => {
  handleRoleAssign(reaction, user);
  handleGradesReaction(reaction, user, true); // ajout du rôle
});

client.on('messageReactionRemove', async (reaction, user) => {
  handleGradesReaction(reaction, user, false); // retrait du rôle
});

client.login(process.env.DISCORD_TOKEN);
