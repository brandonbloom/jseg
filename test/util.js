let assert = require('assert');

let Graph = require('../src/graph');

let assertEquiv = (actual, expected) => {
  //XXX This assumes the children collection come back in insertion order.
  //TODO: Treat arrays as sets.
  assert.deepStrictEqual(actual, expected);
};

class TestGraph {

  constructor(schema) {
    this._messages = [];
    this.g = new Graph(schema, {
      log: (...args) => this._messages.push([...args].join(' ')),
    });
  }

  check(lid, expected, options) {
    assertEquiv(this.g.get(lid, options), expected);
  }

  checkLookup(field, value, expected, options) {
    assertEquiv(this.g.lookup(field, value, options), expected);
  }

  messages() {
    let ret = this._messages;
    this._messages = [];
    return ret;
  }

}

module.exports = {TestGraph};
