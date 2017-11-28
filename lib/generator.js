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
require("undom/register");
const preact_render_to_string_1 = require("preact-render-to-string");
const preact_1 = require("preact");
const Path = require("path");
const fs = require("mz/fs");
function isString(a) {
    return typeof a === 'string';
}
function generate_file(config) {
    const module = require(config.path);
    let component;
    if (config.name) {
        component = module[config.name];
    }
    else if (typeof module === 'function') {
        component = module;
    }
    else if (typeof module.default === 'function') {
        component = module.default;
    }
    else {
        for (const key in module) {
            if (!module.hasOwnProperty(key))
                continue;
            if (typeof module[key] === 'function') {
                try {
                    return new Buffer(preact_render_to_string_1.render(preact_1.h(module[key], config.props)));
                }
                catch (e) {
                    continue;
                }
            }
        }
    }
    if (!component) {
        throw ReferenceError(`component '${config.name}'`);
    }
    return new Buffer(preact_render_to_string_1.render(preact_1.h(component, config.props)));
}
function get_destination(config, file) {
    if (typeof config.dest === 'function') {
        return config.dest(file);
    }
    const fileName = Path.basename(file.path, Path.extname(file.path)), base = config.keep ? Path.dirname(file.path).replace(config.base, '')
        : config.dest;
    return Path.join(base, fileName) + '.html';
}
function validate_config(config) {
    if (!config)
        throw new Error('no config');
    if (!config.files || !config.files.length)
        throw new Error('files is empty');
    if (!config.base)
        config.base = process.cwd();
    if (isString(config.dest) && !Path.isAbsolute(config.dest))
        config.dest = Path.resolve(process.cwd(), config.dest);
    return config;
}
function generate(config, write = true) {
    return __awaiter(this, void 0, void 0, function* () {
        config = validate_config(config);
        var errors = [];
        const files = config.files
            .map(m => {
            try {
                return {
                    input: m.path,
                    output: get_destination(config, m),
                    content: generate_file(m)
                };
            }
            catch (error) {
                errors.push({ error, file: { input: m.path } });
            }
            return void 0;
        }).filter(m => m != void 0)
            .map(file => {
            if (!write)
                return file;
            return fs.writeFile(file.output, file.content, 'utf8')
                .then(_ => file)
                .catch(error => {
                errors.push({ error, file });
                return void 0;
            });
        });
        const results = (yield Promise.all(files)).filter(m => m != void 0);
        return { results, errors };
    });
}
exports.generate = generate;
