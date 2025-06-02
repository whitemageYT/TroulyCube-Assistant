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
  PermissionsBitField,
  MessageFlags
} = require('discord.js');
const uploadConfigToDrive = require('../utils/driveUploader.js');

// Fonction pour mettre à jour l'embed de la liste des villages
async function updateVillagesEmbed(client) {
  const channelId = "1377173673391427594"; // Salon de la liste des villages
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const villagesData = config.villages.list || {};
  const roles = await channel.guild.roles.fetch();

  const villages = Object.entries(villagesData).map(([name, data]) => {
    const maireRole = roles.find(r => r.name === `maire de ${name}`);
    const habitantRole = roles.find(r => r.name === `habitant de ${name}`);
    return {
      name,
      desc: data.desc,
      maireId: maireRole?.members.first()?.id,
      habitants: habitantRole?.members.map(m => m.id) || []
    };
  });

  const embed = new EmbedBuilder()
    .setTitle('📜 Liste des villages')
    .setColor('#3498db')
    .setDescription('Tous les villages enregistrés sur le serveur :');

  villages.forEach(village => {
    embed.addFields({
      name: `🏡 ${village.name}`,
      value: `**Description :** ${village.desc}\n**Maire :** ${village.maireId ? `<@${village.maireId}>` : 'Aucun'}\n**Habitants :** ${village.habitants.map(id => `<@${id}>`).join(', ') || 'Aucun'}`,
      inline: false
    });
  });

  let message;
  if (config.villages.embedMessageId) {
    message = await channel.messages.fetch(config.villages.embedMessageId).catch(() => null);
    if (message) {
      await message.edit({ embeds: [embed] });
      return;
    }
  }
  message = await channel.send({ embeds: [embed] });
  config.villages.embedMessageId = message.id;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Affichage du bouton de création de village
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
    if (message && typeof message.edit === 'function') {
      await message.edit({ embeds: [embed], components: [row] });
    } else {
      message = await channel.send({ embeds: [embed], components: [row] });
      config.villages.messageId = message.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      logger.info("Message de création de villages envoyé et sauvegardé.");
    }
  } else {
    message = await channel.send({ embeds: [embed], components: [row] });
    config.villages.messageId = message.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info("Message de création de villages envoyé et sauvegardé.");
  }
}

