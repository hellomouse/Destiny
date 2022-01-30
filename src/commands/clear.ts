import { defaultEmbed } from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS, { CommandHelpProvider } from '../commands.js';
import type { Client } from '../types';
import type { Message } from 'discord.js';

/**
 * @description Clears the queue
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;

    serverQueue.clear(false);

    return message.reply({ embeds: [defaultEmbed().setTitle('Cleared').setDescription('The queue has been cleared')] });
};

export const names = ['clear'];
// export const help = {
//     desc: 'Clears the queue',
//     syntax: ''
// };
export let help = new CommandHelpProvider('clear')
    .setDescription('Clears the queue');
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
