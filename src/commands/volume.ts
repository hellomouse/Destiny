import embeds from '../embeds.js';
import { queueManager } from '../queue.js';
import utils from '../utils.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { Client, Message } from 'discord.js';

const MAX_VOLUME = utils.MAX_VOLUME;

/**
 * @description Adjust the playback volume
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args args[0]: Volume as integer from 0 to 100
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.getOrCreate(message, message.member!.voice.channel!);

    if (args.length > 1)
        throw new utils.FlagHelpError();

    if (args.length === 0)
        return message.channel.send(embeds.defaultEmbed()
            .setDescription(`The current volume is **${serverQueue!.volume}%**`));

    let floatVolume = +args;
    if (Number.isNaN(floatVolume) || floatVolume < 0 || floatVolume > MAX_VOLUME)
        return message.channel.send(embeds.errorEmbed()
            .setTitle(`Volume must be a percentage from 0 to ${MAX_VOLUME}%`));

    message.channel.send(embeds.defaultEmbed()
        .setDescription(`Volume set to **${floatVolume.toFixed(2)}%**`));

    serverQueue!.volume = floatVolume;
    return serverQueue!.connection!.dispatcher.setVolumeLogarithmic(floatVolume / utils.VOLUME_BASE_UNIT);
};

export const names = ['volume', 'v', 'vol'];
export const help = {
    desc: 'Set the volume of the music',
    syntax: '<volume 0-200>'
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;