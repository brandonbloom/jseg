let {getOwn, eachPair, objEmpty, StringMap} = require('./util');
let s = require('./schema');


class Graph {


  constructor(schema, options) {

    this._schema = schema;

    this._options = Object.assign({
      log: (...args) => console.error(...args),
    }, options);

    // Construct indexes as map of defining type name -> field name -> obj.
    this._indexes = {};
    eachPair(this._schema, (typeName, type) => {

      let indexes = {};
      this._indexes[typeName] = indexes;

      if (!(type instanceof s.Composite)) {
        return;
      }

      eachPair(type._fieldDefs, (fieldName, field) => {

        // Only index Key fields.
        if (field.type !== schema.Key) {
          return;
        }

        let index = new StringMap();
        indexes[fieldName] = index;

      });
    });

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

    if (typeof entity !== 'object' || Array.isArray(entity)) {
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
    let obj = this._findByLid(lid);
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
      if (!type._field('lid')) {
        this._log('not an entity type:', type);
        return undefined;
      }
      // Pre-initialize special fields needed to establish relationships.
      obj = {lid, type};
      let index = this._indexes['Entity']['lid'];
      index.put(lid, obj);
    }

    // Put all non-special fields.
    eachPair(entity, (fieldName, value) => {
      if (fieldName in {lid: true, type: true}) {
        return;
      }
      let field = obj.type._field(fieldName);
      if (!field) {
        this._log('unknown field', JSON.stringify(fieldName),
                  'on', obj.type._name);
        return;
      }
      this._putField(obj, field, value);
    });

    return obj;

  }

  _coerceType(x) {
    return this._validate('type', (t) => s.coerceType(this._schema, t), x);
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

    let {kind, from, name, type} = field;

    if (kind === 'scalar') {

      let oldValue = getOwn(obj, name);
      let newValue = this._validate(name, type._validate, value);
      if (newValue === null) {
        delete obj[name];
      } else if (typeof newValue !== 'undefined') {
        obj[name] = newValue;
      } else {
        return;
      }

      if (type === this._schema.Key) {
        let index = this._indexes[from._name][name];
        if (oldValue) {
          index.del(oldValue)
        }
        if (newValue) {
          index.put(newValue, obj);
        }
      }

    } else {

      let {reverse} = field;

      switch (kind) {

        case 'oneToOne': {
          let other = this._put(value);
          if (typeof other === 'undefined') {
            return;
          }
          let prior = getOwn(obj, name);
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
        }

        case 'oneToMany': {
          let set = getOwn(obj, name);
          if (!set) {
            set = {};
            obj[name] = set;
          }
          value.forEach(x => {
            let other = this._put(x);
            if (!other) {
              return;
            }
            let prior = getOwn(other, reverse.name);
            if (prior) {
              this._remove(other, reverse, prior);
            }
            other[reverse.name] = obj;
            set[other.lid] = other;
          });
          break;
        }

        case 'manyToOne': {
          let prior = getOwn(obj, name);
          if (prior) {
            this._remove(obj, field, prior);
          }
          let other = this._put(value);
          if (!other) {
            return;
          }
          obj[name] = other;
          let set = other[reverse.name];
          if (!set) {
            set = {};
            other[reverse.name] = set;
          }
          set[obj.lid] = obj;
          break;
        }

        case 'manyToMany': {
          let fromSet = getOwn(obj, name);
          if (!fromSet) {
            fromSet = {};
            obj[name] = fromSet;
          }
          value.forEach(x => {
            let other = this._put(x);
            if (!other) {
              return;
            }
            let toSet = getOwn(other, reverse.name);
            if (!toSet) {
              toSet = {};
              other[reverse.name] = toSet;
            }
            fromSet[other.lid] = other;
            toSet[obj.lid] = obj;
          });
          break;
        }

        default: {
          this._log('cannot put field of unexpected kind:', kind);
          return;
        }

      }

    }
  }


  // Query.

  get(lid, options) {
    let obj = this._findByLid(lid);
    return obj ? this._read(obj, options) : null;
  }

  lookup(type, attribute, value, options) {
    type = this._coerceType(type);
    if (!type) {
      return null;
    }
    let keyField = type._field(attribute);
    if (!keyField) {
      this._log('Unknown key field: ' + type._name + '.' + attribute);
      return null;
    }
    let obj = this._find(keyField, value);
    return obj ? this._read(obj, options) : null;
  }

  _findByLid(lid) {
    let {Entity} = this._schema;
    let keyField = Entity._fieldDefs['lid'];
    return this._find(keyField, lid);
  }

