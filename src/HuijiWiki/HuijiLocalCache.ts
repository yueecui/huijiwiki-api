import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

interface LocalCache {
    title: string;
    content: string;
}

export class HuijiLocalCache {
    private prefix: string;
    private sqlite: sqlite3.Database;

    constructor(prefix: string, sqlPath: string = '') {
        this.prefix = prefix;
        if (sqlPath === '') {
            // 使用内存模式
            this.sqlite = new sqlite3.Database(':memory:', (err) => {
                if (err) {
                    console.error(`[HuijiLocalCache] ${err.message}`);
                }
            });
        } else {
            // 文件所在目录不存在时则创建
            // 获取文件的目录
            const dirPath = path.dirname(sqlPath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }

            sqlite3.verbose();

            this.sqlite = new sqlite3.Database(sqlPath, (err) => {
                if (err) {
                    console.error(`[HuijiLocalCache] ${err.message}`);
                }
            });
        }

        this.init();
    }

    private init() {
        // 如果没有表则创建表
        // 表名： prefix
        // 字段： title(varbinary 255), content (blob)
        this.sqlite.run(`CREATE TABLE IF NOT EXISTS ${this.prefix} (
            title varbinary(255) NOT NULL,
            content blob NOT NULL,
            PRIMARY KEY (title)
            )`);
    }

    // 获取缓存
    public async get(title: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            this.sqlite.get<LocalCache>(`SELECT content FROM ${this.prefix} WHERE title = ?`, title, (err, row) => {
                if (err) {
                    reject(err);
                }
                if (row) {
                    resolve(row.content.toString());
                } else {
                    resolve(null);
                }
            });
        });
    }

    // 设置缓存
    public async set(title: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sqlite.run(
                `INSERT OR REPLACE INTO ${this.prefix} (title, content) VALUES (?, ?)`,
                title,
                content,
                (err: Error) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    // 修改标题
    public async rename(oldTitle: string, newTitle: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sqlite.run(`UPDATE ${this.prefix} SET title = ? WHERE title = ?`, newTitle, oldTitle, (err: Error) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    // 删除缓存
    public async delete(title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sqlite.run(`DELETE FROM ${this.prefix} WHERE title = ?`, title, (err: Error) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
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
