/**
 * Minecraft Server Status Bot - Command Deployment
 */

const { REST, Routes } = require('discord.js');
const config = require('./config.json');

// Mets ici l'ID de ton serveur Discord
const GUILD_ID = 'GUILD_ID';

const commands = [
    {
        name: 'status',
        description: 'Get the current status of a Minecraft server',
        options: [
            {
                name: 'server',
                description: 'The name of the server to check',
                type: 3, // STRING
                required: true,
                choices: config.servers.map(server => ({
                    name: server.name,
                    value: server.name
                }))
            }
        ],
    },
    {
        name: 'recensée',
        description: 'Ajouter un membre comme habitant de ton village',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'Le membre à ajouter comme habitant',
                required: true
            }
        ]
    },
    {
        name: 'dé-recensée',
        description: 'Retirer un membre de ton village',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'Le membre à retirer comme habitant',
                required: true
            }
        ]
    },
    {
    name: 'export_config',
    description: 'Envoie le fichier config.json à jour en DM (admin seulement)'
    },
    {
        name: 'clear',
        description: 'Supprimer un nombre de messages dans ce salon',
        options: [
            {
                name: 'nombre',
                type: 4, // INTEGER
                description: 'Nombre de messages à supprimer (max 100)',
                required: true,
                min_value: 1,
                max_value: 100
            }
    ]
}

];

const rest = new REST({ version: '10' }).setToken(config.bot.token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Déploiement instantané sur ton serveur
        await rest.put(
            Routes.applicationGuildCommands(config.bot.clientId, GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
