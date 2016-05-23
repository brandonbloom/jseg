let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Tree');
b.entity('List');

b.finalize({

  attributes: {},

  relationships: [

    [[t.Tree, 'many', 'children', {destroy: true}],
     [t.Tree, 'one', 'parent']],

    [[t.List, 'one', 'next', {destroy: true}],
     [t.List, 'one', 'prev']],

  ],

});

let tg = new TestGraph(t);


tg.g.put({
  type: t.Tree,
  lid: 'root',
  children: [
    {
      type: t.Tree,
      lid: 'x',
    },
    {
      type: t.Tree,
      lid: 'y',
      children: [
        {
          type: t.Tree,
          lid: 'z',
        },
      ],
    },
  ],
});

tg.g.destroy('y');
tg.check('root', {
  type: t.Tree,
  lid: 'root',
  parent: null,
  children: [
    {
      type: t.Tree,
      lid: 'x',
      parent: {
        lid: 'root',
      },
      children: [],
    },
  ],
});
tg.check('y', null);
tg.check('z', null);


tg.g.put({
  type: t.List,
  lid: 'a',
  next: {
    type: t.List,
    lid: 'b',
    next: {
      type: t.List,
      lid: 'c',
    },
  },
});

tg.g.destroy('b');
tg.check('a', {
  type: t.List,
  lid: 'a',
  prev: null,
  next: null,
});
tg.check('b', null);
tg.check('c', null);

tg.g.put({
  type: t.List,
  lid: 'q',
  next: {lid: 'q'},
});

tg.g.destroy('q');
tg.check('q', null);
