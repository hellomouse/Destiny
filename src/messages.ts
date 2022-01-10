import { Collection, Message, MessageOptions, MessagePayload } from 'discord.js';

class CustomMessage {
    protected message: Message<boolean> | undefined;
    constructor() {
        this.message = undefined;
    }

    async _send(channel: Message['channel'], options: string | MessagePayload | MessageOptions) {
        this.message = await channel.send(options);
        return this.message;
    }

    async send(channel: Message['channel'], options: string | MessagePayload | MessageOptions) {
        this._send(channel, options);
        return this.message;
    }
}

/**
 * When a new message is sent, delete the previous one
 */
export class SingletonMessage extends CustomMessage {
    constructor() {
        super();
    }

    async send(channel: Message['channel'], options: string | MessagePayload | MessageOptions) {
        if (this.message) this.message.delete().catch(err => console.log(err));
        return await this._send(channel, options);
    }
}

export class SongQueueMessage extends CustomMessage {
    private previousMessage: Message<boolean> | undefined;
    constructor() {
        super();
    }

    // Disable buttons for the previous song queue message
    async disableButtons() {
        if (!this.previousMessage) return;

        this.previousMessage.components[0].components.forEach(
            button => button.setDisabled(true)
        );

        this.previousMessage.edit({ components: this.previousMessage.components }).catch(console.error);
    }

    async send(channel: Message['channel'], options: string | MessagePayload | MessageOptions) {
        // TODO: Figure out why DiscordAPIError is thrown.
        // We send a new message, and disable the buttons on the previous message
        this.previousMessage = this.message;
        let message = await this._send(channel, options);
        await this.disableButtons();
        return message;
    }
}

class MessageCollection extends Collection<string, SingletonMessage | SongQueueMessage> {
    constructor() {
        super();
    }
}

export default MessageCollection;
