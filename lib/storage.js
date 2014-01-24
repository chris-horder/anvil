var Storage, crypto, fs, AWS, qs, uuid, s3bucket;

crypto = require("crypto");

fs = require("fs");

// knox = require("knox");
AWS = require('aws-sdk');

qs = require("querystring");

uuid = require("node-uuid");

Storage = (function() {

  function Storage() {
    AWS.config.region = process.env.AWS_REGION;
    
  }

  Storage.prototype.get = function(filename, cb) {
    s3 = new AWS.S3();
    params = {Bucket: process.env.S3_BUCKET, Key: filename};

    return s3.getObject(params, function(err, get){
      return cb(err, get)
    });
  };

  Storage.prototype.get_file = function(filename, cb) {

    s3 = new AWS.S3();
    params = {Bucket: process.env.S3_BUCKET, Key: filename};

    return s3.getObject(params, function(err, get){
      var data;
      data = "";
      get.on("httpData", function(chunk) {
        return data += chunk;
      });
      return get.on("httpDone", function(success) {
        return cb(null, data);
      });
    });



    // return this.get(filename, function(err, get) {
    //   var data;
    //   data = "";
    //   get.setEncoding("binary");
    //   get.on("data", function(chunk) {
    //     return data += chunk;
    //   });
    //   return get.on("end", function(success) {
    //     return cb(null, data);
    //   });
    // });
  };

  Storage.prototype.exists = function(filename, cb) {

    s3 = new AWS.S3();
    params = {Bucket: process.env.S3_BUCKET, Key: filename};

    return s3.headObject(params, function(err, res){
      if(err) {
        return cb(err, false)
      } else {
        return cb(err, true)
      }
    });

    // return this.knox.headFile(filename, function(err, res) {
    //   return cb(err, res.statusCode !== 404);
    // });
  };

  Storage.prototype.create = function(filename, data, options, cb) {
    s3 = new AWS.S3();

    // options  =
    //   "ContentLength": manifest.length,
    //   "ContentType":  "application/json"
    //   "ACL": "private"


    params = {Bucket: process.env.S3_BUCKET, ACL: "private", Key: filename, Body: data,ContentType : options["Content-Type"], ContentLength : options["Content-Length"]};
    s3.putObject(params, function(err, data) {
      return cb(data);
    });

    // put = this.knox.put(filename, options);
    // put.on("response", function(res) {
    //   return cb(null);
    // });
    // return put.end(data);
  };

  Storage.prototype.create_stream = function(filename, stream, cb) {

    params = {Bucket: process.env.S3_BUCKET, ACL: "private", Key: filename, Body: stream};
    s3.putObject(params, function(err, data) {
      return cb(data);
    });
    // return this.knox.putStream(stream, filename, headers, function(err, res) {
    //   return cb(null);
    // });
  };

  Storage.prototype.verify_hash = function(filename, hash, cb) {
    var file, sha;
    sha = crypto.createHash("sha256");
    file = fs.createReadStream(filename);
    file.on("data", function(data) {
      return sha.update(data);
    });
    return file.on("end", function() {
      if (hash === sha.digest("hex")) {
        return cb(null);
      } else {
        return cb("file does not match hash");
      }
    });
  };

  Storage.prototype.generate_put_url = function(filename, cb) {
    var bucket, digest, expires, hmac, put_url, string_to_sign, ttl, url;
    ttl = 3600;
    expires = Math.floor((new Date).getTime() / 1000) + ttl;
    bucket = process.env.S3_BUCKET;
    string_to_sign = "PUT\n\n\n" + expires + "\n/" + bucket + "/" + filename;
    hmac = crypto.createHmac("sha1", process.env.AWS_SECRET);
    hmac.update(string_to_sign);
    digest = hmac.digest("base64");
    url = "http://" + bucket + ".s3.amazonaws.com/" + filename;
    put_url = "" + url + "?AWSAccessKeyId=" + process.env.AWS_ACCESS + "&Signature=" + (qs.escape(digest)) + "&Expires=" + expires;
    return cb(null, put_url);
  };

  Storage.prototype.create_cache = function() {
    var id, url;
    id = uuid.v4();
    return url = "" + process.env.ANVIL_HOST + "/cache/" + id + ".tgz";
  };

  return Storage;

})();

module.exports.init = function() {
  return new Storage();
};
