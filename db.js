//TODO: Reverse relationships.
//TODO: Change listeners.

let baseSchema = {
  id: {
    type: 'string',
  },
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
        if (schema.type === 'ref') {
          // Write set of referenced IDs, recurse.
          let set = obj[field] || {};
          for (let val of entity[field]) {
            set[val.id] = true;
            this.put(val);
          }
          obj[field] = set;
        }
        else {
          obj[field] = [].concat(entity[field]);
        }
      }
      else {
        let val = entity[field];
        if (schema.type === 'ref') {
          if (!val.id) {
            console.warn('Ref does not have id: ', val);
            continue;
          }
          obj[field] = val.id;
          this.put(val);
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
          if (schema.type === 'ref') {
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
        else {
          if (schema.type === 'ref') {
            entity[field] = get(obj[field]);
          }
          else {
            entity[field] = obj[field];
          }
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
      if (schema.type === 'ref' && schema.destroy) {
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
    let obj = this._objs[parentId];
    if (!obj) {
      return;
    }
    let val = obj[field];
    delete val[childId];
  }

}
