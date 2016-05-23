let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Node');

b.finalize({

  attributes: {
    Node: {
      index: t.Num,
    },
  },

  relationships: [
    [[t.Node, 'one', 'parent'],
     [t.Node, 'many', 'children', {
       compare: (x, y) => Math.sign(x.index - y.index),
     }]],
  ],

});

let tg = new TestGraph(t);


tg.g.put({
  type: t.Node,
  lid: 'root',
  children: [
    {
      type: t.Node,
      lid: 'b',
      index: 2,
    },
    {
      type: t.Node,
      lid: 'a',
      index: 1,
    },
    {
      type: t.Node,
      lid: 'c',
      index: 3,
    },
  ],
});

tg.check('root', {
  type: t.Node,
  lid: 'root',
  index: null,
  parent: null,
  children: [
    {
      type: t.Node,
      lid: 'a',
      index: 1,
      parent: {lid: 'root'},
      children: [],
    },
    {
      type: t.Node,
      lid: 'b',
      index: 2,
      parent: {lid: 'root'},
      children: [],
    },
    {
      type: t.Node,
      lid: 'c',
      index: 3,
      parent: {lid: 'root'},
      children: [],
    },
  ],
});
