let getOwn = (obj, key) => obj.hasOwnProperty(key) ? obj[key] : undefined;

let eachPair = (obj, f) => {
  for (let key in obj) {
    f(key, obj[key]);
  }
};

let objEmpty = (obj) => {
  for (let key in obj) {
    return false;
  }
  return true;
};

// A string map safe for inherited properties, including __prototype__.
class StringMap {

  constructor() {
    this._obj = {};
  }

  get(key) {
    return getOwn(this._obj, key + '$');
  }

  put(key, value) {
    this._obj[key + '$'] = value;
  }

  del(key) {
    delete this._obj[key + '$'];
  }

}

module.exports = {getOwn, objEmpty, eachPair, StringMap};
