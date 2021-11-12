import strings from '../strings.json';
import utils from '../utils';
import embeds from '../embeds.js';
import { queueManager } from '../queue.js';
import { Client, Message } from 'discord.js';

/**
 * @description Show the guild's song queue
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild.id);
    if (!serverQueue || serverQueue.size() === 0)
        return message.channel.send(embeds.songQueueEmpty());

    let queuetxt = '';

    for (let i = 0; i < Math.min(10, serverQueue.songs.length); i++) {
        let minutes = `${Math.floor(serverQueue.songs[i].duration / 60)}`;
        if (minutes.length === 1)
            minutes = '0' + minutes;
        let seconds = `${serverQueue.songs[i].duration % 60}`;
        if (seconds.length === 1)
            seconds = '0' + seconds;

        if (serverQueue.loop === 'song' && i === 0)
            queuetxt += `\`\`${i + 1}. (${minutes}:${seconds}) 🔄 ${serverQueue.songs[i].title} requested by ${serverQueue.songs[i].requestedBy.tag}\`\`\n`;
        else
            queuetxt += `\`\`${i + 1}. (${minutes}:${seconds}) ${serverQueue.songs[i].title} requested by ${serverQueue.songs[i].requestedBy.tag}\`\`\n`;
    }

    utils.log('Showed music queue');
    return message.channel.send(strings.musicsQueued + '\n' + queuetxt);
};


export const names = ['queue', 'q'];
export const help = {
    desc: 'View the current song queue',
    syntax: ''
};
