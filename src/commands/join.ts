import { log } from '../utils.js';
import embeds from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS from '../commands';
import { Client, Message } from 'discord.js';

/**
 * @description Make the bot join the current voice channel the user is in
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    log(message);
    if (!message || !message.member) return;

    const voiceChannel = message.member.voice.channel;
    log(`voiceChannel: ${voiceChannel}`);
    if (!voiceChannel) return; // You need to be in a voice channel

    log(`Joining ${voiceChannel.name}`);
    const queue = queueManager.getOrCreate(message, voiceChannel);
    queue.join();

    return message.channel.send({ embeds: [embeds.defaultEmbed()
        .setDescription(`Joining ${voiceChannel.toString()}`)] });
};

export const names = ['summon', 'join', 'j'];
export const help = {
    desc: 'Summon the bot to the voice channel the user is in',
    syntax: ''
};

export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
