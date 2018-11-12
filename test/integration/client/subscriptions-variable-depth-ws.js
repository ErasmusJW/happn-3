describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var expect = require('expect.js');
  var happn = require('../../../lib/index');
  var service = happn.service;
  var happn_client = happn.client;
  var async = require('async');
  var happnInstance = null;

  this.timeout(5000);

  /*
   This test demonstrates starting up the happn service -
   the authentication service will use authTokenSecret to encrypt web tokens identifying
   the logon session. The utils setting will set the system to log non priority information
   */

  before('should initialize the service', function (callback) {

    try {
      service.create({secure:true}, function (e, happnInst) {
        if (e) return callback(e);
        happnInstance = happnInst;
        callback();
      });
    } catch (e) {
      callback(e);
    }
  });

  after(function (done) {

    this.timeout(20000);

    publisherclient.disconnect({
      timeout: 2000
    }, function (e) {
      if (e) console.warn('failed disconnecting publisher client');
      listenerclient.disconnect({
        timeout: 2000
      }, function (e) {
        if (e) console.warn('failed disconnecting listener client');
        happnInstance.stop(done);
      });
    });
  });

  var publisherclient;
  var listenerclient;

  /*
   We are initializing 2 clients to test saving data against the database, one client will push data into the
   database whilst another listens for changes.
   */
  beforeEach('should initialize the clients',  async () => {

    if (publisherclient) await publisherclient.disconnect();
    if (listenerclient) await listenerclient.disconnect();

    publisherclient = await happn_client.create({config:{username:'_ADMIN', password:'happn'}});
    listenerclient = await happn_client.create({config:{username:'_ADMIN', password:'happn'}});
  });


  it('does a variable depth on, ensure the client state items are correct', function(done){

    var variableDepthHandle;

    listenerclient.on('/test/path/**', { depth:4 }, function(data){
      expect(data).to.eql({set:'data'});

      listenerclient.off(variableDepthHandle, function(e){

        if (e) return done(e);

        expect(listenerclient.state.__variableDepthSubscriptions[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs).to.eql({});

        done();

      });
    }, function(e, handle){

      if (e) return done(e);

      expect(handle).to.be(0);

      expect(listenerclient.state.__variableDepthSubscriptions[handle]).to.eql([
        1,2,3,4
      ]);

      expect(Object.keys(listenerclient.state.listenerRefs).length).to.eql(4);

      variableDepthHandle = handle;

      publisherclient.set('/test/path/1', {set:'data'}, function(e){
        if (e) return done(e);
      });

    });
  });

  it('does a variable depth on, ensure the client state items are correct, deeper path', function(done){

    var variableDepthHandle;

    listenerclient.on('/test/path/**', { depth:4 }, function(data){
      expect(data).to.eql({set:'data'});

      listenerclient.off(variableDepthHandle, function(e){

        if (e) return done(e);

        expect(listenerclient.state.__variableDepthSubscriptions[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs).to.eql({});

        done();

      });
    }, function(e, handle){

      if (e) return done(e);

      expect(handle).to.be(0);

      expect(listenerclient.state.__variableDepthSubscriptions[handle]).to.eql([
        1,2,3,4
      ]);

      expect(Object.keys(listenerclient.state.listenerRefs).length).to.eql(4);

      variableDepthHandle = handle;

      publisherclient.set('/test/path/1/3', {set:'data'}, function(e){
        if (e) return done(e);
      });
    });
  });
});
