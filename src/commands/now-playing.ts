import utils from '../utils';
import { queueManager } from '../queue';
import embeds from '../embeds';
import commands from '../commands';
import { Client, Message } from 'discord.js';

/**
 * @description Get current playing song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;
    const song = serverQueue.currentSong();

    if (!song) return message.channel.send(embeds.queueNotPlaying());

    const time = utils.formatDuration(serverQueue.connection!.dispatcher.streamTime / 1000);
    const embed = song.getEmbed(
        embeds.songEmbed(song, 'Now Playing', false)
            .addField('Duration', `${time} / ${song.formattedDuration}`, true)
            .addField('Action', serverQueue.isPaused() ? 'Paused' : 'Playing', true)
    );

    return message.channel.send(embed);
};

export const names = ['nowplaying', 'now_playing', 'np', 'playing', 'song', 'current'];
export const help = {
    desc: 'Get the currently playing song',
    syntax: ''
};
export const requirements = commands.REQUIRE_QUEUE_NON_EMPTY | commands.REQUIRE_IS_PLAYING;
