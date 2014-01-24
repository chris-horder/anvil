module.exports = function timeout(ms) {
  ms = ms || 5000;

  return function(req, res, next) {
    var id = setTimeout(function(){
      req.emit('timeout', ms);
    }, ms);

    req.on('timeout', function(){
      if (res.headerSent) return debug('response started, cannot timeout');
      var err = new Error('Response timeout');
      err.timeout = ms;
      err.status = 503;
      next(err);
    });

    req.clearTimeout = function(){
      clearTimeout(id);
    };

    res.on('header', function(){
      clearTimeout(id);
    });

    next();
  };
};