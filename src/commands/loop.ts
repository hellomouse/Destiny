import { defaultEmbed, errorEmbed } from '../embeds.js';
import { log } from '../utils.js';
import { queueManager, LOOP_MODES } from '../queue.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { Client, Message } from 'discord.js';

/**
 * @description Loop the current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Optional loop mode
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.getOrCreate(message, message.member!.voice.channel!);

    // TODO: command with no arguments should cycle through loop modes
    let loopMode = serverQueue.loop;
    if (args[0]) {
        loopMode = LOOP_MODES[args[0].toUpperCase() as keyof typeof LOOP_MODES];

        if (typeof loopMode === 'undefined')
            return message.reply({ embeds: [errorEmbed()
                .setTitle(`Invalid loop mode: \`${args[0].toLowerCase()}\``)
                // List loop modes (lowercase) after filtering out the number keys
                .setDescription(`Loop mode should be one of \`${Object.keys(LOOP_MODES).map(e => e.toLowerCase()).filter(e => isNaN(+e)).join(', ')}\``)] });
    }


    serverQueue.setLoopMode(loopMode);
    log(`Loop mode set to ${LOOP_MODES[loopMode].toLowerCase()}`);
    return message.channel.send({ embeds: [defaultEmbed().setDescription(`Loop mode now set to \`${LOOP_MODES[loopMode].toLowerCase()}\``)] });
};

export const names = ['loop', 'l'];
export const help = {
    desc: 'Change looping settings',
    syntax: '[loop | none/off | queue]'
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
