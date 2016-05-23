let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Thing');

b.scalar('Rounded', {
  validate: Math.round,
});
b.scalar('Even', {
  validate: (x) => {
    if (x % 2 !== 0) {
      throw Error('expected even number');
    }
    return x;
  },
});

b.finalize({

  attributes: {
    Thing: {
      rounded: t.Rounded,
      even: t.Even,
    },
  },

  relationships: [],

});

let tg = new TestGraph(t);

tg.g.put({
  type: t.Thing,
  lid: 'good',
  rounded: 6.8,
  even: 4,
});

tg.check('good', {
  type: t.Thing,
  lid: 'good',
  rounded: 7,
  even: 4,
});

tg.expectMessage('expected even number', () => {
  tg.g.put({
    type: t.Thing,
    lid: 'bad',
    rounded: 6.2,
    even: 5,
  });
});

tg.check('bad', {
  type: t.Thing,
  lid: 'bad',
  rounded: 6,
  even: null,
});
