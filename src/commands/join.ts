import { log } from '../utils.js';
import { defaultEmbed, warningEmbed } from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { Client, Message, Permissions } from 'discord.js';

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

    const voiceChannel = message.member.voice.channel!;
    log(`voiceChannel: ${voiceChannel}`);

    if (voiceChannel.permissionsFor(message.guild!.me!).missing([Permissions.FLAGS.SPEAK, Permissions.FLAGS.CONNECT]))
        return message.channel.send({ embeds: [warningEmbed().setDescription(`Cannot join ${voiceChannel.toString()}: Insufficient Permissions`)] });

    log(`Joining ${voiceChannel.name}`);
    const queue = queueManager.getOrCreate(message, voiceChannel);
    queue.join();

    return message.channel.send({ embeds: [defaultEmbed()
        .setDescription(`Joining ${voiceChannel.toString()}`)] });
};

export const names = ['summon', 'join', 'j'];
export const help = {
    desc: 'Summon the bot to the voice channel the user is in',
    syntax: ''
};

export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
