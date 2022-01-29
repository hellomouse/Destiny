import { FlagHelpError, log } from '../utils.js';
import { songEmbed, queueNotPlaying, errorEmbed } from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS, { CommandArgument, CommandArgumentNecessity, CommandHelpProvider } from '../commands.js';
import type { Message } from 'discord.js';
import type { Client } from '../types';

/**
 * @description Jump to a specific position in the queue
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    if (!args[0]) throw new FlagHelpError('You need to specify a position');

    const serverQueue = queueManager.get(message.guild!.id)!;

    try {
        serverQueue!.jump(+args[0]);
    } catch (e) {
        return message.reply({ embeds: [errorEmbed().setTitle((e as Error).message)] });
    }

    log(`Skipping (jump): ${serverQueue!.songs[0].song.title}`);
    const currentSongReference = serverQueue.currentSong();
    if (currentSongReference)
        return await message.reply({ embeds: [songEmbed(currentSongReference, 'Jumping to...', false)] });

    //    return message.channel.send({ embeds: [songEmbed(currentSong, 'Jumping to...', false)] });


    return message.reply({ embeds: [queueNotPlaying()] });
};

export const names = ['jump'];
// export const help = {
//     desc: 'Jump to a specific position in the queue',
//     syntax: '[position]'
// };

export let help = new CommandHelpProvider('jump')
    .setDescription('Jumps to a specific position in the queue')
    .setSyntax([new CommandArgument('position', CommandArgumentNecessity.Optional)]);

export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
