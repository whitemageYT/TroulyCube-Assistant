const { updateVillagesEmbed } = require('./villages');
module.exports = (client) => {
  setInterval(() => updateVillagesEmbed(client), 120000); // toutes les 5 min
  client.on('roleUpdate', () => updateVillagesEmbed(client));
  client.on('guildMemberUpdate', () => updateVillagesEmbed(client));
};
