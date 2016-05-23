let {inspect} = require('util');

let {Type, Graph} = require('../src');

let classify = (x) => {
  if (x === null || x instanceof Type) {
    return 'scalar';
  }
  if (Array.isArray(x)) {
    return 'array';
  }
  if (typeof x === 'object') {
    return 'entity';
  }
  return 'scalar';
};

let assertEquiv = (x, y) => {

  let path = [];

  let fail = (msg) => {
    throw Error('at .' + path.join('.') + ' ' + msg);
  }

  let rec = (x, y) => {

    let cx = classify(x);
    let cy = classify(y);
    if (cx !== cy) {
      fail(cx + ' !== ' + cy);
    }

    switch (cx) {

      case 'scalar':
        if (x !== y) {
          fail('' + x + ' !== ' + y);
        }
        break;

      case 'array':
        if (x.length !== y.length) {
          fail('length ' + x.length + ' but expected ' + y.length);
        }
        for (let i = 0; i < x.length; i++) {
          path.push(i);
          rec(x[i], y[i]);
          path.pop();
        }
        break;

      case 'entity':
        let ks = Object.keys(x).sort();
        path.push('*')
        rec(ks, Object.keys(y).sort());
        path.pop();
        ks.forEach(k => {
          path.push(k);
          rec(x[k], y[k]);
          path.pop();
        });
        break;

      default:
        throw Error('Invalid classification: ' + cx);

    }

  };

  rec(x, y);

}

class TestGraph {

  constructor(schema) {
    this._messages = null;
    this.g = new Graph(schema, {
      log: (...args) => {
        let msg = [...args].map(x =>
          typeof x === 'string' ? x : inspect(x)
        ).join(' ');
        if (this._messages) {
          this._messages.push(msg);
        } else {
          throw Error('Unexpected message: ' + msg);
        }
      }
    });
  }

  check(lid, expected, options) {
    options = Object.assign({depth: 0}, options);
    assertEquiv(this.g.get(lid, options), expected);
  }

  checkLookup(type, attribute, value, expected, options) {
    options = Object.assign({depth: 0}, options);
    assertEquiv(this.g.lookup(type, attribute, value, options), expected);
  }

  expectMessage(substr, f) {
    this._messages = [];
    f();
    if (this._messages.length !== 1) {
      throw Error('Expected a 1 message, got ' + this._messages.length + ': ' +
          JSON.stringify(this._messages, null, 2));
    }
    if (this._messages[0].indexOf(substr) === -1) {
      throw Error('Expected message containing ' +
          JSON.stringify(substr) + ', but got: ' +
          JSON.stringify(this._messages[0]));
    }
    this._messages = null;
  }

  show(lid) {
    let entity = this.g.get(lid, {depth: 0, json: true});
    console.log(JSON.stringify(entity, null, 2));
  }

  showLookup(type, attribute, value) {
    let entity = this.g.lookup(type, attribute, value, {depth: 0, json: true});
    console.log(JSON.stringify(entity, null, 2));
  }

}

module.exports = {TestGraph};
