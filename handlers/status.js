const fs = require('fs');
const config = require('../config.json');
const configPath = './config.json';
const { EmbedBuilder } = require('discord.js');

async function upsertServerStatusMessage(client, server, config) {
  const channel = await client.channels.fetch(server.channelId);
  if (!channel) return;

  // Exemple d'embed de statut serveur
  const embed = new EmbedBuilder()
    .setTitle(server.embed.title)
    .setColor(server.embed.colors.online) // ou offline selon l'état
    .setDescription("Statut du serveur ici...");

  let message;
  if (server.messageId) {
    message = await channel.messages.fetch(server.messageId).catch(() => null);
  }

  if (message) {
    await message.edit({ embeds: [embed] });
  } else {
    message = await channel.send({ embeds: [embed] });
    // Sauvegarde l'ID dans config.json
    const servers = config.servers.map(srv => {
      if (srv.channelId === server.channelId) {
        return { ...srv, messageId: message.id };
      }
      return srv;
    });
    config.servers = servers;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Message status envoyé et ID sauvegardé dans config.json.");
  }
}

module.exports = upsertServerStatusMessage;
