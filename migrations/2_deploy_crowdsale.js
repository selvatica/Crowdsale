const TestToken = artifacts.require("./TestToken.sol");

module.exports = function(deployer) {
	const _name = "TestToken";
	const _symbol ="TEST";
	const _decimals= 18;
  deployer.deploy(TestToken,_name,_symbol,_decimals);
};