/**
 * Minecraft Server Status Bot - Command Deployment
 */

const { REST, Routes } = require('discord.js');
const config = require('./config.json');

// Remplace ceci par l'ID de ton serveur Discord
const GUILD_ID = 'ID_DU_SERVEUR';

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
                choices: config.minecraft.servers.map(server => ({
                    name: server.name,
                    value: server.name
                }))
            }
        ],
    },
    {
        name: 'ressencer',
        description: 'Ajouter un membre comme habitant de ton village',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'Le membre à ajouter comme habitant',
                required: true
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(config.bot.token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Déploiement instantané sur le serveur spécifié
        await rest.put(
            Routes.applicationGuildCommands(config.bot.clientId, GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
