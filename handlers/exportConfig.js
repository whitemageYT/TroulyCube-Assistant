const fs = require('fs');
const { MessageFlags } = require('discord.js');
const downloadConfigFromDrive = require('../utils/driveDownloader');
const { google } = require('googleapis');

const ADMIN_ID = '219085766624542721';
// Met ici l'ID de ton dossier Drive
const DRIVE_FOLDER_ID = '1gFVq7OIfdL94WtcJPzXh_G69i75lhYWy';
const KEYFILEPATH = './credentials.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

module.exports = async (interaction) => {
  // Sécurité absolue : ne traite QUE les commandes slash
  if (
    !interaction.isChatInputCommand ||
    typeof interaction.isChatInputCommand !== "function" ||
    !interaction.isChatInputCommand() ||
    interaction.commandName !== 'export_config'
  ) return;

  if (interaction.user.id !== ADMIN_ID) {
    return interaction.reply({ content: "Tu n'es pas autorisé à utiliser cette commande.", flags: MessageFlags.Ephemeral });
  }

  // Défère la réponse immédiatement (avant tout code lent)
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const path = './config.json';

    // --- 1. Vérifier la date de modif du fichier sur Drive ---
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });
    const drive = google.drive({ version: 'v3', auth });

    // Cherche le fichier sur Drive
    const list = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and name='config.json' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
    });

    if (!list.data.files.length) {
      throw new Error("config.json introuvable sur Drive.");
    }

    const fileId = list.data.files[0].id;
    const modifiedTime = list.data.files[0].modifiedTime;
    console.log(`[ExportConfig] Fichier sur Drive, dernière modification : ${modifiedTime}`);

    // --- 2. Télécharger le fichier depuis Drive ---
    await downloadConfigFromDrive(path);

    if (!fs.existsSync(path)) {
      throw new Error("Le fichier config.json n'a pas été trouvé après le téléchargement.");
    }

    const fileBuffer = fs.readFileSync(path);

    // --- 3. Envoyer le fichier en DM ---
    await interaction.user.send({
      content: `Voici le fichier config.json à jour (modifié sur Drive le : ${modifiedTime}) :`,
      files: [{ attachment: fileBuffer, name: 'config.json' }]
    });

    await interaction.editReply({ content: "Fichier envoyé en DM !" });
  } catch (e) {
    await interaction.editReply({ content: "Erreur lors de l'envoi du fichier : " + e.message });
    console.error(e);
  }
};
