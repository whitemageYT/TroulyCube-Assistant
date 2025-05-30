const fs = require('fs');
const { MessageFlags } = require('discord.js');
const downloadConfigFromDrive = require('../utils/driveDownloader');

// Remplace par ton ID Discord pour la sécurité
const ADMIN_ID = '219085766624542721';

module.exports = async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'export_config') return;

  // Sécurité : seul l'admin peut utiliser la commande
  if (interaction.user.id !== ADMIN_ID) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: "Tu n'es pas autorisé à utiliser cette commande.", flags: MessageFlags.Ephemeral });
    }
    return;
  }

  try {
    // On prévient l'utilisateur qu'on traite la commande
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Télécharge le fichier à jour depuis Drive
    await downloadConfigFromDrive('./config.json');
    // Lis le fichier téléchargé
    const fileBuffer = fs.readFileSync('./config.json');

    // Envoie en DM
    await interaction.user.send({
      content: "Voici le fichier config.json à jour :",
      files: [{ attachment: fileBuffer, name: 'config.json' }]
    });

    await interaction.editReply({ content: "Fichier envoyé en DM !" });
  } catch (e) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Erreur lors de l'envoi du fichier : " + e.message, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.editReply({ content: "Erreur lors de l'envoi du fichier : " + e.message });
    }
  }
};
