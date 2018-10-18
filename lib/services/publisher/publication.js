var async = require('async'),
  Utils = require('../utils/service'),
  utils = new Utils(),
  CONSISTENCY = require('../../../').constants.CONSISTENCY;

function Publication(message, options) {

  this.message = message;
  this.options = message.request.options || {};

  this.result = {
    successful: 0,
    failed: 0,
    skipped: 0,
    queued: message.recipients.length
  };

  if (!options) options = {};

  if (!options.acknowledgeTimeout) options.acknowledgeTimeout = 60000;

  this.publication_options = options;

  if (this.options.consistency == null) this.options.consistency = CONSISTENCY.TRANSACTIONAL; //by default

  if (this.options.consistency == CONSISTENCY.ACKNOWLEDGED) {

    this.unacknowledged_recipients = [];
    this.options.publishResults = true;
    this.result.acknowledged = 0;
  }

  this.id = message.session.id + '-' + message.request.eventId;
  this.origin = message.session;
  this.recipients = message.recipients;

  this.duplicate_channels = {};

  this.__configurePayload(message, message.response.data, message.response._meta, 'payload');
  this.__configurePayload(message, message.request.data, message.response._meta, 'mergePayload');
}

Publication.create = function(message, options){
  return new Publication(message, options);
};

Publication.prototype.__reservedMetaKeys = [
  'created',
  'modified',
  'path',
  'action',
  'type',
  'published',
  'status',
  'eventId',
  'sessionId'
];

Publication.prototype.__configurePayload = function(message, data, meta, payloadType){

  var payload = {
    data:data,
    _meta:{
      action: '/' + message.request.action.toUpperCase() + '@' + message.request.path,
      type:'data',
      sessionId:message.session.id,
      consistency:this.options.consistency,
      publicationId:this.id,
      path:message.request.path,
      created:meta.created,
      modified:meta.modified
    },
    protocol:message.protocol,
    __outbound:true
  };

  if (message.request.options && typeof message.request.options.meta == 'object') {

    Object.keys(message.request.options.meta).forEach(key => {
      if (this.__reservedMetaKeys.indexOf(key) >= 0) return;
      payload._meta[key] = message.request.options.meta[key];
    });
  }

  this[payloadType]  = JSON.stringify(payload);
};

Publication.prototype.acknowledge = function (sessionId) {

  this.unacknowledged_recipients.every((recipientSessionId, recipientSessionIdIndex) => {

    if (recipientSessionId == sessionId) {

      this.unacknowledged_recipients.splice(recipientSessionIdIndex, 1); //remove it

      this.result.acknowledged++;

      return false;
    }

    return true;
  });

  if (this.unacknowledged_recipients.length == 0) {

    this.__acknowledgeStatus = 1;

    if (this.__onAcknowledgeComplete) this.__onAcknowledgeComplete();
  }
};

Publication.prototype.__waitForAck = function (callback) {

  this.recipients.forEach(recipient => {
    this.unacknowledged_recipients.push(recipient.data.session.id);
  });

  this.__onAcknowledgeComplete = (e) => {

    clearTimeout(this.__unacknowledgedTimedout);

    if (e) {
      this.message.response._meta.published = false;
      this.message.response._meta.publishError = e.toString();

    } else this.message.response._meta.published = true;

    this.message.response._meta.publishResults = this.result;

    callback(e, this.result);
  };

  this.__unacknowledgedTimedout = setTimeout(() => {

    this.__onAcknowledgeComplete(new Error('unacknowledged publication'));

  }, this.publication_options.acknowledgeTimeout);

  this.__checkAcknowledgeStatus(); //race condition, as we may have acknowledgements already
};

Publication.prototype.__checkAcknowledgeStatus = function () {

  if (this.__acknowledgeStatus == 1) this.__onAcknowledgeComplete();
};

Publication.prototype.publish = function (queue, callback) {

  async.each(this.recipients, (recipient, recipientCB) => {

    if (this.options.noCluster && recipient.data.session.info.clusterName) {

      this.skipped++;
      return recipientCB();
    }

    var message = (recipient.data.options && recipient.data.options.merge == true)?JSON.parse(this.mergePayload):JSON.parse(this.payload);

    message._meta.channel = '/' + recipient.data.action + '@' + recipient.data.path;

    //deduplcate messages with same client and channel (2 identical listeners)
    if (this.duplicate_channels[recipient.data.session.id + message._meta.channel]) return recipientCB();

    this.duplicate_channels[recipient.data.session.id + message._meta.channel] = true;

    queue.pushOutbound({
      request: {
        publication: message,
        options: recipient.data.options,
        action: 'emit'
      },
      session: recipient.data.session
    }, (e) => {

      if (e) {

        this.result.failed++;
        this.result.lastError = e;

      } else this.result.successful++;

      recipientCB();
    });

  }, (e) => {

    if (e || this.result.failed > 0) {
      this.message.response._meta.publishResults = this.result;
      return callback(e || this.result.lastError);
    }

    if (this.options.consistency == CONSISTENCY.ACKNOWLEDGED) return this.__waitForAck(callback);

    this.message.response._meta.published = true;

    if (this.options.publishResults) this.message.response._meta.publishResults = this.result;

    callback(null, this.result);
  });
};

Publication.prototype.resultsMessage = function (e) {

  var message = {
    request: {
      publication: {
        id: this.id,
        action: 'publication-ack',
        result: this.result,
        status: 'ok',
        _meta: {
          type: 'ack',
          eventId: this.message.request.eventId
        }
      }
    },
    session: this.origin
  };

  if (e) {
    //need to take out Error:  - or we get a double up
    message.request.publication.error = e.toString().replace('Error: ', '');
    message.request.publication.status = 'error';
  }

  return message;
};

module.exports = Publication;
