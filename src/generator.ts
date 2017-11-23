import { render } from 'preact-render-to-string';
import { ComponentConstructor, h } from 'preact';
import * as Path from 'path';
import * as fs from 'mz/fs';

function isString(a: any): a is any {
    return typeof a === 'string';
}

export type destination = string | ((config: FileConfig) => string);

export interface FileConfig {
    path: string;
    name?: string;
    props?: any;
}

export interface Config {
    base?: string;
    files: FileConfig[];
    dest: destination;
    keep?: boolean;
}

interface Export {
    input: string;
    output?: string;
    content?: Buffer;
}

export interface Results {
    errors: { error: Error, file: Export }[];
    results: Export[];
}

function generate_file(config: FileConfig) {

    const module = require(config.path);

    let component: ComponentConstructor<any, any> | undefined;

    if (config.name) {
        component = module[config.name];
    } else if (typeof module === 'function') {
        component = module;
    } else if (typeof module.default === 'function') {
        component = module.default;
    } else {
        for (const key in module) {
            if (!module.hasOwnProperty(key))
                continue;
            if (typeof module[key] === 'function') {
                try {
                    return new Buffer(render(h(module[key], config.props)));
                } catch (e) {
                    continue;
                }
            }
        }
    }

    if (!component) {
        throw ReferenceError(`component '${config.name}'`);
    }

    return new Buffer(render(h(component, config.props)));

}

function get_destination(config: Config, file: FileConfig) {
    if (typeof config.dest === 'function') {
        return config.dest(file);
    }


    const fileName = Path.basename(file.path, Path.extname(file.path)),

        base = config.keep ? Path.dirname(file.path).replace(config.base!, '')
            : config.dest;

    return Path.join(base, fileName) + '.html';
}

function validate_config(config: Config) {
    if (!config) throw new Error('no config');
    if (!config.files || !config.files.length) throw new Error('files is empty');

    if (!config.base) config.base = process.cwd();

    if (isString(config.dest) && !Path.isAbsolute(config.dest as string))
        config.dest = Path.resolve(process.cwd(), config.dest);
    return config;
}



export async function generate(config: Config, write: boolean = true): Promise<Results> {

    config = validate_config(config);

    var errors: { error: Error, file: Export }[] = [];

    const files = config.files
        .map(m => {
            try {
                return {
                    input: m.path,
                    output: get_destination(config, m),
                    content: generate_file(m)
                };
            } catch (error) {
                errors.push({ error, file: { input: m.path } })
            }
            return void 0;
        }).filter(m => m != void 0)
        .map(file => {
            if (!write) return file;
            return fs.writeFile(file!.output, file!.content, 'utf8')
                .then(_ => file)
                .catch(error => {
                    errors.push({ error, file } as any);
                    return void 0;
                });
        })


    const results = (await Promise.all(files)).filter(m => m != void 0);

    return { results, errors } as Results;

}