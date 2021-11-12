import utils from '../utils';
import embeds from '../embeds.js';
import { queueManager } from '../queue.js';
import commands from '../commands.js';
import { Client, Message } from 'discord.js';

/**
 * @description Skip the current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild.id);
    utils.log(`Skipped music : ${serverQueue.songs[0].title}`);
    serverQueue.skip();

    return message.channel.send(embeds.songEmbed(serverQueue.currentSong(), 'Skipping', false));
};

export const names = ['skip', 's'];
export const help = {
    desc: 'Skip the current song',
    syntax: ''
};
export const requirements = commands.REQUIRE_QUEUE_NON_EMPTY | commands.REQUIRE_USER_IN_VC;
