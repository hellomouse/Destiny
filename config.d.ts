/* eslint-disable @typescript-eslint/naming-convention */
export default interface Config {
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
    inactivity?: {
        waitRejoinSeconds?: number;
        botIdleSeconds?: number;
    };
    allowed: Array<string>;
};
