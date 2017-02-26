var path = require('path')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter
  , async = require('async')
  , Promise = require('bluebird')
  , configurator = require('./config')
  , Publication = require('./publication')
  ;

function PublisherService(opts) {

  this.log = opts.logger.createLogger('Publisher');

  this.log.$$TRACE('construct(%j)', opts);

  this.CONSISTENCY = configurator.CONSISTENCY;

}

// Enable subscription to key lifecycle events
util.inherits(PublisherService, EventEmitter);

PublisherService.prototype.stats = function (opts) {
  return {}
};

PublisherService.prototype.processPublish = function(message, callback){

  try{

    return this.publishMessage(message, function(e){

      callback(e, message);
    });

  }catch(e){
    callback(e);
  }
};

PublisherService.prototype.processInitialEmit = function(message, callback){

  var _this = this;

  try{

    if (message.response.initialValues.length == 0) return callback(null, message);

    async.eachSeries(message.response.initialValues, function(itemData, itemDataCallback){

      var requestParts = message.request.path.split('@');

      var action = requestParts[0].replace('/','');

      var path = requestParts[1];

      itemData._meta = {};

      var initialMessage = {
        request:message.request,
        session:message.session,
        response:itemData,
        recipients:[{subscription:{sessionId:message.session.id, action:action, data:{session:message.session}, fullPath:path}}],
        options:{
          consistency:_this.CONSISTENCY.TRANSACTIONAL
        }
      };

      _this.publishMessage(initialMessage, itemDataCallback);

    }, function(e){

      if (e) return callback(e);

      callback(null, message);

    });

  }catch(e){
    callback(e);
  }
};

PublisherService.prototype.initialize = function (config, callback) {

  var _this = this;

  try {

    if (!config) config = {};

    if (config.timeout) config.timeout = false;

    _this.dataService = _this.happn.services.data;

    _this.securityService = _this.happn.services.security;

    _this.config = config;

  } catch (e) {
    callback(e);
  }

  callback();
};

PublisherService.prototype.performPublication = function (publication, callback) {

  var _this = this;

  publication.publish(_this.happn.services.queue, function(e){

    if (publication.options.consistency == configurator.CONSISTENCY.DEFERRED){

      var resultsMessage = publication.resultsMessage(e);

      return _this.happn.services.queue.pushOutbound(resultsMessage, callback);
    }

    if (e) return callback(e);

    callback(null, publication.message);
  });
};

PublisherService.prototype.publishMessage = function (message, callback) {

  var _this = this;

  try{

    var publication = new Publication(message);

    message.publication = {
      id:publication.id
    };

    if (publication.options.consistency == configurator.CONSISTENCY.QUEUED || publication.options.consistency == configurator.CONSISTENCY.DEFERRED){

      _this.happn.services.queue.pushPublication(publication);

      return callback(null, message);

    } else {

      //all other types of publications get processed up to whatever point consistency is set to - then response happens
      _this.happn.services.queue.pushPublication(publication, callback);
    }

  }catch(e){
    callback(e);
  }
};

module.exports = PublisherService;
