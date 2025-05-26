// handlers/gradesAssign.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { readStorage, writeStorage } = require('../storage');

const GRADES_MESSAGE_ID_FILE = './grades_message_id.txt';

async function sendGradesEmbedIfNeeded(client) {
  const gradesConfig = config.grades;
  const channel = await client.channels.fetch(gradesConfig.channelId);
  if (!channel) {
    console.error("Salon Grades introuvable.");
    return;
  }

  const description = Object.entries(gradesConfig.roles)
    .map(([emoji, roleId]) => `${emoji} : <@&${roleId}>`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(gradesConfig.embed.title)
    .setDescription(description)
    .setColor(gradesConfig.embed.color || 0x3498db);

  const message = await channel.send({ embeds: [embed] });
  for (const emoji of Object.keys(gradesConfig.roles)) {
    await message.react(emoji);
  }

  // Sauvegarde le nouvel ID dans storage.json
  storage.gradesMessageId = message.id;
  writeStorage(storage);
}

async function handleGradesReaction(reaction, user, add = true) {
  if (user.bot) return;
  const gradesConfig = config.grades;

  if (reaction.message.channel.id !== gradesConfig.channelId) return;

  const storage = readStorage();
  const gradesMessageId = storage.gradesMessageId;
  if (!gradesMessageId || reaction.message.id !== gradesMessageId) return;

  const roleId = gradesConfig.roles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  if (!member) return;

  try {
    if (add) {
      if (!member.roles.cache.has(roleId)) await member.roles.add(roleId);
    } else {
      if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
    }
  } catch (error) {
    console.error(`Erreur lors de la modification des rôles pour ${member.user.tag}:`, error);
  }
}

module.exports = {
  upsertGradesEmbed,
  handleGradesReaction
};
