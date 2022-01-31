import type { AudioPlayerError } from '@discordjs/voice';
import { MessageEmbed } from 'discord.js';
import type ytpl from 'ytpl';
import config from '../config.cjs';
import type { Song, SongReference } from './song.js';
import type { Command } from './types';

// Default embed
export const defaultEmbed = () => new MessageEmbed();
// .setColor();
// .setTimestamp();

// Error embeds
export const errorEmbed = () => defaultEmbed().setColor(0xFF0000);
export const warningEmbed = () => defaultEmbed().setColor(0xF57C00);

export const notInVoiceChannelEmbed = () => errorEmbed().setTitle('You must be in a voice channel to do this');
export const songQueueEmpty = () => defaultEmbed().setDescription('The queue is empty');
export const queueNotPlaying = () => defaultEmbed().setDescription('Nothing is playing right now');

export const helpEmbed = (cmd: Command) => {
    let embed = defaultEmbed()
        .setDescription((cmd.help && cmd.help.text) ? cmd.help.getDescription() : 'No description provided')
        .setFooter({ text: `Type ${config.prefix}list to list commands, or ${config.prefix}help <command> for more info on a given command` })
        .setTitle(config.prefix + cmd.names[0]);

    if (cmd.help)
        embed = embed.addField('Syntax', `\`${config.prefix}${cmd.names[0]} ${cmd.help.getSyntax()}\``, true);
    if (Array.isArray(cmd.names))
        embed = embed.addField('Aliases', cmd.names.join(', '), true);

    return embed;
};

/**
* An embed for a song ("Queued" / "Now playing")
* @param {object} songReference SongReference obj
* @param {string} title Title
* @param {boolean} showDuration show duration
* @return {MessageEmbed}
*/
export const songEmbed = (songReference: SongReference, title: string, showDuration = true) => {
    const song = songReference.song;
    let embed = defaultEmbed()
        .setTitle(showDuration
            ? `${title} (${song.formattedDuration})`
            : title)
        .setDescription(`[${song.title}](${song.url}) [${songReference.requestedBy.toString()}]`)
        .setURL(song.url);

    if (song.thumbnail)
        embed.setThumbnail(song.thumbnail);
    return embed;
};

export const songErrorEmbed = (song: Song, errorCount: number, error: AudioPlayerError) => {
    let embed = errorEmbed()
        .setTitle('Error: Trying to replay song')
        .setDescription(`Retry count: ${errorCount}`);
    return embed;
};

/**
 * Get an embed for a playlist
 * @param {playlist} playlist
 * @param {string} title Custom title
 * @param {string} description embed description
 * @return {MessageEmbed}
 */
export const playlistEmbed = (playlist: ytpl.Result, title: string | undefined, description: string) => {
    let embed = defaultEmbed()
        .setTitle(playlist.title)
        .setURL(playlist.url!);
    if (title)
        embed.setTitle(title);
    if (playlist.bestThumbnail)
        embed.setThumbnail(playlist.bestThumbnail.url!);
    if (description)
        embed.setDescription(description);
    return embed;
};
