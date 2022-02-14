import { Collection, Message, MessageOptions, MessagePayload } from 'discord.js';
import type { TextLikeChannels } from './types';

class CustomMessage {
    protected message: Message<boolean> | undefined;
    constructor() {
        this.message = undefined;
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
        this.message = undefined;
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
    private previousMessage: Message<boolean> | undefined;
    private active: boolean; // Buttons active?
    constructor() {
        super();
        this.active = false;
    }

    // Disable buttons for the previous song queue message
    async disableButtons() {
        if (!this.previousMessage || !this.active) return;

        this.previousMessage.components[0].components.forEach(
            button => button.setDisabled(true)
        );

        this.previousMessage.edit({ components: this.previousMessage.components }).catch(console.error);
        this.active = false;
    }

    async send(channel: TextLikeChannels, options: string | MessagePayload | MessageOptions) {
        // TODO: Figure out why DiscordAPIError is thrown.
        // We send a new message, and disable the buttons on the previous message
        this.previousMessage = this.message;
        let message = await this._send(channel, options);
        if (message) this.active = true;
        await this.disableButtons();
        return message;
    }
}

class MessageCollection extends Collection<string, SingletonMessage | SongQueueMessage | NormalMessage> {
    constructor() {
        super();
    }
}

export default MessageCollection;
