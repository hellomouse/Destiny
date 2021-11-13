import embeds from '../embeds.js';
import utils from '../utils';
import { queueManager, LOOP_MODES } from '../queue.js';
import commands from '../commands.js';
import { Client, Message } from 'discord.js';

/**
 * @description Loop the current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Optional loop mode
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>): Promise<Message> => {
    const serverQueue = queueManager.getOrCreate(message, message.member!.voice.channel!);

    let loopMode = LOOP_MODES[(LOOP_MODES.indexOf(serverQueue.loop) + 1) % LOOP_MODES.length];
    if (args[0])
        if (!LOOP_MODES.includes(args[0].toLowerCase() as LOOP_MODES)) {
            loopMode = args[0].toLowerCase() as LOOP_MODES;
            return message.channel.send(embeds.errorEmbed()
                .setTitle(`Invalid loop mode \`${args[0].toLowerCase()}\``)
                .setDescription(`Loop mode should be one of \`${LOOP_MODES.join(', ')}\``));
        }


    serverQueue.setLoopMode(loopMode as LOOP_MODES);
    utils.log(`Loop mode set to ${loopMode}`);
    return message.channel.send(embeds.defaultEmbed().setDescription(`Loop mode now set to \`${loopMode}\``));
};

export const names = ['loop', 'l'];
export const help = {
    desc: 'Change looping settings',
    syntax: '[loop | none | queue]'
};
export const requirements = commands.REQUIRE_USER_IN_VC;
