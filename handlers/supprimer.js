// handlers/supprimer.js

module.exports = function handleSupprimer(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'clear')
      return;

    // Permission check
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({
        content: "Tu n'as pas la permission de supprimer des messages.",
        ephemeral: true
      });
    }

    const nombre = interaction.options.getInteger('nombre');
    if (nombre < 1 || nombre > 100) {
      return interaction.reply({
        content: "Le nombre doit être entre 1 et 100.",
        ephemeral: true
      });
    }

    try {
      // Supprime les messages (ne supprime pas ceux de plus de 14 jours)
      await interaction.channel.bulkDelete(nombre, true);
      await interaction.reply({
        content: `🗑️ ${nombre} messages supprimés !`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: "Erreur lors de la suppression des messages. Les messages de plus de 14 jours ne peuvent pas être supprimés.",
        ephemeral: true
      });
    }
  });
};
