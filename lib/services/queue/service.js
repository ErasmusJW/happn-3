var util = require('util')
  , EventEmitter = require('events').EventEmitter
  , Promise = require('bluebird')
  , async = require('async')
  ;

module.exports = QueueService;

function QueueService(opts) {

  if (!opts) opts = {};

  this.log = opts.logger.createLogger('Queue');
  this.log.$$TRACE('construct(%j)', opts);

  EventEmitter.call(this);

  this.statsInternal = {
    inbound: 0,
    outbound: 0,
    system: 0,
    failures:0
  };
}

util.inherits(QueueService, EventEmitter);

QueueService.prototype.stats = function () {

  if (this.config.mode == 'direct') return {};

  this.statsInternal.inbound = this.__inboundQueue.length();
  this.statsInternal.outbound = this.__outboundQueue.length();
  this.statsInternal.system = this.__systemQueue.length();

  return this.statsInternal;
};

QueueService.prototype.inboundDrain = function () {
  this.emit('inbound-queue-empty');
};

QueueService.prototype.inboundSequentialDrain = function () {
  this.emit('inbound-sequential-queue-empty');
};

QueueService.prototype.outboundDrain = function () {
  this.emit('outbound-queue-empty');
};

QueueService.prototype.outboundSequentialDrain = function () {
  this.emit('outbound-sequential-queue-empty');
};

QueueService.prototype.stop = Promise.promisify(function (options, callback) {
  callback();
});

QueueService.prototype.initialize = Promise.promisify(function (config, callback) {

  if (!config) config = {};

  this.config = config;

  if (this.config.mode === 'direct'){ //no queue or quality of service

    this.pushInbound = Promise.promisify(this.happn.services.protocol.processMessageIn.bind(this.happn.services.protocol));

    this.pushOutbound = Promise.promisify(this.happn.services.protocol.processMessageOut.bind(this.happn.services.protocol));

    this.pushSystem = Promise.promisify(this.happn.services.protocol.processSystem.bind(this.happn.services.protocol));

  }else {

    if (!this.config.concurrency) this.config.concurrency = 2048;

    if (!this.config.outboundConcurrency) this.config.outboundConcurrency = this.config.concurrency;

    if (!this.config.systemConcurrency) this.config.systemConcurrency = 1;//system events are concurrent

    if (!this.config.inboundBuffer) this.config.inboundBuffer = this.config.concurrency / 2;

    if (!this.config.outboundBuffer) this.config.outboundBuffer = this.config.outboundConcurrency / 2;

    if (!this.config.systemConcurrency) this.config.systemConcurrency = 1;//system events are concurrent

    //number

    //GET SET ON DELETE
    this.__inboundQueue = async.queue(this.happn.services.protocol.processMessageIn.bind(this.happn.services.protocol), this.config.concurrency);

    this.__inboundQueue.buffer = this.config.inboundBuffer;

    //publications based on subscriptions
    this.__outboundQueue = async.queue(this.happn.services.protocol.processMessageOut.bind(this.happn.services.protocol), this.config.outboundConcurrency);

    this.__outboundQueue.buffer = this.config.outboundBuffer;

    this.__inboundQueue.saturated(this.__inboundQueueSaturated.bind(this));

    this.__outboundQueue.saturated(this.__outboundQueueSaturated.bind(this));

    this.__inboundQueue.unsaturated(this.__inboundQueueUnsaturated.bind(this));

    this.__outboundQueue.unsaturated(this.__outboundQueueUnsaturated.bind(this));


    this.__inboundQueue.drain = this.inboundDrain.bind(this);

    this.__outboundQueue.drain = this.outboundDrain.bind(this);


    //system events - disconnect/reconnect etc.
    this.__systemQueue = async.queue(this.happn.services.protocol.processSystem.bind(this.happn.services.protocol), this.config.systemConcurrency);
  }

  return callback();

});

QueueService.prototype.__inboundQueueSaturated = function(){
  this.__emit('inbound-saturated');
};

QueueService.prototype.__outboundQueueSaturated = function(){
  this.__emit('outbound-saturated');
};

QueueService.prototype.__inboundQueueUnsaturated = function(){
  this.__emit('inbound-unsaturated');
};

QueueService.prototype.__outboundQueueUnsaturated = function(){
  this.__emit('inbound-unsaturated');
};

QueueService.prototype.inboundQueueFailureHandler = function(e, message){
  this.queueFailureHandler(e, message, 'inbound');
};

QueueService.prototype.outboundQueueFailureHandler = function(e, message){
  this.queueFailureHandler(e, message, 'outbound');
};

QueueService.prototype.queueFailureHandler = function(e, message, queue){

  this.stats.failures++;
  this.emit('queue-failure', {message:message, error:e, queue:queue});
};

QueueService.prototype.pushInbound = function(message, callback){

  var _this = this;

  _this.emit('inbound-job-queue', message);

  if (callback) {

    return _this.__inboundQueue.push(message, function(e){

      if (e) _this.inboundQueueFailureHandler(e, message);

      callback(e, message);
    });

  } else _this.__inboundQueue.push(message, _this.inboundQueueFailureHandler);

};

QueueService.prototype.pushOutbound = function(message, callback){

  var _this = this;

  if (callback) {

    _this.__outboundQueue.push(message, function(e){

      if (e) _this.queueFailureHandler(e, message);

      callback(e, message);
    });

  } else _this.__outboundQueue.push(message);


  _this.emit('outbound-job-queued', message);
};


QueueService.prototype.pushSystem = Promise.promisify(function(message, callback){

  this.__systemQueue.push(message, callback);
  this.emit('system-job-queued', message);
  this.stats.system ++;

});

