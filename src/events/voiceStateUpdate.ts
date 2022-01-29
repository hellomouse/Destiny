import { inactivity } from '../utils.js';
import { queueManager } from '../queue.js';
import type { VoiceState } from 'discord.js';

export default async (oldVoiceState: VoiceState, newVoiceState: VoiceState) => {
    let serverQueue = queueManager.get(newVoiceState.guild.id);
    if (serverQueue === undefined) return;

    let voiceChannel = serverQueue.voiceChannel;

    if (voiceChannel.members.size === 1)
        inactivity.onAlone(serverQueue);
    else
        inactivity.onPersonJoin();
};
