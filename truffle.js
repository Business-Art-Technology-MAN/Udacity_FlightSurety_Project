var HDWalletProvider = require("@truffle/hdwallet-provider");
var mnemonic = "candy maple cakre sugar pudding cream honey rich smooth crumble sweet treat";


module.exports = {
  
  networks: {
    development: {
       host: "127.0.0.1",
       port: 8545,
       network_id: "*"
    }
  }
};