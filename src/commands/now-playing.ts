import { formatDuration } from '../utils.js';
import { queueManager } from '../queue.js';
import { queueNotPlaying, songEmbed } from '../embeds.js';
import COMMAMD_REQUIREMENTS, { CommandHelpProvider } from '../commands.js';
import type { Client, Message } from 'discord.js';

/**
 * @description Get current playing song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;
    const songReference = serverQueue.currentSong();

    if (!songReference) return message.channel.send({ embeds: [queueNotPlaying()] });

    const time = formatDuration(serverQueue.audioResource!.playbackDuration / 1000);
    const embed = songReference.song.getEmbed(
        songEmbed(songReference, 'Now Playing', false)
            .addField('Duration', `${time} / ${songReference.song.formattedDuration}`, true)
            .addField('Action', serverQueue.isPaused() ? 'Paused' : 'Playing', true)
    );

    return message.channel.send({ embeds: [embed] });
};

export const names = ['nowplaying', 'now_playing', 'np', 'playing', 'song', 'current'];
// export const help = {
//     desc: 'Get the currently playing song',
//     syntax: ''
// };
export let help = new CommandHelpProvider('nowplaying')
    .setDescription('Display the currently playing song');
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_IS_PLAYING;
