import Database from './db';

let schema = {
  files: {
    ref: 'evidence',
    collection: true,
  },
  evidence: {
    ref: 'files',
  },
  owner: {
    ref: 'owned',
  },
  owned: {
    ref: 'owner',
    collection: true,
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
  annotates: {
    ref: 'annotations',
  },
  annotations: {
    ref: 'annotates',
    collection: true,
    compare: function(x, y) {
      return Math.sign(x.time - y.time);
    },
    destroy: true,
  },
};

let db = new Database(schema);

let bbloom = {
  lid: 'user1',
  username: 'bbloom',
};

let evidence = {
  lid: 'ev1',
  owner: bbloom,
  files: [
    {
      lid: 'file1',
      mimeType: 'video/avi',
    },
    {
      lid: 'file2',
      mimeType: 'video/mp4',
    },
  ],
  annotations: [
    {
      lid: 'anno1',
      time: 10.5,
    },
    {
      lid: 'anno2',
      time: 3.1,
    },
  ],
};

db.put(evidence);

function go(x) {
  console.log(JSON.stringify(x, null, 2));
};

go(db.get('user1'));
go(db.get('ev1'));
go(db.get('file1'));

go(db.lookup('username', 'bbloom'));

console.log('----');
db.remove('ev1', 'annotations', 'anno2');
go(db.get('ev1'));

console.log('----');
db.destroy('ev1');
go(db.get('user1'));
go(db.get('ev1'));
go(db.get('file1'));

console.log('----');

db.destroy('user1');
go(db.get('user1'));
