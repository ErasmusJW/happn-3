var util = require('util'),
  EventEmitter = require('events').EventEmitter,
  Promise = require('bluebird'),
  constants = require('../../constants');

function AdminClient() {
  this._local = true;
  this.__events = new EventEmitter();
}

AdminClient.prototype.on = function (event, handler) {
  return this.__events.on(event, handler);
};

AdminClient.prototype.once = function (event, handler) {
  return this.__events.once(event, handler);
};

AdminClient.prototype.off = AdminClient.prototype.removeListener = function (event, handler) {
  return this.__events.removeListener(event, handler);
};

AdminClient.prototype.emit = function (event, data) {
  return this.__events.emit(event, data);
};

AdminClient.prototype.write = function (message) {

  setImmediate(() => {

    if (message.__outbound) {//dont check cloned message as it will be stripped of __outbound if it is an array
      delete message.__outbound;
      return this.handle_publication(message); //outbound messages are cloned already
    }
    this.context.services.session.handleMessage(this.context.services.utils.clone(message), this);
  });
};

//needs to be here
AdminClient.prototype.removeAllListeners = function () {
  return this.__events.removeAllListeners();
};

AdminClient.prototype.disconnect = function (event, data) {

  this.context.services.session.finalizeDisconnect(this, (e) => {

    if (e) this.context.services.error.handleSystem(e, 'Adminclient', constants.ERROR_SEVERITY.LOW);
    if (data) this.write(data);
    if (event) this.emit(event, data);
    this.removeAllListeners();
  });
};

AdminClient.prototype.end = function (data) {
  return this.disconnect('end', data);
};

AdminClient.prototype.destroy = function (data) {
  return this.disconnect('destroy', data);
};

function AdminClientWrapper() {

  this.clientType = 'eventemitter';

  this.__encryptLogin = function (parameters) {
    return parameters;
  };

  this.__decryptLogin = function (parameters) {
    return parameters;
  };

  this.__encryptPayload = function (message) {
    return message;
  };

  this.__decryptPayload = function (message) {
    return message;
  };

  this.__getConnection = function (callback) {

    var client = new AdminClient();

    Object.defineProperty(client, 'context', {
      value: this.context
    });
    Object.defineProperty(client, 'handle_publication', {
      value: this.handle_publication.bind(this)
    });
    Object.defineProperty(client, 'handle_response', {
      value: this.handle_response.bind(this)
    });

    client.sessionProtocol = 'happn_' + require('../../../package.json').protocol;
    this.context.services.session.onConnect(client);

    return callback(null, client);
  };

  this.__doLogin = function (loginParameters, callback) {

    this.context.services.security.adminLogin(this.socket.sessionId, (e, session) => {

      if (e) return callback(e);

      if (!session.info) session.info = {};
      session.info.local = true;
      session.info.admin = true;
      this.context.services.session.attachSession(this.socket.sessionId, session);
      this.__attachSession(session);

      callback();
    });
  };
}

module.exports = new AdminClientWrapper();
