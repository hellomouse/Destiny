import utils from '../utils';
import { queueManager } from '../queue.js';

export default async (oldVoiceState, newVoiceState) => {
    let serverQueue = queueManager.get(newVoiceState.guild.id);
    if (serverQueue === undefined) return;

    let voiceChannel = serverQueue.voiceChannel;

    if (voiceChannel.members.size === 1)
        utils.inactivity.onAlone(serverQueue);
    else
        utils.inactivity.onPersonJoin();
};
