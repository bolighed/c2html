# C2HTML

## Usage

config object:
```ts

export type destination = string | ((config: FileConfig) => string);


export interface Config {
    base?: string;
    files: {
        path: string;
        name?: string;
        props?: any;
    }[];
    dest: destination;
    keep?: boolean;
}

```

### Usage from terminal

```sh
$ c2html -h

Options:
  --version     Show version number                                    [boolean]
  --config, -c  path to config file, which can be of type: yaml, json, or
                javascript
  --output, -o  destination output                           [default: "output"]
  --help        Show help                                              [boolean]

# With config file
$ c2html -c config.js
# With arguments
$ c2html -o template components/**/*.{js,jsx}

```

### Programmic API

```js

import { generate } from 'c2html'

generate({
    files: [
        { path: "component.js" },
        { path: "component.jsx", name: "MyComponent" }
    ],
    dest: process.cwd() + '/templates'
}).then( results => {
    console.log(results);
});


```