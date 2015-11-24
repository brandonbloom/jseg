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
    this._lookup = {};
  }

  put(entity) {

    let {id} = entity;

    // Lookup or create shallow, mutable, stored object.
    if (!id) {
      console.error('Can not put entity without id: ', entity);
      return;
    }
    let obj = this._lookup[id];
    if (!obj) {
      obj = {};
      this._lookup[id] = obj;
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
      let obj = this._lookup[id];
      let entity = {};
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

  lookup(field, value) {
    //TODO: Implement non-ID based indexing in opt-in string fields.
  }

  destroy(id) {
    //TODO: Recursively delete component structures.
  }

  remove(parentId, field, childId) {
  }

}
