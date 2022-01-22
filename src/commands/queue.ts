import { FlagHelpError, log } from '../utils.js';
import { songQueueEmpty } from '../embeds.js';
import { LOOP_MODES, queueManager, ServerQueue } from '../queue.js';
import { Client, Message, MessageActionRow, MessageButton } from 'discord.js';

const PAGE_SIZE = 10;
const MAX_LINE_LENGTH = 80;

// first, prev, next, last
const ROW_BTN_EMOJI = ['929913795726418001', '929913795491561615', '929913795726442567', '929913795747405924'];
const ROW_BTN_FUNC = [
    (page: number, maxPages: number) => 0,
    (page: number, maxPages: number) => page - 1,
    (page: number, maxPages: number) => page + 1,
    (page: number, maxPages: number) => maxPages - 1
];

function getQueueContent(page: number, serverQueue: ServerQueue, maxPages: number) {
    page = Math.max(0, Math.min(page, maxPages - 1));

    let queuetxt = '```swift';
    queuetxt += `\nQueue Page: ${page + 1} / ${maxPages}`;
    queuetxt += `    Loop Mode: ${LOOP_MODES[serverQueue.loop]}\n\n`;

    let endIndex = Math.min((page + 1) * PAGE_SIZE, serverQueue.songs.length);
    for (let i = page * PAGE_SIZE; i < endIndex; i++) {
        let songReference = serverQueue.songs[i];
        let song = songReference.song;
        let indexStr = (i + 1)
            .toString()
            .padStart(Math.floor(Math.log10(endIndex)) + 1, ' ');
        let songtxt = `${indexStr}. [${song.requestedBy.tag}] (${song.formattedDuration}) ${song.title}`;
        songtxt = songtxt.length > MAX_LINE_LENGTH
            ? songtxt.substring(0, MAX_LINE_LENGTH - 2) + '..'
            : songtxt;

        if (serverQueue.getIndex() === i)
            songtxt = `     ⌈ Now playing ⌉\n${songtxt}\n     ⌊ Now playing ⌋`;
        queuetxt += songtxt + '\n';
    }

    queuetxt += '```';
    return queuetxt;
}


/**
 * @description Show the guild's song queue
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;
    if (!serverQueue || serverQueue.size() === 0)
        return message.reply({ embeds: [songQueueEmpty()] });

    let page = 0;
    let maxPages = Math.ceil(serverQueue.songs.length / PAGE_SIZE);
    if (args.length) {
        page = +args[0] - 1;
        if (Number.isNaN(page))
            throw new FlagHelpError();
    }
    page = Math.max(0, Math.min(page, maxPages - 1));

    let queuetxt = getQueueContent(page, serverQueue, maxPages);

    const row = new MessageActionRow();
    row.addComponents(...ROW_BTN_EMOJI.map(emoji => new MessageButton()
        .setEmoji(emoji)
        .setCustomId(emoji)
        .setStyle('PRIMARY')));

    log('Showed music queue');
    let sentMessage = await serverQueue.messages.get('queue')?.send(message.channel, {
        content: queuetxt,
        components: [row]
    });

    sentMessage?.createMessageComponentCollector({ componentType: 'BUTTON' })
        .on('collect', async interaction => {
            if (!interaction.isButton()) return;
            for (let i = 0; i < ROW_BTN_EMOJI.length; i++)
                if (interaction.customId === ROW_BTN_EMOJI[i]) {
                    page = ROW_BTN_FUNC[i](page, maxPages);
                    let content = getQueueContent(page, serverQueue, maxPages);
                    await interaction.update({ content })
                        .catch(console.error);
                    return;
                }
        });

    return sentMessage;
    // return message.channel.send({
    //     content: queuetxt,
    //     components: [row]
    // }, hidden = true);
};


export const names = ['queue', 'q'];
export const help = {
    desc: 'View the current song queue',
    syntax: '[page]'
};
