import { queueManager } from '../queue.js';
import type { VoiceState } from 'discord.js';

export default async (oldVoiceState: VoiceState, newVoiceState: VoiceState) => {
    let serverQueue = queueManager.get(newVoiceState.guild.id);
    if (serverQueue === undefined) return;

    let voiceChannel = serverQueue.voiceChannel;
    const clientId = newVoiceState.guild.me!.id;
    const isInVC = voiceChannel.members.has(clientId);

    if (isInVC)
        if (voiceChannel.members.size === 1)
            serverQueue.inactivityHelper.onAlone();
        else
            serverQueue.inactivityHelper.onPersonJoin();
    else if (newVoiceState.member?.id === clientId)
        serverQueue.leave();
};
