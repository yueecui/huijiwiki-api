import { readFileSync } from 'fs';
import { HuijiRequester } from './HuijiRequester';
import {
    MWPage,
    MWResponseAsk,
    MWResponseClientLogin,
    MWResponseQueryAllPages,
    MWResponseQueryCategoryMembers,
    MWResponseQueryTokens,
    MWResponseUpload,
} from './typeMWApiResponse';

enum LOG_LEVEL {
    INFO = 10,
    WARN = 20,
    ERROR = 30,
    NONE = 1000,
}

export class HuijiWiki {
    private prefix: string;
    private huijiRequester: HuijiRequester;
    private csrfToken: string = '';
    /** 登录的用户名，可供显示 */
    private username: string = '';
    private lastError: string = '';

    /** 登录用的用户名缓存 */
    private loginUsername: string = '';
    /** 登录用的密码缓存 */
    private loginPassword: string = '';

    private logLevel: LOG_LEVEL;

    constructor(prefix: string, logLevel?: LOG_LEVEL) {
        this.prefix = prefix;
        this.huijiRequester = new HuijiRequester(prefix);
        this.logLevel = logLevel ?? LOG_LEVEL.INFO;
    }

    log(msg: string, level: LOG_LEVEL = LOG_LEVEL.INFO) {
        if (level < this.logLevel) {
            return;
        }
        switch (level) {
            case LOG_LEVEL.INFO:
                console.log(msg);
                break;
            case LOG_LEVEL.WARN:
                console.warn(msg);
                break;
            case LOG_LEVEL.ERROR:
                this.lastError = msg;
                console.error(msg);
                break;
            default:
                console.log(msg);
                break;
        }
    }

    warn(msg: string) {
        this.log(msg, LOG_LEVEL.WARN);
    }

    error(msg: string) {
        this.log(msg, LOG_LEVEL.ERROR);
    }

    getLastErrorMessage() {
        return this.lastError;
    }

    setUserAgent(userAgent: string) {
        this.huijiRequester.setUserAgent(userAgent);
    }

    setLogLevel(level: LOG_LEVEL) {
        this.logLevel = level;
    }

    async login(username: string, password: string) {
        username = username.trim();
        password = password.trim();
        let loginToken = '';
        {
            const resToken = await this.huijiRequester.request<MWResponseQueryTokens>({
                action: 'query',
                meta: 'tokens',
                type: 'login',
            });
            loginToken = resToken.query.tokens.logintoken;
        }
        {
            const resLogin = await this.huijiRequester.request<MWResponseClientLogin>({
                action: 'clientlogin',
                username: username,
                password: password,
                logintoken: loginToken,
                loginreturnurl: `https://${this.prefix}.huijiwiki.com`,
                rememberMe: '1',
            });
            if (resLogin.clientlogin.status === 'PASS') {
                this.username = resLogin.clientlogin.username;
                // 记录下以备后续重新登录用
                this.loginUsername = username;
                this.loginPassword = password;
                this.log(`登录成功，用户名：${this.username}`);
                return true;
            } else {
                this.error(`登录失败，错误信息：${resLogin.clientlogin.message}`);
                return false;
            }
        }
    }

    async queryCsrfToken(): Promise<string> {
        if (this.csrfToken !== '') {
            return this.csrfToken;
        }
        const res = await this.huijiRequester.request<MWResponseQueryTokens>({
            action: 'query',
            meta: 'tokens',
        });
        this.csrfToken = res.query.tokens.csrftoken;
        if (this.csrfToken === '+\\') {
            this.csrfToken = '';
            // 尝试重新登录
            if (this.loginUsername !== '' && this.loginPassword !== '') {
                if (await this.login(this.loginUsername, this.loginPassword)) {
                    return await this.queryCsrfToken();
                } else {
                    this.loginUsername = '';
                    this.loginPassword = '';
                    this.error('获取 CSRF Token 失败，且尝试重新登录失败');
                }
            } else {
                this.error('获取 CSRF Token 失败：因为没有登录');
            }
        }
        return this.csrfToken;
    }

    /**
     * 编辑一个条目
     * @param title 条目标题
     * @param text 条目内容
     * @param options 选项
     * @returns API 返回值
     */
    async edit(title: string, text: string, options?: { isBot?: boolean; summary?: string }) {
        const csrfToken = await this.queryCsrfToken();
        if (csrfToken === '') {
            this.error('编辑失败，因为 CSRF Token 为空');
            return;
        }
        options = options || {};
        const isBot = options.isBot ?? true;
        const summary = options.summary ?? 'Huiji Bot 编辑';

        return await this.huijiRequester.request({
            action: 'edit',
            title: title,
            text: text,
            summary: summary,
            token: csrfToken,
            ...(isBot ? { bot: '1' } : {}),
        });
    }

