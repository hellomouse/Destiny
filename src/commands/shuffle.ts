import embeds from '../embeds.js';
import { queueManager } from '../queue.js';
import commands from '../commands.js';

/**
 * @description Shuffle the playlist
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client, message, args) => {
    const serverQueue = queueManager.getOrCreate(message, message.member.voice.channel);

    if (serverQueue.shuffle) {
        serverQueue.shuffleOff();
        message.channel.send(embeds.defaultEmbed().setDescription('Shuffle mode is now disabled'));
    } else {
        serverQueue.shuffleOn();
        message.channel.send(embeds.defaultEmbed().setDescription('Shuffle mode is now enabled'));
    }
};

export const names = ['shuffle'];
export const help = {
    desc: 'Shuffle playlist',
    syntax: ''
};
export const requirements = commands.REQUIRE_USER_IN_VC;
