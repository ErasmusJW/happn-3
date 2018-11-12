describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(5000);

  var expect = require('expect.js');
  var path = require('path');
  var HappnClient = require('../../../lib/client');
  var Constants = require('../../../lib/constants');

  function mockHappnClient(log, state, session, serverInfo, socket, clientOptions){

    var happnClient = new HappnClient();

    happnClient.__initializeEvents();
    happnClient.__initializeState();

    happnClient.log = log || {
      error:function(){}
    };

    happnClient.status = state != null?state: Constants.CLIENT_STATE.ACTIVE;
    happnClient.session = session || {id:'test'};
    happnClient.serverInfo = serverInfo || {};

    happnClient.socket = socket || {
      write: function(message){

      },
      on:function(eventName){

      }
    };

    happnClient.options = clientOptions || {callTimeout: 60000};

    return happnClient;
  }

  it('tests the __performDataRequest function set null options', function (done) {

    var happnClient = mockHappnClient();

    happnClient.__requestCallback = function(message, callback, options, eventId, path, action){
      callback();
    };

    happnClient.__performDataRequest('/test/path', 'set', {test:'data'}, null, function(e, response){
      if (e) return done(e);
      done();
    });
  });

  it('tests the __performDataRequest function set null options no callback', function (done) {

    var happnClient = mockHappnClient();

    happnClient.__requestCallback = function(message, callback, options, eventId, path, action){
      callback();
    };

    happnClient.__performDataRequest('/test/path', 'set', {test:'data'});

    done();
  });

  it('tests the __performDataRequest function set null options, error state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.ERROR);

    happnClient.__performDataRequest('/test/path', 'set', {test:'data'}, null, function(e, response){
      expect(e.toString()).to.be('Error: client in an error state');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    });
  });

  it('tests the __performDataRequest function set null options, connect error state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.CONNECT_ERROR);

    happnClient.__performDataRequest('/test/path', 'set', {test:'data'}, null, function(e, response){
      expect(e.toString()).to.be('Error: client in an error state');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    });
  });

  it('tests the __performDataRequest function set null options, disconnected state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.DISCONNECTED);

    happnClient.__performDataRequest('/test/path', 'set', {test:'data'}, null, function(e, response){
      expect(e.toString()).to.be('Error: client is disconnected');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    });
  });

  it('tests the __performDataRequest function set null options, uninitialized state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.UNINITIALIZED);

    happnClient.__performDataRequest('/test/path', 'set', {test:'data'}, null, function(e, response){
      expect(e.toString()).to.be('Error: client not initialized yet');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    });
  });

  it('tests the __performDataRequest function set null options, no callback, error state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.ERROR);

    try{
      happnClient.__performDataRequest('/test/path', 'set', {test:'data'});
    }catch(e){
      expect(e.toString()).to.be('Error: client in an error state');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    }
  });

  it('tests the __performDataRequest function set null options, no callback, connect error state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.CONNECT_ERROR);

    try{
      happnClient.__performDataRequest('/test/path', 'set', {test:'data'});
    }catch(e){
      expect(e.toString()).to.be('Error: client in an error state');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    }
  });

  it('tests the __performDataRequest function set null options, no callback, disconnected state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.DISCONNECTED);

    try{
      happnClient.__performDataRequest('/test/path', 'set', {test:'data'});
    }catch(e){
      expect(e.toString()).to.be('Error: client is disconnected');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    }
  });

  it('tests the __performDataRequest function set null options, no callback, uninitialized state', function (done) {

    var happnClient = mockHappnClient(null, Constants.CLIENT_STATE.UNINITIALIZED);

    try{
      happnClient.__performDataRequest('/test/path', 'set', {test:'data'});
    }catch(e){
      expect(e.toString()).to.be('Error: client not initialized yet');
      expect(e.detail).to.be('action: set, path: /test/path');
      done();
    }
  });

  it('tests the __getVariableDepthPermutations method', function(){

    var happnClient = mockHappnClient();

    expect(happnClient.__getVariableDepthPermutationPaths('/my/test/**', 5)).to.eql(
      [
        '/my/test/*',
        '/my/test/*/*',
        '/my/test/*/*/*',
        '/my/test/*/*/*/*',
        '/my/test/*/*/*/*/*',
      ]
    );

    expect(happnClient.__getVariableDepthPermutationPaths('/my/test/*/**', 5)).to.eql(
      [
        '/my/test/*/*',
        '/my/test/*/*/*',
        '/my/test/*/*/*/*',
        '/my/test/*/*/*/*/*',
        '/my/test/*/*/*/*/*/*',
      ]
    );

    expect(happnClient.__getVariableDepthPermutationPaths('/my/*/1/**', 5)).to.eql(
      [
        '/my/*/1/*',
        '/my/*/1/*/*',
        '/my/*/1/*/*/*',
        '/my/*/1/*/*/*/*',
        '/my/*/1/*/*/*/*/*',
      ]
    );
  });

  var refId = 1;

  it('tests the __onVariableDepth method, then off', function(done){

    var happnClient = mockHappnClient();

    happnClient._remoteOn = function(path, parameters, callback) {
      callback(null, {id:refId++});
    }

    happnClient._remoteOff = function(channel, listenerRef, callback) {
      callback();
    }

    happnClient.__onVariableDepth('/test/path/**', { depth:4 }, function(data){

    }, function(e, handle){

      if (e) return done(e);

      expect(handle).to.be(0);

      expect(happnClient.state.variableDepthSubscriptions[handle]).to.eql([
        1,2,3
      ]);

      expect(happnClient.state.listenerRefs).to.eql({
        "{\"path\":\"/ALL@/test/path/*\",\"event_type\":\"all\",\"count\":0}": 1,
        "{\"path\":\"/ALL@/test/path/*/*\",\"event_type\":\"all\",\"count\":0}": 2,
        "{\"path\":\"/ALL@/test/path/*/*/*\",\"event_type\":\"all\",\"count\":0}": 3,
        "{\"path\":\"/ALL@/test/path/*/*/*/*\",\"event_type\":\"all\",\"count\":0}": 4
      });

      happnClient.off(handle, function(e){

        if (e) return done(e);

        expect(happnClient.state.variableDepthSubscriptions[handle]).to.eql(undefined);

        expect(happnClient.state.listenerRefs[handle]).to.eql(undefined);

        expect(happnClient.state.listenerRefs).to.eql({});

        done();
      });
    });
  });

  var failedRefId = 1;

  it('tests the .on method failure in _remoteOn with variable depth', function(done){

    var happnClient = mockHappnClient();

    happnClient._remoteOn = function(path, parameters, callback) {

      if (failedRefId == 3) return callback(new Error('test error'));
      callback(null, {id:failedRefId++});
    }

    happnClient.on('/test/path/**', { depth:4 }, function(data){

    }, function(e){
      expect(e.toString()).to.be('Error: test error');
      done();
    });
  });

  var failedRefOffId = 1;

  it('tests the .on method failure in _remoteOff with variable depth', function(done){

    var happnClient = mockHappnClient();

    happnClient._remoteOn = function(path, parameters, callback) {
      callback(null, {id:failedRefOffId++});
    }

    happnClient._remoteOff = function(channel, listenerRef, callback) {
      if (listenerRef == 3) return callback(new Error('test error'));
      callback(null, {id:listenerRef++});
    }

    happnClient.on('/test/path/**', { depth:4 }, function(data){

    }, function(e, handle){

      if (e) return done(e);

      happnClient.off(handle, function(e){

        expect(e.toString()).to.be('Error: test error');
        done();
      });
    });
  });
});
