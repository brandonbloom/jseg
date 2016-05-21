# JavaScript Entity Graph

A in-memory graph database for JavaScript data.


## Overview

- Entity/Attribute/Value graph-based information model.
  - Schema enforces relationships, provides unique indexes, and validates data.
- Operates on plain-old JavaScript objects.
  - Hierarchical data is flattened on put and reconstituted on get.
  - Not necessarily just JSON (allows dates, etc).
- No spooky action at a distance.
  - Every graph operation makes an implicit defensive copy.
  - Many of the benefits of immutability without loss of JavaScript idioms.


# Status

Expect bugs and API changes. This is version 2 with lots of new/improved
stuff, but not yet battle tested.

Version 1 is in active use in one real product. Check out [the v1 branch][1].
Unlikely to see much future work, but bug fixes are welcome.

See [the v1 readme][2] for rationale, background, goals, etc.


# Usage

This is just a taste. See [docs](./doc) for more details.

```javascript
let jseg = require('jseg');

let [builder, types] = jseg.newSchema();

builder.entity('User');
builder.trait('Likeable');
builder.entity('Comment', types.Likeable);
builder.entity('Link', types.Likeable);

builder.finalize({

  attributes: {

    User: {
      name: types.Text,
    },

    Comment: {
      createdAt: types.Time,
      message: types.Text,
    },

    Link: {
      href: types.Key,
    },

  },

  relationships: [

    [[types.Likeable, 'many', 'likers'],
     [types.User, 'many', 'likes']],

    [[types.Comment, 'one', 'author'],
     [types.User, 'many', 'comments', {
       compare: (a, b) => Math.sign(a.createdAt - b.createdAt)
     }]],

  ],

});


let graph = new jseg.Graph(types);

graph.put({

  type: 'User',
  lid: 'user:brandonbloom',
  name: 'Brandon Bloom',

  comments: [
    {
      type: 'Comment',
      lid: 'comment-1',
      createdAt: new Date('Sat May 21 2016 12:59:48 GMT-0700 (PDT)'),
      message: 'It is kind of weird to like your own comments.',
    },
    {
      type: 'Comment',
      lid: 'comment-2',
      createdAt: new Date('Sat May 21 2016 12:59:51 GMT-0700 (PDT)'),
      message: 'This is a very important comment.',
    },
  ],

  likes: [
    {
      type: 'Link',
      lid: 'link-1',
      href: 'example.com',
    },
    {
      type: 'Comment',
      lid: 'comment-1',
    }
  ],

});

console.log(graph.get('user:brandonbloom'));

console.log(graph.get('comment-1', {depth: 3, json: true}));

console.log(graph.lookup('Link', 'href', 'example.com'));

graph.destroy('comment-2');
console.log(graph.get('comment-2'));
```



[1]: https://github.com/brandonbloom/jseg/tree/v1
[2]: https://github.com/brandonbloom/jseg/blob/v1/README.md
