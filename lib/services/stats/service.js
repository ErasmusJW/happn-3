var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = StatsService;

function StatsService() {
  this.DEBUG = false;
}

util.inherits(StatsService, EventEmitter);

//how we collect stats from the various services and return them as a json object
StatsService.prototype.fetch = function (opts) {

  var stats = {};

  if (!opts) opts = {};

  for (var serviceName in this.happn.services) {
    stats[serviceName] = {};
    if (this.happn.services[serviceName].stats) stats[serviceName] = this.happn.services[serviceName].stats(opts[serviceName]);
  }

  return stats;
};

StatsService.prototype.initialize = function (config, callback) {

  if (!config) return callback();

  if(config.debug) this.DEBUG = true;

  if (config.statsServer) {
    this.__statsClient = new (require('happn-stats').StatsClient)({
      host: config.statsServer,
      port: config.statsPort,
      name: this.happn.services.system.config.name
    });

    // Gave stats its own interval, assuming fetch() is cheap, this
    // allows the other interval to continue storing into into database
    // and writing to console low frequency.

    if (typeof config.statsInterval != 'number') config.statsInterval = 5 * 1000;

    this.__statsInterval = setInterval(function () {

      var stats = this.service.fetch(config.opts);
      this.service.__sendStats(stats);

    }.bind({service: this}), config.statsInterval);

  }

  if (config.emit || config.print){

    if (typeof config.interval != 'number') config.interval = 10000 * 60;//every 10 minutes

    this.__interval = setInterval(function(){

      var stats = this.service.fetch(this.config.opts);

      if (this.config.emit) this.service.emit('system-stats', stats);

      if (this.config.print) console.log('SYSTEM STATS:::\r\n' + JSON.stringify(stats, null, 2));

      //path, data, options, callback
      if (this.config.db) this.service.happn.services.data.upsert('/_SYSTEM/_STATS', stats, {}, function(e){
        if (e) return console.warn('failed saving stats to db: ' + e.toString());
      })

    }.bind({service:this, config:config}), config.interval)
  }
  callback();
};

StatsService.prototype.stop = function (options, callback) {
  clearInterval(this.__statsInterval); // doesn't mattter if no interval there
  clearInterval(this.__interval);
  if (this.__statsClient) this.__statsClient.stop();
  callback();
};

StatsService.prototype.increment = function(counterName, value) {

  if (!this.__statsClient) return;
  this.__statsClient.increment(counterName, value);
}

StatsService.prototype.gauge = function(gaugeName, value) {

  if (!this.__statsClient) return;
  this.__statsClient.gauge(gaugeName, value);
}

StatsService.prototype.__sendStats = function (stats) {

  var statsClient = this.__statsClient;

  if (!statsClient) return;

  statsClient.gauge('happn.system.memory.rss', stats.system.memory.rss);
  statsClient.gauge('happn.system.memory.heapTotal', stats.system.memory.heapTotal);
  statsClient.gauge('happn.system.memory.heapUsed', stats.system.memory.heapUsed);
  statsClient.gauge('happn.system.memory.external', stats.system.memory.external);

  statsClient.gauge('happn.session.sessions', stats.session.sessions);

  statsClient.gauge('happn.queue.publication.length', stats.queue.publication);
  statsClient.gauge('happn.queue.inbound.length', stats.queue.inbound);
  statsClient.gauge('happn.queue.outbound.length', stats.queue.outbound);
  // Does this queue still get used?
  // statsClient.gauge('happn.queue.system.length', stats.queue.system);

  // This should perhaps technically be a counter, but it never
  // gets reset to zero so no failures/persecond can be generated
  // Which is fine, be a gauge. Only problem is that the metrics
  // backend can't be expanded to generate alerts on failures > 0.
  statsClient.gauge('happn.queue.failures', stats.queue.failures);

  /*

  console.log('stats\n\n', JSON.stringify(stats, null, 2), '\n\n');

  {
 "utils": {},
 "error": {},
 "log": {
   "errors": {}
 },
 "data": {},
 "system": {
   "HEALTH": {
     "STATUS": 0,
     "BY_SEVERITY": {
       "0": 0,
       "1": 0,
       "2": 0,
       "3": 0
     },
     "BY_AREA": {},
     "lastError": null
   },
   "memory": {
     "rss": 65499136,
     "heapTotal": 43061248,
     "heapUsed": 30983112,
     "external": 604104
   }
 },
 "cache": {},
 "connect": {},
 "crypto": {},
 "transport": {},
 "session": {
   "sessions": 1
 },
 "protocol": {
   "protocols": [
     "happn_2",
     "happn",
     "happn_1"
   ],
   "protocolCounts": {
     "happn_2": 9
   },
   "stackCacheSize": 6,
   "benchmarks": {}
 },
 "security": {},
 "subscription": {},
 "publisher": {
   "attempted": 0,
   "failed": 0,
   "unacknowledged": 0
 },
 "queue": {
   "publication": 0,
   "inbound": 0,
   "outbound": 0,
   "system": 0,
   "failures": 0
 },
 "layer": {},
 "stats": {}
}

*/


}
