export interface MWResponseBase {
    error?: {
        code: string;
        info: string;
        '*': string;
    };
    warnings?: {
        [key: string]: string;
    };
}

export interface MWResponseClientLogin extends MWResponseBase {
    clientlogin: {
        status: string;
        username: string;
        message: string;
    };
}

////////////////////////////////////////
// QUERY
////////////////////////////////////////

export interface MWPage {
    pageid: number;
    ns: number;
    title: string;
}

export interface MWResponseQueryTokens extends MWResponseBase {
    query: {
        tokens: {
            logintoken: string;
            csrftoken: string;
        };
    };
}

export interface MWResponseQueryListAllPages extends MWResponseBase {
    query: {
        allpages: MWPage[];
    };
    /**
     * continue存在表示可以继续查
     * apcontinue是继续查的参数
     */
    continue?: {
        apcontinue: string;
        continue: string;
    };
}

export interface MWResponseQueryListCategoryMembers extends MWResponseBase {
    query: {
        categorymembers: MWPage[];
    };
    continue?: {
        cmcontinue: string;
        continue: string;
    };
}

export interface MWResponseQueryListAllRedirects extends MWResponseBase {
    query: {
        allredirects: {
            fromid: number;
            ns: number;
            title: string;
        }[];
    };
    continue?: {
        arcontinue: string;
        continue: string;
    };
}

export interface MWResponseQueryPropRevisions extends MWResponseBase {
    query: {
        pages: {
            [key: string]: {
                pageid: number;
                ns: number;
                title: string;
                missing?: '';
                invalid?: '';
                invalidreason: string;
                revisions: {
                    slots: {
                        main: {
                            contentmodel: string;
                            contentformat: string;
                            '*': string;
                        };
                    };
                }[];
            };
        };
    };
}

export interface MWResponseQueryMetaSiteInfo extends MWResponseBase {
    query: {
        general: {
            sitename: string;
            base: string;
            server: string;
            favicon: string;
            prefix: string;
            description: string;
            avatar: {
                l: string;
                ml: string;
                m: string;
                s: string;
            };
            avatartime: number;
        };
        namespaces: {
            [key: string]: {
                id: number;
                case: string;
                content?: string;
                canonical?: string;
                '*': string;
            };
        };
    };
}

export interface MWResponseAsk<T = any> extends MWResponseBase {
    /**
     * continue时的参数
     */
    'query-continue-offset'?: number;
    query: {
        results: {
            [key: string]: {
                /**
                 * 查询的结果区
                 */
                printouts: {
                    [key: string]: T;
                };
                /**
                 * 存储数据的条目名称
                 * 如果是子属性，最后会有 #子属性名
                 */
                fulltext: string;
                /**
                 * 存储数据的页面地址
                 * 如果是子属性，最后会有 #子属性名
                 */
                fullurl: string;
                /**
                 * 命名空间ID
                 */
                namespace: number;
                exists: string;
                /**
                 * 存储数据条目的显示标题
                 */
                displaytitle: string;
            };
        }[];
    };
}

export interface MWResponsePurge extends MWResponseBase {
    purge: {
        [key: string]: {
            ns: number;
            title: string;
            purged: boolean;
        };
    };
}

////////////////////////////////////////
// 编辑相关
////////////////////////////////////////

export interface MWResponseEdit extends MWResponseBase {
    edit: {
        result: string;
        pageid: number;
        title: string;
        contentmodel: string;
        oldrevid?: number;
        newrevid?: number;
        newtimestamp?: string;
        nochange?: string;
    };
}

export interface MWResponseUpload extends MWResponseBase {
    upload: {
        result: string;
        filename: string;
    };
}

export interface MWResponseDelete extends MWResponseBase {
    delete: {
        title: string;
        reason: string;
    };
}

export interface MWResponseUndelete extends MWResponseBase {
    undelete: {
        title: string;
        reason: string;
    };
}

export interface MWResponseMove extends MWResponseBase {
    move: {
        from: string;
        to: string;
        reason: string;
    };
}
