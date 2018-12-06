require('dotenv').config();
require('babel-register');
require('babel-polyfill');

//const path = require("path");
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    //contracts_build_directory: path.join(process.cwd(), "build/contracts"),
    ganachegui: {
      host: "127.0.0.1",
      port: "7545",  //Ganache GUI is listening on this port
      //port: "8545",  //Ganache-cli CLIent is listening on this port
      network_id: "*"
    },
    ganachecli: {
      host: "127.0.0.1",
      port: "8545",  //Ganache CLI is listening on this port
      network_id: "*"
    },
    truffledev: {
      host: "127.0.0.1",
      port: "9545",  //Truffle development is listening on this port
      network_id: "*"
    },
    development: {
      host: "127.0.0.1",
      port: "7545",  //Ganache GUI is listening on this port
      //port: "8545",  //Ganache-cli CLIent is listening on this port
      network_id: "*" // Match any network id
    },
    mainnet: {
      provider: function() {
        return new HDWalletProvider(process.env.MNEMONIC,"https://mainnet.infura.io/${process.env.INFURA_API_KEY}");
      },
      gas: 5000000,
      gasPrice: 25000000000,
      confirmations: 2,
      network_id: 1
    },
    rinkeby: {
      provider: function() {
       return new HDWalletProvider(process.env["MNEMONIC"],"https://rinkeby.infura.io/v3/" + process.env["INFURA_API_KEY"]);
          //   provider: () => new HDWalletProvider(process.env.MNEMONIC, "https://rinkeby.infura.io/v3/" + process.env.INFURA_API_KEY),
          //"https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}"
      },
      network_id: 4,
      gas: 5000000,
      gasPrice: 25000000000
   
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(process.env["MNEMONIC"],"https://ropsten.infura.io/v3/" + process.env["INFURA_API_KEY"]);
      },
      network_id: 3,
      gas: 5000000,
      gasPrice: 25000000000
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }

};