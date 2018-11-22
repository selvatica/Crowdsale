require('dotenv').config();
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
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
    development: {
      host: "127.0.0.1",
      port: "7545",  //Ganache GUI is listening on this port
      //port: "8545",  //Ganache-cli CLIent is listening on this port
      network_id: "*" // Match any network id
    },
    mainnet: {
      provider: function() {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          "https://mainnet.infura.io/${process.env.ENDPOINT_KEY}"
        )
      },
      gas: 5000000,
      gasPrice: 25000000000,
      confirmations: 2,
      network_id: 1
    },
    rinkeby: {
      //#### These two lines is for Geth rinkeby local network !!
      //host: "localhost"
      //port: 3001,
      //Make sure you have enough Ether on METAMASK First Account (MNEMONIC is pointing to it)! 0x1B8a5F6035B4D07AcDd29Bf569Bb6a47930b1A23
      provider: function() {
       return new HDWalletProvider(
          process.env["MNEMONIC"],
          "https://rinkeby.infura.io/v3/" + process.env["ENDPOINT_KEY"]
          //   provider: () => new HDWalletProvider(process.env.MNEMONIC, "https://rinkeby.infura.io/v3/" + process.env.ENDPOINT_KEY),
          //"https://rinkeby.infura.io/v3/${process.env.ENDPOINT_KEY}"
        )
      },
      network_id: 4,
      gas: 5000000,
      gasPrice: 25000000000
   
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(
          process.env["MNEMONIC"],
          "https://ropsten.infura.io/v3/" + process.env["ENDPOINT_KEY"]
          //${process.env.ENDPOINT_KEY}"
        )
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
  },
  mocha: {
    useColors: true
  }
};