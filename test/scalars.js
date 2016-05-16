let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Thing');

b.finalize({

  attributes: {
    Thing: {
      text: t.Text,
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
});

tg.g.put({
  lid: 'x',
  deleteme: null,
});

tg.check('x', {
  lid: 'x',
  type: t.Thing,
  text: 'y',
});
