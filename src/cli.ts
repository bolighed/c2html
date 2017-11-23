
import { generate, Config, Results } from './generator';
import * as Path from 'path';
import * as fs from 'mz/fs';
import { safeLoad } from 'js-yaml';
import * as yargs from 'yargs';
import { Writable } from 'stream'


async function read_yaml(path: string) {
    return safeLoad((await fs.readFile(path)).toString('utf8'));
}

async function read_js(path: string) {
    const js = require(path);
    return js.default ? js.default : js; // allow es6
}

async function read_config(path: string) {

    const extname = Path.extname(path);
    switch (extname) {
        case ".yaml":
        case ".yml":
            return await read_yaml(path);
        case ".json":
            return require(path);
        case ".js":
            return read_js(path);
    }

}

function printandExit(ctx: string, err: Error, status = 200): never {
    console.error(`${ctx}: ${err.message}`);
    return process.exit(status);
}

function write_report(_: Config, results: Results, stream: Writable) {

    stream.write("Report:\n");
    const n = (n: string) => Path.relative(process.cwd(), n)

    for (const result of results.results) {
        stream.write(`  successfully created: ./${n(result.input)} => ./${n(result.output!)}\n`);
    }

    for (const error of results.errors) {
        stream.write(`  could not generate: './${n(error.file.input)}'\n`);
        stream.write(`    ${error.error.message}\n`);
    }
}

const supported_files = "js jsx".split(' ').map(m => '.' + m);

async function resolve_config(argv: yargs.Arguments) {
    let configFile = argv.config;

    if (!configFile && !argv._.length) {
        yargs.showHelp();
        process.exit(1);
    }

    let config: Config;
    if (configFile) {
        if (!Path.isAbsolute(configFile)) {
            try {
                configFile = Path.resolve(process.cwd(), configFile);
            } catch (e) {
                printandExit("Could not resolve config-file path", e);
            }
        }

        try {
            config = await read_config(configFile);
        } catch (e) {
            return printandExit("Could not read config", e);
        }
    } else {
        try {
            config = {
                files: argv._
                    .filter(p => !!~supported_files.indexOf(Path.extname(p)))
                    .map(m => {
                        if (!Path.isAbsolute(m)) {
                            return Path.resolve(process.cwd(), m);
                        }
                        return m;
                    })
                    .map(path => ({ path })),
                dest: argv.output
            }
        } catch (e) {
            return printandExit("Could not read file", e);
        }
    }

    return config;
}

async function ensure_dest(config: Config, stream?: Writable) {
    if (typeof config.dest === 'function') return;

    try {
        await fs.mkdir(config.dest);
        stream ? stream.write("Created directory\n") : void 0;
    } catch (e) {
        if (e.code !== 'EEXIST') {
            throw e;
        }
    }
}

export async function run(): Promise<any> {

    const argv = yargs.option("config", {
        alias: 'c',
        required: false,
        describe: "path to config file, which can be of type: yaml, json, or javascript"
    })
        .option('output', {
            alias: 'o',
            default: 'output',
            describe: "destination output"
        })
        .help('help').argv;


    const config = await resolve_config(argv);

    const stream = process.stdout;

    await ensure_dest(config, stream);


    let output: Results;
    stream.write("Generating markup ... ");
    try {
        output = await generate(config);
    } catch (e) {
        stream.write("failed!\n");
        return printandExit("Got unexpected error when generating markup", e);
    }

    if (output.results.length)
        stream.write(`done${output.errors.length ? ' with errors' : ''}!`);
    else
        stream.write("failed!");
    stream.write("\n");

    write_report(config, output, stream);

}