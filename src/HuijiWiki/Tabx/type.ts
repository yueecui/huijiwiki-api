import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export const HuijiTabxRawSchame = {
    type: 'object',
    additionalProperties: false,
    properties: {
        license: { type: 'string' },
        description: {
            type: 'object',
            additionalProperties: false,
            properties: {
                zh: { type: 'string' },
                en: { type: 'string' },
            },
        },
        sources: { type: 'string' },
        schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                fields: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            name: { type: 'string' },
                            type: { type: 'string' },
                            title: {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    zh: { type: 'string' },
                                    en: { type: 'string' },
                                },
                                required: ['en'],
                            },
                        },
                        required: ['name', 'type', 'title'],
                    },
                },
            },
            required: ['fields'],
        },
        data: {
            type: 'array',
            items: {
                type: 'array',
                items: {
                    type: ['string', 'number', 'boolean', 'null'],
                },
            },
        },
    },
    required: ['schema', 'data'],
} as const satisfies JSONSchema;

export type HuijiTabxRaw = FromSchema<typeof HuijiTabxRawSchame>;

