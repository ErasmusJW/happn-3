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

        expect(listenerclient.state.variableDepthSubscriptions[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs).to.eql({});

        done();

      });
    }, function(e, handle){

      if (e) return done(e);

      expect(handle).to.be(0);

      expect(listenerclient.state.variableDepthSubscriptions[handle]).to.eql([
        1,2,3
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

        expect(listenerclient.state.variableDepthSubscriptions[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs[variableDepthHandle]).to.eql(undefined);

        expect(listenerclient.state.listenerRefs).to.eql({});

        done();

      });
    }, function(e, handle){

      if (e) return done(e);

      expect(handle).to.be(0);

      expect(listenerclient.state.variableDepthSubscriptions[handle]).to.eql([
        1,2,3
      ]);

      expect(Object.keys(listenerclient.state.listenerRefs).length).to.eql(4);

      variableDepthHandle = handle;

      publisherclient.set('/test/path/1/3', {set:'data'}, function(e){
        if (e) return done(e);
      });
    });
  });

  it('does a couple of variable depth ons, we disconnect the client and ensure the state is cleaned up', function(done){

    listenerclient.on('/test/path/**', { depth:4 }, function(data){}, function(e, handle1){

      listenerclient.on('/test/path/1/**', { depth:5 }, function(data){}, function(e, handle2){

        expect(listenerclient.state.variableDepthSubscriptions[handle1]).to.eql([
          1,2,3
        ]);

        expect(listenerclient.state.variableDepthSubscriptions[handle2]).to.eql([
          5,6,7,8
        ]);

        expect(Object.keys(listenerclient.state.listenerRefs).length).to.eql(9);

        listenerclient.disconnect(function(e){

          if (e) return done(e);

          expect(listenerclient.state.variableDepthSubscriptions[handle1]).to.eql(undefined);

          expect(listenerclient.state.variableDepthSubscriptions[handle2]).to.eql(undefined);

          expect(Object.keys(listenerclient.state.listenerRefs).length).to.eql(0);

          done();

        });
      });
    });
  });

  it('does a variable depth on which eclipses another .on, do off and ensure the correct handlers are called', function(done){

    var variableDepthHandle;
    var results = [];

    listenerclient.on('/test/path/**', { depth:4 }, function(data, meta){
      results.push({data:data, channel:meta.channel});
    }, function(e, handle1){
      if (e) return done(e);
      listenerclient.on('/test/path/1/**', { depth:4 }, function(data, meta){
        results.push({data:data, channel:meta.channel});
      }, function(e, handle2){
        if (e) return done(e);
        publisherclient.set('/test/path/1/1', {set:1}, function(e){
          if (e) return done(e);
          listenerclient.off(handle1, function(e){
            if (e) return done(e);
            publisherclient.set('/test/path/1/1', {set:2}, function(e){
              if (e) return done(e);
              expect(results).to.eql([
                { data: { set: 1 }, channel: '/ALL@/test/path/1/*' },
                { data: { set: 1 }, channel: '/ALL@/test/path/*/*' },
                { data: { set: 2 }, channel: '/ALL@/test/path/1/*' }]
              );
              done();
            });
          });
        });
      });
    });
  });
});
