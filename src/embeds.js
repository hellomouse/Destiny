const { MessageEmbed } = require('discord.js');
const config = require('../config.js');

// Default embed
const defaultEmbed = () => new MessageEmbed()
    .setColor();
    // .setTimestamp();

// Error embeds
const errorEmbed = () => defaultEmbed().setColor(0xFF0000);

module.exports = {
    defaultEmbed,
    errorEmbed,

    notInVoiceChannelEmbed: () => errorEmbed().setTitle('You must be in a voice channel to do this'),
    songQueueEmpty: () => defaultEmbed().setDescription('The queue is empty'),
    queueNotPlaying: () => defaultEmbed().setDescription('Nothing is playing right now'),

    helpEmbed: cmd => {
        let embed = defaultEmbed()
            .setDescription((cmd.help && cmd.help.desc) ? cmd.help.desc : 'No description provided')
            .setFooter(`Type ${config.prefix}list to list commands, or ${config.prefix}help <command> for more info on a given command`)
            .setTitle(config.prefix + cmd.names[0]);

        if (cmd.help && cmd.help.syntax)
            embed = embed.addField('Syntax', `\`${config.prefix}${cmd.names[0]} ${cmd.help.syntax}\``, true);
        embed = embed.addField('Aliases', cmd.names.join(', '), true);

        return embed;
    },

    /**
     * An embed for a song ("Queued" / "Now playing")
     * @param {object} song Song obj
     * @param {string} title Title
     * @param {boolean} showDuration show duration
     * @return {MessageEmbed}
     */
    songEmbed: (song, title, showDuration = true) => {
        let embed = defaultEmbed()
            .setTitle(showDuration ?
                `${title} (${song.formattedDuration})` :
                title)
            .setDescription(`[${song.title}](${song.url}) [${song.requestedBy.toString()}]`)
            .setURL(song.url);

        if (song.thumbnail)
            embed.setThumbnail(song.thumbnail);
        return embed;
    },

    /**
     * Get an embed for a playlist
     * @param {string} url URL to playlist
     * @param {string} title Title of playlist
     * @param {number} itemCount Approximate item count
     * @param {string} thumbnail URL to thumbnail
     * @return {MessageEmbed}
     */
    playlistEmbed: (url, title, itemCount, thumbnail) => {
        let embed = defaultEmbed()
            .setTitle(title)
            .setDescription(`Loading playlist of ~${itemCount} songs`)
            .setURL(url);
        if (thumbnail)
            embed.setThumbnail(thumbnail);
        return embed;
    }
};
