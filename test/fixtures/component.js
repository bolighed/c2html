"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const preact_1 = require("preact");
class TestComponent extends preact_1.Component {
    render() {
        return preact_1.h("div", null, "Hello, World!");
    }
}
exports.TestComponent = TestComponent;