let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Thing');

b.finalize({

  attributes: {
    Thing: {
      any: t.Scalar,
      text: t.Text,
      deleteme: t.Text,
      bool: t.Bool,
    },
  },

  relationships: [],

});

let tg = new TestGraph(t);

tg.expectMessage('unknown field "mystery"', () => {
  tg.g.put({
    type: t.Thing,
    lid: 'x',
    text: 'y',
    mystery: 'z',
    deleteme: 'ok',
  });
});

tg.check('x', {
  type: t.Thing,
  lid: 'x',
  text: 'y',
  deleteme: 'ok',
  any: null,
  bool: null,
});

class Foo {
  constructor(bar) {
    this.bar = bar;
  }
}
let foo = new Foo();

tg.g.put({
  lid: 'x',
  deleteme: null,
  bool: false,
  any: foo,
});

tg.check('x', {
  lid: 'x',
  type: t.Thing,
  text: 'y',
  deleteme: null,
  bool: false,
  any: foo,
});
