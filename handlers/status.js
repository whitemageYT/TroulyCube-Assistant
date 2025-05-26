const fs = require('fs');
const config = require('../config.json');
const configPath = './config.json';
const { EmbedBuilder } = require('discord.js');

// Cette fonction doit recevoir le statut réel du serveur et le nombre de joueurs !
// Ici, c'est un exemple statique, à adapter selon ton fetch de statut réel.
async function upsertServerStatusMessage(client, server, config) {
  const channel = await client.channels.fetch(server.channelId);
  if (!channel) return;

  // TODO : Remplace ces variables par ton vrai fetch de statut serveur Minecraft
  const online = true; // true si le serveur est online, false sinon
  const playersOnline = 12; // nombre de joueurs connectés
  const maxPlayers = 50;    // nombre max de joueurs

  const color = online ? server.embed.colors.online : server.embed.colors.offline;
  const statusText = online ? "🟢 En ligne" : "🔴 Hors ligne";

  // Construit l'embed complet
  const embed = new EmbedBuilder()
    .setTitle(server.embed.title)
    .setColor(color)
    .setDescription(
      `Statut du serveur : **${statusText}**\n` +
      `IP : \`${server.ip}\`:\`${server.port}\``
    )
    .addFields(
      { name: 'Joueurs en ligne', value: `${playersOnline}/${maxPlayers}`, inline: true },
      { name: 'Dernière mise à jour', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: server.embed.footer.text })
    .setTimestamp();

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
