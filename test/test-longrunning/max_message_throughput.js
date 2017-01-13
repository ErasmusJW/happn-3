describe('max_message_throughput', function () {

  var Happn = require('../../')
    , fork = require('child_process').fork
    , sep = require('path').sep
    , remotes = {}
    , async = require('async')
    ;

  GLOBAL.hrTime = function(){

    var hr = process.hrtime();

    return hr[0] * 1000000 + hr[1] / 1000;
  };

  var libFolder = __dirname + sep + 'test-resources' + sep;

  var REMOTE_CLIENT_COUNT = 5;

  var TIME = 10 * 1000;

  var NOSTORE = "true";

  var NOPUBLISH = "false";

  var SECURE_CONFIG = {
    secure: true
  };

  var NON_SECURE_CONFIG = {

  };

  //optimal queue sizes, single node
  // var NON_SECURE_CONFIG_CONCURRENCY = {
  //   services:{
  //     queue:{
  //       config:{
  //         concurrency:16,
  //         outboundConcurrency:64
  //       }
  //     }
  //   }
  // };

  //NOSTORE
  // ended, averages are:  {"tried":49752,"set":49639,"received":27942}
  // set success: 99.77287345232352
  // average sets per sec: 4963.9
  // expected received, based on sets: 297834
  // actual received: 27942
  // average received per sec: 2794.2
  // received success, based on sets: 9.381736134893934

  //STORE
  // ended, averages are:  {"tried":45342,"set":3651,"received":17663}
  // set success: 8.052137091438402
  // average sets per sec: 365.1
  // expected received, based on sets: 21906
  // actual received: 17663
  // average received per sec: 1766.3
  // received success, based on sets: 80.63087738519127

  var NON_SECURE_CONFIG_CONCURRENCY = {
    services:{
      queue:{
        config:{
          concurrency:16,
          outboundConcurrency:64
        }
      }
    }
  };

  var NON_SECURE_CONFIG_DIRECT = {
    services:{
      queue:{
        config:{
          mode:'direct'
        }
      }
    }
  };

  var CONFIG = NON_SECURE_CONFIG_DIRECT;

  var server;

  function startHappnService(callback) {

    Happn.service.create(CONFIG)
      .then(function (_server) {
        server = _server;
        callback();
      })
      .catch(callback);
  }

  var totals = {
    tried:0,
    set:0,
    received:0
  };

  var steps;

  function logMetrics(message){

    totals.tried += message.tried;
    totals.set += message.set;
    totals.received += message.received;
  }

  function startRemoteClients(callback) {

    async.times(REMOTE_CLIENT_COUNT, function(time, timeCB){

      var remoteName = 'client ' + time.toString();

      var remote = fork(libFolder + 'max_message_throughput_client', [remoteName, NOSTORE, NOPUBLISH]);

      remote.on('message', function (message) {

        if (message.type == 'ready') {

          remotes[remoteName] = remote;
          timeCB();
        }
        if (message.type == 'starterror') {

          console.log('failed starting remote ' + remoteName + ': ', message.error);
          timeCB(new Error(message.error));
        }
        if (message.type == 'metric') {
          console.log(message);
          steps = message.steps;
          logMetrics(message)
        }
        if (message.type == 'runerror') {
          console.log(message);
        }
      });

    }, callback);

    // remote.stdout.on('data', function (data) {
    //   console.log(data.toString());
    // });
    //
    // remote.stderr.on('data', function (data) {
    //   console.log(data.toString());
    // });
  }

  function stopRemoteClients() {

    for (var remoteName in remotes) remotes[remoteName].kill();
  }

  before('start', function (done) {

    var _this = this;

    this.timeout(60000);

    startHappnService(function (e) {

      if (e) return done(e);

      startRemoteClients(done);

    });

  });


  after(function (done) {

    this.timeout(60000);

    stopRemoteClients();
    server.stop(done);
  });

  it("can call remote component function", function (done) {

    this.timeout(TIME + (1000 * REMOTE_CLIENT_COUNT));

    setTimeout(function(){

      console.log();

      console.log('ended, averages are: ', JSON.stringify(totals));

      console.log('set success: ' + ((totals.set / totals.tried) * 100));

      console.log('average sets per sec: ' + totals.set / (TIME / 1000));

      console.log('expected received, based on sets: ' + totals.set * REMOTE_CLIENT_COUNT);

      console.log('actual received: ' + totals.received);

      console.log('average received per sec: ' + totals.received / (TIME / 1000));

      console.log('received success, based on sets: ' + (totals.received / (totals.set * REMOTE_CLIENT_COUNT)) * 100);

      console.log();

      console.log(steps);

      var total = 0;

      // Object.keys(steps).forEach(function(step){
      //   total += steps[step];
      // });
      //
      // console.log('average total beginning->end', total);
      //
      // console.log('average total beginning->end seconds', total / 1000000);

      done();

    }, TIME);

    setInterval(function(){

      console.log('QUEUE-STATS');
      console.log(server.services.queue.stats());
      console.log('SESSION-STATS');
      console.log(server.services.session.stats());

    }, 1000);

  });

});
