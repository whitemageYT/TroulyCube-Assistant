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

  // Envoie ou modifie le message
  try {
    if (config.villages.embedMessageId) {
      const msg = await channel.messages.fetch(config.villages.embedMessageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
        return;
      }
    }
    const message = await channel.send({ embeds: [embed] });
    config.villages.embedMessageId = message.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    logger.error("Erreur lors de la mise à jour de l'embed villages :", e);
  }
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

// Gestion des interactions
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

        // Ajout d’un habitant
if (interaction.isChatInputCommand() && interaction.commandName === 'recensée') {
  const utilisateur = interaction.options.getUser('utilisateur');
  // Ici, tu dois retrouver le village du maire, puis donner le rôle "habitant de <village>" à l'utilisateur
  // Exemple simplifié :
  const member = await interaction.guild.members.fetch(utilisateur.id);
  // Trouve le village dont interaction.member est maire
  const villages = config.villages.list || {};
  const maireVillage = Object.entries(villages).find(([name, data]) => {
    const maireRole = interaction.guild.roles.cache.find(r => r.name === `maire de ${name}`);
    return maireRole && interaction.member.roles.cache.has(maireRole.id);
  });
  if (!maireVillage) {
    return interaction.reply({ content: "Tu n'es maire d'aucun village.", ephemeral: true });
  }
  const [villageName] = maireVillage;
  const habitantRole = interaction.guild.roles.cache.find(r => r.name === `habitant de ${villageName}`);
  if (!habitantRole) {
    return interaction.reply({ content: "Rôle habitant introuvable.", ephemeral: true });
  }
  await member.roles.add(habitantRole);
  await interaction.reply({ content: `${utilisateur} a été ajouté comme habitant de **${villageName}** !`, ephemeral: true });
  return;
}

// Retrait d’un habitant
if (interaction.isChatInputCommand() && interaction.commandName === 'dé-recensée') {
  const utilisateur = interaction.options.getUser('utilisateur');
  const member = await interaction.guild.members.fetch(utilisateur.id);
  // Trouve le village dont interaction.member est maire
  const villages = config.villages.list || {};
  const maireVillage = Object.entries(villages).find(([name, data]) => {
    const maireRole = interaction.guild.roles.cache.find(r => r.name === `maire de ${name}`);
    return maireRole && interaction.member.roles.cache.has(maireRole.id);
  });
  if (!maireVillage) {
    return interaction.reply({ content: "Tu n'es maire d'aucun village.", ephemeral: true });
  }
  const [villageName] = maireVillage;
  const habitantRole = interaction.guild.roles.cache.find(r => r.name === `habitant de ${villageName}`);
  if (!habitantRole) {
    return interaction.reply({ content: "Rôle habitant introuvable.", ephemeral: true });
  }
  await member.roles.remove(habitantRole);
  await interaction.reply({ content: `${utilisateur} a été retiré des habitants de **${villageName}** !`, ephemeral: true });
  return;
}


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

        logger.success(`Village "${villageName}" créé par ${interaction.user.tag} avec couleur ${color}`);
        await interaction.reply({ content: `Ton village **${villageName}** a été créé avec succès !`, ephemeral: true });

        // Met à jour l'embed de la liste des villages
        await updateVillagesEmbed(interaction.client);

      } catch (error) {
        logger.error(`Erreur lors de la création du village "${villageName}":`, error);
        await interaction.reply({ content: "Une erreur est survenue lors de la création du village.", ephemeral: true });
      }
    }
  });
}

module.exports = {
  setupVillageEmbed,
  handleVillageInteractions,
  updateVillagesEmbed
};