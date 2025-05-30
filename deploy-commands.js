const { REST, Routes } = require('discord.js');
const config = require('./config.json');

// Utilisation des variables d'environnement Render
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
    throw new Error("DISCORD_TOKEN, CLIENT_ID ou GUILD_ID non définis dans les variables d'environnement Render !");
}

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
      name: 'village',
      type: 3, // STRING
      description: 'Le nom du village',
      required: true
    },
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
      name: 'village',
      type: 3, // STRING
      description: 'Le nom du village',
      required: true
    },
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
  name: 'supprimer_village',
  description: 'Supprimer un de tes villages',
  options: [
    {
      name: 'village',
      type: 3, // STRING
      description: 'Le nom du village à supprimer',
      required: true
    }
  ]
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

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
