const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const KEYFILEPATH = './credentials.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const DRIVE_FOLDER_ID = '1gFVq7OIfdL94WtcJPzXh_G69i75lhYWy'; // Mets l'ID de ton dossier Drive ici

async function uploadConfigToDrive() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: 'config.json',
    parents: [DRIVE_FOLDER_ID],
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

  let fileId;
  if (list.data.files.length > 0) {
    // Mise à jour du fichier existant
    fileId = list.data.files[0].id;
    await drive.files.update({
      fileId,
      media,
    });
    console.log(`[DriveUploader] Fichier mis à jour sur Drive (ID: ${fileId})`);
  } else {
    // Upload d'un nouveau fichier
    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });
    fileId = file.data.id;
    console.log(`[DriveUploader] Nouveau fichier uploadé sur Drive (ID: ${fileId})`);
  }

  // Logue la date de modification pour vérification
  const fileMeta = await drive.files.get({ fileId, fields: 'modifiedTime' });
  console.log(`[DriveUploader] Dernière modification sur Drive: ${fileMeta.data.modifiedTime}`);

  return fileId;
}

module.exports = uploadConfigToDrive;
