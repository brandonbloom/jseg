# Graph API

## Construction

Graph objects are constructed with a [schema type map](./schema.md).

```javascript
let jseg = require('jseg');

let [builder, types] = jseg.newSchema();

... // Build-up and finalize schema.

let graph = new jseg.Graph(types);
```

## Querying

### Get by Lid

Gets an entity by "local id".

graph.get(*lid*, _[options]_)

Entities are copies of data from the graph and so are safe to mutate.
Relationships are returned as nested objects with a `lid` key. Additional
information about related entities can be acquired via additional queries
or recursively with the `depth` option.

Null field values and empty collections are included.

Returns null if the object does not exist.


```javascript
graph.lookup('entity123');
```


### Lookup by Unique Attribute

graph.lookup(*type*, *fieldName*, *value*, _[options]_)

Behaves like `get`, but works on any field with of type `Key`.

```javascript
graph.lookup('User', 'username', 'brandonbloom');
```

### Query Options

`depth`: Defines maximum number of references to follow when building the
hierarchical query result. Default is `1`. Specify `0` for unlimited.
Cyclic references are never followed and are returned as an object with
only a `lid` key like when exceeding max depth.

`json`: Set to `true` to have scalar values converted to JSON. Useful for
serializing the output of a query.


## Adding Data

graph.put(*entity*)

Puts a whole tree of related objects. Properties are merged in to existing
objects with matching `lid` fields. Relationship arrays are set-unioned.

Fields set to null are deleted from entities.


## Removing Data

### Destroy

graph.destroy(*lid*)

Removes an object from the graph by lid. Recursively destroys related objects
if cascading is specified in the schema.

### Remove

graph.remove(*fromLid*, *fieldName*, *toLid*)

Removes a related object from a set of references.

Treats references of cardinality `one` as a set with a max size of one.
