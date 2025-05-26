const fs = require('fs');
const config = require('../config.json');
const configPath = './config.json';
const logger = require('../utils/logger.js');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require('discord.js');

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

  // Correction : ne renvoie le message QUE si nécessaire
  let message = null;
  if (villagesConfig.messageId) {
    // On tente de fetch le message existant
    message = await channel.messages.fetch(villagesConfig.messageId).catch(() => null);
  }

  if (message && typeof message.edit === 'function') {
    // Message existant : on l'édite
    await message.edit({ embeds: [embed], components: [row] });
  } else {
    // Pas de message existant : on envoie et on sauvegarde l'ID
    message = await channel.send({ embeds: [embed], components: [row] });
    config.villages.messageId = message.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info("Message de création de villages envoyé et sauvegardé.");
  }
}

function handleVillageInteractions(client) {
  client.on('interactionCreate', async interaction => {
    // Bouton → ouvrir la modale
    if (interaction.isButton() && interaction.customId === 'create_village') {
      const modal = new ModalBuilder()
        .setCustomId('village_modal')
        .setTitle('Création de village')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('village_name')
              .setLabel('Nom du village')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('village_color')
              .setLabel('Couleur du village (hex, ex: #3498db)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('#3498db')
          )
        );
      return interaction.showModal(modal);
    }

    // Modale validée → création du village
    if (interaction.isModalSubmit() && interaction.customId === 'village_modal') {
      const villageName = interaction.fields.getTextInputValue('village_name').trim().substring(0, 50);
      let color = interaction.fields.getTextInputValue('village_color').trim();

      // Validation couleur hexadécimale
      if (!/^#?([0-9A-Fa-f]{6})$/.test(color)) {
        return interaction.reply({ content: "La couleur doit être au format hexadécimal, ex: #3498db", ephemeral: true });
      }
      if (!color.startsWith('#')) color = '#' + color;

      // Vérifie que le nom n'existe pas déjà
      if (interaction.guild.channels.cache.find(c => c.name.toLowerCase() === villageName.toLowerCase())) {
        return interaction.reply({ content: "Un village porte déjà ce nom.", ephemeral: true });
      }

      try {
        // Crée les rôles
        const maireRole = await interaction.guild.roles.create({
          name: `maire de ${villageName}`,
          color: color,
          permissions: [],
          mentionable: true,
          reason: `Création du village ${villageName}`
        });
        const habitantRole = await interaction.guild.roles.create({
          name: `habitant de ${villageName}`,
          color: color,
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

        logger.success(`Village "${villageName}" créé par ${interaction.user.tag} avec couleur ${color}`);
        await interaction.reply({ content: `Ton village **${villageName}** a été créé avec succès !`, ephemeral: true });
      } catch (error) {
        logger.error(`Erreur lors de la création du village "${villageName}":`, error);
        await interaction.reply({ content: "Une erreur est survenue lors de la création du village.", ephemeral: true });
      }
    }

    // Slash command /ressencer
    if (interaction.isChatInputCommand() && interaction.commandName === 'ressencer') {
      const target = interaction.options.getMember('utilisateur');
      if (!target) return interaction.reply({ content: "Utilisateur introuvable.", ephemeral: true });

      // Vérifie que l'utilisateur est bien maire d'un village
      const maireRole = interaction.member.roles.cache.find(r => r.name.startsWith('maire de '));
      if (!maireRole) return interaction.reply({ content: "Tu n'es maire d'aucun village.", ephemeral: true });

      // Trouve le rôle habitant correspondant
      const habitantRoleName = maireRole.name.replace('maire de ', 'habitant de ');
      const habitantRole = interaction.guild.roles.cache.find(r => r.name === habitantRoleName);
      if (!habitantRole) return interaction.reply({ content: "Rôle habitant introuvable.", ephemeral: true });

      // Ajoute le rôle
      await target.roles.add(habitantRole);
      await interaction.reply({ content: `${target} est maintenant habitant de ton village !`, ephemeral: true });
    }
  });
}

module.exports = {
  setupVillageEmbed,
  handleVillageInteractions
};
