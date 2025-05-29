const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Chemin vers ton fichier d'identifiants
const KEYFILEPATH = './credentials.json';
// Les permissions nécessaires
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// L'ID du dossier Drive où tu veux stocker le fichier (optionnel)
const DRIVE_FOLDER_ID = 'TON_ID_DOSSIER_DRIVE'; // Mets l'ID de ton dossier Drive ici

async function uploadConfigToDrive() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: 'config.json',
    parents: [DRIVE_FOLDER_ID], // retire cette ligne si tu veux mettre à la racine de Drive
  };
  const media = {
    mimeType: 'application/json',
    body: fs.createReadStream(path.resolve('./config.json')),
  };

  // Cherche si le fichier existe déjà dans le dossier
  const list = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and name='config.json' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (list.data.files.length > 0) {
    // Mise à jour du fichier existant
    const fileId = list.data.files[0].id;
    await drive.files.update({
      fileId,
      media,
    });
    return fileId;
  } else {
    // Upload d'un nouveau fichier
    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });
    return file.data.id;
  }
}

module.exports = uploadConfigToDrive;
