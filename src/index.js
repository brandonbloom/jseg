let baseSchema = {
  lid: {},
};

let defaultCompare = (x, y) => {
  //XXX total order for non-ref types.
  return Math.sign(x - y);
};

let compareIds = (x, y) => {
  return Math.sign(x.lid - y.lid);
};

let validate = (field, schema, val) => {
  if (!schema.validate) {
    return val;
  }
  try {
    return schema.validate(val);
  } catch (e) {
    console.error('Error validating ' + field + ': ' + e);
    return null;
  }
};

export default class Database {

  constructor(schema) {

    this._schema = Object.assign({}, baseSchema, schema);
    this._objs = {};

    // Allocate lookup tables.
    this._lookup = {};
    for (let field in schema) {
      if (schema[field].unique) {
        this._lookup[field] = {};
      }
    }

  }

  put(entity) {

    let {lid} = entity;

    // Lookup or create shallow, mutable, stored object.
    if (!lid) {
      console.error('Can not put entity without lid: ', entity);
      return;
    }
    let obj = this._objs[lid];
    if (!obj) {
      obj = {};
      this._objs[lid] = obj;
    }

    // Write fields.
    for (let field in entity) {

      let schema = this._schema[field];
      if (!schema) {
        console.warn('Unknown field: ' + field);
        continue;
      }

      if (schema.collection) {
        if (schema.ref) {
          // Write set of referenced IDs, recurse.
          let set = obj[field] || {};
          obj[field] = set;
          let values = entity[field] || [];
          for (let val of values) {
            let target = Object.assign({}, val);
            if (set[val.lid]) {
              continue;
            }
            set[val.lid] = true;
            // Set reverse reference.
            if (this._schema[schema.ref].collection) {
              let arr = target[schema.ref] || [];
              target[schema.ref] = [].concat(arr, [{lid}]);
            } else {
              target[schema.ref] = {lid};
            }
            this.put(target);
          }
        } else {
          let val = validate(field, schema, entity[field]);
          obj[field] = [].concat(val);
        }
      } else {
        let val = entity[field];
        if (schema.ref) {
          if (!val) {
            let targetLid = obj[field];
            if (targetLid) {
              if (this._schema[schema.ref].collection) {
                this.remove(lid, field, targetLid);
              } else {
                delete obj[field];
                delete this._objs[targetLid][field];
              }
            }
            continue;
          }
          if (!val.lid) {
            console.warn('Ref does not have lid: ', val);
            continue;
          }
          let target = Object.assign({}, val);
          if (obj[field] !== val.lid) {
            obj[field] = val.lid;
            // Set reverse relationship.
            if (this._schema[schema.ref].collection) {
              let arr = target[schema.ref] || [];
              target[schema.ref] = [].concat(arr, [{lid}]);
            } else {
              target[schema.ref] = {lid};
            }
          }
          this.put(target);
        } else {
          val = validate(field, schema, val);
          if (schema.unique) {
            this._lookup[field][val] = lid;
          }
          obj[field] = val;
        }
      }

    }

  }

  get(rootLid) {
    let inside = {};
    let rec = (lid) => {
      if (inside[lid]) {
        return {lid};
      }
      inside[lid] = true;
      let obj = this._objs[lid];
      let entity = {lid};
      for (let field in obj) {
        let schema = this._schema[field];
        if (schema.collection) {
          let arr;
          let compare = schema.compare;
          if (schema.ref) {
            arr = Object.keys(obj[field]).map(rec);
            compare = compare || compareIds;
          } else {
            arr = [].concat(obj[field]);
            compare = compare || defaultCompare;
          }
          if (arr.length > 0) {
            arr.sort(compare);
            entity[field] = arr;
          }
        } else if (schema.ref) {
          entity[field] = rec(obj[field]);
        } else {
          entity[field] = obj[field];
        }
      }
      inside[lid] = false;
      return entity;
    };
    return rec(rootLid);
  }

  lookup(field, value) {
    return this.get(this._lookup[field][value]);
  }

  destroy(lid) {
    let obj = this._objs[lid];
    if (!obj) {
      return;
    }
    delete this._objs[lid];
    for (var field in obj) {
      let val = obj[field];
      let schema = this._schema[field];
      if (schema.ref) {
        let arr = (schema.collection ? Object.keys(val) : [val]);
        for (let ref of arr) {
          if (schema.destroy) {
            this.destroy(ref);
          } else {
            this.remove(ref, schema.ref, lid);
          }
        }
      } else if (schema.unique) {
        delete this._lookup[field][val];
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
    if (schema.collection) {
      if (!val[childId]) {
        return;
      }
      delete val[childId];
    } else {
      if (val !== childId) {
        return;
      }
      delete obj[field];
    }
    this.remove(childId, schema.ref, parentId);
  }

}
