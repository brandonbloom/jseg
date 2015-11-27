# jsgraphthinggie

An in-memory graph database for JavaScript data.


## Status

Example Code only really.

I'm probably going to copy/paste this in to a real project.

Needs a better name. Suggestions?


## Inspiration

The most direct inspiration is [DataScript][2], which is in turn inspired by
[Datomic][3]. Like DataScript, but unlike Datomic, this "database" does not
offer durability of any kind.

Further inspiration comes from [Facebook's Relay][1] and [Netflix's Falcor][4].
Unlike either of these, this project does not attempt to address any networking
and service challenges.

Lastly, this project is inspired by [Om Next][5] and discussions with its
creator, David Nolen.


## Background

We've already got a growing set of JSON/REST APIs, so we can't easily switch
everything to a Relay or Falcor style service endpoint overnight.

Our frontend is already written in JavaScript, utilizing React.js;
ClojureScript is too large of a leap for our team at this time.

We need something that's, above all else, simple, but acts as a stepping stone
along the path towards frontend nirvana.


## Goals

- Client-side, in-memory only.
  - Assume dataset is small enough to traverse in O(N) time.
- Plain-old JavaScript objects.
  - Not necessarily just JSON (allow dates, etc).
  - Encourages use via destructuring.
  - All the standard debugging, printing, etc tools should work.
- No spooky action at a distance.
  - Every database operation makes an implicit defensive copy.
  - Good enough compared to real immutability.


## Non-Goals

- Persistent Data Structure
  - We don't need undo or anything like that.
  - The debugging benefits are nice, but just gravy.
- Serializablity
  - We already need to reshape data from our APIs.
  - Solve durability, caching, and transmission at another layer.
- Query
  - Since dataset is small, assume it's OK to do aggressive recursive fetches.


## API

```javascript
let db = new Database(schema)
```

See below for methods of `db` and schema details.

### get(id)

Gets a whole tree of related objects by `id`.

Does not traverse in to cycles.

### put(entity)

Puts a whole tree of related objects. Properties are merged in to existing
objects with matching `id` fields.

### lookup(field, value)

Gets an object by a unique field value. See schema.

### destroy(id)

Removes an object from the database by id. Recurses as per schema.

### remove(parentId, field, childId)

Removes a related object from a reference collection field.


## Schema

Just a map of named fields to config.

### Entity Identity

The `id` property is required for all get/put operations. It's just a string.

### Unique Lookup

`unique: true`

Use on string fields to enable O(1) indexing for use by `lookup`.

### Collections

```
collection: true,
sort: function compare(x, y) {
  ...
}
```

An array field value adds items in to a collection. To remove items, see
`remove`.

### Entity References

`ref: 'reverse'`

Specifies which fields are references to other objects, and those object's
reverse relationship field name. Neither, either, or both ends of the
relationship may be collections.

For example:

```javascript
let schema = {
  owner: {
    ref: 'tickets',
    collection: true,
  },
  tickets: {
    ref: 'owner',
  },
};

```

Use field value of `{id: ...}` for related objects:

```javascript
db.put({id: 'ticket1', owner: 'user1'});
db.put({id: 'user1', tickets: ['ticket2']});
```

### Cascarding Delete

`destroy: true`

Use on ref fields to recursively call `destroy`.


## TODO & Known Issues.

- Dramatically improve docs.
- Validate this design.
- Implement reverse relationships.
- Add change listeners.
  - Actually, might not even need/want this. Callers can do it themselves.
- Add field validators.
- Real tests.
- Lots of runtime consistency checks via schema.

## Known


[1]: https://facebook.github.io/relay/
[2]: https://github.com/tonsky/datascript
[3]: http://www.datomic.com/about.html
[4]: http://netflix.github.io/falcor/
[5]: https://github.com/omcljs/om/wiki/Quick-Start-(om.next)
