const fs = require('fs');
const downloadConfigFromDrive = require('../utils/driveDownloader');

// Remplace par ton ID Discord pour la sécurité
const ADMIN_ID = '219085766624542721';

module.exports = async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'export_config') return;

  // Sécurité : seul l'admin peut utiliser la commande
  if (interaction.user.id !== ADMIN_ID) {
    return interaction.reply({ content: "Tu n'es pas autorisé à utiliser cette commande.", ephemeral: true });
  }

  try {
    // Télécharge le fichier à jour depuis Drive
    await downloadConfigFromDrive('./config.json');
    // Lis le fichier téléchargé
    const fileBuffer = fs.readFileSync('./config.json');

    // Envoie en DM
    await interaction.user.send({
      content: "Voici le fichier config.json à jour :",
      files: [{ attachment: fileBuffer, name: 'config.json' }]
    });
    await interaction.reply({ content: "Fichier envoyé en DM !", ephemeral: true });
  } catch (e) {
    await interaction.reply({ content: "Erreur lors de l'envoi du fichier : " + e.message, ephemeral: true });
  }
};
