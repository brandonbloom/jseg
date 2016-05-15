



// schema: entities have IDs
// Resource = Entity | Perspective | Extension
// Entity = {Name, FieldSet}; FieldSet must include Id
// Trait = {Name, FieldSet}
// Field = Attribute | Relation
// Relation = {from: Port}
//             ToType



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

  constructor(name) {
    super(name);
    this._defines = {};
    this._includes = {};
  }

}

// An entities is a composite type with a unique ID.
class Entity extends Composite {

  constructor(name) {
    super(name);
  }

}

// A resource is a perspective of an entity.
// An entity itself is it's own public perspective resource.
class Resource extends Composite {

  constructor(name) {
    super(name);
  }

}

// A trait is a named set of fields.
class Trait extends Composite {

  constructor(name) {
    super(name);
  }

}


class CompositeBuilder {

  constructor(type) {
    this._composite = type;
  }

  attribute(name, typeable) {
    if (typeof name !== 'string') {
      throw new Error('Expected name to be string');
    }
    let type = toType(typeable);
    let defs = this._composite._defines;
    if (name in defs) {
      throw new Error('Redefinition of field: ' +
          this._composite.name() + '.' + name);
    }
    defs[name] = {kind: 'attribute', type};
  }

  include(traitable) { //TODO: Differentiate include from extend?
    let trait = traitable._composite;
    if (!(trait instanceof Trait)) {
      throw new Error('Expected trait');
    }
    this._checkIncludes(this, {});
    this._composite._includes[trait._name] = trait;
  }

  _checkIncludes(composite, visited) {
    if (composite._name in this._composite._includes) {
      throw new Error('Duplicate include of ' + composite._name);
    }
    //XXX check for duplicates or cycles recursively.
  }

}

let toType = (x) => {
  if (x instanceof Type) {
    return x;
  }
  if (x instanceof TypeBuilder) {
    return x._type;
  }
  throw new Error('expected typeable');
};


class Builder {

  constructor() {
    this._types = {};
  }

  _type(type) {
    if (type._name in this._types) {
      throw new Error('Redefinition of type: ' + type._name)
    }
    this._types[type._name] = type;
    return type;
  }

  scalar(name, validate) {
    return this._type(new Scalar(name, validate));
  }

  _composite(type) {
    this._type(type);
    return new CompositeBuilder(type);
  }

  entity(name) {
    return this._composite(new Entity(name));
  }

  resource(name) {
    return this._composite(new Resource(name));
  }

  trait(name) {
    return this._composite(new Trait(name));
  }

  relate(leftType, leftCard, leftField,
         rightTyp, rightCard, rightField) {
  }

  build() {
    //XXX error if shadowing inherited names.
    //XXX error if the same trait is inherited twice.
    return this; //XXX generate a schema object.
  }

}

module.exports = {Builder};
