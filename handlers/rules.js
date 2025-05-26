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

  // Prépare l'embed à envoyer ou modifier
  const embed = new EmbedBuilder()
    .setTitle(reglementConf.embed.title)
    .setDescription(reglementConf.embed.description)
    .setColor(parseInt(reglementConf.embed.color.replace('#', ''), 16));

  let message = null;
  if (reglementConf.messageId) {
    // On tente de fetch le message existant, sinon null
    message = await channel.messages.fetch(reglementConf.messageId).catch(() => null);
  }

  if (message && typeof message.edit === 'function') {
    // Modifie l'embed si le message existe et est bien un Message Discord.js
    await message.edit({ embeds: [embed] });
  } else {
    // Envoie un nouveau message
    message = await channel.send({ embeds: [embed] });
    await message.react('✅');
    reglementConf.messageId = message.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info("Message de règlement envoyé et sauvegardé.");
  }
};
