import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import regeneratorRuntime from "regenerator-runtime";
import Web3 from 'web3';
import express from 'express';
import BN from 'bn.js';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);


//informed by code from https://github.com/wkerstiens/FlightSurety/blob/master/src/server/server.js
let theOracles = [];

async function registerOracle(){
  let regFee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  //get accounts from enviornment
  let oracleAccounts = await web3.eth.getAccounts();
  //first 10 for use by airlines and passengers
  for(let i = 11; i <=36; i++){
    await flightSuretyApp.methods.registerOracle().send({
      "from": oracleAccounts[i],
      "value": regFee,
      "gas": 3000000
    });
    const result = await flightSuretyApp.methods.getMyIndexes().call({from: oracleAccounts[i]});
    theOracles.push({address: oracleAccounts[i], indexes: result});
    console.log(`Oracle ${oracleAccounts[i]} registered: ${result}`);
  }
  
}

registerOracle();

flightSuretyApp.events.OracleRequest({
    fromBlock: "latest"
  }, async function (error, event) {
    if (error) {
      console.log(error)
      console.log(event)
    }
  
  let airlineEvent = event.returnValues.airline;
  let flightEvent = event.returnValues.flight;
  let eventTime = new BN(event.returnValues.timestamp);

  let flightFound = false;
  /* // Flight status codees
  uint8 private constant STATUS_CODE_UNKNOWN = 0;
  uint8 private constant STATUS_CODE_ON_TIME = 10;
  uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
  uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
  uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
  uint8 private constant STATUS_CODE_LATE_OTHER = 50; */
  theOracles.forEach((oracle)=>{
    if(flightFound){
      return false;
    }
    oracle.indexes.forEach((i)=>{
      flightSuretyApp.methods.submitOracleResponse(
        oracle.indexes[i], airlineEvent, flightEvent, eventTime.toNumber(), 0
      ).send({
        from: oracle.address,
        gas: 30000000
      }).then(result => {
          flightFound = true;
          console.log(`Oracle: ${oracle.indexes[idx]} responded from flight ${flight}`);
      }).catch(error=>{
          console.log(error);
      });
    });

  });




});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


