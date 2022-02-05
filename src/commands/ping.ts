import type { Message } from 'discord.js';
import { CommandHelpProvider } from '../commands.js';
import type { Client } from '../types';
import { getRandomInt } from '../utils.js';

const REPLY_NO_PING = {
    /* eslint-disable @typescript-eslint/naming-convention */
    allowed_mentions: {
        parse: ['users', 'roles', 'everyone'],
        replied_user: false
    }
    /* eslint-enable @typescript-eslint/naming-convention */
};

let generateNonce = () => getRandomInt(1e15).toString();

class Deferred {
    promise: Promise<number>;
    resolve!: (apiReturnTime: number) => void;
    reject!: (reason?: any) => void;
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

/**
 * @description Ping the bot
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    let id = generateNonce();
    let gatewayDeferred = new Deferred();
    client.pingInfo.set(id, gatewayDeferred.resolve);
    let startDate = new Date();
    let sendTs: number;
    let apiReturnTs: number;
    sendTs = message.createdTimestamp;
    let [sent, gatewayReturnTs] = await Promise.all([
        message.reply({
            content: `(ping ${id})`
        }).then(result => {
            apiReturnTs = Date.now();
            return result;
        }),
        gatewayDeferred.promise
    ]);
    let endTs = Date.now();
    let startTs = +startDate;
    let serverTs = +new Date(sent.createdTimestamp);
    client.pingInfo.delete(id);
    let out = [
        `(ping ${id})`,
        `**Total latency** (including queues): ${endTs - startTs} ms`,
        `**API timings**: rtt ${apiReturnTs! - sendTs!} ms, send ${serverTs - sendTs!} ms, return ${apiReturnTs! - serverTs} ms`,
        `**Gateway timings**: rtt ${gatewayReturnTs - sendTs!} ms, return ${gatewayReturnTs - serverTs} ms`
    ];
    return await sent.edit({ content: out.join('\n'), ...REPLY_NO_PING });
};

export const names = ['ping'];
// export const help = {
//     desc: 'PONG!',
//     syntax: ''
// };
export let help = new CommandHelpProvider('ping')
    .setDescription('Ping the bot');
