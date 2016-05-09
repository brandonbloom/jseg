import * as assert from 'assert';

import Database from '../src';


let db;

let check = (lid, expected, options) => {
  assert.deepStrictEqual(db.get(lid, options), expected);
};

let checkLookup = (field, value, expected, options) => {
  assert.deepStrictEqual(db.lookup(field, value, options), expected);
};


// Scalar attributes.

db = new Database({
  field: {},
  deleteme: {},
});

db.put({
  lid: 'x',
  field: 'y',
  unknown: 'z',
  deleteme: 'ok',
});

check('x', {
  lid: 'x',
  field: 'y',
  deleteme: 'ok',
});

db.put({
  lid: 'x',
  deleteme: null,
});

check('x', {
  lid: 'x',
  field: 'y',
});


// Validation.

db = new Database({
  rounded: {
    validate: (val) => {
      return Math.round(val);
    },
  },
  even: {
    validate: (val) => {
      if (val % 2 !== 0) {
        throw Error('Expected even number');
      }
      return val;
    }
  },
});

db.put({
  lid: 'good',
  rounded: 6.8,
  even: 4,
});

check('good', {
  lid: 'good',
  rounded: 7,
  even: 4,
});

db.put({
  lid: 'bad',
  rounded: 6.2,
  even: 5,
});

check('bad', {
  lid: 'bad',
  rounded: 6,
});


// One-to-One relationships.

db = new Database({
  tag: {},
  aToB: {
    ref: 'bToA',
  },
  bToA: {
    ref: 'aToB',
  },
});

db.put({
  lid: 'a1',
  tag: 'a',
  aToB: {
    lid: 'b1',
    tag: 'b',
  },
});

check('a1', {
  lid: 'a1',
  tag: 'a',
  aToB: {
    lid: 'b1',
    tag: 'b',
    bToA: {
      lid: 'a1',
    },
  },
});
check('b1', {
  lid: 'b1',
  tag: 'b',
  bToA: {
    lid: 'a1',
    tag: 'a',
    aToB: {
      lid: 'b1',
    },
  },
});

db.destroy('a1');
check('a1', {lid: 'a1'});
check('b1', {lid: 'b1', tag: 'b'});

db.destroy('b1');
check('b1', {lid: 'b1'});

db.put({
  lid: 'a2',
  tag: 'a',
  aToB: {
    lid: 'b2',
    tag: 'b',
  },
});

db.remove('a2', 'aToB', 'x');
check('a2', {
  lid: 'a2',
  tag: 'a',
  aToB: {
    lid: 'b2',
    tag: 'b',
    bToA: {
      lid: 'a2',
    }
  },
});

db.remove('a2', 'aToB', 'b2');
check('a2', {
  lid: 'a2',
  tag: 'a',
});


// One-to-Many relationships.

db = new Database({
  oneToMany: {
    ref: 'manyToOne',
    collection: true,
  },
  manyToOne: {
    ref: 'oneToMany',
  },
});

db.put({
  lid: 'loner',
});
check('loner', {
  lid: 'loner',
});

db.put({
  lid: 'parent',
  oneToMany: [
    {lid: 'x'},
    {lid: 'y'},
    {lid: 'z'},
  ],
});

//XXX This assumes the children collection come back in insertion order.
check('parent', {
  lid: 'parent',
  oneToMany: [
    {
      lid: 'x',
      manyToOne: {
        lid: 'parent',
      },
    },
    {
      lid: 'y',
      manyToOne: {
        lid: 'parent',
      },
    },
    {
      lid: 'z',
      manyToOne: {
        lid: 'parent',
      },
    },
  ],
});

db.destroy('y');
check('parent', {
  lid: 'parent',
  oneToMany: [
    {
      lid: 'x',
      manyToOne: {
        lid: 'parent',
      },
    },
    {
      lid: 'z',
      manyToOne: {
        lid: 'parent',
      },
    },
  ],
});

db.remove('parent', 'oneToMany', 'x');
check('parent', {
  lid: 'parent',
  oneToMany: [
    {
      lid: 'z',
      manyToOne: {
        lid: 'parent',
      },
    },
  ],
});

db.put({
  lid: 'z',
  manyToOne: null,
});
check('parent', {
  lid: 'parent',
});


// Many-to-Many relationships.

db = new Database({
  nToM: {
    ref: 'mToN',
    collection: true,
  },
  mToN: {
    ref: 'nToM',
    collection: true,
  },
});

db.put({
  lid: 'a',
  nToM: [
    {
      lid: 'x',
      mToN: [
        {lid: 'a'},
        {lid: 'b'}
      ],
    },
    {
      lid: 'y',
      mToN: [
        {lid: 'a'},
        {lid: 'b'},
      ],
    },
  ],
});

