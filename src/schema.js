

class Type {

  constructor(schema, name) {
    this._schema = schema;
    this._name = name;
  }

  name() {
    return this._name
  }

}

class Scalar extends Type {

  constructor(schema, name, validate) {
    super(schema, name);
    this._validate = validate;
  }

}

// A composite type has a named set of fields.
class Composite extends Type {

  constructor(schema, name, bases) {

    super(schema, name);

    this._bases = bases;

    // Compute map of all implemented type names to type objects.
    this._supers = {};
    let include = (type) => {
      if (type._name in this._supers) {
        throw new Error('Duplicate super ' + type._name + ' in ' + name);
      }
      this._supers[type._name] = type;
      type._bases.forEach(base => {
        if (!(base instanceof Trait)) {
          throw new Error(`${name} extends non-Trait: ${type._name}`);
        }
        include(base);
      });
    };
    include(this);

    // Maps field names defined directly on this type to definition structures.
    // Definition structures have form:
    // {kind, from, cardinality, name, type, reverse}.
    //   from: Type on which this field was defined.
    //   cardinality: 'one' or 'many'. Always 'one' for scalars.
    //   type: Attribute value's type.
    //   kind: One of 'scalar', 'oneToMany', 'manyToOne', or 'manyToMany'.
    //   reverse: relationship's counter part on destination type.
    // Populated during type system finalization.
    this._fieldDefs = {};

    // Maps a union of field names from this and all super types.
    // Initialized after all types have their _fieldDefs populated.
    this._allFields = null;

  }

}

// An entity is a concrete composite type with unique IDs.
class Entity extends Composite {

  constructor(schema, name, bases) {
    super(schema, name, bases);
  }

}

// A trait is an abstract composite type.
class Trait extends Composite {

  constructor(schema, name, bases) {
    super(schema, name, bases);
  }

}


let relationKinds = {
  one: {
    one: 'oneToOne',
    many: 'oneToMany',
  },
  many: {
    one: 'manyToOne',
    many: 'manyToMany',
  },
};

let reserved = {
  lid: true,
  gid: true,
  type: true,
};

let ensureUnreserved = (typeName, fieldName) => {
  if (reserved[fieldName]) {
    throw new Error('Cannot add field with reserved name "' +
        fieldName + '" to ' + typeName);
  }
};

let coerceType = (schema, x) => {
  if (x instanceof Type) {
    if (x._schema !== schema) {
      throw new Error('Cannot use Type from another schema');
    }
    return x;
  }
  let type = schema[x];
  if (!type) {
    throw new Error('Unknown type: ' + x);
  }
  return type;
};


class SchemaBuilder {

  constructor() {

    this._types = {};

    // Define standard types.

    let typeofValidator = (name) => (x) => {
      if (typeof x !== name) {
        throw new Error('Expected ' + name);
      }
      return x;
    };

    this.scalar('Text', typeofValidator('string'));
    this.scalar('Bool', typeofValidator('boolean'));
    this.scalar('Num', typeofValidator('number'));

    this.scalar('Type', (x) => coerceType(this._types, x));

  }

  _type(type) {
    if (type._name in this._types) {
      throw new Error('Redefinition of type: ' + type._name)
    }
    this._types[type._name] = type;
    return type;
  }

  scalar(name, validate) {
    return this._type(new Scalar(this._types, name, validate));
  }

  entity(name, ...bases) {
    return this._type(new Entity(this._types, name, bases));
  }

  trait(name, ...bases) {
    return this._type(new Trait(this._types, name, bases));
  }

  _getType(name) {
    let type = this._types[name];
    if (!type) {
      throw new Error('Unknown type: ' + name);
    }
    return type;
  }

  finalize({attributes, relationships}) {

    // Decorate types with attributes.
    Object.keys(attributes).forEach(typeName => {
      let attributeTypes = attributes[typeName];
      let type = this._getType(typeName);

      Object.keys(attributeTypes).forEach(attrName => {
        ensureUnreserved(attrName);
        let attrType = attributeTypes[attrName];
        if (!(attrType instanceof Scalar)) {
          throw new Error(`Expected scalar for ${typeName}.${attrName}`);
        }
        type._fieldDefs[attrName] = {
          kind: 'scalar',
          cardinality: 'one',
          from: type,
          name: attrName,
          type: attrType,
          reverse: null,
        };
      });

    });

    // Add special attributes to all entities.
    Object.keys(this._types).forEach(typeName => {
      let type = this._types[typeName];
      if (!(type instanceof Entity)) {
        return;
      }
      ['lid', 'gid'].forEach(attrName => {
        type._fieldDefs[attrName] = {
          kind: 'scalar',
          cardinality: 'one',
          from: type,
          name: attrName,
          type: this._types.Text,
          reverse: null,
        };
      });
      type._fieldDefs['type'] = {
        kind: 'scalar',
        cardinality: 'one',
        from: type,
        name: 'type',
        type: this._types.Type,
        reverse: null,
      };
    });

    // Decorate types with relationships.
    let addRelation = (fromType, fromCard, toCard, name, toType) => {
      ensureUnreserved(name);
      if (name in fromType._fieldDefs) {
        throw new Error(`Relation redefines field: ${fromType}.${name}`);
      }
      let def = {
        kind: relationKinds[fromCard][toCard],
        cardinality: fromCard,
        from: fromType,
        name,
        type: toType,
        reverse: null,
      };
      fromType._fieldDefs[name] = def;
      return def;
    };
    relationships.forEach(([left, right]) => {
      let [typeL, cardL, nameL] = left;
      let [typeR, cardR, nameR] = right;
      let defL = addRelation(typeL, cardL, cardR, nameL, typeR);
      let defR = addRelation(typeR, cardR, cardL, nameR, typeL);
      defL.reverse = defR;
      defR.reverse = defL;
    });

    // Build field set indexes recursively bottom-up.
    let indexFields = (type) => {
      if (type._allFields !== null) {
        // Already visited this type.
        return type._allFields;
      }
      type._allFields = Object.assign({}, type._fieldDefs);
      type._bases.forEach(baseType => {
        Object.keys(indexFields(baseType)).forEach(fieldName => {

          let field = baseType._allFields[fieldName];

          // Check for conflicts.
          let existing = type._allFields[fieldName];
          if (existing) {
            throw new Error(`Field ${fieldName} conflicts between ` +
                `${existing.from._name} and ${field.from._name}`)
          }

          type._allFields[fieldName] = field;

        });
      });
      return type._allFields;
    };

    // Run field indexing on all types.
    Object.keys(this._types).forEach(typeName => {
      let type = this._types[typeName];
      indexFields(type);
    });

    // Prevent additional operations.
    this._types = null;

  }

}

let newSchema = () => {
  let b = new SchemaBuilder();
  return [b, b._types];
};

module.exports = {
  coerceType, Type, Scalar, Composite, Trait, Entity, newSchema,
};
