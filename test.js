import Database from './db';

let schema = {
  files: {
    type: 'ref',
    collection: true,
  },
  owner: {
    type: 'ref',
  },
  username: {
    type: 'string',
    unique: true,
  },
  mimeType: {
    type: 'string',
  },
  time: {
    type: 'number',
  },
  duration: {
    type: 'number',
  },
  annotations: {
    type: 'ref',
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
db.destroy('ev1');
console.log(db.get('user1'));
console.log(db.get('ev1'));
console.log(db.get('file1'));
