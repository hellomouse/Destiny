import { log } from '../utils.js';
import { defaultEmbed, warningEmbed } from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS, { CommandHelpProvider } from '../commands.js';
import type { Client } from '../types';
import type { Message } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';

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

    const me = message.guild!.members.me!;
    if (voiceChannel.members.has(me.id)) return message.reply({ embeds: [warningEmbed().setDescription('I am already in this voice channel.')] });

    if (!voiceChannel.permissionsFor(me).has([PermissionFlagsBits.Speak, PermissionFlagsBits.Connect]))
        return message.channel.send({ embeds: [warningEmbed().setDescription(`Cannot join ${voiceChannel.toString()} due to \`Insufficient Permissions\``)] });

    log(`Joining ${voiceChannel.name}`);
    const queue = queueManager.getOrCreate(message, voiceChannel);
    queue.join();

    return message.channel.send({ embeds: [defaultEmbed()
        .setDescription(`Joining ${voiceChannel.toString()}`)] });
};

export const names = ['summon', 'join', 'j'];
// export const help = {
//     desc: 'Summon the bot to the voice channel the user is in',
//     syntax: ''
// };
export let help = new CommandHelpProvider('summon')
    .setDescription('Summon the bot to the voice channel you\'re in');

export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
