# Schemas

## API

A JSEG schema is created imperatively in three steps:

### Creating a Schema

First, call `newSchema` to create a schema builder and a type map.

```javascript
let jseg = require('jseg');

let [builder, types] = jseg.newSchema();
```

### Declaring Traits and Entity Types

Second, declare the abstract traits and concrete entities of objects that make
up the graph. Both traits and entities may inherit other traits.

builder.trait(*name*, _[traits...]_)

builder.entity(*name*, _[traits...]_)

Declared types immediately appear in the type map:

```javascript
builder.trait('Likeable');
builder.entity('Comment', types.Likeable);
...
```

New types of scalars can also be defined for the purposes of validation:

builder.scalar(*name*, _[options]_)

### Finalizing a Schema

Finally, define fields for each type. There are two classes of fields:
attributes and relationships.

```javascript
builder.finalize({
  attributes: {...},
  relationships: [...],
});
```

Attributes are specified on a per-type basis:

```javascript
attributes: {
  Comment: {
    message: types.Text,
    ...
  },
  ...
},
```

Relationships are specified as pairs of outbound relations:

```javascript
relationships: [
  [[types.Likeable, 'many', 'likers'],
   [types.User, 'many', 'likes']],
  ...
],
```

See below for details of attribute and relationship specifications.


## Attributes

Attributes are fields containing "scalar" values.

### Specifications

Attributes are specified in the `finalize` configuration map as a nested map
of type names to field names to types for those fields.

To customize the behavior of an attribute, create a custom scalar type.

### Special Attributes

Each entity in a JSEG graph has a `type` and a `lid`.  Both are required when
putting an object the first time.

The type must be in the schema map and may be provided as either the actual
type object or a string of the type's name.

The `lid`, short for "Local ID", is a string uniquely identifies an entity
across all types in the graph.


## Relationships

Relationships are fields containing references to other entities.

## Specifications

Relationships are specified in the `finalize` configuration map as an array
of bidirectional relationship specifications.

A bidirectional relationship specification is a pair of a relationship field
specification and its reverse relationship field specification.

A relationship field specification is a triple of type, cardinality, and name.
The specification may also provide a forth value: An options map. The triples
may be read as the madlib "A _type_ has _cardinality_ _field_". For example:
"A _comment_ has _one_ _author_" and "A _user_ has _many_ _comments_, sorted
by _createdAt_".

```javascript
[[types.Comment, 'one', 'author'],
 [types.User, 'many', 'comments', {
   compare: (a, b) => Math.sign(a.createdAt - b.createdAt)
 }]],
```


### Cardinality

Each relationship field has a cardinality of either `one` or `many`.

Cardinality `one` specifies a field containing a singular, nullable reference.

Cardinality `many` specifies a field containing a set of zero or more
references. Sets are represented as arrays.

### Casading Deletes

When a relationship field option of `destroy: true` is provided, `destroy`
operations on the source entity of the relationship will cascade, destroying
the related entity.

### Ordering

For cardinality `many` fields, related entities are sorted by `lid` by default.
To override this, provide a `compare: (a, b) => ...` option. The compare
function will be used via JavaScript's normal Array sort to order the set
of related objects when querying the graph.


## Scalars

Attribute fields have "scalar" types.

### Builtin Types

`Scalar`: Any non-null JavaScript object.

Standard JSON data is supported:

`Text`: Normal JSON strings.

`Bool`: Normal JSON booleans.

`Num`: Normal JSON numbers.

Some common JavaScript types are also provided:

`Time`: Normal JavaScript Date objects.

Two builtin types are treated specially:

`Key`: Like `text`, but must be non-empty and will enable `lookup`.

`Type`: JSEG Type objects. Must come from the graph's schema.

### Custom Types

Custom types can be defined to provide validation and normalization, as well
as to configure serialization.

A `validate` function is required. It is called each time an attribute of this
type is put in to the graph. The return value of the validation function is
the value that will be stored. If an error is thrown, the value is considered
invalid; an error will be logged and the value will be discarded.

```javascript
builder.scalar('Integer' {
  validate: Math.round,
});
```

An optional `serialize` function can be provided to specify how this field
should be converted to JSON. For example, the builtin Time type is defined
as follows:


```javascript
builder.scalar('Time', {
  validate: (x) => new Date(x),
  serialize: (x) => x.toISOString(),
});
```
