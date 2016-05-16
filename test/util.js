let assert = require('assert');

let Graph = require('../src/graph');

class TestGraph {

  constructor(schema) {
    this._messages = null;
    this.g = new Graph(schema, {
      log: (...args) => {
        let msg = [...args].join(' ');
        if (this._messages) {
          this._messages.push(msg);
        } else {
          throw Error('Unexpected message: ' + msg);
        }
      }
    });
  }

  check(lid, expected, options) {
    assert.deepStrictEqual(this.g.get(lid, options), expected);
  }

  checkLookup(field, value, expected, options) {
    assert.deepStrictEqual(this.g.lookup(field, value, options), expected);
  }

  expectMessage(substr, f) {
    this._messages = [];
    f();
    if (this._messages.length !== 1) {
      throw Error('Expected a message');
    }
    if (this._messages[0].indexOf(substr) === -1) {
      throw Error('Expected message containing ' +
          JSON.stringify(substr) + ', but got: ' +
          JSON.stringify(this._messages[0]));
    }
    this._messages = null;
  }

}

module.exports = {TestGraph};
