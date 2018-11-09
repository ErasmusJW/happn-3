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

    expect(happnClient.__getVariableDepthPermutationPaths('/my/test/**/1', 5)).to.eql(
      [
        '/my/test/*/1',
        '/my/test/*/*/1',
        '/my/test/*/*/*/1',
        '/my/test/*/*/*/*/1',
        '/my/test/*/*/*/*/*/1',
      ]
    );

    expect(happnClient.__getVariableDepthPermutationPaths('/my/test/1/**', 6, true)).to.eql(
      [
        '/my/test/1/*',
        '/my/test/1/*/*',
        '/my/test/1/*/*/*',
        '/my/test/1/*/*/*/*',
        '/my/test/1/*/*/*/*/*',
        '/my/test/1/*/*/*/*/*/*',
      ]
    );

    expect(happnClient.__getVariableDepthPermutationPaths('/my/test/1/**', 3, true)).to.eql(
      [
        '/my/test/1/*',
        '/my/test/1/*/*',
        '/my/test/1/*/*/*'
      ]
    );
  });

  it('tests the __onVariableDepth method, bad paths 1', function(done){
    var happnClient = mockHappnClient();

    happnClient.__onVariableDepth('/test/path**/1', { depth:4 }, function(data){}, function(e, handle){
      expect(e.toString()).to.be('Error: variable depth segments must either be trailing, or be enclosed by segment delimiters /, ie: /my/test/** or /my/**/test is ok, this is not ok: /my/tes**/1');
      happnClient.__onVariableDepth('/test/**/**', { depth:4 }, function(data){}, function(e1, handle){
        expect(e1.toString()).to.be('Error: variable depth subscription paths can only have one variable depth segment, ie: this is not ok /my/test/**/path/**');
        happnClient.__onVariableDepth('/test/**/**/1', { depth:4 }, function(data){}, function(e2, handle){
          expect(e2.toString()).to.be('Error: variable depth subscription paths can only have one variable depth segment, ie: this is not ok /my/test/**/path/**');
          done();
        });
      });
    });
  });

  it('tests the __onVariableDepth method, trailing then off', function(){

    var happnClient = mockHappnClient();

    happnClient.__onVariableDepth('/test/path/**', { depth:4 }, function(data){

    }, function(e, handle){

      if (e) return done(e);

      expect(happnClient.state.__variableDepthSubscriptions[handle]).to.eql([

      ]);

      expect(happnClient.state.listenerRefs[handle]).to.eql([

      ]);

      expect(happnClient.state.listenerRefs).to.eql({

      });

      happnClient.off(handle, function(e){

        if (e) return done(e);

        expect(happnClient.__variableDepthSubscriptions[handle]).to.eql(undefined);

        expect(happnClient.state.listenerRefs[handle]).to.eql(undefined);

        expect(happnClient.state.listenerRefs).to.eql({

        });

        done();
      });
    });
  });
});
