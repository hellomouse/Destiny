import { Client as DiscordClient, Message } from 'discord.js';
import Enmap from 'enmap';

export interface Command {
    requirements?: number;
    run: (client: Client, message: Message, args: Array<string>) => Promise<Message | void>;
    postLoad?: (client: Client) => void;
    alias?: boolean;
    help: {
        desc: string;
        syntax: string;
    };
    names: string | Array<string>;
}

export interface Client extends DiscordClient {
    lastToken: null;
    _events: unknown;
    commands: Enmap<string, Command>;
}
