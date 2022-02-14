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

    let voiceChannel = serverQueue.voiceChannel;
    const clientId = newVoiceState.guild.me!.id;

    if (oldVoiceState.channel === null)
        log('Someone joined the Voice Channel');
    else if (newVoiceState.channel === null)
        if (newVoiceState.member!.id === clientId) {
            queueManager.remove(serverQueue.serverID);
            log(`Left the channel ${voiceChannel.name}`);
        } else
            log('Someone left the Voice Channel');
    else if (oldVoiceState.channel !== null && newVoiceState.channel !== null)
        if (newVoiceState.member!.id === clientId) {
            // Check if the new state has a channel, and that the channel matches the linked channel
            // Update it if it doesn't match
            if (oldVoiceState.channel.id !== newVoiceState.channel.id) {
                log(`Moved Voice channel from ${oldVoiceState.channel.name} to ${newVoiceState.channel.name}`);
                serverQueue.voiceChannel = newVoiceState.channel;
            }
        // eslint-disable-next-line curly
        } else {
            if (voiceChannel.members.size === 1)
                serverQueue.inactivityHelper.onAlone();
            else
                serverQueue.inactivityHelper.onPersonJoin();
        }
};
