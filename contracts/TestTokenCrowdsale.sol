pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol"; 
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";

import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";



contract TestTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, WhitelistedCrowdsale, RefundableCrowdsale {
// contract TestTokenCrowdsale is Crowdsale, Ownable, MintedCrowdsale, CappedCrowdsale {


	//Track investor contributions CAPPED CROWDSALE
	uint256 public investorMinCap 	= 2000000000000000; //0.002 ether
	uint256 public investorHardCap 	= 50000000000000000000; //50 ETH

	mapping(address => uint256) public contributions;

	//Create multiple Crowdsale stages
	enum CrowdsaleStage { PreICO, ICO }
	//Default to PreICO sale stage
	CrowdsaleStage public stage = CrowdsaleStage.PreICO;  //set default enum value to PreICO

	//Token distribution
	uint256 public tokenSalePercentage  = 70;
	uint256 public foundersPercentage   = 10;
	uint256 public foundationPercentage = 10;
	uint256 public partnersPercentage   = 10;

	//Token reserve Funds
	address public foundersFund;  //providing access to those variables inside the contract
	address public foundationFund;
	address public partnersFund;

	//Token Time lock
	uint256 public releaseTime;
  address public foundersTimelock;  //providing access to those variables inside the contract
	address public foundationTimelock;
	address public partnersTimelock;

   // 	@param _rate Number of token units a buyer gets per wei
   // * @param _wallet Address where collected funds will be forwarded to
   // * @param _token Address of the token being sold
	constructor(
		uint256 _rate, 				// Number of token units a buyer gets per wei
		address _wallet, 			// Address where collected funds will be forwarded to
		ERC20 _token, 				// Address of the token being sold
		uint256 _cap,					//CappedCrowdsale
		uint256 _openingTime, //TimedCrowdsale
		uint256 _closingTime, //TimedCrowdsale		
		uint256 _goal,					//RefundableCrowdsale
		address _foundersFund,
		address _foundationFund,
		address _partnersFund,
		uint256 _releaseTime	//From TokenTimelock.sol ; releaseTime for Funds
	) 
	Crowdsale(_rate, _wallet, _token)
	CappedCrowdsale(_cap)
	TimedCrowdsale(_openingTime, _closingTime)
	RefundableCrowdsale(_goal)
	public {
		require(_goal <= _cap); //VERY IMPORTANT: Require that the goal can be reached in a capped crowdsale !
		foundersFund = _foundersFund;  //providing access to those variables inside the contract
		foundationFund = _foundationFund;
		partnersFund = _partnersFund;
		releaseTime = _releaseTime;  //available as state variable 
		
	} 

	/**
	* @dev Returns the amount contributed so far by a specific user.
	* @param _beneficiary Address of contributor
	* @return User contribution so far
	*/
	function getUserContribution (address _beneficiary) 
		public view returns (uint256) 
	{
		return contributions[_beneficiary];
	}

	/**
	* @dev Allows admin to update the crowdsale stage
	* @param _stage can bei either PreICO or ICO
	*/
	function setCrowdsaleStage(uint256 _stage) public onlyOwner {
		if(uint(CrowdsaleStage.PreICO) == _stage) {
			stage = CrowdsaleStage.PreICO;

		} else if(uint(CrowdsaleStage.ICO) == _stage) {
			stage = CrowdsaleStage.ICO;

		}

		if(stage == CrowdsaleStage.PreICO) {
			rate = 500;
		}else if (stage == CrowdsaleStage.ICO) {
			rate = 250;
		}

	}

	/**
	 * @dev forwards funds to the wallet during the PreICO stage, then to the refund vault during the ICO stage
   * @dev Overrides Crowdsale fund forwarding, sending funds to vault.
   */
  function _forwardFunds() internal {
  	if(stage == CrowdsaleStage.PreICO) {
			wallet.transfer(msg.value);   					//Do what the Crowdsale does
		}else if (stage == CrowdsaleStage.ICO) {
			//The following will be executed during ICO stage
			super._forwardFunds(); 									//Do what the RefundableCrowdsale does
    	//vault.deposit.value(msg.value)(msg.sender);
		}
  }

  /**
	* @dev Extend parent behavior requiring purchase to respects investor min/max funding cap
	* @param _beneficiary Token purchaser
	* @param _weiAmount Amount of wei contributed
	*/
	function _preValidatePurchase(
		address _beneficiary,
		uint256 _weiAmount
	)
		internal
	{
		super._preValidatePurchase(_beneficiary, _weiAmount);
		uint256 _existingContribution = contributions[_beneficiary];
		uint256 _newContribution = _existingContribution.add(_weiAmount);
		require(_newContribution >= investorMinCap && _newContribution <= investorHardCap);
		contributions[_beneficiary] = _newContribution;
	}


	/**
   * @dev enables token transfers, called when owner calls finalize()
   */
  function finalization() internal {
  	if(goalReached()) {
  		MintableToken _mintableToken = MintableToken(token); //variable token is from Crowdsale.sol
  		uint256 _alreadyMinted = _mintableToken.totalSupply();

  		//Calculate the final total token Supply in order to calculate minited tokens for founders.
  		uint256 _finalTotalSupply = _alreadyMinted.div(tokenSalePercentage).mul(100);

  		foundersTimelock   = new TokenTimelock(token, foundersFund, releaseTime);
  		foundationTimelock = new TokenTimelock(token, foundationFund, releaseTime);
  		partnersTimelock   = new TokenTimelock(token, partnersFund, releaseTime);
  		
	  	// _mintableToken.mint(foundersAddress, _finalTotalSupply.div(foundersPercentage));
			// _mintableToken.mint(foundationAddress, _finalTotalSupply.div(foundationPercentage));
			// _mintableToken.mint(partnersAddress, _finalTotalSupply.div(partnersPercentage));

			_mintableToken.mint(address(foundersTimelock), _finalTotalSupply.div(foundersPercentage));
			_mintableToken.mint(address(foundationTimelock), _finalTotalSupply.div(foundationPercentage));
			_mintableToken.mint(address(partnersTimelock), _finalTotalSupply.div(partnersPercentage));


  		//Distribute the tokens
  		_mintableToken.finishMinting(); //only owner can do this. The Owner has been already transferred
  		// If crowdsale is finished..finish minting the token...so total supply can't change

  		// Unpause the token
 			PausableToken _pausableToken = PausableToken(token);
 			_pausableToken.unpause();
 			_pausableToken.transferOwnership(wallet);
 			// _mintableToken.transferOwnership(wallet);

  	}

  	super.finalization();
  }
}