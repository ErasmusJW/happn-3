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
  
