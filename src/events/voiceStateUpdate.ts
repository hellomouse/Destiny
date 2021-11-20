import utils from '../utils';
import { queueManager } from '../queue.js';
import { VoiceState } from 'discord.js';

export default async (oldVoiceState: VoiceState, newVoiceState: VoiceState) => {
    let serverQueue = queueManager.get(newVoiceState.guild.id);
    if (serverQueue === undefined) return;

    let voiceChannel = serverQueue.voiceChannel;

    if (voiceChannel.members.size === 1)
        utils.inactivity.onAlone(serverQueue);
    else
        utils.inactivity.onPersonJoin();
};
