const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.json');
const logger = require('./utils/logger.js');
const handleRules = require('./handlers/rules.js');
const handleRoleAssign = require('./handlers/roleAssign.js');
const upsertServerStatusMessage = require('./handlers/status.js');
const { upsertGradesEmbed, handleGradesReaction } = require('./handlers/gradesAssign.js');
const express = require('express');
const { setupVillageEmbed, handleVillageInteractions } = require('./handlers/villages.js');
const handleSupprimer = require('./handlers/supprimer.js');
const updateEmbeds = require('./handlers/updateEmbeds.js');
const handleExportConfig = require('./handlers/exportConfig.js');

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

  // Grades (envoi ou modif unique)
  await upsertGradesEmbed(client);

  // Gestion des villages
  await setupVillageEmbed(client);
  handleVillageInteractions(client);

  updateEmbeds(client);

  handleSupprimer(client);

  // Statut Minecraft (pour chaque serveur)
  // Statut Minecraft
  config.servers.forEach(server => {
    upsertServerStatusMessage(client, server, config);
    setInterval(() => {
      upsertServerStatusMessage(client, server, config);
    }, server.updateInterval || 300000);
  });
});

// === Gestion centralisée des interactions ===
client.on('interactionCreate', async interaction => {
  // Vérifie que c'est bien une interaction Discord.js
  if (!interaction || typeof interaction.isButton !== "function") return;
  try {
  // Transfère toutes les interactions aux handlers concernés
  await handleExportConfig(interaction);
  await handleVillageInteractions(interaction); 
  // Ajoutez ici d'autres handlers si nécessaire
  }});

// Attribution du rôle à la réaction (Règlement + Grades)
client.on('messageReactionAdd', async (reaction, user) => {
  handleRoleAssign(reaction, user);
  handleGradesReaction(reaction, user, true);
});

client.on('messageReactionRemove', async (reaction, user) => {
  handleGradesReaction(reaction, user, false);
});

client.login(process.env.DISCORD_TOKEN);
