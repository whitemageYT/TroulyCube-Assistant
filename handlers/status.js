const fs = require('fs');
const config = require('../config.json');
const configPath = './config.json';
const { EmbedBuilder } = require('discord.js');
const { readStorage, writeStorage } = require('../storage');

// Cette fonction doit recevoir le statut réel du serveur et le nombre de joueurs !
// Ici, c'est un exemple statique, à adapter selon ton fetch de statut réel.
async function upsertServerStatusMessage(client, server, config) {
  const channel = await client.channels.fetch(server.channelId);
  if (!channel) return;

  // Exemple d'embed de statut serveur
  const embed = new EmbedBuilder()
    .setTitle(server.embed.title)
    .setColor(server.embed.colors.online) // ou offline selon l'état
    .setDescription("Statut du serveur ici...");

  // Utilise storage.json pour stocker l'ID par salon
  const storage = readStorage();
  if (!storage.statusMessages) storage.statusMessages = {};
  let messageId = storage.statusMessages[server.channelId];

  if (messageId) {
    try {
      const oldMessage = await channel.messages.fetch(messageId);
      if (oldMessage) {
        await oldMessage.edit({ embeds: [embed] });
        return;
      }
    } catch {
      // Le message n'existe plus, on continue
    }
  }

  // Sinon, envoie un nouveau message
  const message = await channel.send({ embeds: [embed] });
  storage.statusMessages[server.channelId] = message.id;
  writeStorage(storage);
}

module.exports = upsertServerStatusMessage;
