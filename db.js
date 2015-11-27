//TODO: Reverse relationships.
//TODO: Change listeners.

let baseSchema = {
  id: {},
};

let defaultCompare = function(x, y) {
  //XXX total order for non-ref types.
  return Math.sign(x - y);
};

let compareIds = function(x, y) {
  return Math.sign(x.id - y.id);
};

export default class Database {

  constructor(schema) {
    this._schema = Object.assign({}, baseSchema, schema);
    this._objs = {};
    this._lookup = {};
  }

  put(entity) {

    let {id} = entity;

    // Lookup or create shallow, mutable, stored object.
    if (!id) {
      console.error('Can not put entity without id: ', entity);
      return;
    }
    let obj = this._objs[id];
    if (!obj) {
      obj = {};
      this._objs[id] = obj;
    }

    // Write fields.
    for (let field in entity) {

      let schema = this._schema[field];
      if (!schema) {
        console.warn('Unknown field: ' + field);
        continue;
      }

      //XXX validation.
      if (schema.collection) {
        if (schema.ref) {
          // Write set of referenced IDs, recurse.
          let set = obj[field] || {};
          for (let val of entity[field]) {
            let target = Object.assign({}, val);
            if (!set[val.id]) {
              set[val.id] = true;
              // Set reverse reference.
              if (this._schema[schema.ref].collection) {
                target[schema.ref] = [].concat(target[schema.ref] || [], [{id}]);
              } else {
                target[schema.ref] = {id};
              }
            }
            this.put(target);
          }
          obj[field] = set;
        }
        else {
          obj[field] = [].concat(entity[field]);
        }
      }
      else {
        let val = entity[field];
        if (schema.ref) {
          if (!val.id) {
            console.warn('Ref does not have id: ', val);
            continue;
          }
          let target = Object.assign({}, val);
          if (obj[field] !== val.id) {
            obj[field] = val.id;
            // Set reverse relationship.
            if (this._schema[schema.ref].collection) {
              target[schema.ref] = [].concat(target[schema.ref] || [], [{id}]);
            } else {
              target[schema.ref] = {id};
            }
          }
          this.put(target);
        }
        else {
          if (schema.unique) {
            let table = this._getTable(field);
            table[val] = id;
          }
          obj[field] = val;
        }
      }

    }

  }

  get(id) {
    let inside = {};
    let get = (id) => {
      if (inside[id]) {
        return {id};
      }
      inside[id] = true;
      let obj = this._objs[id];
      let entity = {id};
      for (let field in obj) {
        let schema = this._schema[field];
        if (schema.collection) {
          let arr;
          let compare = schema.compare;
          if (schema.ref) {
            arr = Object.keys(obj[field]).map(get);
            compare = compare || compareIds;
          }
          else {
            arr = [].concat(obj[field]);
            compare = compare || defaultCompare;
          }
          arr.sort(compare);
          entity[field] = arr;
        }
        else if (schema.ref) {
          entity[field] = get(obj[field]);
        }
        else {
          entity[field] = obj[field];
        }
      }
      inside[id] = false;
      return entity;
    };
    return get(id);
  }

  _getTable(field) {
    let table = this._lookup[field];
    if (!table) {
      table = {};
      this._lookup[field] = table;
    }
    return table;
  }

  lookup(field, value) {
    let table = this._getTable(field);
    return this.get(table[value]);
  }

  destroy(id) {
    let obj = this._objs[id];
    if (!obj) {
      return;
    }
    delete this._objs[id];
    for (var field in obj) {
      let val = obj[field];
      let schema = this._schema[field];
      if (schema.ref && schema.destroy) {
        let arr = (schema.collection ? Object.keys(val) : [val]);
        for (let ref of arr) {
          this.destroy(ref);
        }
      } else if (schema.unique) {
        let table = this._getTable(field);
        delete table[val];
      }
    }
  }

  remove(parentId, field, childId) {
    let schema = this._schema[field];
    let obj = this._objs[parentId];
    if (!obj) {
      return;
    }
    let val = obj[field];
    if (!val[childId]) {
      return;
    }
    delete val[childId];
    if (this._schema[schema.ref].collection) {
      this.remove(childId, schema.ref, parentId);
    }
    else {
      delete this._objs[childId][field];
    }
  }

}
