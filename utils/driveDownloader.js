// utils/driveDownloader.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const KEYFILEPATH = './credentials.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const DRIVE_FOLDER_ID = 'TON_ID_DOSSIER_DRIVE';

async function downloadConfigFromDrive(localPath = './config.json') {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });
  const drive = google.drive({ version: 'v3', auth });

  // Cherche le fichier config.json dans le dossier
  const list = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and name='config.json' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (!list.data.files.length) throw new Error('config.json non trouvé sur Drive');
  const fileId = list.data.files[0].id;

  // Télécharge le fichier
  const dest = fs.createWriteStream(localPath);
  await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  ).then(res => {
    return new Promise((resolve, reject) => {
      res.data
        .on('end', resolve)
        .on('error', reject)
        .pipe(dest);
    });
  });
}

module.exports = downloadConfigFromDrive;
