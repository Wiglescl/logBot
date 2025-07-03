require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder, ChannelType } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 8080;

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildVoiceStates
    ]
});

const LOG_CHANNEL_ID = '1364912337965813850';

function getMoscowTime() {
    const daysRu = {
        'Sunday': 'Воскресенье',
        'Monday': 'Понедельник',
        'Tuesday': 'Вторник',
        'Wednesday': 'Среда',
        'Thursday': 'Четверг',
        'Friday': 'Пятница',
        'Saturday': 'Суббота'
    };

    const date = new Date();
    const moscowDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    
    const dayEn = moscowDate.toLocaleString('en-US', { weekday: 'long' });
    const dayRu = daysRu[dayEn];
    
    const hours = moscowDate.getHours().toString().padStart(2, '0');
    const minutes = moscowDate.getMinutes().toString().padStart(2, '0');
    
    return `${dayRu}, ${hours}:${minutes}`;
}

const recentEvents = new Map();
const EVENT_TIMEOUT = 10000;

let isAlive = true;
let lastPingTime = Date.now();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000;

async function performSelfPing() {
    const now = Date.now();
    if (now - lastPingTime > 300000) {
        console.log('Обнаружено отсутствие активности, выполняю само-пинг...');
        const serverUrl = process.env.SERVER_URL || `http://127.0.0.1:${port}`;
        try {
            const response = await fetch(`${serverUrl}/heartbeat`);
            if (response.ok) {
                console.log('Само-пинг успешно выполнен');
                lastPingTime = now;
            } else {
                throw new Error('Не удалось выполнить само-пинг');
            }
        } catch (err) {
            console.error('Ошибка само-пинга:', err);
            restartWebServer();
        }
    }
}

function restartWebServer() {
    console.log('Попытка перезапуска веб-сервера...');
    try {
        if (app.server) {
            app.server.close(() => {
                console.log('Старый веб-сервер остановлен');
                startWebServer();
            });
        } else {
            startWebServer();
        }
    } catch (error) {
        console.error('Ошибка при перезапуске веб-сервера:', error);
    }
}

function startWebServer() {
    try {
        app.get('/', (req, res) => {
            lastPingTime = Date.now();
            res.send('Discord Бот работает! Текущее время МСК: ' + getMoscowTime());
        });

        app.get('/heartbeat', (req, res) => {
            lastPingTime = Date.now();
            isAlive = true;
            res.send('OK');
        });

        app.server = app.listen(port, () => {
            console.log(`Веб-сервер запущен на порту ${port}`);
            isAlive = true;
            lastPingTime = Date.now();
            reconnectAttempts = 0;
        });

        app.server.on('error', (error) => {
            console.error('Ошибка веб-сервера:', error);
            isAlive = false;
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`Попытка переподключения ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
                setTimeout(restartWebServer, RECONNECT_INTERVAL);
            } else {
                console.error('Превышено максимальное количество попыток переподключения');
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('Критическая ошибка веб-сервера:', error);
        isAlive = false;
        process.exit(1);
    }
}

setInterval(performSelfPing, 60000);

client.on('error', error => {
    console.error('Discord client error:', error);
    if (!client.ws?.connection) {
        console.log('Попытка переподключения к Discord...');
        client.destroy();
        setTimeout(() => {
            client.login(process.env.DISCORD_TOKEN)
                .catch(err => console.error('Ошибка при переподключении к Discord:', err));
        }, 5000);
    }
});

client.on('disconnect', () => {
    console.log('Bot disconnected! Attempting to reconnect...');
    setTimeout(() => {
        client.login(process.env.DISCORD_TOKEN)
            .catch(err => console.error('Ошибка при переподключении к Discord:', err));
    }, 5000);
});

client.once('ready', () => {
    console.log(`Бот ${client.user.tag} готов к работе!`);
    console.log(`Текущее время МСК: ${getMoscowTime()}`);
    console.log('Доступные каналы:');
    client.channels.cache.forEach(channel => {
        console.log(`ID: ${channel.id}, Name: ${channel.name}, Type: ${channel.type}`);
    });
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    let logChannel;
    try {
        logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            console.error(`Канал ${LOG_CHANNEL_ID} не найден или не является текстовым`);
            return;
        }
    } catch (error) {
        console.error(`Ошибка при загрузке канала ${LOG_CHANNEL_ID}:`, error);
        return;
    }

    const member = newState.member;
    if (!member) return;

    const eventTimestamp = Date.now();
    const eventId = `${member.id}-${oldState.channelID || 'none'}-${newState.channelID || 'none'}-${eventTimestamp}`;

    const lastEventTime = recentEvents.get(eventId);
    if (lastEventTime) {
        console.log(`Duplicate event detected for ${eventId}, skipping...`);
        return;
    }

    recentEvents.set(eventId, eventTimestamp);
    setTimeout(() => recentEvents.delete(eventId), EVENT_TIMEOUT);

    const currentTime = getMoscowTime();
    const username = member.user.username;

    try {
        if (!oldState.channel && newState.channel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setAuthor({
                    name: `${username} зашел в голосовой канал`,
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
        } else if (oldState.channel && !newState.channel) {
            const embed = new EmbedBuilder()
                .setColor(0x99AAb5)
                .setAuthor({
                    name: `${username} покинул голосовой канал`,
                    iconURL: member.user.displayAvatarURL()
                })
                .setDescription(`🔴 **${oldState.channel.name}**`)
                .setFooter({
                    text: `ID участника: ${member.id} • ${currentTime}`
                });
            await logChannel.send({ embeds: [embed] });
        } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setAuthor({
                    name: `${username} перешел в другой голосовой канал`,
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
        console.error(`Ошибка при отправке сообщения в канал ${LOG_CHANNEL_ID}:`, error);
    }
});

client.login(process.env.DISCORD_TOKEN);
