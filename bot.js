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
    return moscowTime;
}

// Error handling and automatic reconnection
client.on('error', error => {
    console.error('Discord client error:', error);
    client.destroy();
    client.login('MTA5ODY0MTIxNTE3MzQ0NzgzMw.GoXfm-.pS0Gnr-RzrN4sbaGnofDiAJbh07e0JPpQ82VM8');
});

client.on('disconnect', () => {
    console.log('Bot disconnected! Attempting to reconnect...');
    client.login('MTA5ODY0MTIxNTE3MzQ0NzgzMw.GoXfm-.pS0Gnr-RzrN4sbaGnofDiAJbh07e0JPpQ82VM8');
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log(`Бот ${client.user.tag} готов к работе!`);
    console.log(`Текущее время МСК: ${getMoscowTime()}`);
});

// Prevent duplicate event handling
const recentEvents = new Map();
const EVENT_TIMEOUT = 5000; // 5 seconds

// Handle voice state updates
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const member = newState.member;
    if (!member) return; // Дополнительная проверка на наличие участника

    // Создаем уникальный идентификатор события с учетом времени
    const eventId = `${member.id}-${oldState.channelId || 'none'}-${newState.channelId || 'none'}`;
    const now = Date.now();

    // Проверяем, не является ли событие дубликатом
    const lastEventTime = recentEvents.get(eventId);
    if (lastEventTime && (now - lastEventTime) < EVENT_TIMEOUT) {
        return; // Пропускаем дубликат
    }

    // Обновляем время последнего события
    recentEvents.set(eventId, now);

    // Очищаем старые события
    setTimeout(() => recentEvents.delete(eventId), EVENT_TIMEOUT);

    const currentTime = getMoscowTime();
    const embed = new EmbedBuilder();

    try {
        // Пользователь зашел в голосовой канал
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
        // Пользователь покинул голосовой канал
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
        // Пользователь перешел из одного канала в другой
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
    } catch (error) {
        console.error('Error in voice state update:', error);
    }
});

// Keep the web server alive
let isAlive = true;
setInterval(() => {
    if (!isAlive) {
        console.log('Web server died, restarting...');
        startWebServer();
    }
}, 60000);

function startWebServer() {
    try {
        app.get('/', (req, res) => {
            res.send('Discord Bot is running! Current Moscow time: ' + getMoscowTime());
        });

        app.listen(port, () => {
            console.log(`Web server is running on port ${port}`);
            isAlive = true;
        });
    } catch (error) {
        console.error('Web server error:', error);
        isAlive = false;
    }
}

startWebServer();

client.login('MTA5ODY0MTIxNTE3MzQ0NzgzMw.GoXfm-.pS0Gnr-RzrN4sbaGnofDiAJbh07e0JPpQ82VM8');
