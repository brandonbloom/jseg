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

tg.expectMessage('unknown field mystery', () => {
  tg.g.put({
    type: t.Thing,
    lid: 'x',
    field: 'y',
    mystery: 'z',
    deleteme: 'ok',
  });
});

tg.check('x', {
  type: t.Thing,
  lid: 'x',
  field: 'y',
  deleteme: 'ok',
});

tg.g.put({
  lid: 'x',
  deleteme: null,
});

tg.check('x', {
  lid: 'x',
  type: t.Thing,
  field: 'y',
});
