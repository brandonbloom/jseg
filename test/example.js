let jseg = require('../src');

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
