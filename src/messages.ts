import { Collection, Message, MessageOptions, MessagePayload } from 'discord.js';
import type { TextLikeChannels } from './types';

class CustomMessage {
    protected message: Message<boolean> | null;
    constructor() {
        this.message = null;
    }

    async _send(channel: TextLikeChannels, options: string | MessagePayload | MessageOptions) {
        this.message = await channel.send(options);
        return this.message;
    }

    async send(channel: TextLikeChannels, options: string | MessagePayload | MessageOptions) {
        await this._send(channel, options);
        return this.message;
    }

    async delete() {
        let deletedMessage = await this.message?.delete().catch(err => console.log(err));
        this.message = null;
        return deletedMessage;
    }
}

export class NormalMessage extends CustomMessage {
    constructor() {
        super();
    }
}

/**
 * When a new message is sent, delete the previous one
 */
export class SingletonMessage extends CustomMessage {
    constructor() {
        super();
    }

    async send(channel: TextLikeChannels, options: string | MessagePayload | MessageOptions) {
        await this.delete();
        return await this._send(channel, options);
    }
}

export class SongQueueMessage extends CustomMessage {
    private previousMessage: Message<boolean> | null;
    constructor() {
        super();
        this.previousMessage = null;
    }

    // Disable buttons for the previous song queue message
    disableButtons(messageToDisable = this.message) {
        if (!messageToDisable) return;

        for (let button of messageToDisable.components[0].components)
            button.setDisabled(true);

        messageToDisable.edit({ components: messageToDisable.components }).catch(console.error);
    }

    async send(channel: TextLikeChannels, options: string | MessagePayload | MessageOptions) {
        // TODO: Figure out why DiscordAPIError is thrown.
        // We send a new message, and disable the buttons on the previous message
        this.previousMessage = this.message;

        let message = await this._send(channel, options);
        this.disableButtons(this.previousMessage);
        return message;
    }
}

class MessageCollection extends Collection<string, SingletonMessage | SongQueueMessage | NormalMessage> {
    constructor() {
        super();
    }
}

export default MessageCollection;
