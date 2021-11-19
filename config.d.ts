/* eslint-disable @typescript-eslint/naming-convention */
declare module 'config' {
    export default class config {
        token: string;
        prefix: string;
        inactivity: {
            waitRejoinSeconds: number;
            botIdleSeconds: number;
        };
        songManager: {
            softNumLimit: number;
            hardNumLimit: number;
            cacheCleanTimeoutDuration: number;
            metadataRefreshInterval: {
                YouTubeSong?: number;
            }
        };
        allowed: Array<string>;
    }
}
