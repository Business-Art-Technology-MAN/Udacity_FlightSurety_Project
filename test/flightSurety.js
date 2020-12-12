
var Test = require('../config/testConfig.js');
var BN = require('bn.js');


contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
  
  it('(airline) can have funds added', async () => {
    
    // ARRANGE
    

    // ACT
    try {
        await config.flightSuretyApp.addFundsToAirline({from: config.owner, value:10000000000000000000});
    }
    catch(e) {

    }

    let result = await config.flightSuretyData.getAirline(config.owner); 
    /* console.log(result);
    console.log("result from adding funds: ", new BN(result[1]).toString(10,2)); */
    
    // ASSERT
    //amout returned by get airlines is equal to amount added.
    let a = new BN(result[1], 10);
    let b = new BN('10000000000000000000', 10);
    assert.equal(a.eq(b), true, "Amount deposited did not match.");

  });

  it('(airline) Registered and Funded Airline can sponsor and register a new airline. ', async () => {
    
    // ARRANGE
    let newAirline = config.testAddresses[2];
    

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(config.firstAirline, {from: config.owner});
        await config.flightSuretyApp.addFundsToAirline({from: config.firstAirline, value:10000000000000000000});
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
      //console.log(e);
    }

    let result = await config.flightSuretyData.isAirline.call(newAirline);
    
    // ASSERT
    
    assert.equal(result, true, "Non-owner Airline failed to add new airline.");

  });

  it('(mult-party consensus) Test threshold of 4 to 5 airlines', async () => {
    
    // ARRANGE
    thirdAirline = config.testAddresses[3];
    fourthAirline = config.testAddresses[4];
    fifthAirline = config.testAddresses[5];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(thirdAirline, {from: config.owner});
      await config.flightSuretyApp.addFundsToAirline({from: thirdAirline, value:10000000000000000000});
      /* let numAirlines_1 = await config.flightSuretyData.getNumberRegisteredAirlines.call();
      console.log("number of regd airlines: ", numAirlines_1); */
      await config.flightSuretyApp.registerAirline(fourthAirline, {from: config.owner});
      await config.flightSuretyApp.addFundsToAirline({from: fourthAirline, value:10000000000000000000});
      /* let numAirlines_2 = await config.flightSuretyData.getNumberRegisteredAirlines.call();
      console.log("number of regd airlines: ", numAirlines_2); */
    
    

    // ASSERT
    await config.flightSuretyApp.registerAirline(fifthAirline, true, {from: thirdAirline});

    }
    catch(e) {
      console.log(e);
    }


    let result = await config.flightSuretyData.isAirline.call(fifthAirline);
    let numAirlines = await config.flightSuretyData.getNumberRegisteredAirlines.call();
    let numVotes = await config.flightSuretyData.airlineTotalVotes(fifthAirline);

    assert.equal(result, false, "50% must approve before registered.");
    assert.equal(numAirlines, 4, "Number of Airlines should have stayed at 4.")
    assert.equal(numVotes, 1, "There should only be one vote at this point.");
  });

  it('(mult-party consensus) Test 50% approval', async () => {
    
    // ARRANGE
    thirdAirline = config.testAddresses[3];
    fourthAirline = config.testAddresses[4];
    fifthAirline = config.testAddresses[5];
    let doubleVoteError = false;
    // ACT
    try {
      //check no double voting
      await config.flightSuretyApp.registerAirline(fifthAirline, true, {from: thirdAirline});
      await config.flightSuretyApp.registerAirline(fifthAirline, false, {from: thirdAirline});

    }
    catch(e) {
      //console.log(e);
      //double vote error thrown
      doubleVoteError = true;
    }

    try {
      
      await config.flightSuretyApp.registerAirline(fifthAirline, true, {from: fourthAirline});
      

    }
    catch(e) {
      console.log(e);
      
    }

     
    //ASSERT
    let result = await config.flightSuretyData.isAirline.call(fifthAirline);
    assert.equal(doubleVoteError, true, "Error a second vote by a single airline was allowed.");
    assert.equal(result, true, "50% of votes should have been achieved");
  });

  it('Flights check registering and getting', async () => {
    //ARANGE
    let flightName = "MAL2689"
    let timestamp = Math.floor(Date.now() / 1000);
    

    //ASSEMBLE
    try {
      
      await config.flightSuretyApp.registerFlight(flightName, timestamp, {from: fourthAirline});
      

    }
    catch(e) {
      console.log(e);
      
    }

    //ASSERT
    let result = await config.flightSuretyData.getFlightInfo.call(flightName, fourthAirline);
    assert.equal(result[0], flightName, "Flight was not added.");

  });

});
