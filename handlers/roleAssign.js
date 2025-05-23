const config = require('../config.json');
const logger = require('../utils/logger.js');

module.exports = async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  logger.info(`Réaction détectée sur le message ${reaction.message.id} par ${user.tag} emoji: ${reaction.emoji.name}`);

  const reglementConf = config.reglement;

  if (
    reglementConf &&
    reaction.message.id === reglementConf.messageId &&
    reaction.emoji.name === '✅'
  ) {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    // Liste des rôles à attribuer
    const roleIds = reglementConf.validatedRoleIds || [];

    for (const roleId of roleIds) {
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        logger.error(`Rôle ${roleId} introuvable !`);
        continue;
      }
      if (!member.roles.cache.has(role.id)) {
        try {
          await member.roles.add(role);
          logger.success(`Rôle ${role.name} donné à ${member.user.tag}`);
        } catch (err) {
          logger.error(`Erreur lors de l'ajout du rôle ${role.name} :`, err);
        }
      }
    }
  }
};
