let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Node');

b.finalize({

  attributes: {},

  relationships: [
    [[t.Node, 'many', 'mToN'],
     [t.Node, 'many', 'nToM']],
  ],

});

let tg = new TestGraph(t);


tg.g.put({
  type: t.Node,
  lid: 'a',
  mToN: [
    {
      type: t.Node,
      lid: 'x',
    },
    {
      type: t.Node,
      lid: 'y',
    },
  ],
});

tg.check('a', {
  type: t.Node,
  lid: 'a',
  nToM: [],
  mToN: [
    {
      type: t.Node,
      lid: 'x',
      nToM: [
        {
          lid: 'a',
        },
      ],
      mToN: [],
    },
    {
      type: t.Node,
      lid: 'y',
      nToM: [
        {
          lid: 'a',
        },
      ],
      mToN: [],
    },
  ],
});

tg.g.remove('a', 'mToN', 'x');
tg.check('a', {
  type: t.Node,
  lid: 'a',
  nToM: [],
  mToN: [
    {
      type: t.Node,
      lid: 'y',
      nToM: [
        {
          lid: 'a',
        },
      ],
      mToN: [],
    },
  ],
});

tg.g.remove('y', 'nToM', 'a');
tg.check('a', {
  type: t.Node,
  lid: 'a',
  nToM: [],
  mToN: [],
});

tg.g.put({
  type: t.Node,
  lid: 'x',
  nToM: [
    {
      type: t.Node,
      lid: 'a',
    },
    {
      type: t.Node,
      lid: 'b',
    },
  ],
});
tg.check('x', {
  type: t.Node,
  lid: 'x',
  nToM: [
    {
      type: t.Node,
      lid: 'a',
      nToM: [],
      mToN: [
        {
          lid: 'x',
        }
      ],
    },
    {
      type: t.Node,
      lid: 'b',
      nToM: [],
      mToN: [
        {
          lid: 'x',
        }
      ],
    },
  ],
  mToN: [],
});
