const fs = require('fs');
const { MessageFlags } = require('discord.js');
const downloadConfigFromDrive = require('../utils/driveDownloader');

const ADMIN_ID = '219085766624542721';

module.exports = async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'export_config') return;

  if (interaction.user.id !== ADMIN_ID) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: "Tu n'es pas autorisé à utiliser cette commande.", flags: MessageFlags.Ephemeral });
    }
    return;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const path = './config.json';
    await downloadConfigFromDrive(path);

    // Vérification supplémentaire
    if (!fs.existsSync(path)) {
      throw new Error("Le fichier config.json n'a pas été trouvé après le téléchargement.");
    }

    const fileBuffer = fs.readFileSync(path);

    await interaction.user.send({
      content: "Voici le fichier config.json à jour :",
      files: [{ attachment: fileBuffer, name: 'config.json' }]
    });

    await interaction.editReply({ content: "Fichier envoyé en DM !" });
  } catch (e) {
    console.error(e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Erreur lors de l'envoi du fichier : " + e.message, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.editReply({ content: "Erreur lors de l'envoi du fichier : " + e.message });
    }
  }
};
