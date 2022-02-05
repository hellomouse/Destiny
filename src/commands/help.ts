import { MessageActionRow, MessageSelectMenu } from 'discord.js';
import { CommandHelpProvider } from '../commands.js';
import { defaultEmbed, warningEmbed } from '../embeds.js';
import type { Client } from '../types';
import type { Message } from 'discord.js';

const detailedCommandHelp = new Map<string, CommandHelpProvider>();
export const postLoad = async (client: Client) => {
    for (let [commandName, command] of client.commands) {
        if (command.alias) continue;
        detailedCommandHelp.set(commandName, command.help);
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
    let content = defaultEmbed();
    if (!args[0]) {
        content.setDescription('Use the dropdown to view help for a command').setTitle('Interactive help');
        let selectMenu = new MessageSelectMenu()
            .setCustomId('select')
            .setPlaceholder('Select a command to view it\'s usage');

        for (let [commandName, help] of detailedCommandHelp)
            selectMenu.addOptions([
                {
                    label: commandName,
                    value: commandName,
                    description: help.getDescription()
                }
            ]);

        const row = new MessageActionRow().addComponents(selectMenu);
        let sentMessage = await message.channel.send({
            embeds: [content],
            components: [row]
        });

        sentMessage.createMessageComponentCollector({ componentType: 'SELECT_MENU', time: 120000 })
            .on('collect', async interaction => {
                await sentMessage.edit({
                    embeds: [content.setDescription(detailedCommandHelp.get(interaction.values[0])!.text)]
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
            embeds: [content.setDescription(detailedCommandHelp.get(args[0])!.text)]
        });
};

export const names = ['help'];
// export const help = {
//     desc: 'Provides help for commands',
//     syntax: '[command]',
//     detailed: `Provides usage information for a command.

//         With no arguments, an interactive emebd will be shown allowing you to switch between commands.

//         Syntax uses characters which show you how a command can be used.
//         For example {prefix}help [command]
//         The argument \`command\` is optional so usage is: \`{prefix}help help\` or  \`{prefix}help\`

//         Syntax listing:
//         [argument] "Optional argumennt"
//         <argument> "Required argument"
//         --switch [argument]|<argument> "Paramaeter switch with optional or required arguments"
//         -s [argument]|<argument> "Shorthand for the switch"`
// };
export let help = new CommandHelpProvider('help')
    .setDescription('Provides help for commands');
