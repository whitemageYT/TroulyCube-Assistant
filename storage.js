// storage.js
const fs = require('fs');
const path = './storage.json';

function readStorage() {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify({}, null, 2));
  }
  const data = fs.readFileSync(path);
  return JSON.parse(data);
}

function writeStorage(data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

module.exports = { readStorage, writeStorage };
