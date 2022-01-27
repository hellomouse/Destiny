import { Message } from 'discord.js';
import { Client } from '../types';

/**
 * @description Pause current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    return message.reply('PONG');
};

export const names = ['ping'];
export const help = {
    desc: 'PONG!',
    syntax: ''
};
