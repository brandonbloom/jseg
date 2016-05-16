let schema = require('./schema');

let b = new schema.Builder();
let t = b.types;

let Email = t.Text;
let SaltedHash = t.Text;
let Image = t.Text;
let Language = t.Text;

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

b.finalize({
  //TODO: Resource comparators for default ordering.
  attributes: {

    Profile: {
      name: t.Text,
      about: t.Text,
      image: Image,
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
    //TODO: Relationships comparators.
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


// Now, `t` is all good to go!


let {inspect} = require('util');
console.log(inspect(t, {depth: 5}));
