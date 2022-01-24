/* eslint-disable @typescript-eslint/naming-convention */
declare module 'ascii-table' {
    export default class AsciiTable {
        addRow(arg0: string, arg1: string): void;
        render(): string;
        constructor(title: string);
        VERSION: string;
        LEFT: number;
        CENTER: number;
        RIGHT: number;
        factory: (title: string) => AsciiTable;
        align: (dir: number, str: string, len: number, padding: number) => string;
        alignLeft: (str: string, len: number, pad: number) => string;
        alignCenter: (str: string, len: number, pad: number) => string;
        alignRight: (str: string, len: number, pad: number) => string;
        alignAuto: (str: string, len: number, pad: number) => string;
        arrayFill: <T = any>(len: number, fill: T) => Array<T>;
        clear(title: string): AsciiTable;
        setBorder(edge: string, fill: string, top: string, bottom: string): AsciiTable;
        removeBorder(): AsciiTable;
        setAlign(idx: number, dir: number): AsciiTable;
        title(title: string): AsciiTable;
        getTitle(): string;
        setTitleAlign(dir: number): AsciiTable;
        sort(): AsciiTable;
        sortColumn(idx: number, method: Function): AsciiTable;
        setHeading(...args: Array<string>): AsciiTable;
        getHeading(): Array<string>;
        setHeadingAlign(dir: number): AsciiTable;

    }
}
