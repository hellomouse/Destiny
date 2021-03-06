import { defaultEmbed } from '../embeds.js';
import { log } from '../utils.js';
import { queueManager } from '../queue.js';
import type { Client } from '../types';
import type { Message } from 'discord.js';
import COMMAMD_REQUIREMENTS, { CommandHelpProvider } from '../commands.js';

/**
 * @description Pause current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;
    serverQueue.pause();

    log(`Paused music playback`);
    return message.channel.send({ embeds: [defaultEmbed().setDescription(`:pause_button: Playback paused`)] });
};

export const names = ['pause', 'unresume'];
// export const help = {
//     desc: 'Pause playback',
//     syntax: ''
// };
export let help = new CommandHelpProvider('pause')
    .setDescription('Pause playback');
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
