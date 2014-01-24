var Manifest, async, uuid;

async = require("async");

uuid = require("node-uuid");

Manifest = (function() {

  function Manifest(manifest) {
    this.manifest = manifest;
    this.builder = require("./builder").init();
    this.storage = require("./storage").init();
    this.id = uuid.v4();
  }

  Manifest.prototype.hashes = function() {
    var name, object, _ref, _results;
    _ref = this.manifest;
    _results = [];
    for (name in _ref) {
      object = _ref[name];
      if (object.hash) {
        _results.push(object.hash);
      }
    }
    return _results;
  };

  Manifest.prototype.save = function(cb) {
    var manifest, options,
      _this = this;
    manifest = new Buffer(JSON.stringify(this.manifest), "binary");
    options = {
      "Content-Length": manifest.length,
      "Content-Type": "application/json",
      "x-amz-acl": "private"
    };
    return this.storage.create("/manifest/" + this.id + ".json", manifest, options, function(err) {
      return cb(err, _this.manifest_url());
    });
  };

  Manifest.prototype.missing_hashes = function(cb) {
    return async.parallel(this.datastore_testers(), function(err, results) {
      var exists, hash, missing;
      missing = [];
      for (hash in results) {
        exists = results[hash];
        if (!exists) {
          missing.push(hash);
        }
      }
      return cb(missing);
    });
  };

  Manifest.prototype.test_datastore_presence = function(hash, cb) {
    return this.storage.exists("/hash/" + hash, function(err, exists) {
      return cb(exists);
    });
  };

  Manifest.prototype.datastore_testers = function() {
    var _this = this;
    return this.hashes().reduce(function(ax, hash) {
      ax[hash] = function(async_cb) {
        return _this.test_datastore_presence(hash, function(exists) {
          return async_cb(null, exists);
        });
      };
      return ax;
    }, {});
  };

  Manifest.prototype.manifest_url = function() {
    return "" + process.env.ANVIL_HOST + "/manifest/" + this.id + ".json";
  };

  return Manifest;

})();

module.exports.init = function(manifest) {
  return new Manifest(manifest);
};
