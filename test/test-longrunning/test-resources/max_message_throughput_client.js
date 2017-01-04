var name = process.argv[2];
var noStore = process.argv[3] == 'true';
var noPublish = process.argv[4] == 'true';

console.log({
  name: name,
  noStore: noStore,
  noPublish: noPublish
});

var Happn = require('../../../');

Happn.client.create()

  .then(function (client) {
    process.send({
      type: 'ready'
    });
    runClient(client);
  })

  .catch(function (error) {
    process.send({
      type: 'starterror',
      name: name,
      error: error.toString()
    });

    console.log(error);

    process.exit(1);
  });


function runClient(client) {

  var received = 0;

  var triedTotal = 0;

  var setTotal = 0;

  GLOBAL.hrTime = function(){

    var hr = process.hrtime();

    return hr[0] * 1000000 + hr[1] / 1000;
  };

  setInterval(function () {
    // console.log(count); // messages received per second
    process.send({
      type: 'metric',
      name: name,
      received: received,
      tried: triedTotal,
      set: setTotal,
      steps: reportAggregate()
    });

    triedTotal = 0;
    setTotal = 0;
    received = 0;

  }, 1000);

  client.on('/some-path/*',
    function (data, meta) {

      received++;
    },
    function (error) {
      if (error) {
        process.send({
          type: 'starterror',
          name: name,
          error: error.toString()
        });
        console.error(error);
        process.exit(1);
      }
    }
  );

  var aggregateSteps = {};

  function average(array) {
    var total = 0;
    for (var i = 0; i < array.length; i++) {
      total += array[i];
    }
    return total / array.length;
  }

  function reportAggregate() {
    var report = {};
    var keys = Object.keys(aggregateSteps);
    for (var i = 0; i < keys.length; i++) {
      report[keys[i]] = average(aggregateSteps[keys[i]]);
    }
    // console.log(report);
    return report;
  }

  function addToAggregate(key, value, i) {
    var num = i;
    if (num.toString().length < 2) num = '0' + num;
    key = num + '-' + key;
    aggregateSteps[key] = aggregateSteps[key] || [];
    aggregateSteps[key].push(value);
    while (aggregateSteps[key].length > 20) aggregateSteps[key].shift();
  }

  setInterval(function () {

    triedTotal ++;

    client.set('/some-path/xxx', {some: 'data', step_timestamp:hrTime()}, {noStore: noStore, noPublish: noPublish, timeout:120000},
      function (error, response) {

        setTotal ++;

        if (error) {
          process.send({
            type: 'runerror',
            name: name,
            error: error.toString()
          });
          console.error('set error', error);
          return;
        }

        // var steps = response._meta.steps;
        //
        // steps.push({step: 'callback', timestamp: hrTime()});

        // for (var i =   1  ; i < steps.length; i++) {
        //   var key = steps[i].step;
        //   var value = steps[i].timestamp - steps[i - 1].timestamp;
        //   addToAggregate(key, value, i)
        // }
      });
  }, 0);

}
