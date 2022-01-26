import { Client as DiscordClient, Message } from 'discord.js';
import Enmap from 'enmap';
import { configHandler } from './configHandler';

export interface Command {
    requirements?: number;
    run: (client: Client, message: Message, args: Array<string>) => Promise<Message | void>;
    postLoad?: (client: Client) => void;
    alias?: boolean;
    help: {
        desc: string,
        syntax: string,
        detailed: string
    };
    names: string | Array<string>;
}

export interface Client extends DiscordClient {
    config: Awaited<ReturnType<typeof configHandler>>;
    lastToken: string | null;
    _events: unknown;
    commands: Enmap<string, Command>;
}
