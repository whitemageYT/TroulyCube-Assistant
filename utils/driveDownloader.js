const fs = require('fs');
const { MessageFlags } = require('discord.js');
const downloadConfigFromDrive = require('../utils/driveDownloader');

const ADMIN_ID = '219085766624542721';

module.exports = async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'export_config') return;

  if (interaction.user.id !== ADMIN_ID) {
    // Répond immédiatement et quitte
    return interaction.reply({ content: "Tu n'es pas autorisé à utiliser cette commande.", flags: MessageFlags.Ephemeral });
  }

  // Défère la réponse le plus tôt possible
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const path = './config.json';
    await downloadConfigFromDrive(path);

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
    // Toujours editReply après deferReply
    await interaction.editReply({ content: "Erreur lors de l'envoi du fichier : " + e.message });
    console.error(e);
  }
};
