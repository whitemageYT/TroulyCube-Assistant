const fs = require('fs');
const config = require('../config.json');
const configPath = './config.json';
const { EmbedBuilder } = require('discord.js');

async function upsertGradesEmbed(client) {
  const gradesConfig = config.grades;
  const channel = await client.channels.fetch(gradesConfig.channelId);
  if (!channel) {
    console.error("Salon Grades introuvable.");
    return;
  }

  // Prépare l'embed
  const description = Object.entries(gradesConfig.roles)
    .map(([emoji, roleId]) => `${emoji} : <@&${roleId}>`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(gradesConfig.embed.title)
    .setDescription(description)
    .setColor(gradesConfig.embed.color || 0x3498db);

  let message;
  if (gradesConfig.messageId) {
    message = await channel.messages.fetch(gradesConfig.messageId).catch(() => null);
  }

  if (message) {
    await message.edit({ embeds: [embed] });
    // Ajoute les réactions manquantes
    const existingReactions = message.reactions.cache.map(r => r.emoji.name);
    for (const emoji of Object.keys(gradesConfig.roles)) {
      if (!existingReactions.includes(emoji)) {
        try {
          await message.react(emoji);
        } catch (e) {
          console.error(`Impossible d’ajouter la réaction pour l’emoji ${emoji}:`, e);
        }
      }
    }
  } else {
    // Envoie un nouveau message
    message = await channel.send({ embeds: [embed] });
    for (const emoji of Object.keys(gradesConfig.roles)) {
      try {
        await message.react(emoji);
      } catch (e) {
        console.error(`Impossible d’ajouter la réaction pour l’emoji ${emoji}:`, e);
      }
    }
    // Sauvegarde l'ID dans config.json
    config.grades.messageId = message.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Message grades envoyé et ID sauvegardé dans config.json.");
  }
}

async function handleGradesReaction(reaction, user, add = true) {
  if (user.bot) return;
  const gradesConfig = config.grades;

  if (reaction.message.channel.id !== gradesConfig.channelId) return;
  if (reaction.message.id !== gradesConfig.messageId) return;

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
