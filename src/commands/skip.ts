import { log } from '../utils.js';
import { songEmbed, errorEmbed, queueNotPlaying } from '../embeds.js';
import { LOOP_MODES, queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS, { CommandArgument, CommandArgumentNecessity, CommandHelpProvider } from '../commands.js';
import type { Client, Message } from 'discord.js';

/**
 * @description Skip the current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;

    log(`Skipped music : ${serverQueue.songs[0].song.title}`); // Problem is here


    let skipAmount: number = +args[0] ? +args[0] + 1 : 0;
    let skipTo = 0;

    if (skipAmount)
        // If we're looping the queue, find the index of the song to jump to
        if (serverQueue.getLoopMode() === LOOP_MODES['QUEUE'])
            skipTo = serverQueue.getIndex() + skipAmount % serverQueue.size();
        else if (skipAmount > (serverQueue.size() - serverQueue.getIndex()))
        // Can't skip songs if it takes us out of the queue when not looping it
            return await message.reply({ embeds: [errorEmbed().setDescription('Can\'t skip there, out of bounds.\nOnly possible when looping the queue')] });
        else
            skipTo = serverQueue.getIndex() + skipAmount;

    if (skipTo)
        serverQueue.jump(skipTo);
    else if (serverQueue.getIndex() < serverQueue.size())
        serverQueue.skip();
        // TODO: you should be able to skip the last song, other commands will break on invalid indexes however

    const currentSong = serverQueue.currentSong();
    if (currentSong)
        return message.channel.send({ embeds: [songEmbed(currentSong, 'Skipping', false)] });

    return message.reply({ embeds: [queueNotPlaying()] });
};

export const names = ['skip', 's'];
// export const help = {
//     desc: 'Skip the current song',
//     syntax: '[amount]'
// };
export let help = new CommandHelpProvider('skip')
    .setDescription('Skip the current song')
    .setSyntax([new CommandArgument('amount', CommandArgumentNecessity.Optional)]);
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
