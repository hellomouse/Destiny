import { Message, MessageActionRow, MessageButton } from 'discord.js';
import { configHandler } from '../configHandler.js';
import { Client } from '../types.js';

// description character limit
const DESCRIPTION_CHARACTER_LIMIT = 1000;

let pages: Array<string> = [];

// first, prev, next, last
const ROW_BTN_EMOJI = ['929913795726418001', '929913795491561615', '929913795726442567', '929913795747405924'];
const ROW_BTN_FUNC = [
    (page: number, maxPages: number) => 0,
    (page: number, maxPages: number) => page - 1,
    (page: number, maxPages: number) => page + 1,
    (page: number, maxPages: number) => maxPages - 1
];

export const postLoad = async (client: Client) => {
    pages = [];

    const prefix = (await configHandler()).prefix;
    let page = '```swift\n';
    let charactersRemaining = DESCRIPTION_CHARACTER_LIMIT;
    for (let [commandName, command] of client.commands) {
        if (command.alias) continue;

        let description = `${prefix}${commandName.slice(0, 10).padEnd(10, ' ')} "${command.help.desc}"`;
        if (charactersRemaining < 0) {
            pages.push(page + '```');
            page = '```swift\n';
            charactersRemaining = DESCRIPTION_CHARACTER_LIMIT;
        }
        page += '\n' + description;
        charactersRemaining -= description.length + 1;
    }
    if (page) pages.push(page + '```');

    pages = pages.map((value, index) => value.replace('```swift\n',
        '```swift\nPage ' + (index + 1) + ' / ' + pages.length +
        ` - Use \`${prefix}help\` for interactive help or \`${prefix}help [command]\` to get command specific help\n`));
};

/**
 * @description Lists commands
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>): Promise<Message | void> => {
    let index = Math.max(0, Math.min(+args[0] - 1 | 0, pages.length - 1));

    const row = new MessageActionRow();
    row.addComponents(...ROW_BTN_EMOJI.map(emoji => new MessageButton()
        .setEmoji(emoji)
        .setCustomId(emoji)
        .setDisabled(pages.length === 1)
        .setStyle('PRIMARY')));

    let sentMessage = await message.channel.send({
        content: pages[index],
        components: [row]
    });

    // disable buttons after 2 minutes
    setTimeout(() => {
        sentMessage.components[0].components.forEach(
            button => button.setDisabled(true)
        );
        sentMessage.edit({ components: sentMessage.components }).catch(console.error);
    }, 120000);

    sentMessage?.createMessageComponentCollector({ componentType: 'BUTTON', time: 120000 })
        .on('collect', async interaction => {
            if (!interaction.isButton()) return;
            for (let i = 0; i < ROW_BTN_EMOJI.length; i++)
                if (interaction.customId === ROW_BTN_EMOJI[i]) {
                    index = ROW_BTN_FUNC[i](index, pages.length);
                    await interaction.update(pages[index])
                        .catch(console.error);
                    return;
                }
        });

    return sentMessage;
};

export const names = ['list'];
export const help = {
    desc: 'List commands',
    syntax: ''
};
