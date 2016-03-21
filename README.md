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
  - Hierarchical flattening of the graph.
  - Not necessarily just JSON (allow dates, etc).
  - Encourages use via destructuring.
  - All the standard debugging, printing, etc tools should work.
- Graph-based information model.
  - Strong support for relationships between entities.
  - Allow navigation from any node as a root, in any direction.
- No spooky action at a distance.
  - Every database operation makes an implicit defensive copy.
  - Good enough compared to real immutability.
  - Safe to directly return to callers of your store API.


## Non-Goals

- Be a Flux "store" by itself.
  - No one general purpose information model can address all domain needs.
  - You still need an API for mutations anyway.
- Persistent Data Structure
  - We don't need undo or anything like that.
  - The debugging benefits are nice, but just gravy.
- Serializablity
  - We already need to reshape data from our APIs.
  - Solve durability, caching, and transmission at another layer.
- Query
  - Since dataset is small, assume it's OK to aggressively over-satisfy gets.
  - If you need filtering, use alternative or additional data structure in
    your store.
- Change Notifications
  - Wrap with domain-level store API and implement your own coarse-grain
    notifications for key entities.


## API

```javascript
let db = new Database(schema)
```

The only field provided by the default schema, `lid`, is required. It is short
for "Local ID" and is named such to differentiate it from other application
specific identifiers. The recommended name for server-specified identifiers is
"gid", or "Global ID".

See below for methods of `db` and schema details.

### get(lid)

Gets a whole tree of related objects by `lid`.

Does not traverse in to cycles.

### put(entity)

Puts a whole tree of related objects. Properties are merged in to existing
objects with matching `lid` fields.

### lookup(field, value)

Gets an object by a unique field value. See schema.

### destroy(lid)

Removes an object from the database by lid. Recurses as per schema.

### remove(parentId, field, childId)

Removes a related object from a reference collection field.


## Schema

Just a map of named fields to config.

### Entity Identity

The `lid` property is required for all get/put operations. It's just a string.

### Unique Lookup

`unique: true`

Use on string fields to enable O(1) indexing for use by `lookup`.

### Validation

The `validate` property specifies a function to validate and transform a
scalar value. Throw an exception to report a validation error or return the
transformed value.

```javascript
validate: function(value) {
  if (!valid(value)) {
    throw validationError;
  }
  return coerce(value);
}
```

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

Use field value of `{lid: ...}` for related objects:

```javascript
db.put({lid: 'ticket1', owner: 'user1'});
db.put({lid: 'user1', tickets: ['ticket2']});
```

### Cascarding Delete

`destroy: true`

Use on ref fields to recursively call `destroy`.


## TODO

- Dramatically improve docs.
- Validate this design (in real app) and implementation (with test asserts).


[1]: https://facebook.github.io/relay/
[2]: https://github.com/tonsky/datascript
[3]: http://www.datomic.com/about.html
[4]: http://netflix.github.io/falcor/
[5]: https://github.com/omcljs/om/wiki/Quick-Start-(om.next)
