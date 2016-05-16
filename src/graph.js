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


  // Insertion.

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
          this._log('put type', type, 'does not match existing:', obj.type);
          return obj;
        }
      }
    } else {
      // Create a new typed entity object.
      if (!entity.type) {
        this._log('expected type for new entity:', entity);
        return undefined;
      }
      let type = s.coerceType(this._schema, entity.type);
      if (!(type instanceof s.Entity)) {
        this._log('not an entity type:', type);
        return undefined;
      }
      obj = {lid, type};
      this._objs[lid] = obj;
    }

    // Put all mutable fields.
    Object.keys(entity).forEach(fieldName => {
      if (fieldName in {lid: true, type: true}) {
        return;
      }
      let field = obj.type._allFields[fieldName];
      if (!field) {
        this._log('unknown field', fieldName, 'on', obj.type);
        return;
      }
      this._putField(obj, field, entity[fieldName]);
    });

    return obj;

  }

  _coerceType(x) {
    return this._validate('type', s.coerceType, x);
  }

  _validate(fieldName, f, x) {
    if (x === null) {
      return null;
    }
    try {
      return f(x);
    } catch (e) {
      this._log('error validating ' + fieldName + ': ' + e);
      return undefined;
    }
  }

  _putField(obj, field, value) {

    let {kind, name, type} = field;

    if (kind === 'scalar') {

      let validated = this._validate(name, type._marshal, value);
      if (validated === null) {
        delete obj[name];
      } else if (typeof validated !== 'undefined') {
        obj[name] = validated;
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
            other[reverse.name] = obj;
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
          this._log('Unexpected field kind:', kind);
          return;

      }

    }
  }


  // Query.

  get(lid, options) {

    let {depth, json} = Object.assign({depth: 1}, options);
    depth = depth || -1;
    let unmarshal = (json ?
      (f, x) => f(x) :
      (_, x) => x
    );

    let inside = {};

    let rec = (obj) => {
      if (depth === 0 || inside[obj.lid]) {
        return {lid: obj.lid};
      }
      inside[obj.lid] = true;
      depth--;

      let getField = (fieldName) => {
        let value = obj[fieldName]
        let {type, kind, cardinality} = obj.type._allFields[fieldName];
        if (kind === 'scalar') {
          return unmarshal(type._unmarshal, value);
        }
        if (cardinality === 'one') {
          return rec(value)
        }
        return Object.keys(value).map(rec);
      };

      let entity = {};
      for (let fieldName in obj) {
        entity[fieldName] = getField(fieldName);
      }
      inside[obj.lid] = false;
      depth++;
      return entity;
    };

    let obj = this._objs[lid];
    return obj ? rec(obj) : null;

  }


  // Deletion.

  destroy(lid) {
    let obj = this._objs[lid];
    if (!obj) {
      return;
    }
    this._destroy(obj);
  }

  _destroy(obj) {
    delete this._objs[obj.lid];
    for (var fieldName in obj) {
      let value = obj[fieldName];
      let {kind, reverse} = obj.type._allFields[fieldName];
      switch (kind) {

        case 'scalar':
          //XXX if unique
          break;

        case 'oneToOne':
          delete value[reverse.name];
          //XXX if destroy cascading.
          break;

        case 'oneToMany':
          throw Error('not implemented'); //XXX
          break;

        case 'manyToOne':
          throw Error('not implemented'); //XXX
          break;

        case 'manyToMany':
          throw Error('not implemented'); //XXX
          break;

        default:
          this._log('Unexpected field kind: ' + kind);
          break;

      }
    }
  }

  remove(fromLid, relationName, toLid) {
    let from = this._objs[fromLid];
    if (!from) {
      return;
    }
    let relation = from.type._allFields[relationName];
    if (!relation) {
      this._log('unknown relation: ' + relationName);
      return;
    }
    let to = this._objs[toLid];
    if (!to) {
      return;
    }
    return this._remove(from, relation, to);

  }

  _remove(from, relation, to) {
    let {kind, name, reverse} = relation;
    switch (kind) {

      case 'scalar':
        throw Error('not implemented'); //XXX
        break;

      case 'oneToOne':
        let value = from[name];
        if (value === to) {
          delete from[name];
          delete to[reverse.name];
        }
        break;

      case 'oneToMany':
        throw Error('not implemented'); //XXX
        break;

      case 'manyToOne':
        throw Error('not implemented'); //XXX
        break;

      case 'manyToMany':
        throw Error('not implemented'); //XXX
        break;

      default:
        this._log('Unexpected field kind: ' + kind);
        break;

    }

  }


}

module.exports = Graph;
