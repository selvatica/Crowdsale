const {duration, latestTime } = require('../test/helpers/increaseTime');
//const ether = require('../test/helpers/ether');
const ether = (n) => web3.utils.toWei(n , 'ether');

const TestToken = artifacts.require("./TestToken.sol");
const TestTokenCrowdsale = artifacts.require("./TestTokenCrowdsale.sol");

module.exports = async function(deployer, network, accounts) {
	// ######### DEPLOYMENT OF TEST TOKEN ###########
	const _name = "TestToken";
	const _symbol = "TEST";
	const _decimals= 18;

	await deployer.deploy(TestToken, 
		_name, 
		_symbol, 
		_decimals
	);
	const deployedToken = await TestToken.deployed();

	// ######### DEPLOYMENT OF TEST TOKEN CROWDSALE ###########
	// How many token units a buyer gets per wei.
  // The rate is the conversion between wei and the smallest and indivisible token unit.
  // So, if you are using a rate of 1 with a DetailedERC20 token with 3 decimals called TOK
  // 1 wei will give you 1 unit, or 0.001 TOK.

	const _rate 					= 500; //1 ETH = 500 Token (* 10 ** decimals)
	
	//const _wallet 				=	'0xd3fF8838a81cDd6543ADa738D3676578bed6a520';		// GANACHE Account[0]
	const _wallet 				= '0xAE66178Df0FebB58A52080Fa775990d6E8d4D380';		//Metamask ICO_Wallet

	//const _foundersFund 	= accounts[4];				//IMPORTANT: MAKE SURE TO CHANGE THIS BEFORE DEPLOYING	
	//const _foundersFund 	= '0x3886198031cB7402FF5b052e516DdD3D02f05E54';		// GANACHE Account[4]
	const _foundersFund 	= '0xA43Eb6C07685e10715202d2C95EFcB853ea95d24'; 	//Metamask ICO_founders

	//const _foundationFund = accounts[5];				//IMPORTANT: MAKE SURE TO CHANGE THIS BEFORE DEPLOYING
	//const _foundationFund = '0x49dEde1b6034EBeBE6cd52AA558c305AfBB3863b';		// GANACHE Account[5]
	const _foundationFund = '0x1371E2795374C171E307B926CFA3D65201Ff4f57';		//Metamask ICO_foundation

	const _partnersFund 	= '0x4cDeb12Df5C9d7ee8D8Cd67494ba9fA6e0fDF13c';	 //Mar...
	//const _partnersFund 	= '0xCeF55B7CF1edB3C7FfEAC2678443460bFa36dbf6';		//Metamask ICO_partners

	const _tokenAddress		= deployedToken.address; //Address of the token being sold
	const _cap 						= ether('100');

	var latestTime = (new Date).getTime();
	latestTime= latestTime/1000; //convert Milliseconds to seconds,because blockchain (getBlock.timestamp) is in seconds
	
	const _openingTime 		= latestTime + duration.minutes(1); 
	const _closingTime 		= _openingTime + duration.days(5); // Test Crowdsale lasts 4 days
	const _releaseTime 		= _closingTime + duration.days(1); // Test period of release time is 1 day
	const _goal 					= ether('50');

	await deployer.deploy(TestTokenCrowdsale,
		_rate, 
		_wallet, 
		_tokenAddress,
		_cap,														
		_openingTime,
		_closingTime,
		_goal,
		_foundersFund,
	  _foundationFund,
	  _partnersFund,
	  _releaseTime
	);

	return true;
};