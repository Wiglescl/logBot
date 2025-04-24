const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// ID of the text channel where logs will be sent
const LOG_CHANNEL_ID = '1364913678499184692';

// Function to get Moscow time
function getMoscowTime() {
    const moscowTime = new Date().toLocaleString('ru-RU', { 
        weekday: 'long', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
        hour12: false
    });
    return moscowTime + ' (МСК)';
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log(`Бот ${client.user.tag} готов к работе!`);
    console.log(`Текущее время МСК: ${getMoscowTime()}`);
});

// Prevent duplicate event handling
const recentEvents = new Set();
const EVENT_TIMEOUT = 2000; // 2 seconds

// Handle voice state updates
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    // Create unique event identifier
    const eventId = `${newState.member.id}-${Date.now()}`;
    if (recentEvents.has(eventId)) return;
    recentEvents.add(eventId);
    setTimeout(() => recentEvents.delete(eventId), EVENT_TIMEOUT);

    const member = newState.member;
    const currentTime = getMoscowTime();

    const embed = new EmbedBuilder();

    // User joined a voice channel
    if (!oldState.channel && newState.channel) {
        embed.setColor('#FF0000')
            .setAuthor({
                name: `${member.user.tag} зашел в голосовой канал`,
                iconURL: member.user.displayAvatarURL()
            })
            .setDescription(`Канал: **${newState.channel.name}**`)
            .addFields({
                name: 'Перешел в голосовой канал:',
                value: `🔴 **${newState.channel.name}**`,
                inline: false
            })
            .setFooter({
                text: `ID участника: ${member.id} • ${currentTime}`
            });
        await logChannel.send({ embeds: [embed] });
    }
    // User left a voice channel
    else if (oldState.channel && !newState.channel) {
        embed.setColor('#99AAb5')
            .setAuthor({
                name: `${member.user.tag} покинул голосовой канал`,
                iconURL: member.user.displayAvatarURL()
            })
            .setDescription(`🔴 **${oldState.channel.name}**`)
            .setFooter({
                text: `ID участника: ${member.id} • ${currentTime}`
            });
        await logChannel.send({ embeds: [embed] });
    }
    // User moved from one voice channel to another
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        embed.setColor('#FF0000')
            .setAuthor({
                name: `${member.user.tag} перешел в другой голосовой канал`,
                iconURL: member.user.displayAvatarURL()
            })
            .addFields(
                {
                    name: 'Предыдущий канал:',
                    value: `🔴 **${oldState.channel.name}**`,
                    inline: true
                },
                {
                    name: 'Новый канал:',
                    value: `🔴 **${newState.channel.name}**`,
                    inline: true
                }
            )
            .setFooter({
                text: `ID участника: ${member.id} • ${currentTime}`
            });
        await logChannel.send({ embeds: [embed] });
    }
});

// Simple web server
app.get('/', (req, res) => {
    res.send('Discord Bot is running! Current Moscow time: ' + getMoscowTime());
});

// Start the web server
app.listen(port, () => {
    console.log(`Web server is running on port ${port}`);
});

// Log in to Discord with your client's token
client.login('MTA5ODY0MTIxNTE3MzQ0NzgzMw.GoXfm-.pS0Gnr-RzrN4sbaGnofDiAJbh07e0JPpQ82VM8');