    /**
     * Query AllPages API
     * @param filter 需要查询的条件
     * @param options 选项
     * @returns API 返回值
     */
    async queryAllPages(
        filter?: {
            namespace?: number;
            // 以后需要别的再加
        },
        options?: { limit?: number; continue?: string }
    ) {
        options = options || {};
        const limit = options.limit ?? 500;
        const finalFilter = {} as { [key: string]: string | number };
        if (filter?.namespace !== undefined) {
            finalFilter['apnamespace'] = filter.namespace;
        }

        return await this.huijiRequester.request<MWResponseQueryAllPages>({
            action: 'query',
            list: 'allpages',
            ...finalFilter,
            aplimit: limit,
            ...(options.continue ? { apcontinue: options.continue } : {}),
        });
    }

    /**
     * 通过命名空间ID查询条目
     * @param namespace 命名空间ID
     * @param options 选项
     * @returns API 返回值
     */
    async getPageListByNamespace(namespace: number, options?: { limit?: number; continue?: string }) {
        const res = await this.queryAllPages({ namespace: namespace }, options);
        return {
            pages: res.query.allpages,
            continue: res.continue?.apcontinue ?? '',
        };
    }

    /**
     * Query CategoryMembers API
     * @param filter 需要查询的条件
     * @param options 选项
     * @returns API 返回值
     */
    async queryCategoryMembers(
        filter?: {
            category?: string;
        },
        options?: { limit?: number; continue?: string }
    ) {
        options = options || {};
        const limit = options.limit ?? 500;
        const finalFilter = {} as { [key: string]: string | number };
        if (filter?.category !== undefined) {
            finalFilter['cmtitle'] = `Category:${filter.category}`;
        }

        return await this.huijiRequester.request<MWResponseQueryCategoryMembers>({
            action: 'query',
            list: 'categorymembers',
            ...finalFilter,
            cmlimit: limit,
            ...(options.continue ? { cmcontinue: options.continue } : {}),
        });
    }

    /**
     * 通过分类名查询条目
     * @param category 分类名称
     * @param options 选项
     * @returns API 返回值
     */
    async getPageListByCategory(category: string, options?: { limit?: number; continue?: string }) {
        const res = await this.queryCategoryMembers({ category: category }, options);
        return {
            pages: res.query.categorymembers,
            continue: res.continue?.cmcontinue ?? '',
        };
    }

    /**
     * Ask API
     */
    async ask(query: string) {
        return await this.huijiRequester.request<MWResponseAsk>({
            action: 'ask',
            query: query,
            api_version: '3',
        });
    }

    /**
     * 通过SMW查询条目
     */
    async getPageListBySMW(query: string, options?: { limit?: number; offset?: number }) {
        const queryArray = [query];
        queryArray.push(`limit=${options?.limit ?? 500}`);
        queryArray.push(`offset=${options?.offset ?? 0}`);

        const res = await this.ask(queryArray.join('|'));
        const pageList = [] as MWPage[];
        for (const pageInfoTop of res.query.results) {
            for (const pageName in pageInfoTop) {
                const pageInfo = pageInfoTop[pageName];
                pageList.push({
                    pageid: -1,
                    title: pageInfo.fulltext,
                    ns: pageInfo.namespace,
                });
            }
        }
        return {
            pages: pageList,
            continue: res['query-continue-offset'] ?? -1,
        };
    }

    // MOVE

    /**
     * upload API
     * @param file 上传的文件Buffer
     * @param filename 上传的文件名
     * @param options 选项
     * @returns API 返回值
     */
    async upload(file: Buffer, filename: string, options?: { comment?: string; text?: string }) {
        const csrfToken = await this.queryCsrfToken();
        if (csrfToken === '') {
            this.error('编辑失败，因为 CSRF Token 为空');
            return;
        }
        return await this.huijiRequester.request<MWResponseUpload>({
            action: 'upload',
            filename: filename,
            token: csrfToken,
            ignorewarnings: '1',
            comment: options?.comment ?? '',
            text: options?.text ?? '',
            file: file,
        });
    }

    /**
     * 上传图片
     * @param filepath 需要上传的文件路径
     * @param filename 上传的文件名
     * @param options 选项
     * @returns API 返回值
     */
    async uploadImage(filepath: string, filename: string, options?: { comment?: string; text?: string }) {
        let file: Buffer;
        try {
            file = readFileSync(filepath);
        } catch (e) {
            this.error(`读取文件失败：${filepath}`);
            return;
        }

        return await this.upload(file, filename, options);
    }

    // 回退编辑

    // 删除条目

    // 恢复删除

    // 获取源代码 RAW

    // 刷新页面缓存 / 空编辑

    // 获取重定向
}
