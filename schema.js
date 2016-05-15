

class Type {

  constructor(name) {
    this._name = name;
  }

  name() {
    return this._name
  }

}

class Scalar extends Type {

  constructor(name, validate) {
    super(name);
    this._validate = validate;
  }

}

class Composite extends Type {

  constructor(name, bases) {

    super(name);

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
    // Definition structures have form {kind, from, name, type, ...}.
    //   `from` is the defining type. `type` is the attribute type.
    //   Possible kinds are 'attribute' and 'relation'.
    //   If kind is 'relation', structure also has 'cardinality'.
    //     Possible cardinalities are 'one' and 'many'.
    // Populated during type system finalization.
    this._fieldDefs = {};

    // Maps a union of field names from this and all super types.
    // Initialized after all types have their _fieldDefs populated.
    this._allFields = null;

  }

}

// An entities is a composite type with a unique ID.
class Entity extends Composite {

  constructor(name, bases) {
    super(name, bases);
  }

}

// A resource is a perspective of an entity.
// An entity itself is it's own public perspective resource.
//XXX class Resource extends Composite

// A trait is a named set of fields.
class Trait extends Composite {

  constructor(name, bases) {
    super(name, bases);
  }

}


class Builder {

  constructor() {
    this.types = {};
  }

  _type(type) {
    if (type._name in this.types) {
      throw new Error('Redefinition of type: ' + type._name)
    }
    this.types[type._name] = type;
    return type;
  }

  scalar(name, validate) {
    return this._type(new Scalar(name, validate));
  }

  entity(name, ...bases) {
    return this._type(new Entity(name, bases));
  }

  trait(name, ...bases) {
    return this._type(new Trait(name, bases));
  }

  _getType(name) {
    let type = this.types[name];
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
        let attrType = attributeTypes[attrName];
        if (!(attrType instanceof Scalar)) {
          throw new Error(`Expected scalar for ${typeName}.${attrName}`);
        }
        type._fieldDefs[attrName] = {
          kind: 'attribute',
          from: type,
          name: attrName,
          type: attrType,
        };
      });

    });

    // Decorate types with relationships.
    let addRelation = (fromType, cardinality, name, toType) => {
      if (name in fromType._fieldDefs) {
        throw new Error(`Relation redefines field: ${fromType}.${name}`);
      }
      fromType._fieldDefs[name] = {
        kind: 'relation',
        from: fromType,
        name,
        type: toType,
        cardinality,
      };
    };
    relationships.forEach(([left, right]) => {
      let [typeL, cardL, nameL] = left;
      let [typeR, cardR, nameR] = right;
      addRelation(typeL, cardL, nameL, typeR);
      addRelation(typeR, cardR, nameR, typeL);
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
    Object.keys(this.types).forEach(typeName => {
      let type = this.types[typeName];
      indexFields(type);
    });

    // Prevent additional operations.
    this.types = null;

  }

}

module.exports = {Builder};
