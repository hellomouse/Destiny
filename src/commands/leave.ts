import { log } from '../utils.js';
import { defaultEmbed } from '../embeds.js';
import { queueManager } from '../queue.js';
import { Client, Message } from 'discord.js';

/**
 * @description Stops the music and make the bot leave the channel
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>): Promise<Message | void> => {
    const serverQueue = queueManager.get(message.guild!.id);
    if (!serverQueue) // Not in VC, ignore
        return;

    log('Stopped playing music');
    serverQueue.leave();
    queueManager.remove(message.guild!.id);

    return message.channel.send({ embeds: [defaultEmbed().setDescription(':wave:')] });
};

export const names = ['dc', 'disconnect', 'leave', 'die', 'fuckoff'];
export const help = {
    desc: 'Disconnect the bot',
    syntax: ''
};
