import { queueManager } from '../queue.js';
import type { VoiceState } from 'discord.js';

export default async (oldVoiceState: VoiceState, newVoiceState: VoiceState) => {
    let serverQueue = queueManager.get(newVoiceState.guild.id);
    if (serverQueue === undefined) return;

    let voiceChannel = serverQueue.voiceChannel;

    if (voiceChannel.members.size === 1)
        serverQueue.inactivityHelper.onAlone();
    else
        serverQueue.inactivityHelper.onPersonJoin();

    // need to get client id here
    if (oldVoiceState?.member?.id === oldVoiceState.guild!.me!.id)
        if (!newVoiceState.channel?.members.has(oldVoiceState.guild!.me!.id!))
            console.log('left voice channel');
};
