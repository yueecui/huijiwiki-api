export interface IHuijiwikiCache {
    get(title: string): Promise<string | null>;
    set(title: string, content: string): Promise<void>;
    rename(oldTitle: string, newTitle: string): Promise<void>;
    delete(title: string): Promise<void>;
    compare(title: string, content: string): Promise<boolean>;
}

export class HuijiwikiMemoryCache implements IHuijiwikiCache {
    private cache: Map<string, string> = new Map<string, string>();

    constructor() {}

    // 获取缓存
    public async get(title: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            resolve(this.cache.get(title) || null);
        });
    }

    // 设置缓存
    public async set(title: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.cache.set(title, content);
            resolve();
        });
    }

    // 修改标题
    public async rename(oldTitle: string, newTitle: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const content = this.cache.get(oldTitle);
            if (content) {
                this.cache.delete(oldTitle);
                this.cache.set(newTitle, content);
            }
            resolve();
        });
    }

    // 删除缓存
    public async delete(title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.cache.delete(title);
            resolve();
        });
    }

    // 对比新传入的值和缓存是否相同
    public async compare(title: string, content: string): Promise<boolean> {
        const cache = await this.get(title);
        if (cache === null) {
            return false;
        }
        return cache === content;
    }
}
