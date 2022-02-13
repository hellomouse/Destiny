import { queueManager } from '../queue.js';
import type { VoiceState } from 'discord.js';
import { log } from '../utils.js';

/*
- If the channel of the old state is the same as the channel of the new state:
    - If the user is in the channel:
        - Handle user parts/joins
    - If the user is not in the channel:
        - inactivity timeout
- If the channel of the old state is not the same as the channel of the new state:
    - If the user is in the new channel, then update the linked channel
*/
export default async (oldVoiceState: VoiceState, newVoiceState: VoiceState) => {
    let serverQueue = queueManager.get(newVoiceState.guild.id);
    if (serverQueue === undefined) return;

    // Check if the new state has a channel, and that the channel matches the linked channel
    // Update it if it doesn't match
    if (newVoiceState.channel && newVoiceState.channel.id !== serverQueue.voiceChannel.id)
        serverQueue.voiceChannel = newVoiceState.channel;

    let voiceChannel = serverQueue.voiceChannel;
    const clientId = newVoiceState.guild.me!.id;
    const isInVC = voiceChannel.members.has(clientId);

    if (isInVC)
        if (voiceChannel.members.size === 1)
            serverQueue.inactivityHelper.onAlone();
        else
            serverQueue.inactivityHelper.onPersonJoin();
    else if (newVoiceState.member?.id === clientId) {
        queueManager.remove(serverQueue.serverID);
        log(`Left the channel ${voiceChannel.name}`);
    }
};
