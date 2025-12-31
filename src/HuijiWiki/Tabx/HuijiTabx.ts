import Ajv from 'ajv';
import type { JSONSchema } from 'json-schema-to-ts';
import { readFile, utils, writeFile } from 'xlsx';
import type { HuijiWiki } from '../HuijiWiki.js';
import { HuijiTabxRawSchame, type HuijiTabxRaw } from './type.js';

export class HuijiTabx<T extends Record<string, any> = Record<string, any>> {
    public data: T[];
    public mainKeyName: string;
    private description: string;
    private sources: string;
    private rowSchame;

    private constructor(private raw: HuijiTabxRaw) {
        this.mainKeyName = raw.schema.fields[0].title.en;
        this.rowSchame = {
            type: 'object',
            additionalProperties: false,
            properties: (() => {
                const properties: Record<string, JSONSchema> = {};
                raw.schema.fields.forEach((field) => {
                    if (['string', 'number', 'boolean'].includes(field.type)) {
                        properties[field.title.en] = { type: ['null', field.type as 'string' | 'number' | 'boolean'] };
                    } else {
                        throw new Error(`Invalid field type, field: ${field.title.en}`);
                    }
                });
                return properties;
            })(),
            required: [this.mainKeyName],
        } satisfies JSONSchema;
        this.data = this.convertTabxRawToData<T>(raw);
        this.description = raw.description?.en ?? '';
        this.sources = raw.sources ?? '';
    }

    static newFromJson(json: any): HuijiTabx {
        return new HuijiTabx(validateJsonIsTabx(json));
    }

    static async newFromWiki(wiki: HuijiWiki, title: string) {
        const response = await wiki.getPageRawTextByTitle(title);
        if (!response) throw new Error('Failed to get page content');

        return new HuijiTabx(validateJsonIsTabx(response.content));
    }

    static newFromXlsxFile(filePath: string, description: string = '', sources: string = '') {
        const workbook = readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        const fields: HuijiTabxRaw['schema']['fields'] = json[0].map((field) => {
            return {
                name: field.toString().replace(/\[\]$/, ''),
                type: '',
                title: { en: field.toString() },
            };
        });
        json.shift();

        for (const row of json) {
            // 根据第一个遇到的值的类型推断field的类型
            for (let i = 0; i < fields.length; i++) {
                if (fields[i].type === '') {
                    const value = row[i];
                    if (typeof value === 'string') {
                        fields[i].type = 'string';
                    } else if (typeof value === 'number') {
                        fields[i].type = 'number';
                    } else if (typeof value === 'boolean') {
                        fields[i].type = 'boolean';
                    }
                }
            }
            if (fields.every((field) => field.type !== '')) {
                break;
            }
        }

        const raw: HuijiTabxRaw = {
            license: 'CC0-1.0',
            description: { en: description },
            sources,
            schema: { fields },
            data: json,
        };

        return new HuijiTabx(raw);
    }

    setMainKeyName(mainKeyName: string) {
        if (!this.raw.schema.fields.find((field) => field.title.en === mainKeyName)) {
            throw new Error('Invalid field name');
        }
        this.mainKeyName = mainKeyName;
        this.rowSchame.required = [mainKeyName];
    }

    setDesciption(description: string) {
        this.description = description;
    }

    setSources(sources: string) {
        this.sources = sources;
    }

    convertTabxRawToData<T>(raw: HuijiTabxRaw): T[] {
        return raw.data.map((row) => {
            const obj: Record<string, any> = {};
            raw.schema.fields.forEach((field, i) => {
                obj[field.title.en] = row[i];
            });
            this.validateRow(obj);
            return obj as T;
        });
    }

    /**
     * 验证一行数据是否符合schema，不符合则抛出异常
     * @param row 一行数据
     */
    validateRow(row: Record<string, any>): void {
        const ajv = new Ajv();
        const validator = ajv.compile(this.rowSchame);
        if (!validator(row)) {
            throw new Error(ajv.errorsText(validator.errors));
        }
    }

    getRow(key: string): T | undefined {
        return this.data.find((row) => row[this.mainKeyName] === key);
    }

    addRow(row: T): boolean {
        this.validateRow(row);
        this.data.push(row);
        return true;
    }

    updateRow(key: string, row: T): boolean {
        this.validateRow(row);
        const index = this.data.findIndex((r) => r[this.mainKeyName] === key);
        if (index === -1) return false;

        this.data[index] = row;
        return true;
    }

    deleteRow(key: string): boolean {
        const index = this.data.findIndex((r) => r[this.mainKeyName] === key);
        if (index === -1) return false;

        this.data.splice(index, 1);
        return true;
    }

    exportRaw(): HuijiTabxRaw {
        return {
            license: this.raw.license,
            description: {
                en: this.description,
            },
            sources: this.sources,
            schema: this.raw.schema,
            data: this.data.map((row) => {
                return this.raw.schema.fields.map((field) => row[field.title.en] ?? null);
            }),
        };
    }

    saveAsXlsx(filePath: string) {
        const workbook = utils.book_new();
        const sheet = utils.aoa_to_sheet([
            this.raw.schema.fields.map((field) => field.title.en),
            ...this.data.map((row) => this.raw.schema.fields.map((field) => row[field.title.en] ?? null)),
        ]);

        sheet['!autofilter'] = {
            ref: utils.encode_range({
                s: { r: 0, c: 0 },
                e: { r: 0, c: this.raw.schema.fields.length - 1 },
            }),
        };
        utils.book_append_sheet(workbook, sheet, 'Sheet1');
        writeFile(workbook, filePath);
    }
}

const validateJsonIsTabx = (json: any) => {
    if (typeof json === 'string') {
        try {
            json = JSON.parse(json);
        } catch (e) {
            throw new Error('Invalid JSON string');
        }
    }

    if (typeof json !== 'object') {
        throw new Error('Invalid JSON object');
    }

    const ajv = new Ajv();
    const validator = ajv.compile(HuijiTabxRawSchame);
    const valid = validator(json);
    if (!valid) {
        throw new Error(ajv.errorsText(validator.errors));
    }

    return json as HuijiTabxRaw;
};
