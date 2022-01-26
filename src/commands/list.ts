import { defaultEmbed } from '../embeds.js';
import { Client, Message } from 'discord.js';

export const postLoad = async (client: Client) => {
    // todo
};

/**
 * @description Lists commands
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>): Promise<Message | void> => {
    return message.channel.send({ embeds: [defaultEmbed().setDescription(':wave:')] });
};

export const names = ['list'];
export const help = {
    desc: 'List commands',
    syntax: ''
};
