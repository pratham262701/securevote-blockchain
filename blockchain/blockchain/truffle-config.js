module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Ganache GUI/CLI default
      port: 8545,            // Ganache default RPC port
      network_id: "*",       // match any network id
      gas: 6721975,
    },
  },
  compilers: {
    solc: {
      version: "0.8.17",   // match solidity version
    }
  }
};
