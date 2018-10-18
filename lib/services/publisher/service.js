var path = require('path'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  async = require('async'),
  Publication = require('./publication'),
  CONSISTENCY = require('../../../').constants.CONSISTENCY,
  constants = require('../../constants'),
  Promise = require('bluebird');

function PublisherService(opts) {

  this.log = opts.logger.createLogger('Publisher');

  this.log.$$TRACE('construct(%j)', opts);
}

// Enable subscription to key lifecycle events
util.inherits(PublisherService, EventEmitter);

PublisherService.prototype.stats = stats;
PublisherService.prototype.processAcknowledge = processAcknowledge;
PublisherService.prototype.initialize = initialize;
PublisherService.prototype.performPublication = performPublication;
PublisherService.prototype.processPublish = processPublish;

PublisherService.prototype.__emitPublicationLog = __emitPublicationLog;
PublisherService.prototype.__recipientAcknowledge = __recipientAcknowledge;

function stats (opts) {
  return JSON.parse(JSON.stringify(this.__stats));
}

function processAcknowledge (message) {

  return new Promise((resolve, reject) => {
    this.__recipientAcknowledge(message, (e, message) => {
      if (e) return this.errorService.handleSystem(new Error('processAcknowledge failed', e), 'PublisherService', constants.ERROR_SEVERITY.MEDIUM, (e) => {
        reject(e);
      });
      resolve(message);
    });
  });
}

function initialize (config, callback) {

  try {

    if (!config) config = {};

    if (config.timeout) config.timeout = false;

    this.__stats = {
      attempted: 0,
      failed: 0,
      unacknowledged: 0
    };

    this.errorService = this.happn.services.error;

    this.dataService = this.happn.services.data;

    this.securityService = this.happn.services.security;

    if (!config.publicationOptions) config.publicationOptions = {};

    if (!config.publicationOptions.acknowledgeTimeout) config.publicationOptions.acknowledgeTimeout = 60000; //1 minute

    //we need to keep these, as they accept incoming ack requests
    this.__unacknowledgedPublications = {};

    this.config = config;

  } catch (e) {
    callback(e);
  }

  callback();
}

function performPublication (publication, callback) {

  publication.publish(this.happn.services.queue, (e) => {

    if (publication.options.consistency == CONSISTENCY.DEFERRED)
      return this.__emitPublicationLog(publication, e, callback);

    if (publication.options.consistency == CONSISTENCY.ACKNOWLEDGED) {
      delete this.__unacknowledgedPublications[publication.id];
      return this.__emitPublicationLog(publication, e, callback);
    }

    if (e) return callback(e); //happens after the DEFERRED, as the error is handled there as well
    callback(null, publication.message);
  });
}

function __emitPublicationLog (publication, e, callback) {

  // not logging 'happn.queue.outbound.time' for this use of outbound queue?
  return this.happn.services.queue.pushOutbound(publication.resultsMessage(e), callback);
}

function __recipientAcknowledge (message, callback) {

  //if (!_this.__unacknowledgedPublications[message.request.data]) return callback(new Error('publication timed out'));
  if (this.__unacknowledgedPublications[message.request.data]) this.__unacknowledgedPublications[message.request.data].acknowledge(message.request.sessionId);
  callback(null, message);
}

function processPublish (message) {

  return new Promise((resolve, reject) => {

    var publication = Publication.create(message, this.config.publicationOptions);

    message.publication = {
      id: publication.id
    };

    if (publication.options.consistency == CONSISTENCY.TRANSACTIONAL)
      return this.happn.services.queue.pushPublication(publication, (e, publication) => {
        if (e) return reject(e);
        resolve(message);
      });

    if (publication.options.consistency == CONSISTENCY.QUEUED || publication.options.consistency == CONSISTENCY.DEFERRED) {
      this.happn.services.queue.pushPublication(publication);
      return resolve(message);
    }

    if (publication.options.consistency == CONSISTENCY.ACKNOWLEDGED) {
      this.__unacknowledgedPublications[publication.id] = publication;
      this.happn.services.queue.pushPublication(publication);
      return resolve(message);
    }
  });
}

module.exports = PublisherService;
