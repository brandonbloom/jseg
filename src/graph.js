let s = require('./schema');



class Graph {

  constructor(schema, options) {
    this._schema = schema;
    this._objs = {};
    this._options = Object.assign({
      log: console.error,
    }, options);
  }

  _log(...args) {
    this._options.log(...args);
  }

  _validate(fieldName, f, x) {
    try {
      return f(x);
    } catch (e) {
      this._log('Error validating ' + fieldName + ': ' + e);
      return undefined;
    }
  }

  put(entity) {
    //TODO: begin/commit.
    this._put(entity);
  }

  _put(entity) {

    if (typeof entity !== 'object') {
      this._log('expected entity object:', entity);
      return undefined;
    }

    if (!entity) {
      return null;
    }

    let {lid} = entity;
    if (!lid) {
      this._log('missing lid:', entity);
      return undefined;
    }

    // Find or create mutable storage object.
    let obj = this._objs[lid];
    if (obj) {
      // Prevent transmutation of existing object.
      if (entity.type) {
        let type = this._coerceType(obj.type);
        if (type !== obj.type) {
          this._log('put type ', type, 'does not match existing: ', obj.type);
          return obj;
        }
      }
    } else {
      // Create a new typed entity object.
      if (!entity.type) {
        this._log('expected type for new entity: ', entity);
        return undefined;
      }
      let type = s.coerceType(this._schema, entity.type);
      if (!(type instanceof s.Entity)) {
        this._log('not an entity type: ', type);
        return undefined;
      }
      obj = {lid, type};
      this._objs[lid] = obj;
    }

    // Assert all mutable fields.
    Object.keys(entity).forEach(fieldName => {
      if (fieldName in {lid: true, type: true}) {
        return;
      }
      let field = obj.type._allFields[fieldName];
      if (!field) {
        this._log('Unknown field ', fieldName, ' on ', obj.type);
        return;
      }
      this._assert(obj, field, entity[fieldName]);
    });

    return obj;

  }

  get(entity) {
    //XXX
  }

  _coerceType(x) {
    return this._validate('type', s.coerceType, x);
  }

  _assert(obj, field, value) {

    let {kind, name, type} = field;

    if (kind === 'scalar') {

      let validated = this._validate(field._name, type._validate, value);
      if (validated === null) {
        delete obj[field._name];
      } else if (typeof validated !== 'undefined') {
        obj[field._name] = validated;
      }

    } else {

      let {reverse} = field;

      switch (kind) {

        case 'oneToOne':
          let other = this._put(value);
          if (typeof other === 'undefined') {
            return;
          }
          let prior = obj[name];
          if (prior === other) {
            return;
          }
          if (prior) {
            delete prior[reverse.name];
          }
          if (other) {
            obj[name] = other;
          } else {
            delete obj[name];
          }
          break;

          /*
        case 'oneToMany':
          this._setHalf(obj, field, value);
          this._assertHalf(obj, field, oldValue);
          this._assertHalf(XXX);
          break;

        case 'manyToOne':
          let other = this._put(value);
          this._assertHalf(obj, field, value);
          this._retractHalf(obj, field, value);
          this._assertHalf(XXX);
          break;

        case 'manyToMany':
          this._assertHalf(obj, field, value);
          this._assertHalf(XXX);
          break;
          */

        default:
          this._log('Unexpected field kind: ', kind);
          return;

      }

    }
  }

  destroy(lid) {
    //XXX
  }

  remove(fromId, relation, toId) {
    let {kind, from, name, type: fieldType} = type._allFields[field];
    switch (kind) {

      case 'scalar':
        break;

      case 'oneToMany':
        break;

      case 'manyToOne':
        break;

      case 'manyToMany':
        break;

    }
  }

  _get(type, lid) {
  }

}

module.exports = Graph;
