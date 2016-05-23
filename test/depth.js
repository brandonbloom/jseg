let assert = require('assert');
let jseg = require('../src');
let {TestGraph} = require('./util');

let [b, t] = jseg.newSchema();

b.entity('Node');

b.finalize({

  attributes: {},

  relationships: [
    [[t.Node, 'one', 'next'],
     [t.Node, 'one', 'prev']],
  ],

});

let tg = new TestGraph(t);


tg.g.put({
  type: t.Node,
  lid: 'a',
  next: {
    type: t.Node,
    lid: 'b',
    next: {
      type: t.Node,
      lid: 'c',
      next: {
        type: t.Node,
        lid: 'd',
      },
    },
  },
});

tg.check('a', {
  type: t.Node,
  lid: 'a',
  prev: null,
  next: {
    type: t.Node,
    lid: 'b',
    next: {
      type: t.Node,
      lid: 'c',
      next: {
        type: t.Node,
        lid: 'd',
        prev: {
          lid: 'c',
        },
        next: null,
      },
      prev: {
        lid: 'b',
      }
    },
    prev: {
      lid: 'a',
    },
  },
}, {depth: 0});

tg.check('a', {
  type: t.Node,
  lid: 'a',
  prev: null,
  next: {
    type: t.Node,
    lid: 'b',
    next: {
      type: t.Node,
      lid: 'c',
      next: {
        type: t.Node,
        lid: 'd',
        next: null,
        prev: {
          lid: 'c',
        }
      },
      prev: {
        lid: 'b',
      }
    },
    prev: {
      lid: 'a',
    },
  },
}, {depth: 100});

tg.check('a', {
  type: t.Node,
  lid: 'a',
  prev: null,
  next: {
    lid: 'b',
  },
}, {depth: 1});

tg.check('a', {
  type: t.Node,
  lid: 'a',
  prev: null,
  next: {
    type: t.Node,
    lid: 'b',
    next: {
      lid: 'c',
    },
    prev: {
      lid: 'a',
    },
  },
}, {depth: 2});

tg.check('a', {
  type: t.Node,
  lid: 'a',
      prev: null,
  next: {
    type: t.Node,
    lid: 'b',
    next: {
      type: t.Node,
      lid: 'c',
      next: {
        lid: 'd',
      },
      prev: {
        lid: 'b',
      },
    },
    prev: {
      lid: 'a',
    },
  },
}, {depth: 3});
