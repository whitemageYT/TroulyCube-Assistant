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

// Fonction pour mettre à jour l'embed de la liste des villages
async function updateVillagesEmbed(client) {
  const channelId = "1377173673391427594"; // Salon de la liste des villages
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  // Prépare la liste des villages
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

  // MODIFICATION : Essaye d'éditer le message existant, sinon crée-le
  let message;
  if (config.villages.embedMessageId) {
    message = await channel.messages.fetch(config.villages.embedMessageId).catch(() => null);
    if (message) {
      await message.edit({ embeds: [embed] });
      return;
    }
  }
  // Si le message n'existe pas, envoie-en un nouveau et sauvegarde son ID
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
  try {
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
      return interaction.showModal(modal);
    }

    // Modale validée → création du village
    if (interaction.isModalSubmit() && interaction.customId === 'village_modal') {
      const villageName = interaction.fields.getTextInputValue('village_name').trim().substring(0, 50);
      let color = interaction.fields.getTextInputValue('village_color').trim();
      const villageDesc = interaction.fields.getTextInputValue('village_desc').trim().substring(0, 200);

      // Validation couleur hexadécimale
      if (!/^#?([0-9A-Fa-f]{6})$/.test(color)) {
        return interaction.reply({ content: "La couleur doit être au format hexadécimal, ex: #3498db", flags: MessageFlags.Ephemeral });
      }
      if (!color.startsWith('#')) color = '#' + color;

      // Vérifie que le nom n'existe pas déjà
      if (interaction.guild.channels.cache.find(c => c.name.toLowerCase() === villageName.toLowerCase())) {
        return interaction.reply({ content: "Un village porte déjà ce nom.", flags: MessageFlags.Ephemeral });
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
          parent: category.id
        });
        await interaction.guild.channels.create({
          name: 'bla-bla',
          type: 2, // GUILD_VOICE
          parent: category.id
        });

        // Donne le rôle maire au créateur
        await interaction.member.roles.add(maireRole);

        // Enregistre le village dans la config
        if (!config.villages.list) config.villages.list = {};
        config.villages.list[villageName] = {
          color,
          desc: villageDesc,
          created: new Date().toISOString()
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        // Si tu utilises Google Drive, décommente la ligne ci-dessous
        // const uploadConfigToDrive = require('../utils/driveUploader.js');
        // uploadConfigToDrive().catch(console.error);

        logger.success(`Village "${villageName}" créé par ${interaction.user.tag} avec couleur ${color}`);
        await interaction.reply({ content: `Ton village **${villageName}** a été créé avec succès !`, flags: MessageFlags.Ephemeral });

        // Met à jour l'embed de la liste des villages (modifie le message existant si possible)
        await updateVillagesEmbed(interaction.client);

      } catch (error) {
        logger.error(`Erreur lors de la création du village "${villageName}":`, error);
        if (!interaction.replied) {
          await interaction.reply({ content: "Une erreur est survenue lors de la création du village.", flags: MessageFlags.Ephemeral });
        }
      }
      return;
    }

    // Handler pour /supprimer_village
    if (interaction.isChatInputCommand() && interaction.commandName === 'supprimer_village') {
      const member = interaction.member;
      const guild = interaction.guild;

      // Trouver le village dont l'utilisateur est maire
      const villages = config.villages.list || {};
      const maireVillage = Object.entries(villages).find(([name, data]) => {
        const maireRole = guild.roles.cache.find(r => r.name === `maire de ${name}`);
        return maireRole && member.roles.cache.has(maireRole.id);
      });

      if (!maireVillage) {
        return interaction.reply({ content: "Tu n'es maire d'aucun village, ou tu n'as pas les permissions.", flags: MessageFlags.Ephemeral });
      }

      const [villageName] = maireVillage;

      // Confirmation (optionnel)
      await interaction.reply({ content: `Suppression du village **${villageName}** en cours...`, flags: MessageFlags.Ephemeral });

      try {
        // Supprimer la catégorie et les salons
        const category = guild.channels.cache.find(c => c.name === villageName && c.type === 4); // 4 = GUILD_CATEGORY
        if (category) {
          // Supprime tous les salons enfants
          for (const channel of guild.channels.cache.filter(c => c.parentId === category.id).values()) {
            await channel.delete("Suppression du village");
          }
          await category.delete("Suppression du village");
        }

        // Supprimer les rôles
        const maireRole = guild.roles.cache.find(r => r.name === `maire de ${villageName}`);
        const habitantRole = guild.roles.cache.find(r => r.name === `habitant de ${villageName}`);
        if (maireRole) await maireRole.delete("Suppression du village");
        if (habitantRole) await habitantRole.delete("Suppression du village");

        // Supprimer du config.json
        delete config.villages.list[villageName];
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Mettre à jour l'embed
        await updateVillagesEmbed(interaction.client);

        await interaction.editReply({ content: `Le village **${villageName}** a bien été supprimé !` });
      } catch (e) {
        logger.error("Erreur lors de la suppression du village :", e);
        await interaction.editReply({ content: "Erreur lors de la suppression du village." });
      }
      return;
    }

    // Ajoute ici d'autres commandes slash si besoin

  } catch (error) {
    logger.error(`[ERROR] Handler interaction :`, error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "Erreur interne.", flags: MessageFlags.Ephemeral });
      } else {
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
