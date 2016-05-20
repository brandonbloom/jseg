let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Node');

b.finalize({

  attributes: {},

  relationships: [
    [[t.Node, 'many', 'children'],
     [t.Node, 'one', 'parent']],
  ],

});

let tg = new TestGraph(t);

tg.g.put({
  type: t.Node,
  lid: 'loner',
});
tg.check('loner', {
  type: t.Node,
  lid: 'loner',
});

tg.g.put({
  type: t.Node,
  lid: 'root',
  children: [
    {
      type: t.Node,
      lid: 'x',
    },
    {
      type: t.Node,
      lid: 'y',
    },
    {
      type: t.Node,
      lid: 'z',
    },
  ],
});

tg.check('root', {
  type: t.Node,
  lid: 'root',
  children: [
    {
      type: t.Node,
      lid: 'x',
      parent: {
        lid: 'root',
      },
    },
    {
      type: t.Node,
      lid: 'y',
      parent: {
        lid: 'root',
      },
    },
    {
      type: t.Node,
      lid: 'z',
      parent: {
        lid: 'root',
      },
    },
  ],
});

tg.g.destroy('y');
tg.check('root', {
  type: t.Node,
  lid: 'root',
  children: [
    {
      type: t.Node,
      lid: 'x',
      parent: {
        lid: 'root',
      },
    },
    {
      type: t.Node,
      lid: 'z',
      parent: {
        lid: 'root',
      },
    },
  ],
});

tg.g.remove('root', 'children', 'x');
tg.check('root', {
  type: t.Node,
  lid: 'root',
  children: [
    {
      type: t.Node,
      lid: 'z',
      parent: {
        lid: 'root',
      },
    },
  ],
});

tg.g.put({
  type: t.Node,
  lid: 'z',
  parent: null,
});
tg.check('root', {
  type: t.Node,
  lid: 'root',
});

