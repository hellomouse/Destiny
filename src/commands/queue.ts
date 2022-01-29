import { FlagHelpError, log } from '../utils.js';
import { songQueueEmpty } from '../embeds.js';
import { LOOP_MODES, queueManager, ServerQueue } from '../queue.js';
import type { Client, Message } from 'discord.js';
import { MessageActionRow, MessageButton } from 'discord.js';
import { CommandArgument, CommandArgumentNecessity, CommandHelpProvider } from '../commands.js';

const PAGE_SIZE = 10;
const MAX_LINE_LENGTH = 80;

// first, prev, next, last
const ROW_BTN_EMOJI = ['emojii:929913795726418001', 'emojii:929913795491561615', 'Current', 'emojii:929913795726442567', 'emojii:929913795747405924'];
const ROW_BTN_FUNC = [
    (page: number, maxPages: number, currentPage: number) => 0,
    (page: number, maxPages: number, currentPage: number) => page - 1,
    (page: number, maxPages: number, currentPage: number) => currentPage,
    (page: number, maxPages: number, currentPage: number) => page + 1,
    (page: number, maxPages: number, currentPage: number) => maxPages - 1
];

function getQueueContent(page: number, serverQueue: ServerQueue, maxPages: number) {
    page = Math.max(0, Math.min(page, maxPages - 1));

    let queuetxt = '```swift';
    queuetxt += `\nQueue Page: ${page + 1} / ${maxPages}`;
    queuetxt += `    Loop Mode: ${LOOP_MODES[serverQueue.getLoopMode()]}\n\n`;

    let endIndex = Math.min((page + 1) * PAGE_SIZE, serverQueue.songs.length);
    for (let i = page * PAGE_SIZE; i < endIndex; i++) {
        let songReference = serverQueue.songs[i];
        let song = songReference.song;
        let indexStr = (i + 1)
            .toString()
            .padStart(Math.floor(Math.log10(endIndex)) + 1, ' ');
        let songtxt = `${indexStr}. [${songReference.requestedBy.tag}] (${song.formattedDuration}) ${song.title}`;
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

    let maxPages = Math.ceil(serverQueue.songs.length / PAGE_SIZE);
    let currentPage = Math.floor(serverQueue.getIndex() / PAGE_SIZE);
    let page = currentPage;

    if (args.length) {
        page = +args[0] - 1;
        if (Number.isNaN(page))
            throw new FlagHelpError();
    }
    page = Math.floor(page);
    page = Math.max(0, Math.min(page, maxPages - 1));

    let queuetxt = getQueueContent(page, serverQueue, maxPages);

    const row = new MessageActionRow();
    row.addComponents(...ROW_BTN_EMOJI.map((label, i) => {
        let btn = new MessageButton()
            .setCustomId(label + i)
            .setStyle('PRIMARY');
        if (label.startsWith('emojii:'))
            btn = btn.setEmoji(label.split(':')[1]);
        else
            btn = btn.setLabel(label);
        return btn;
    }));

    log('Showed music queue');
    let sentMessage = await serverQueue.messages.get('queue')?.send(message.channel, {
        content: queuetxt,
        components: [row]
    });

    sentMessage?.createMessageComponentCollector({ componentType: 'BUTTON', time: 120000 })
        .on('collect', async interaction => {
            if (!interaction.isButton()) return;
            for (let i = 0; i < ROW_BTN_EMOJI.length; i++)
                if (interaction.customId === ROW_BTN_EMOJI[i] + i) {
                    page = ROW_BTN_FUNC[i](page, maxPages, currentPage);
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
// export const help = {
//     desc: 'View the current song queue',
//     syntax: '[page]'
// };
export let help = new CommandHelpProvider('queue')
    .setDescription('View the song queue')
    .setSyntax([new CommandArgument('page', CommandArgumentNecessity.Optional)]);
