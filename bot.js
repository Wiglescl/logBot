const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Инициализация Express для health check
const app = express();
const PORT = process.env.PORT || 10000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Bot is running');
});

// Запуск веб-сервера
app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

// Инициализация Discord бота
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  reconnect: true // Автоматическое переподключение
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Событие готовности бота
client.once('ready', () => {
  console.log(`Бот ${client.user.tag} готов к работе!`);
  console.log(`Текущее время МСК: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);
});

// Пример обработки сообщений (настройте под свои нужды)
client.on('messageCreate', async (message) => {
  if (message.content === '!ping') {
    await message.reply('Pong!');
  }
});

// Логин бота
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Ошибка при логине:', error);
});
