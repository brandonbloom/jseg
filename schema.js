

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

    this._defines = {};
    this._bases = bases;

    // Compute map of all implemented type names to type objects.
    this._supers = {};
    let include = (type) => {
      console.log('include: ' + type._name);
      if (type._name in this._supers) {
        throw new Error('Duplicate super ' + type._name + ' in ' + name);
      }
      this._supers[type._name] = type;
      type._bases.forEach(include);
    };
    include(this);

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

  resource(name, ...bases) {
    return this._type(new Resource(name, bases));
  }

  trait(name, ...bases) {
    return this._type(new Trait(name, bases));
  }

  build({attributes, relationships}) {

    //XXX error if shadowing inherited names.
    //XXX error if the same trait is inherited twice.

    // Prevent additional operations.
    this.types = null;

  }

}

module.exports = {Builder};
