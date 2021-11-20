import { Client as DiscordClient, Message } from 'discord.js';
import Enmap from 'enmap';

export interface Command {
    requirements?: number;
    run: (client: Client, message: Message, args: Array<string>) => Promise<Message | void>;
    help: {
        desc: string;
        syntax: string;
    };
    names: string | string[];
}

export interface Client extends DiscordClient {
    lastToken: null;
    _events: unknown;
    commands: Enmap<string, Command>;
}
