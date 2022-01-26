import { Message, MessageActionRow, MessageSelectMenu } from 'discord.js';
import { warningEmbed } from '../embeds.js';
import { Client } from '../types.js';
import { configHandler } from '../configHandler.js';

const detailedCommandHelp = new Map();
const prefix = (await configHandler()).prefix;

export const postLoad = async (client: Client) => {
    for (let [commandName, command] of client.commands) {
        if (command.alias) continue;
        detailedCommandHelp.set(commandName, command.help.detailed || 'No help for this command exists just yet...');
    }
};

/**
 * @description Lists commands
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>): Promise<Message | void> => {
    if (!args[0]) {
        let content = '```swift\nInteractive help\n\nUse the dropdown to view help for a command```';

        let selectMenu = new MessageSelectMenu()
            .setCustomId('select')
            .setPlaceholder('Select a command to view it\'s usage');

        for (let [commandName] of detailedCommandHelp)
            selectMenu.addOptions([
                {
                    label: commandName,
                    value: commandName
                }
            ]);

        const row = new MessageActionRow().addComponents(selectMenu);
        let sentMessage = await message.channel.send({
            content,
            components: [row]
        });

        sentMessage?.createMessageComponentCollector({ componentType: 'SELECT_MENU', time: 120000 })
            .on('collect', async interaction => {
                await sentMessage.edit({
                    content: '```swift\nInteractive help\n\n' +
                    prefix + interaction.values[0] + ' - ' + detailedCommandHelp.get(interaction.values[0]) + '```'
                }).catch(console.error);
                interaction.deferUpdate();
            });

        // disable select menu after 2 minutes
        setTimeout(() => {
            sentMessage.components[0].components[0].setDisabled(true);
            sentMessage.edit({ components: sentMessage.components }).catch(console.error);
        }, 120000);
    } else if (!detailedCommandHelp.has(args[0]))
        return message.channel.send({ embeds: [warningEmbed().setDescription('Command does not exist')] });
    else
        await message.channel.send({
            content: '```swift\n' +
                prefix + args[0] + ' - ' + detailedCommandHelp.get(args[0]) + '```'
        });
};

export const names = ['help'];
export const help = {
    desc: 'Provides help for commands',
    syntax: '[command]',
    detailed: `Provides usage information for a command.

        With no arguments, an interactive emebd will be shown allowing you to switch between commands.
        
        Syntax uses characters which show you how a command can be used.
        For example ${prefix}help [command]
        The argument \`command\` is optional so usage is: \`${prefix}help help\` or  \`${prefix}help\`
        
        Syntax listing:
        [argument] "Optional argumennt"
        <argument> "Required argument"
        --switch [argument]|<argument> "Paramaeter switch with optional or required arguments"
        -s [argument]|<argument> "Shorthand for the switch"`
};
