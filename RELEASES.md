0.0.1 2016-11-03
----------------

 - based on 2.15.4
 - alpha release 
 
0.0.2 2016-11-04
----------------

 - passing publicKey back with login response on encrypted payloads
 
0.0.3 2016-11-07
----------------
 
 - security audits and modifiedBy
  
0.0.4 2016-11-15
----------------
  
 - modified login method to be simpler, check for secure - then set auth type to digest if no password


0.1.0 2016-11-15
----------------
  
 - have layered security more, not so many conditional statements, now have distinct login, and processLogin methods
 - fixed issue where onEvent in client was not pushing the actual event data, as the data was being pushed into the scope argument for a "call"
 - fixed bug in client, with incorrcetly spelled enum STATE.diconnected
  
0.2.0 2016-11-18
----------------

 - update to default policies, both now have no ttl
 - fix the session service disconnect to allow client reconnections (reconnect true if options.reconnect == null)
  
0.3.0 2016-11-21
----------------

 - inbound and outbound layer plugins
 
0.4.0 2016-11-21
----------------

 - services other than system services can now be loaded
 
0.4.2 2016-11-22
----------------

 - proper error returned when token from deleted user is used in an attempt to access a resource

0.4.3 2016-11-22
----------------

 - upgrade from node-uuid to uuid
 
0.5.0 2016-11-22
----------------

 - fix to pubsub, allow for noCluster option
 - added mergeObjects function to utils
 
0.6.0 2016-11-23
----------------
 
 - client connect timeout
 - made getConnection more logical
 - token login reuse
  
0.6.1 2016-11-25
----------------

 - fix to test c1
 - have correct management of connection timeout
 - upgrade to primus 6
 
0.6.2 2016-11-25
----------------

 - downgrade to primus 5.2.2 (support node 0.10)
 
0.6.3 2016-11-27
----------------

 - downgrade to primus 4.0.5 (last known good version)
 
0.6.5 2016-11-27
----------------
 
 - upgrade to primus 5.2.2 (didnt make a difference)
 
0.6.6 2016-11-27
----------------
  
 - update to __getConnection

0.6.7 2016-11-28
----------------

 - safeSession and updateSession returns null if session booted
 
0.7.0 2016-12-02
----------------

 - major updates to disconnect
 - fix to browser (Primus now attached to window)
 - happner-mocha-serial tests
 
0.7.1 2016-12-02
----------------

 - disabled benchmarket on all tests except benchmarket
 
0.8.0 2016-12-03
----------------

 - changed config on client to not have config.config
 - changed client.options.config to just client.options
 
0.9.0 2016-12-06
----------------

 - server shutdown, if connections are destroyed by primus, destroy not called in transport.stop
 - made call timeout configurable in client, defaults to 30 seconds
 
 

 
 
