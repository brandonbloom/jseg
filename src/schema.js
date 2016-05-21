let {getOwn} = require('./util');


let banInsanity = (s) => {
  if (s === '__prototype__') {
    throw Error('insanity.');
  }
}

let compareLids = (x, y) => {
  return Math.sign(x.lid - y.lid);
};


class Type {

  constructor(schema, name) {
    banInsanity(name);
    this._schema = schema;
    this._name = name;
  }

  name() {
    return this._name
  }

}

class Scalar extends Type {

  constructor(schema, name, {marshal, unmarshal}) {
    super(schema, name);
    this._marshal = marshal || ((x) => x);
    this._unmarshal = unmarshal || ((x) => x);
  }

}

class Composite extends Type {

  constructor(schema, name, bases) {

    super(schema, name);

    this._bases = bases;

    // Compute map of all implemented type names to type objects.
    this._supers = {};
    let include = (type) => {
      if (this._supers.hasOwnProperty(type._name)) {
        throw Error('Duplicate super ' + type._name + ' in ' + name);
      }
      this._supers[type._name] = type;
      type._bases.forEach(base => {
        if (!(base instanceof Composite)) {
          throw Error(`${name} extends non-Composite: ${type._name}`);
        }
        include(base);
      });
    };
    include(this);

    // Maps field names defined directly on this type to definition structures.
    // Definition structures have form:
    // {kind, from, cardinality, name, type, reverse, compare}.
    //   from: Type on which this field was defined.
    //   cardinality: 'one' or 'many'. Always 'one' for scalars.
    //   type: Attribute value's type.
    //   kind: One of 'scalar', 'oneToMany', 'manyToOne', or 'manyToMany'.
    //   reverse: relationship's counter part on destination type.
    //   compare: function for sorting cardinality 'many' arrays on query.
    // Populated during type system finalization.
    this._fieldDefs = {};

    // Maps a union of field names from this and all super types.
    // Initialized after all types have their _fieldDefs populated.
    this._allFields = null;

  }

  _defField(field) {
    let {name} = field;
    banInsanity(name);
    this._fieldDefs[name] = field;
  }

  _field(name) {
    return getOwn(this._allFields, name);
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

let coerceType = (schema, x) => {
  if (x instanceof Type) {
    if (x._schema !== schema) {
      throw Error('Cannot use Type from another schema');
    }
    return x;
  }
  let type = schema[x];
  if (!type) {
    throw Error('Unknown type: ' + x);
  }
  return type;
};


class SchemaBuilder {

  constructor() {

    this._types = {};

    // Define standard scalar types.

    this.scalar('Key', {
      marshal: (x) => {
        if (typeof x === 'string') {
          x = x.trim();
          if (x !== '') {
            return x;
          }
        }
        throw Error('expected non-empty string');
      },
    });

    let primitive = (name, tag) => {
      this.scalar(name, {
        marshal: (x) => {
          if (typeof x !== tag) {
            throw Error('Expected ' + tag);
          }
          return x;
        },
      });
    };

    primitive('Text', 'string');
    primitive('Bool', 'boolean');
    primitive('Num', 'number');

    this.scalar('Type', {
      marshal: (x) => coerceType(this._types, x),
      unmarshal: (x) => x._name,
    });

    this.scalar('Time', {
      marshal: (x) => new Date(x),
      unmarshal: (x) => x.toISOString(),
    });

    // Declare the only special composite type.
    this.trait('Entity');

  }

  _type(type) {
    if (this._types.hasOwnProperty(type._name)) {
      throw Error('Redefinition of type: ' + type._name)
    }
    this._types[type._name] = type;
    return type;
  }

  scalar(name, options) {
    return this._type(new Scalar(this._types, name, options));
  }

  trait(name, ...bases) {
    return this._type(new Composite(this._types, name, bases));
  }

  entity(name, ...bases) {
    bases = [this._types.Entity].concat(bases);
    return this._type(new Composite(this._types, name, bases));
  }

  _getType(name) {
    let type = this._types[name];
    if (!type) {
      throw Error('Unknown type: ' + name);
    }
    return type;
  }

  finalize({attributes, relationships}) {

    // Add special attributes to Entity.
    let Entity = this._types.Entity;
    ['lid', 'gid'].forEach(attrName => {
      Entity._defField({
        kind: 'scalar',
        cardinality: 'one',
        from: Entity,
        name: attrName,
        type: this._types.Key,
        reverse: null,
        compare: null,
      });
    });
    Entity._defField({
      kind: 'scalar',
      cardinality: 'one',
      from: Entity,
      name: 'type',
      type: this._types.Type,
      reverse: null,
      compare: null,
    });

    // Decorate types with attributes.
    Object.keys(attributes).forEach(typeName => {
      let attributeTypes = attributes[typeName];
      let type = this._getType(typeName);

      Object.keys(attributeTypes).forEach(attrName => {
        let attrType = attributeTypes[attrName];
        if (!(attrType instanceof Scalar)) {
          throw Error(`Expected scalar for ${typeName}.${attrName}`);
        }
        if (type._fieldDefs.hasOwnProperty(attrName)) {
          throw Error(type._name + '.' + attrName +
              ' conflicts with builtin field');
        }
        type._defField({
          kind: 'scalar',
          cardinality: 'one',
          from: type,
          name: attrName,
          type: attrType,
          reverse: null,
          compare: null,
        });
      });

    });

    // Decorate types with relationships.
    let addRelation = (fromType, fromCard, toCard, name, toType, options) => {
      if (fromType._fieldDefs.hasOwnProperty(name)) {
        throw Error(`Relation redefines field: ${fromType}.${name}`);
      }
      let {compare} = options || {};
      let def = {
        kind: relationKinds[toCard][fromCard],
        cardinality: fromCard,
        from: fromType,
        name,
        type: toType,
        reverse: null, // Knot tied below.
        compare: compare || compareLids,
      };
      fromType._defField(def);
      return def;
    };
    relationships.forEach(([left, right]) => {
      let [typeL, cardL, nameL, optsL] = left;
      let [typeR, cardR, nameR, optsR] = right;
      let defL = addRelation(typeL, cardL, cardR, nameL, typeR, optsL);
      let defR = addRelation(typeR, cardR, cardL, nameR, typeL, optsR);
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
          if (type._allFields.hasOwnProperty(fieldName)) {
            let existing = type._allFields[fieldName];
            throw Error(`Field ${fieldName} conflicts between ` +
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
  coerceType, Type, Scalar, Composite, newSchema,
};
