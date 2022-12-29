enum LOG_LEVEL {
    INFO = 10,
    WARN = 20,
    ERROR = 30,
    NONE = 1000,
}

declare interface HuijiWiki {
    constructor(prefix: string, logLevel?: LOG_LEVEL): void;
    log(msg: string, level: LOG_LEVEL = LOG_LEVEL.INFO): void;
    warn(msg: string): void;
    error(msg: string): void;
    setLogLevel(logLevel: LOG_LEVEL): void;

    getLastErrorMessage(): string;
    setUserAgent(userAgent: string): void;

    login(username: string, password: string): Promise<boolean>;
    getCsrfToken(): Promise<string>;
    edit(title: string, content: string, options?: { isBot?: boolean; summary?: string }): Promise<boolean>;
}
