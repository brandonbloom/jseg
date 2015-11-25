import Database from './db';

let schema = {
  files: {
    ref: true,
    collection: true,
  },
  owner: {
    ref: true,
  },
  username: {
    unique: true,
  },
  mimeType: {
  },
  time: {
  },
  duration: {
  },
  annotations: {
    ref: true,
    collection: true,
    compare: function(x, y) {
      return Math.sign(x.time - y.time);
    },
    destroy: true,
  },
};

let db = new Database(schema);

let bbloom = {
  id: 'user1',
  username: 'bbloom',
};

let evidence = {
  id: 'ev1',
  owner: bbloom,
  files: [
    {
      id: 'file1',
      mimeType: 'video/avi',
    },
    {
      id: 'file2',
      mimeType: 'video/mp4',
    },
  ],
  annotations: [
    {
      id: 'anno1',
      time: 10.5,
    },
    {
      id: 'anno2',
      time: 3.1,
    },
  ],
};

db.put(evidence);

console.log(db.get('user1'));
console.log(db.get('ev1'));
console.log(db.get('file1'));

console.log(db.lookup('username', 'bbloom'));

console.log('----');
db.remove('ev1', 'annotations', 'anno2');
console.log(db.get('ev1'));

console.log('----');
db.destroy('ev1');
console.log(db.get('user1'));
console.log(db.get('ev1'));
console.log(db.get('file1'));

console.log('----');

db.destroy('user1');
console.log(db.get('user1'));
