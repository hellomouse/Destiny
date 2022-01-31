import { FlagHelpError } from './utils.js';
import type { Message } from 'discord.js';

const enum COMMAMD_REQUIREMENTS {
    // Enums for command requirements
    // Multiple requirements can be ORed together
    REQUIRE_QUEUE_NON_EMPTY = 1,
    REQUIRE_IS_PLAYING = 2,
    REQUIRE_USER_IN_VC = 4
}

export function hasEnoughArgs(args: Array<string>, message: Message) {
    if (!args[0] && message.attachments.size === 0)
        throw new FlagHelpError();
}

// argument class or type? no clue
// argument position, optional, necessary flags?
// if we have position does it make sense to only have one??????/
// setExample()
// but if we're doing this, wouldn't it be useful in a commandbuilder?
export enum CommandArgumentNecessity {
    Optional = 0,
    Necessary = 1
}

export class CommandArgument {
    public name: string;
    public necessity: CommandArgumentNecessity;
    constructor(name: string, necessity: CommandArgumentNecessity) {
        this.name = name;
        this.necessity = necessity;
    }
}

// TODO, command category, can't we merge this with Command?
export class CommandHelpProvider {
    private name: string;
    private syntax: Array<CommandArgument>;
    private helpText: string;
    private description: string;
    private static prefix: string;
    private examples: Array<string>; // will change to class???
    constructor(name: string) {
        this.name = name;
        this.syntax = [];
        this.description = '';
        this.helpText = '';
        this.examples = [];
    }

    static setPrefix(prefix: string) {
        CommandHelpProvider.prefix = prefix;
    }

    /**
     * Builds the help text
     * @returns {this}
     */
    build() {
        let builtSyntax = CommandHelpProvider.prefix + this.name + ' ' +
            this.syntax.map(argument => argument.necessity ? `<${argument.name}>` : `[${argument.name}]`).join(' ');
        /* eslint-disable @typescript-eslint/indent */
        this.helpText = `
**${CommandHelpProvider.prefix}${this.name}**

${this.description}

Syntax: 
    ${builtSyntax}
        `;
        /* eslint-enable @typescript-eslint/indent */

        if (this.examples) {
            this.helpText + `
                Usage Examples:
                `;

            for (let example of this.examples)
                this.helpText + ' - ' + example + '\n';
        }


        return this;
    }

    /**
     * Return help text
     */
    get text() {
        return this.helpText;
    }

    setSyntax(syntax: Array<CommandArgument>) {
        this.syntax = syntax;
        return this;
    }

    setDescription(description: string) {
        this.description = description;
        return this;
    }

    getDescription() {
        return this.description;
    }

    setSwitchParameter(name: string, shorthand: string, argument: CommandArgument ) {

    }

    setExampleUsage() {

    }

    getSyntax() {
        return this.syntax;
    }
}

export default COMMAMD_REQUIREMENTS;
