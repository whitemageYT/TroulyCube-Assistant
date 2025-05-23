const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { status } = require('minecraft-server-util');
const fs = require('fs');
const logger = require('../utils/logger.js');
const { generatePlayerChart } = require('../utils/charts.js');
const configPath = './config.json';
const historyPath = './history.json';

function loadHistory() {
  if (!fs.existsSync(historyPath)) return {};
  return JSON.parse(fs.readFileSync(historyPath));
}

function saveHistory(history) {
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

async function checkServerStatus(server) {
  try {
    const result = await status(server.ip, server.port, { timeout: 5000 });
    return {
      online: true,
      players: result.players.online,
      maxPlayers: result.players.max,
      version: result.version.name,
      ping: result.roundTripLatency,
      motd: result.motd.clean
    };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

function getEmbed(server, status, chartBuffer = null) {
  const embed = new EmbedBuilder()
    .setTitle(server.embed.title || `Statut du serveur ${server.name}`)
    .setFooter({ text: server.embed.footer?.text || '' });

  if (status.online) {
    embed
      .setColor(server.embed.colors.online || '#00ff00')
      .setDescription(
        `🟢 **En ligne**\n**Joueurs**: ${status.players}/${status.maxPlayers}\n**Version**: ${status.version}\n**Ping**: ${status.ping} ms\n**MOTD**: ${status.motd}`
      );
    if (chartBuffer) {
      embed.setImage('attachment://chart.png');
    }
  } else {
    embed
      .setColor(server.embed.colors.offline || '#ff0000')
      .setDescription(`🔴 **Hors ligne**\nErreur: ${status.error || "Impossible de joindre le serveur."}`);
  }
  embed.setTimestamp();
  return embed;
}

module.exports = async function updateServerStatus(client, server, config, saveConfig = true) {
  try {
    logger.info("Tentative de récupération du salon :", server.channelId);
    const channel = await client.channels.fetch(server.channelId);
    if (!channel) {
      logger.error(`[Status] Salon introuvable pour ${server.name} (${server.channelId})`);
      return;
    }

    const history = loadHistory();
    if (!history[server.name]) history[server.name] = [];
    const now = Date.now();
    const statusData = await checkServerStatus(server);

    logger.info("Statut du serveur :", statusData);

    if (statusData.online) {
      history[server.name].push({ timestamp: now, count: statusData.players });
      const cutoff = now - (server.display.chart.historyHours * 60 * 60 * 1000);
      history[server.name] = history[server.name].filter(e => e.timestamp >= cutoff);
      saveHistory(history);
    }

    let chartBuffer = null;
    if (
      server.display.chart.enabled &&
      statusData.online &&
      history[server.name] &&
      history[server.name].length > 1
    ) {
      chartBuffer = await generatePlayerChart(history[server.name], server.display.chart.color);
    }

    const embed = getEmbed(server, statusData, chartBuffer);
    let message;
    if (server.messageId) {
      message = await channel.messages.fetch(server.messageId).catch(() => null);
      if (message) {
        logger.info("Édition du message de statut existant...");
        if (chartBuffer) {
          await message.edit({ embeds: [embed], files: [new AttachmentBuilder(chartBuffer, { name: 'chart.png' })] });
        } else {
          await message.edit({ embeds: [embed], files: [] });
        }
      }
    }
    if (!message) {
      logger.info("Envoi d'un nouveau message de statut...");
      if (chartBuffer) {
        message = await channel.send({ embeds: [embed], files: [new AttachmentBuilder(chartBuffer, { name: 'chart.png' })] });
      } else {
        message = await channel.send({ embeds: [embed] });
      }
      server.messageId = message.id;
      if (saveConfig) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
    }
    logger.success(`[Status] Statut du serveur ${server.name} mis à jour`);
  } catch (err) {
    logger.error(`Erreur lors de la mise à jour du statut du serveur ${server.name}: ${err}`);
  }
};
