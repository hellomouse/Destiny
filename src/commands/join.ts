import utils from '../utils';
import embeds from '../embeds.js';
import { queueManager } from '../queue.js';
import REQUIRE_USER_IN_VC from '../commands';
import { Client, Message } from 'discord.js';

/**
 * @description Make the bot join the current voice channel the user is in
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    if (!message || !message.member) return;

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return; // You need to be in a voice channel

    const serverQueue = queueManager.getOrCreate(message, voiceChannel);
    const connection = await voiceChannel.join();

    serverQueue.connection = connection;
    utils.log(`Joined the channel : ${voiceChannel.name}`);

    return message.channel.send(embeds.defaultEmbed()
        .setDescription(`Joining ${voiceChannel.toString()}`));
};

export const names = ['summon', 'join', 'j'];
export const help = {
    desc: 'Summon the bot to the voice channel the user is in',
    syntax: ''
};
export const requirements = REQUIRE_USER_IN_VC;
