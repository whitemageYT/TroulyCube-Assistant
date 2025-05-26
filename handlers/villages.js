const fs = require('fs');
const config = require('../config.json');
const configPath = './config.json';
const logger = require('../utils/logger.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');

async function setupVillageEmbed(client) {
  const villagesConfig = config.villages;
  if (!villagesConfig || !villagesConfig.channelId) return;

  const channel = await client.channels.fetch(villagesConfig.channelId).catch(() => null);
  if (!channel) {
    logger.error("Salon de création de villages introuvable.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(villagesConfig.embed.title)
    .setDescription(villagesConfig.embed.description)
    .setColor(villagesConfig.embed.color || '#3498db');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_village')
      .setLabel('Créer mon village')
      .setStyle(ButtonStyle.Primary)
  );

  let message = null;
  if (villagesConfig.messageId) {
    message = await channel.messages.fetch(villagesConfig.messageId).catch(() => null);
  }

  if (message && typeof message.edit === 'function') {
    await message.edit({ embeds: [embed], components: [row] });
  } else {
    message = await channel.send({ embeds: [embed], components: [row] });
    config.villages.messageId = message.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info("Message de création de villages envoyé et sauvegardé.");
  }
}

function handleVillageInteractions(client) {
  client.on('interactionCreate', async interaction => {
    // 1. Bouton → ouvrir la modale
    if (interaction.isButton() && interaction.customId === 'create_village') {
      const modal = new ModalBuilder()
        .setCustomId('village_modal')
        .setTitle('Création de village');

      const nameInput = new TextInputBuilder()
        .setCustomId('village_name')
        .setLabel('Nom du village')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(nameInput);
      modal.addComponents(firstRow);

      await interaction.showModal(modal);
    }

    // 2. Modale validée → création du village
    if (interaction.isModalSubmit() && interaction.customId === 'village_modal') {
      const villageName = interaction.fields.getTextInputValue('village_name').trim().substring(0, 50);

      // Vérifie que le nom n'existe pas déjà
      if (interaction.guild.channels.cache.find(c => c.name.toLowerCase() === villageName.toLowerCase())) {
        return interaction.reply({ content: "Un village porte déjà ce nom.", ephemeral: true });
      }

      try {
        // Crée les rôles
        const maireRole = await interaction.guild.roles.create({
          name: `maire de ${villageName}`,
          permissions: [],
          mentionable: true,
          reason: `Création du village ${villageName}`
        });
        const habitantRole = await interaction.guild.roles.create({
          name: `habitant de ${villageName}`,
          permissions: [],
          mentionable: true,
          reason: `Création du village ${villageName}`
        });

        // Crée la catégorie
        const category = await interaction.guild.channels.create({
          name: villageName,
          type: 4, // GUILD_CATEGORY
          permissionOverwrites: [
            {
              id: interaction.guild.id, // everyone
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: maireRole.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel, 
                PermissionsBitField.Flags.ManageChannels, 
                PermissionsBitField.Flags.ManageRoles, 
                PermissionsBitField.Flags.ManageMessages
              ]
            },
            {
              id: habitantRole.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel, 
                PermissionsBitField.Flags.SendMessages, 
                PermissionsBitField.Flags.Connect, 
                PermissionsBitField.Flags.Speak
              ]
            }
          ]
        });

        // Crée les salons dans la catégorie
        await interaction.guild.channels.create({
          name: 'discussion',
          type: 0, // GUILD_TEXT
          parent: category.id,
          permissionOverwrites: category.permissionOverwrites.cache.map(po => po)
        });
        await interaction.guild.channels.create({
          name: 'bla-bla',
          type: 2, // GUILD_VOICE
          parent: category.id,
          permissionOverwrites: category.permissionOverwrites.cache.map(po => po)
        });

        // Donne le rôle maire au créateur
        await interaction.member.roles.add(maireRole);

        logger.success(`Village "${villageName}" créé par ${interaction.user.tag}`);
        await interaction.reply({ content: `Ton village **${villageName}** a été créé avec succès !`, ephemeral: true });
      } catch (error) {
        logger.error(`Erreur lors de la création du village "${villageName}":`, error);
        await interaction.reply({ content: "Une erreur est survenue lors de la création du village.", ephemeral: true });
      }
    }
  });

  // Commande !ressencer
  client.on('messageCreate', async message => {
    if (!message.content.startsWith('!ressencer')) return;
    
    const args = message.content.split(' ').slice(1);
    if (!args.length) return message.reply("Tu dois mentionner un joueur à recenser.");
    
    const target = message.mentions.members.first() || message.guild.members.cache.find(m => m.user.username === args[0]);
    if (!target) return message.reply("Utilisateur introuvable.");

    // Trouver le rôle "maire de {village}" du membre
    const maireRole = message.member.roles.cache.find(r => r.name.startsWith('maire de '));
    if (!maireRole) return message.reply("Tu n'es maire d'aucun village.");

    // Trouver le rôle habitant correspondant
    const habitantRoleName = maireRole.name.replace('maire de ', 'habitant de ');
    const habitantRole = message.guild.roles.cache.find(r => r.name === habitantRoleName);
    if (!habitantRole) return message.reply("Rôle habitant introuvable.");

    // Ajouter le rôle
    try {
      await target.roles.add(habitantRole);
      message.reply(`${target} est maintenant habitant de ton village !`);
      logger.info(`${target.user.tag} a été ajouté au village "${habitantRoleName.replace('habitant de ', '')}" par ${message.author.tag}`);
    } catch (error) {
      logger.error(`Erreur lors de l'ajout de ${target.user.tag} au village:`, error);
      message.reply("Une erreur est survenue lors de l'ajout de l'habitant.");
    }
  });
}

module.exports = {
  setupVillageEmbed,
  handleVillageInteractions
};
