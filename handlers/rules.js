const fs = require('fs');
const config = require('../config.json');
const logger = require('../utils/logger.js');
const configPath = './config.json';
const { EmbedBuilder } = require('discord.js');

module.exports = async (client) => {
  const reglementConf = config.reglement;
  if (!reglementConf || !reglementConf.rulesChannelId) return;

  const channel = await client.channels.fetch(reglementConf.rulesChannelId).catch(() => null);
  if (!channel) {
    logger.error("Salon de règlement introuvable.");
    return;
  }

  let message;
  if (reglementConf.messageId) {
    message = await channel.messages.fetch(reglementConf.messageId).catch(() => null);
  }

  if (message) {
    // Modifie l'embed si besoin (optionnel)
    const embed = new EmbedBuilder()
      .setTitle(reglementConf.embed.title)
      .setDescription(reglementConf.embed.description)
      .setColor(parseInt(reglementConf.embed.color.replace('#', ''), 16));
    await message.edit({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setTitle(reglementConf.embed.title)
      .setDescription(reglementConf.embed.description)
      .setColor(parseInt(reglementConf.embed.color.replace('#', ''), 16));

    message = await channel.send({ embeds: [embed] });
    await message.react('✅');
    reglementConf.messageId = message.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info("Message de règlement envoyé et sauvegardé.");
  }
};
