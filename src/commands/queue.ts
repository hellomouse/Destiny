import strings from '../strings.json';
import utils from '../utils';
import embeds from '../embeds.js';
import { queueManager, ServerQueue } from '../queue.js';
import { Client, Message, MessageActionRow, MessageButton } from 'discord.js';

const PAGE_SIZE = 10;
const MAX_LINE_LENGTH = 80;

// Prev, next, first, last
const ROW_BTN_LABELS = ['上页', '下页', '初页', '末页'];
const ROW_BTN_FUNC = [
    (page: number, maxPages: number) => page + 1,
    (page: number, maxPages: number) => page - 1,
    (page: number, maxPages: number) => 0,
    (page: number, maxPages: number) => maxPages - 1
];

function getQueueContent(page:number, serverQueue: ServerQueue, maxPages: number) {
    let queuetxt = '```swift';
    queuetxt += `\nQueue Page: ${page + 1} / ${maxPages}`;
    queuetxt += `    Loop Mode: ${serverQueue.loop}\n\n`;

    let endIndex = Math.min((page + 1) * PAGE_SIZE, serverQueue.songs.length);
    for (let i = page * PAGE_SIZE; i < endIndex; i++) {
        let song = serverQueue.songs[i];
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
        return message.channel.send({ embeds: [embeds.songQueueEmpty()] });

    let page = 0;
    let maxPages = Math.ceil(serverQueue.songs.length / PAGE_SIZE);
    if (args.length) {
        page = +args[0] - 1;
        if (Number.isNaN(page))
            throw new utils.FlagHelpError();
    }
    page = Math.max(0, Math.min(page, maxPages - 1));

    let queuetxt = getQueueContent(page, serverQueue, maxPages);

    const row = new MessageActionRow();
    row.addComponents(...ROW_BTN_LABELS.map(label => new MessageButton()
        .setCustomId(label)
        .setLabel(label)
        .setStyle('SECONDARY')));

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
        console.log(interaction);
        for (let i = 0; i < ROW_BTN_LABELS.length; i++)
            if (interaction.customId === ROW_BTN_LABELS[i]) {
                page = ROW_BTN_FUNC[i](page, maxPages);
                let content = getQueueContent(page, serverQueue, maxPages);
                await interaction.message.edit({ content });
                interaction.reply(ROW_BTN_LABELS[i]);
                return;
            }
    });

    utils.log('Showed music queue');
    return message.channel.send({
        content: queuetxt,
        components: [row]
    });
};


export const names = ['queue', 'q'];
export const help = {
    desc: 'View the current song queue',
    syntax: '[page]'
};
