let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Thing');

let s = b.finalize({

  attributes: {
    Thing: {
      field: t.Text,
      deleteme: t.Text,
    },
  },

  relationships: [],

});

let tg = new TestGraph(t);

tg.g.put({
  type: 'Thing',
  lid: 'x',
  field: 'y',
  unknown: 'z',
  deleteme: 'ok',
});

tg.check('x', {
  type: 'Thing',
  lid: 'x',
  field: 'y',
  deleteme: 'ok',
});

tg.g.put({
  lid: 'x',
  deleteme: null,
});

tg.check('x', {
  type: 'Thing',
  lid: 'x',
  field: 'y',
});

assert.equals(tg.messages(), []);
