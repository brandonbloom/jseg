let baseSchema = {
  lid: {},
};

let compareIds = (x, y) => {
  return Math.sign(x.lid - y.lid);
};

let validate = (field, schema, val) => {
  try {
    if (!schema.validate) {
      return val;
    }
    return schema.validate(val);
  } catch (e) {
    console.error('Error validating ' + field + ': ' + e);
    return null;
  }
};

//TODO: Validate schema in database constructor, not lazily.
let schemaError = (field, msg) => {
  throw Error('Schema error in field ' + field + ': ' + msg);
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

      //TODO: This has gotten quite hairy. Refactor after tests are complete!
      if (schema.collection) {
        if (!schema.ref) {
          throw schemaError(field, 'collection without ref');
        }
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
        } else if (schema.unique) {
          if (schema.unique) {
            let table = this._lookup[field];
            let oldVal = obj[field];
            if (oldVal) {
              delete table[oldVal];
            }
            if (val === null) {
              delete obj[field]
            } else {
              val = validate(field, schema, val);
              if (typeof val !== 'string' || !val) {
                console.error('Unique fields must be non-empty strings');
                continue;
              }
              table[val] = lid;
              obj[field] = val;
            }
          }
        } else if (val === null) {
          delete obj[field];
        } else {
          val = validate(field, schema, val);
          if (val === null) {
            delete obj[field];
          } else {
            obj[field] = val;
          }
        }
      }

    }

  }

  get(rootLid, options) {
    let {maxDepth} = options || {};
    let inside = {};
    let depth = 1;
    let rec = (lid) => {
      if ((maxDepth && depth > maxDepth) || inside[lid]) {
        return {lid};
      }
      inside[lid] = true;
      depth++;
      let obj = this._objs[lid];
      let entity = {lid};
      for (let field in obj) {
        let schema = this._schema[field];
        if (schema.collection) {
          let arr = Object.keys(obj[field]).map(rec);
          let compare = schema.compare || compareIds;
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
      depth--;
      return entity;
    };
    return rec(rootLid);
  }

  lookup(field, value, options) {
    let lid = this._lookup[field][value];
    return (lid || null) && this.get(lid, options);
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
    if (!schema.ref) {
      throw schemaError(field, 'Cannot remove from non ref field');
    }
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
