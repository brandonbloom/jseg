let schema = require('./schema');


let b = new schema.Builder();

let Text = b.scalar('Text', (x) => {
  if (typeof x !== 'string') {
    throw new Error('Expected string');
  }
  return x;
});

let Bool = b.scalar('Bool', (x) => {
  if (typeof x !== 'boolean') {
    throw new Error('Expected boolean');
  }
  return x;
});

let Email = Text;
let SaltedHash = Text;
let Image = Text;


let Profile = b.trait('Profile');

Profile.attribute('name', Text);
Profile.attribute('about', Text);
Profile.attribute('image', Image);

let User = b.entity('User');

User.include(Profile);
User.attribute('email', Email);
User.attribute('password', SaltedHash)
User.attribute('admin', Bool);

let Followable = b.trait('Followable');
let Likable = b.trait('Likable');

b.relate(User, 'many', 'following',
         Followable, 'many', 'followers');

b.relate(User, 'many', 'likes',
         Likable, 'many', 'likers');

let Session = b.entity('Session');

let Content = b.trait('Content');

Content.include(Profile);

let Category = b.entity('Category');

b.relate(Content, 'many', 'categories',
         Category, 'many', 'content');

let Language = Text;
Content.attribute('language', Language);
Content.attribute('explicit', Bool);

let Network = b.entity('Network');

Network.include(Content);


let {inspect} = require('util');
console.log(inspect(b.build(), {depth: 3}));
