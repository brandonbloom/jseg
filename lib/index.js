'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var baseSchema = {
  lid: {}
};

var compareIds = function compareIds(x, y) {
  return Math.sign(x.lid - y.lid);
};

var validate = function validate(field, schema, val) {
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
var schemaError = function schemaError(field, msg) {
  throw Error('Schema error in field ' + field + ': ' + msg);
};

var Database = function () {
  function Database(schema) {
    _classCallCheck(this, Database);

    this._schema = Object.assign({}, baseSchema, schema);
    this._objs = {};

    // Allocate lookup tables.
    this._lookup = {};
    for (var field in schema) {
      if (schema[field].unique) {
        this._lookup[field] = {};
      }
    }
  }

  _createClass(Database, [{
    key: 'put',
    value: function put(entity) {
      var lid = entity.lid;

      // Lookup or create shallow, mutable, stored object.

      if (!lid) {
        console.error('Can not put entity without lid: ', entity);
        return;
      }
      var obj = this._objs[lid];
      if (!obj) {
        obj = {};
        this._objs[lid] = obj;
      }

      // Write fields.
      for (var field in entity) {

        var schema = this._schema[field];
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
          var set = obj[field] || {};
          obj[field] = set;
          var values = entity[field] || [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = values[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var val = _step.value;

              var target = Object.assign({}, val);
              if (set[val.lid]) {
                continue;
              }
              set[val.lid] = true;
              // Set reverse reference.
              if (this._schema[schema.ref].collection) {
                var arr = target[schema.ref] || [];
                target[schema.ref] = [].concat(arr, [{ lid: lid }]);
              } else {
                target[schema.ref] = { lid: lid };
              }
              this.put(target);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        } else {
          var _val = entity[field];
          if (schema.ref) {
            if (!_val) {
              var targetLid = obj[field];
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
            if (!_val.lid) {
              console.warn('Ref does not have lid: ', _val);
              continue;
            }
            var _target = Object.assign({}, _val);
            if (obj[field] !== _val.lid) {
              obj[field] = _val.lid;
              // Set reverse relationship.
              if (this._schema[schema.ref].collection) {
                var _arr = _target[schema.ref] || [];
                _target[schema.ref] = [].concat(_arr, [{ lid: lid }]);
              } else {
                _target[schema.ref] = { lid: lid };
              }
            }
            this.put(_target);
          } else if (schema.unique) {
            if (schema.unique) {
              var table = this._lookup[field];
              var oldVal = obj[field];
              if (oldVal) {
                delete table[oldVal];
              }
              if (_val === null) {
                delete obj[field];
              } else {
                _val = validate(field, schema, _val);
                if (typeof _val !== 'string' || !_val) {
                  console.error('Unique fields must be non-empty strings');
                  continue;
                }
                table[_val] = lid;
                obj[field] = _val;
              }
            }
          } else if (_val === null) {
            delete obj[field];
          } else {
            _val = validate(field, schema, _val);
            if (_val === null) {
              delete obj[field];
            } else {
              obj[field] = _val;
            }
          }
        }
      }
    }
  }, {
    key: 'get',
    value: function get(rootLid, options) {
      var _this = this;

      var _ref = options || {};

      var maxDepth = _ref.maxDepth;

      var inside = {};
      var depth = 1;
      var rec = function rec(lid) {
        if (maxDepth && depth > maxDepth || inside[lid]) {
          return { lid: lid };
        }
        inside[lid] = true;
        depth++;
        var obj = _this._objs[lid];
        var entity = { lid: lid };
        for (var field in obj) {
          var schema = _this._schema[field];
          if (schema.collection) {
            var arr = Object.keys(obj[field]).map(rec);
            var compare = schema.compare || compareIds;
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
  }, {
    key: 'lookup',
    value: function lookup(field, value, options) {
      var lid = this._lookup[field][value];
      return (lid || null) && this.get(lid, options);
    }
  }, {
    key: 'destroy',
    value: function destroy(lid) {
      var obj = this._objs[lid];
      if (!obj) {
        return;
      }
      delete this._objs[lid];
      for (var field in obj) {
        var val = obj[field];
        var schema = this._schema[field];
        if (schema.ref) {
          var arr = schema.collection ? Object.keys(val) : [val];
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = arr[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var ref = _step2.value;

              if (schema.destroy) {
                this.destroy(ref);
              } else {
                this.remove(ref, schema.ref, lid);
              }
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }
        } else if (schema.unique) {
          delete this._lookup[field][val];
        }
      }
    }
  }, {
    key: 'remove',
    value: function remove(parentId, field, childId) {
      var schema = this._schema[field];
      var obj = this._objs[parentId];
      if (!obj) {
        return;
      }
      var val = obj[field];
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
  }, {
    key: 'lids',
    value: function lids() {
      return Object.keys(this._objs);
    }
  }]);

  return Database;
}();

exports.default = Database;