db.get('x', {
  lid: 'x',
  mToN: [
    {
      lid: 'a',
      nToM: [
        {lid: 'x'},
        {lid: 'y'}
      ],
    },
    {
      lid: 'b',
      nToM: [
        {lid: 'x'},
        {lid: 'y'},
      ],
    },
  ],
});

db.remove('x', 'mToN', 'a');
db.get('x', {
  lid: 'x',
  mToN: [
    {
      lid: 'b',
      nToM: [
        {lid: 'x'},
        {lid: 'y'},
      ],
    },
  ],
});
db.get('a', {
  lid: 'a',
  nToM: [
    {
      lid: 'x',
      mToN: [
        {lid: 'b'},
      ],
    },
  ],
});

db.remove('a', 'nToM', 'y');
db.get('a', {lid: 'a'});
db.get('b', {lid: 'b'});
db.get('x', {lid: 'x'});
db.get('y', {lid: 'y'});


// Unique keys.

db = new Database({
  key: {
    unique: true,
  },
});

db.put({
  lid: 'p',
  key: 'one',
});

db.put({
  lid: 'q',
  key: 'two',
});

db.put({
  lid: 'r',
  key: 3,
});

checkLookup('key', 'one', {
  lid: 'p',
  key: 'one',
});

checkLookup('key', 'two', {
  lid: 'q',
  key: 'two',
});

checkLookup('key', '3', null);

db.put({lid: 'p', key: null});
db.put({lid: 'q'});

checkLookup('key', 'one', null);

checkLookup('key', 'two', {
  lid: 'q',
  key: 'two',
});

db.put({lid: 'q', key: 'four'});

checkLookup('key', 'two', null);

checkLookup('key', 'four', {
  lid: 'q',
  key: 'four',
});


// Collection ordering.

db = new Database({
  index: {},
  one: {
    ref: 'many',
  },
  many: {
    ref: 'one',
    collection: true,
    compare: (x, y) => Math.sign(x.index - y.index),
  },
});

db.put({
  lid: 'one',
  many: [
    {
      lid: 'b',
      index: 2,
    },
    {
      lid: 'a',
      index: 1,
    },
    {
      lid: 'c',
      index: 3,
    },
  ],
});

check('one', {
  lid: 'one',
  many: [
    {
      lid: 'a',
      index: 1,
      one: {lid: 'one'},
    },
    {
      lid: 'b',
      index: 2,
      one: {lid: 'one'},
    },
    {
      lid: 'c',
      index: 3,
      one: {lid: 'one'},
    },
  ],
});


// Cascading destroy.

db = new Database({
  label: {},
  parent: {
    ref: 'children',
  },
  children: {
    ref: 'parent',
    collection: true,
    destroy: true,
  },
});

db.put({
  lid: 'root',
  label: 'root',
  children: [
    {
      lid: 'a',
      label: 'a',
    },
    {
      lid: 'b',
      label: 'b',
      children: [
        {
          lid: 'x',
          label: 'x',
        },
      ],
    },
  ],
});

db.destroy('b');
check('root', {
  lid: 'root',
  label: 'root',
  children: [
    {
      lid: 'a',
      label: 'a',
      parent: {
        lid: 'root',
      },
    },
  ],
});
check('b', {lid: 'b'});
check('x', {lid: 'x'});

db = new Database({
  label: {},
  prev: {
    ref: 'next',
  },
  next: {
    ref: 'prev',
    destroy: true,
  },
});

db.put({
  lid: 'a',
  label: 'a',
  next: {
    lid: 'b',
    label: 'b',
    next: {
      lid: 'c',
      label: 'c',
    },
  },
});

db.destroy('b');
check('a', {lid: 'a', label: 'a'});
check('b', {lid: 'b'});
check('c', {lid: 'c'});

db.put({
  lid: 'x',
  label: 'x',
  next: {lid: 'x'},
});

db.destroy('x');
check('x', {lid: 'x'});


// Recursion Limiting.

db = new Database({
  prev: {
    ref: 'next',
  },
  next: {
    ref: 'prev',
  },
});

db.put({
  lid: 'a',
  next: {
    lid: 'b',
    next: {
      lid: 'c',
      next: {
        lid: 'd',
      },
    },
  },
});

check('a', {
  lid: 'a',
  next: {
    lid: 'b',
    next: {
      lid: 'c',
      next: {
        lid: 'd',
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
}, {maxDepth: 0});

check('a', {
  lid: 'a',
  next: {
    lid: 'b',
    next: {
      lid: 'c',
      next: {
        lid: 'd',
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
}, {maxDepth: 100});

check('a', {
  lid: 'a',
  next: {
    lid: 'b',
  },
}, {maxDepth: 1});

check('a', {
  lid: 'a',
  next: {
    lid: 'b',
    next: {
      lid: 'c',
    },
    prev: {
      lid: 'a',
    },
  },
}, {maxDepth: 2});

check('a', {
  lid: 'a',
  next: {
    lid: 'b',
    next: {
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
}, {maxDepth: 3});
