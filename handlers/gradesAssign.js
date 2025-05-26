// handlers/gradesAssign.js
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const GRADES_MESSAGE_ID_FILE = './grades_message_id.txt';

async function sendGradesEmbedIfNeeded(client) {
  const gradesConfig = config.grades;
  const channel = await client.channels.fetch(gradesConfig.channelId);
  if (!channel) return console.error("Salon Grades introuvable.");

  // Vérifie si le message existe déjà
  let gradesMessageId = null;
  if (fs.existsSync(GRADES_MESSAGE_ID_FILE)) {
    gradesMessageId = fs.readFileSync(GRADES_MESSAGE_ID_FILE, 'utf8');
    try {
      const oldMessage = await channel.messages.fetch(gradesMessageId);
      if (oldMessage) return; // L'embed existe déjà, on ne fait rien
    } catch {
      // Le message n'existe plus, on continue pour en envoyer un nouveau
    }
  }

  // Génère l'embed
  const description = Object.entries(gradesConfig.roles)
    .map(([emoji, roleId]) => `${emoji} : <@&${roleId}>`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(gradesConfig.embed.title)
    .setDescription(description)
    .setColor(gradesConfig.embed.color || 0x3498db);

  const message = await channel.send({ embeds: [embed] });

  // Ajoute les réactions
  for (const emoji of Object.keys(gradesConfig.roles)) {
    await message.react(emoji);
  }

  // Sauvegarde l'ID du message
  fs.writeFileSync(GRADES_MESSAGE_ID_FILE, message.id, 'utf8');
}

async function handleGradesReaction(reaction, user, add = true) {
  if (user.bot) return;
  const gradesConfig = config.grades;

  if (reaction.message.channel.id !== gradesConfig.channelId) return;

  let gradesMessageId;
  try {
    gradesMessageId = fs.readFileSync(GRADES_MESSAGE_ID_FILE, 'utf8');
  } catch {
    return;
  }
  if (reaction.message.id !== gradesMessageId) return;

  const roleId = gradesConfig.roles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  if (!member) return;
  if (add) {
    if (!member.roles.cache.has(roleId)) await member.roles.add(roleId).catch(() => {});
  } else {
    if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
  }
}

module.exports = {
  sendGradesEmbedIfNeeded,
  handleGradesReaction
};
