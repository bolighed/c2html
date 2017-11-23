"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const generator_1 = require("./generator");
const Path = require("path");
const fs = require("mz/fs");
const js_yaml_1 = require("js-yaml");
const yargs = require("yargs");
function read_yaml(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return js_yaml_1.safeLoad((yield fs.readFile(path)).toString('utf8'));
    });
}
function read_js(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const js = require(path);
        return js.default ? js.default : js; // allow es6
    });
}
function read_config(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const extname = Path.extname(path);
        switch (extname) {
            case ".yaml":
            case ".yml":
                return yield read_yaml(path);
            case ".json":
                return require(path);
            case ".js":
                return read_js(path);
        }
    });
}
function printandExit(ctx, err, status = 200) {
    console.error(`${ctx}: ${err.message}`);
    return process.exit(status);
}
function write_report(_, results, stream) {
    stream.write("Report:\n");
    const n = (n) => Path.relative(process.cwd(), n);
    for (const result of results.results) {
        stream.write(`  successfully created: ./${n(result.input)} => ./${n(result.output)}\n`);
    }
    for (const error of results.errors) {
        stream.write(`  could not generate: './${n(error.file.input)}'\n`);
        stream.write(`    ${error.error.message}\n`);
    }
}
const supported_files = "js jsx".split(' ').map(m => '.' + m);
function resolve_config(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        let configFile = argv.config;
        if (!configFile && !argv._.length) {
            yargs.showHelp();
            process.exit(1);
        }
        let config;
        if (configFile) {
            if (!Path.isAbsolute(configFile)) {
                try {
                    configFile = Path.resolve(process.cwd(), configFile);
                }
                catch (e) {
                    printandExit("Could not resolve config-file path", e);
                }
            }
            try {
                config = yield read_config(configFile);
            }
            catch (e) {
                return printandExit("Could not read config", e);
            }
        }
        else {
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
                };
            }
            catch (e) {
                return printandExit("Could not read file", e);
            }
        }
        return config;
    });
}
function ensure_dest(config, stream) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof config.dest === 'function')
            return;
        try {
            yield fs.mkdir(config.dest);
            stream ? stream.write("Created directory\n") : void 0;
        }
        catch (e) {
            if (e.code !== 'EEXIST') {
                throw e;
            }
        }
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
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
        const config = yield resolve_config(argv);
        const stream = process.stdout;
        yield ensure_dest(config, stream);
        let output;
        stream.write("Generating markup ... ");
        try {
            output = yield generator_1.generate(config);
        }
        catch (e) {
            stream.write("failed!\n");
            return printandExit("Got unexpected error when generating markup", e);
        }
        if (output.results.length)
            stream.write(`done${output.errors.length ? ' with errors' : ''}!`);
        else
            stream.write("failed!");
        stream.write("\n");
        write_report(config, output, stream);
    });
}
exports.run = run;
