const { REST, Routes } = require('discord.js');

const token = "MTA5ODY0MTIxNTE3MzQ0NzgzMw.GWpepn.8ryz2lmiiyxdIBMs8tMMMbh9u_MoKMIxHMAr9k";
const clientId = "1098641215173447833";
const guildId = "1361418063895072998";

const commands = [
    {
        name: 'ping',
        description: 'Проверяет, работает ли бот',
    },
    {
        name: 'name',
        description: 'Сообщает имя бота',
    },
    {
        name: 'play',
        description: 'Воспроизводит аудио из видео на YouTube',
        options: [
            {
                name: 'url',
                type: 3, // STRING
                description: 'Ссылка на видео YouTube',
                required: true,
            },
        ],
    },
];


const rest = new REST({ version: '10'}).setToken(token);

(async () => {
    try {
        console.log('Начинается регистация слеш-команд...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Успешно зарегистрированы слеш-команды!');
    } catch (error) {
        console.error(error);
    }
})();