// Handler d'interactions à appeler depuis index.js
async function handleVillageInteractions(interaction) {
  if (
    !interaction ||
    typeof interaction.isButton !== "function" ||
    typeof interaction.isChatInputCommand !== "function" ||
    typeof interaction.isModalSubmit !== "function" ||
    typeof interaction.reply !== "function"
  ) {
    return;
  }
  try {
    // === Bouton → ouvrir la modale ===
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
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('village_desc')
              .setLabel('Description du village')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(200)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // === Modale validée → création du village ===
    if (interaction.isModalSubmit() && interaction.customId === 'village_modal') {
      const villageName = interaction.fields.getTextInputValue('village_name').trim().substring(0, 50);
      let color = interaction.fields.getTextInputValue('village_color').trim();
      const villageDesc = interaction.fields.getTextInputValue('village_desc').trim().substring(0, 200);

      if (!/^#?([0-9A-Fa-f]{6})$/.test(color)) {
        return interaction.reply({ content: "La couleur doit être au format hexadécimal, ex: #3498db", flags: MessageFlags.Ephemeral });
      }
      if (!color.startsWith('#')) color = '#' + color;

      if (interaction.guild.channels.cache.find(c => c.name.toLowerCase() === villageName.toLowerCase())) {
        return interaction.reply({ content: "Un village porte déjà ce nom.", flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        // IDs des rôles de référence
        const membreRoleId = '1375242986719285329';
        const villageoisRoleId = '1376687537447501985';

        // Création du rôle Habitant
        const habitantRole = await interaction.guild.roles.create({
          name: `habitant de ${villageName}`,
          color: color,
          permissions: [],
          mentionable: true,
          hoist: true,
          reason: `Création du village ${villageName}`
        });
        // Place Habitant au-dessus de Membre
        const membreRole = interaction.guild.roles.cache.get(membreRoleId);
        if (membreRole) {
          await habitantRole.setPosition(membreRole.position + 1);
        } else {
          await habitantRole.setPosition(1);
        }

        // Création du rôle Maire
        const maireRole = await interaction.guild.roles.create({
          name: `maire de ${villageName}`,
          color: color,
          permissions: [],
          mentionable: true,
          hoist: true,
          reason: `Création du village ${villageName}`
        });
        // Place Maire au-dessus de Villageois
        const villageoisRole = interaction.guild.roles.cache.get(villageoisRoleId);
        if (villageoisRole) {
          await maireRole.setPosition(villageoisRole.position + 1);
        } else {
          await maireRole.setPosition(1);
        }

        const category = await interaction.guild.channels.create({
          name: villageName,
          type: 4, // GUILD_CATEGORY
          permissionOverwrites: [
            {
              id: interaction.guild.id,
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

        await interaction.guild.channels.create({
          name: 'discussion',
          type: 0, // GUILD_TEXT
          parent: category.id
        });
        await interaction.guild.channels.create({
          name: 'bla-bla',
          type: 2, // GUILD_VOICE
          parent: category.id
        });

        await interaction.member.roles.add(maireRole);

        if (!config.villages.list) config.villages.list = {};
        config.villages.list[villageName] = {
          color,
          desc: villageDesc,
          created: new Date().toISOString()
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        await uploadConfigToDrive();

        logger.success(`Village "${villageName}" créé par ${interaction.user.tag} avec couleur ${color}`);
        await updateVillagesEmbed(interaction.client);

        await interaction.editReply({ content: `Ton village **${villageName}** a été créé avec succès et synchronisé sur Google Drive !` });
      } catch (error) {
        logger.error(`Erreur lors de la création du village "${villageName}":`, error);
        await interaction.editReply({ content: "Une erreur est survenue lors de la création du village." });
      }
      return;
    }

    // Ajout d’un habitant
    if (interaction.isChatInputCommand() && interaction.commandName === 'recensée') {
      const villageName = interaction.options.getString('village');
      const utilisateur = interaction.options.getUser('utilisateur');
      const member = await interaction.guild.members.fetch(utilisateur.id);

      const villages = config.villages.list || {};
      if (!villages[villageName]) {
        return interaction.reply({ content: "Ce village n'existe pas.", flags: MessageFlags.Ephemeral });
      }

      const maireRole = interaction.guild.roles.cache.find(r => r.name === `maire de ${villageName}`);
      if (!maireRole || !interaction.member.roles.cache.has(maireRole.id)) {
        return interaction.reply({ content: "Tu n'es pas maire de ce village.", flags: MessageFlags.Ephemeral });
      }

      const habitantRole = interaction.guild.roles.cache.find(r => r.name === `habitant de ${villageName}`);
      if (!habitantRole) {
        return interaction.reply({ content: "Rôle habitant introuvable.", flags: MessageFlags.Ephemeral });
      }
      await member.roles.add(habitantRole);
      await interaction.reply({ content: `${utilisateur} a été ajouté comme habitant de **${villageName}** !`, flags: MessageFlags.Ephemeral });
      return;
    }

    // Retrait d’un habitant
    if (interaction.isChatInputCommand() && interaction.commandName === 'dé-recensée') {
      const villageName = interaction.options.getString('village');
      const utilisateur = interaction.options.getUser('utilisateur');
      const member = await interaction.guild.members.fetch(utilisateur.id);

      const villages = config.villages.list || {};
      if (!villages[villageName]) {
        return interaction.reply({ content: "Ce village n'existe pas.", flags: MessageFlags.Ephemeral });
      }

      const maireRole = interaction.guild.roles.cache.find(r => r.name === `maire de ${villageName}`);
      if (!maireRole || !interaction.member.roles.cache.has(maireRole.id)) {
        return interaction.reply({ content: "Tu n'es pas maire de ce village.", flags: MessageFlags.Ephemeral });
      }

      const habitantRole = interaction.guild.roles.cache.find(r => r.name === `habitant de ${villageName}`);
      if (!habitantRole) {
        return interaction.reply({ content: "Rôle habitant introuvable.", flags: MessageFlags.Ephemeral });
      }
      await member.roles.remove(habitantRole);
      await interaction.reply({ content: `${utilisateur} a été retiré des habitants de **${villageName}** !`, flags: MessageFlags.Ephemeral });
      return;
    }

    // Suppression d’un village
    if (interaction.isChatInputCommand() && interaction.commandName === 'supprimer_village') {
      const villageName = interaction.options.getString('village');
      const member = interaction.member;
      const guild = interaction.guild;

      const villages = config.villages.list || {};
      if (!villages[villageName]) {
        return interaction.reply({ content: "Ce village n'existe pas.", flags: MessageFlags.Ephemeral });
      }

      const maireRole = guild.roles.cache.find(r => r.name === `maire de ${villageName}`);
      if (!maireRole || !member.roles.cache.has(maireRole.id)) {
        return interaction.reply({ content: "Tu n'es pas maire de ce village.", flags: MessageFlags.Ephemeral });
      }

      await interaction.reply({ content: `Suppression du village **${villageName}** en cours...`, flags: MessageFlags.Ephemeral });

      try {
        // Suppression des channels et de la catégorie
        const category = guild.channels.cache.find(c => c.name === villageName && c.type === 4);
        if (category) {
          for (const channel of guild.channels.cache.filter(c => c.parentId === category.id).values()) {
            await channel.delete("Suppression du village");
          }
          await category.delete("Suppression du village");
        }

        // Suppression des rôles
        if (maireRole) await maireRole.delete("Suppression du village");
        const habitantRole = guild.roles.cache.find(r => r.name === `habitant de ${villageName}`);
        if (habitantRole) await habitantRole.delete("Suppression du village");

        // Suppression dans la config locale
        delete config.villages.list[villageName];
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Upload automatique sur Google Drive
        await uploadConfigToDrive();

        // Mise à jour des embeds
        await updateVillagesEmbed(interaction.client);

        await interaction.editReply({ content: `Le village **${villageName}** a bien été supprimé et la configuration a été synchronisée sur Google Drive !` });
      } catch (e) {
        logger.error("Erreur lors de la suppression du village :", e);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de la suppression du village." });
        }
      }
      return;
    }

  } catch (error) {
    logger.error(`[ERROR] Handler interaction :`, error);
    try {
      if (
        !interaction.replied &&
        !interaction.deferred &&
        !(interaction.isButton && interaction.isButton() && interaction.customId === 'create_village')
      ) {
        await interaction.reply({ content: "Erreur interne.", flags: MessageFlags.Ephemeral });
      }
    } catch (e) {
      logger.error("Erreur lors de la réponse à une erreur d'interaction :", e);
    }
  }
}

module.exports = {
  setupVillageEmbed,
  handleVillageInteractions,
  updateVillagesEmbed
};
