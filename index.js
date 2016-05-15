let schema = require('./schema');

let b = new schema.Builder();
let t = b.types;

b.scalar('Text', (x) => {
  if (typeof x !== 'string') {
    throw new Error('Expected string');
  }
  return x;
});

b.scalar('Bool', (x) => {
  if (typeof x !== 'boolean') {
    throw new Error('Expected boolean');
  }
  return x;
});

let Email = b.Text;
let SaltedHash = b.Text;
let Image = b.Text;
let Language = b.Text;

b.trait('Profile');
b.trait('Followable');
b.entity('User', t.Profile, t.Followable);
b.trait('Likable');
b.entity('Session');
b.entity('Category', t.Profile);
b.trait('Content', t.Profile);
b.trait('Network', t.Content);
b.trait('Series', t.Content);
b.trait('Episode', t.Content);

b.build({
  attributes: {

    Profile: {
      name: t.Text,
      about: t.Text,
      image: t.Image,
    },

    User: {
      email: Email,
      password: SaltedHash,
      admin: t.Bool,
    },

    Content: {
      explicit: t.Bool,
    },

  },
  relationships: [
    [
      [t.User, 'many', 'following'],
      [t.Followable, 'many', 'followers'],
    ],
    [
      [t.User, 'many', 'likes'],
      [t.Likable, 'many', 'likers'],
    ],
    [
      [t.Content, 'many', 'categories'],
      [t.Category, 'many', 'content'],
    ],
  ],
});


let {inspect} = require('util');
console.log(inspect(t, {depth: 3}));
