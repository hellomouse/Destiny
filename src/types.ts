import { Client as DiscordClient, Message } from 'discord.js';
import Enmap from 'enmap';
import { CommandHelpProvider } from './commands';
import { configHandler } from './configHandler';

export interface Command {
    requirements?: number;
    run: (client: Client, message: Message, args: Array<string>) => Promise<Message | void>;
    postLoad?: (client: Client) => void;
    alias?: boolean;
    help: CommandHelpProvider;
    names: string | Array<string>;
}

export interface Client extends DiscordClient {
    config: Awaited<ReturnType<typeof configHandler>>;
    lastToken: string | null;
    _events: unknown;
    commands: Enmap<string, Command>;
}

export type TextLikeChannels = Message['channel'];
