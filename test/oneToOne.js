let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('A');
b.entity('B');

b.finalize({

  attributes: {},

  relationships: [
    [[t.A, 'one', 'b'],
     [t.B, 'one', 'a']],
  ],

});

let tg = new TestGraph(t);

tg.g.put({
  type: t.A,
  lid: 'a1',
  b: {
    type: t.B,
    lid: 'b1',
  },
});
tg.check('a1', {
  type: t.A,
  lid: 'a1',
  b: {
    type: t.B,
    lid: 'b1',
    a: {
      lid: 'a1',
    },
  },
});
tg.check('b1', {
  type: t.B,
  lid: 'b1',
  a: {
    type: t.A,
    lid: 'a1',
    b: {
      lid: 'b1',
    },
  },
});


tg.g.destroy('a1');
tg.check('a1', null);
tg.check('b1', {
  lid: 'b1',
  type: t.B,
  a: null,
});

tg.g.destroy('b1');
tg.check('b1', null);

tg.g.put({
  type: t.A,
  lid: 'a2',
  b: {
    type: t.B,
    lid: 'b2',
  },
});

tg.g.remove('a2', 'b', 'x');
tg.check('a2', {
  type: t.A,
  lid: 'a2',
  b: {
    type: t.B,
    lid: 'b2',
    a: {
      lid: 'a2',
    }
  },
});

tg.g.remove('a2', 'b', 'b2');
tg.check('a2', {
  type: t.A,
  lid: 'a2',
  b: null,
});
