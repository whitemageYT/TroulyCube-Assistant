const fs = require('fs');
const config = require('../config.json');
const configPath = './config.json';
const { EmbedBuilder } = require('discord.js');
const { status } = require('minecraft-server-util');
const logger = require('../utils/logger.js');

const upsertServerStatusMessage = async (client, server, config) => {
  // 1. Récupération du channel
  let channel;
  try {
    channel = await client.channels.fetch(server.channelId);
  } catch (err) {
    logger.error(`Impossible de récupérer le channel ${server.channelId} pour ${server.name}:`, err);
    return;
  }
  if (!channel) return;

  // 2. Récupération du statut du serveur Minecraft
  let online = false;
  let playersOnline = 0;
  let maxPlayers = 0;
  let motd = '';

  try {
  const response = await status(server.ip, server.port, { timeout: 5000 });
  online = true;
  playersOnline = response.players.online;
  maxPlayers = response.players.max;
  motd = response.motd?.clean || response.motd || '';
  logger.info(`Statut récupéré pour ${server.name} : ${playersOnline}/${maxPlayers} joueurs`);
} catch (err) {
  online = false;
  logger.error(`❌ Impossible de pinger ${server.name} (${server.ip}:${server.port})`);
  logger.error(`⛔ ${err.name}: ${err.message}`);
  logger.debug(err.stack);
}


  // 3. Construction de l'embed
  const color = online ? server.embed.colors.online : server.embed.colors.offline;
  const statusText = online ? "🟢 En ligne" : "🔴 Hors ligne";
  const description = online
    ? `Statut du serveur : **${statusText}**\nIP : \`${server.ip}\`:\`${server.port}\`\nSeed : \`${server.seed}\`\nMOTD : ${motd}`
    : `Statut du serveur : **${statusText}**\nIP : \`${server.ip}\`:\`${server.port}\`\nSeed : \`${server.seed}\`\nLe serveur est hors ligne.`;

  const embed = new EmbedBuilder()
    .setTitle(server.embed.title)
    .setColor(color)
    .setDescription(description)
    .addFields(
      { name: 'Joueurs en ligne', value: online ? `${playersOnline}/${maxPlayers}` : '0/0', inline: true },
      { name: 'Dernière mise à jour', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: server.embed.footer.text })
    .setTimestamp();

  // 4. Mise à jour ou création du message d'état
  let message = null;
  if (server.messageId) {
    message = await channel.messages.fetch(server.messageId).catch(() => null);
  }

  if (message && typeof message.edit === 'function') {
    await message.edit({ embeds: [embed] });
    logger.success(`Embed mis à jour pour ${server.name} (messageId: ${message.id})`);
  } else {
    message = await channel.send({ embeds: [embed] });
    logger.success(`Nouveau message d'état envoyé pour ${server.name} (messageId: ${message.id})`);
    // Sauvegarde du nouvel ID dans la config
    const servers = config.servers.map(srv => {
      if (srv.channelId === server.channelId) {
        return { ...srv, messageId: message.id };
      }
      return srv;
    });
    config.servers = servers;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info("Message status envoyé et ID sauvegardé dans config.json.");
  }
};

module.exports = upsertServerStatusMessage;
