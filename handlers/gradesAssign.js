// handlers/gradesAssign.js
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const GRADES_MESSAGE_ID_FILE = './grades_message_id.txt';

async function upsertGradesEmbed(client) {
  const gradesConfig = config.grades;
  const channel = await client.channels.fetch(gradesConfig.channelId);
  if (!channel) return console.error("Salon Grades introuvable.");

  const description = Object.entries(gradesConfig.roles)
    .map(([emoji, roleId]) => `${emoji} : <@&${roleId}>`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(gradesConfig.embed.title)
    .setDescription(description)
    .setColor(gradesConfig.embed.color || 0x3498db);

  // Vérifie si le message existe déjà
  let gradesMessageId = null;
  if (fs.existsSync(GRADES_MESSAGE_ID_FILE)) {
    gradesMessageId = fs.readFileSync(GRADES_MESSAGE_ID_FILE, 'utf8');
    try {
      const oldMessage = await channel.messages.fetch(gradesMessageId);
      if (oldMessage) {
        // Modifie l'embed existant
        await oldMessage.edit({ embeds: [embed] });

        // Ajoute les réactions manquantes
        const existingReactions = oldMessage.reactions.cache.map(r => r.emoji.name);
        for (const emoji of Object.keys(gradesConfig.roles)) {
          if (!existingReactions.includes(emoji)) {
            await oldMessage.react(emoji);
          }
        }
        return;
      }
    } catch {
      // Le message n'existe plus, on continue pour en envoyer un nouveau
    }
  }

  // Sinon, envoie un nouveau message
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
  upsertGradesEmbed,
  handleGradesReaction
};
