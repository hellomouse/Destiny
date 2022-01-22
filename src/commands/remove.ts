import { defaultEmbed, errorEmbed } from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { Client, Message } from 'discord.js';

/**
 * @description Remove a song from the queue at the specified index, or the current song if no index is specified
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;

    let index = +args[0] + 1;

    let songReference = serverQueue.removeSong(index);

    if (!songReference)
        return message.reply({ embeds: [errorEmbed().setDescription('No song at position')] });
    return message.reply({ embeds: [defaultEmbed().setTitle('Song removed').setDescription(`${songReference.song.title} has been removed from position ${index - 1}`)] });
};

export const names = ['remove'];
export const help = {
    desc: 'Remove a song from the queue',
    syntax: '<song position>'
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