  _find(keyField, value) {
    let {from, name} = keyField;
    let index = this._indexes[from._name][name];
    return index.get(value);
  }

  _read(root, options) {

    let {depth, json} = Object.assign({depth: 1}, options);

    depth = depth || -1;

    let marshal = (json ?
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
        let value = getOwn(obj, fieldName);
        let {type, kind, cardinality, compare} = obj.type._field(fieldName);
        let undef = (typeof value === 'undefined');
        if (cardinality === 'one') {
          if (undef) {
            return null;
          }
          if (kind === 'scalar') {
            return marshal(type._serialize, value);
          }
          return rec(value)
        }
        if (undef) {
          return [];
        }
        let lids = Object.keys(value);
        return lids.map(lid => rec(value[lid])).sort(compare);
      };

      let entity = {};
      for (let fieldName in obj.type._allFields) {
        entity[fieldName] = getField(fieldName);
      }
      inside[obj.lid] = false;
      depth++;
      return entity;
    };

    return rec(root);

  }


  // Deletion.

  destroy(lid) {
    let obj = this._findByLid(lid);
    if (!obj) {
      return;
    }
    this._destroy(obj);
  }

  _destroy(obj) {

    // Skip objects already destroyed during the casacde.
    if (!this._findByLid(obj.lid)) {
      return;
    }

    let cascade = [];

    eachPair(obj, (fieldName, value) => {

      let field = obj.type._field(fieldName)
      let {from, kind, reverse, destroy} = field;

      // Remove index entries and reverse links.
      switch (kind) {

        case 'scalar': {
          if (field.type === this._schema.Key) {
            let index = this._indexes[from._name][fieldName]
            index.del(value);
          }
          break;
        }

        case 'oneToOne': {
          delete value[reverse.name];
          break;
        }

        case 'oneToMany': {
          eachPair(value, (lid, other) => {
            delete other[reverse.name];
          });
          break;
        }

        case 'manyToOne': {
          let set = value[reverse.name];
          delete set[obj.lid];
          break;
        }

        case 'manyToMany': {
          eachPair(value, (lid, other) => {
            let set = other[reverse.name];
            delete set[obj.lid];
          });
          break;
        }

        default: {
          this._log('cannot destroy field of unexpected kind:', kind);
          break;
        }

      }

      // Schedule cascading deletes after reverse references destroyed.
      if (!destroy) {
        return;
      }
      if (field.cardinality === 'many') {
        eachPair(value, (lid, other) => {
          cascade.push(other);
        });
      } else if (value) {
        cascade.push(value);
      }

    });

    // Preform the delayed cascding destroys.
    cascade.forEach(other => {
      this._destroy(other);
    });

  }

  remove(fromLid, relationName, toLid) {
    let from = this._findByLid(fromLid);
    if (!from) {
      return;
    }
    let relation = from.type._field(relationName);
    if (!relation) {
      this._log('unknown relation: ' + relationName);
      return;
    }
    let to = this._findByLid(toLid);
    if (!to) {
      return;
    }
    return this._remove(from, relation, to);

  }

  _remove(from, relation, to) {
    let {kind, name, reverse} = relation;
    switch (kind) {

      case 'scalar': {
        throw Error('not implemented'); //XXX
        break;
      }

      case 'oneToOne': {
        let value = getOwn(from, name);
        if (value === to) {
          delete from[name];
          delete to[reverse.name];
        }
        break;
      }

      case 'oneToMany': {
        this._removeOneToMany(from, relation, to);
        break;
      }

      case 'manyToOne': {
        this._removeOneToMany(to, reverse, from);
        break;
      }

      case 'manyToMany': {
        let fromSet = getOwn(from, name);
        let toSet = getOwn(to, reverse.name);
        delete fromSet[to.lid];
        delete toSet[from.lid];
        if (objEmpty(fromSet)) {
          delete from[name];
        }
        if (objEmpty(toSet)) {
          delete to[reverse.name];
        }
        break;
      }

      default: {
        this._log('cannot remove field of unexpected kind:', kind);
        break;
      }

    }

  }

  _removeOneToMany(from, relation, to) {
    let {name, reverse} = relation;
    let set = getOwn(from, name);
    if (!set) {
      return;
    }
    let other = getOwn(set, to.lid);
    delete other[reverse.name];
    delete set[to.lid];
    if (objEmpty(set)) {
      delete from[name];
    }
  }


}

module.exports = Graph;
