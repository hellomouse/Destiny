import { defaultEmbed } from '../embeds.js';
import { log } from '../utils.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS, { CommandHelpProvider } from '../commands.js';
import type { Client } from '../types';
import type { Message } from 'discord.js';

/**
 * @description Resume current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;

    // loop mode off, we finish queue, we change loop mode to song/queue, resume should play

    // No more songs to play if we aren't looping queue and the audio player is idle
    if ((serverQueue.isIdle() &&
            serverQueue.getIndex() === serverQueue.size() &&
            serverQueue.getLoopMode() === 0) ||
            serverQueue.isEmpty())
        return message.channel.send({ embeds: [defaultEmbed().setDescription('No more songs to play. Add some!')] });
    // check if we're at end of queue and no more songs to play
    log(`Resumed music playback`);
    serverQueue.resume();
    return message.channel.send({ embeds: [defaultEmbed().setDescription(`:play_pause: Playback resumed`)] });
};

export const names = ['resume', 'unpause'];
// export const help = {
//     desc: 'Resume playback',
//     syntax: ''
// };
export let help = new CommandHelpProvider('resume')
    .setDescription('Resumes playback');
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
