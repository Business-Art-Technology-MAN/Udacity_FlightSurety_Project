import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network) {
        this.config = Config[network];
        this.owner = null;
        this.airlines = [];
        this.flights = [];
        this.passengers = [];
        this.gasLimit = 5000000;
    }

    async initWeb3 (logCallback) {
        if (window.ethereum) {
            this.web3 = new Web3(window.ethereum);
            try {
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            this.web3 = new Web3(window.web3.currentProvider);
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            this.web3 = new Web3(new Web3.providers.WebsocketProvider('http://localhost:8545'));
        }

        const accounts = await this.web3.eth.getAccounts();
        this.account = accounts[0];

        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress, this.config.dataAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
    }
/*     initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    } */

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    toggleOperational(cState, callback) {
        let self = this;
        
        self.flightSuretyData.methods
             .setOperatingStatus(cState)
             .call({ from: self.owner}, callback);
     }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}
