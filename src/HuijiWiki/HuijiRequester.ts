import axios from 'axios';
import FormData from 'form-data';
import { HuijiCookies } from './HuijiCookie';
import { MWResponseBase, MWResponseUpload } from './typeMWApiResponse';

type RequestParams = { action: string; method?: 'GET' | 'POST' } & Record<string, any>;

export class HuijiRequester {
    private prefix: string;
    private apiUrl: string;
    private cookie: HuijiCookies;
    private csrftoken: string = '';
    private headers: Record<string, string>;
    private userAgent: string = 'Huiji bot/0.0.1';

    /** 请求计数器 */
    private reqIndex: number = 0;

    private lastResult: any;
    private maxRetryCount = 3;

    constructor(prefix: string) {
        this.prefix = prefix;
        this.apiUrl = `https://${prefix}.huijiwiki.com/api.php`;
        this.cookie = new HuijiCookies();
        this.headers = {};
    }

    static getMethod(params: RequestParams) {
        if (params.action === 'query') {
            return 'GET';
        }
        if (params.action === 'parse' && !params.text) {
            return 'GET';
        }
        return 'POST';
    }

    setMaxRetryCount(count: number) {
        this.maxRetryCount = count;
    }

    setUserAgent(userAgent: string) {
        this.userAgent = userAgent;
    }

    async get<T extends MWResponseBase = MWResponseBase>(params: RequestParams): Promise<T> {
        return await this.request(params, 'GET');
    }

    async post<T extends MWResponseBase = MWResponseBase>(params: RequestParams): Promise<T> {
        return await this.request(params, 'POST');
    }

    async request<T extends MWResponseBase = MWResponseBase>(
        params: RequestParams,
        method?: 'GET' | 'POST'
    ): Promise<T> {
        this.reqIndex++;
        params.format = 'json';
        params.utf8 = '1';
        if (!method) {
            method = HuijiRequester.getMethod(params);
        }
        return await this.execute<T>(params, method, 0);
    }

    private async execute<T extends MWResponseBase = MWResponseBase>(
        params: RequestParams,
        method: 'GET' | 'POST',
        retryCount: number
    ): Promise<T> {
        const res = method === 'GET' ? await this.handleGet<T>(params) : await this.handlePost<T>(params);
        if (res.status === 200) {
            this.cookie.setCookies(res.headers['set-cookie'] || []);
            this.lastResult = res.data;
            return this.lastResult;
        } else {
            if (retryCount < this.maxRetryCount) {
                retryCount++;
                return await this.execute<T>(params, method, retryCount);
            } else {
                throw new Error(`Request failed with status code ${res.status}`);
            }
        }
    }

    private async handleGet<T = MWResponseBase>(params: RequestParams) {
        return await axios.request<T>({
            url: this.apiUrl + '?' + new URLSearchParams(params),
            method: 'GET',
            headers: {
                ...this.headers,
                'User-Agent': this.userAgent,
                cookie: this.cookie.getCookies(),
            },
        });
    }

    private async handlePost<T = MWResponseBase>(params: RequestParams) {
        if (params.action === 'upload') {
            return await this.handleUpload(params);
        }
        return await axios.request<T>({
            url: this.apiUrl,
            method: 'POST',
            data: new URLSearchParams(params),
            headers: {
                ...this.headers,
                'User-Agent': this.userAgent,
                cookie: this.cookie.getCookies(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    }

    private async handleUpload(params: RequestParams) {
        const formData = new FormData();
        for (const key in params) {
            if (key === 'file') {
                formData.append(key, params[key], params.filename);
            } else {
                formData.append(key, params[key]);
            }
        }
        return await axios.request<MWResponseUpload>({
            url: this.apiUrl,
            method: 'POST',
            data: formData,
            headers: {
                ...this.headers,
                'User-Agent': this.userAgent,
                cookie: this.cookie.getCookies(),
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    getLastResult() {
        return this.lastResult;
    }
}
