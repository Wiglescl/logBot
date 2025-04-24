// Map to store recent events for deduplication
const recentEvents = new Map();
const EVENT_TIMEOUT = 10000; // Increase to 10 seconds to catch more duplicates

// Handle voice state updates
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const member = newState.member;
    if (!member) return;

    // Create a more specific event identifier with a timestamp
    const eventTimestamp = Date.now();
    const eventId = `${member.id}-${oldState.channelId || 'none'}-${newState.channelId || 'none'}-${eventTimestamp}`;

    // Check if this event is a duplicate
    const lastEventTime = recentEvents.get(eventId);
    if (lastEventTime) {
        console.log(`Duplicate event detected for ${eventId}, skipping...`);
        return; // Skip duplicates
    }

    // Store the event with a timestamp
    recentEvents.set(eventId, eventTimestamp);

    // Clean up old events after the timeout
    setTimeout(() => recentEvents.delete(eventId), EVENT_TIMEOUT);

    const currentTime = getMoscowTime();
    const embed = new EmbedBuilder();

    try {
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
        // User switched voice channels
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
