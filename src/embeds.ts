import { Client, Message, MessageEmbed } from 'discord.js';
import config from '../config.js';
import Song from './song.js';
import { Command } from './types';

// Default embed
const defaultEmbed = () => new MessageEmbed();
// .setColor();
// .setTimestamp();

// Error embeds
const errorEmbed = () => defaultEmbed().setColor(0xFF0000);

export default {
    defaultEmbed,
    errorEmbed,

    notInVoiceChannelEmbed: () => errorEmbed().setTitle('You must be in a voice channel to do this'),
    songQueueEmpty: () => defaultEmbed().setDescription('The queue is empty'),
    queueNotPlaying: () => defaultEmbed().setDescription('Nothing is playing right now'),

    helpEmbed: (cmd: Command) => {
        let embed = defaultEmbed()
            .setDescription((cmd.help && cmd.help.desc) ? cmd.help.desc : 'No description provided')
            .setFooter(`Type ${config.prefix}list to list commands, or ${config.prefix}help <command> for more info on a given command`)
            .setTitle(config.prefix + cmd.names[0]);

        if (cmd.help && cmd.help.syntax)
            embed = embed.addField('Syntax', `\`${config.prefix}${cmd.names[0]} ${cmd.help.syntax}\``, true);
        if (Array.isArray(cmd.names))
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
    songEmbed: (song: Song, title: string, showDuration = true) => {
        let embed = defaultEmbed()
            .setTitle(showDuration
                ? `${title} (${song.formattedDuration})`
                : title)
            .setDescription(`[${song.title}](${song.url}) [${song.requestedBy.toString()}]`)
            .setURL(song.url);

        if (song.thumbnail)
            embed.setThumbnail(song.thumbnail);
        return embed;
    },

    /**
     * Get an embed for a playlist
     * @param {playlist} playlist
     * @param {string} title Custom title
     * @param {string} description embed description
     * @return {MessageEmbed}
     */
    playlistEmbed: (playlist: { title: string, url: string, thumbnail: { url: string } },
        title: string | undefined, description: string) => {
        let embed = defaultEmbed()
            .setTitle(playlist.title)
            .setURL(playlist.url!);
        if (title)
            embed.setTitle(title);
        if (playlist.thumbnail)
            embed.setThumbnail(playlist.thumbnail!.url!);
        if (description)
            embed.setDescription(description);
        return embed;
    }
};
