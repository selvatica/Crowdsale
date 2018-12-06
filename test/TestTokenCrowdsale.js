import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import {increaseTimeTo, duration, latestTime } from './helpers/increaseTime';

const BigNumber = web3.BigNumber;
//var BigNumber1 = require('bignumber.js');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	//.use(require('chai-bignumber')(BigNumber1))
	.should();


const TestToken = artifacts.require('TestToken');
const TestTokenCrowdsale = artifacts.require('TestTokenCrowdsale');

//Import refundVault
const RefundVault = artifacts.require('./RefundVault');
const TokenTimelock = artifacts.require('./TokenTimelock');

//_ is deployer,  wallet is our wallet
contract('TestTokenCrowdsale', function([_, wallet, investor1, investor2, foundersFund, foundationFund, partnersFund]) {

	//Before function will be only run once at the beginning..
	before(async function(){
		//Transfer extra ether to investor1's account for testing. So he does not run out of ether during tests
		await web3.eth.sendTransaction({from: _, to: investor1, value: ether('25') });
	});

	beforeEach(async function() {
		//Token configuration
		this.name = "TestToken";
		this.symbol = "TEST";
		this.decimals = 18;

		//Deploy Token
		this.token = await TestToken.new(
			this.name, 
			this.symbol, 
			this.decimals
		);

		//Crowdsale config
		this.rate = 500; //how many tokens can I get from one ether
		this.wallet = wallet;

		//CappedCrowdsale config
		this.cap = ether('100');

		//TimedCrowdsale config
		this.openingTime=await latestTime();
		this.openingTime+=duration.weeks(1);
		this.closingTime=this.openingTime+duration.weeks(1);
		console.log('OpeningTime:',this.openingTime);
		console.log('ClosingTime:',this.closingTime);

		//RefundableCrowdsale config
		this.goal = ether('50');

		this.foundersFund = foundersFund;
		this.foundationFund = foundationFund;
		this.partnersFund = partnersFund;
		this.releaseTime = this.closingTime + duration.years(1);
		
		// Investor Caps
		this.investorMinCap  = ether('0.002');
		this.investorHardCap = ether('50');

		// ICO stages
		this.preIcoStage = 0;
		this.preIcoRate = 500;
		this.icoStage = 1;
		this.icoRate = 250;

	  this.tokenSalePercentage  = 70;
	  this.foundersPercentage   = 10;
	  this.foundationPercentage = 10;
	  this.partnersPercentage   = 10;

		this.crowdsale = await TestTokenCrowdsale.new(
			this.rate, 
			this.wallet, 
			this.token.address,
			this.cap,														//CappedCrowdsale
			this.openingTime, this.closingTime,	//TimedCrowdsale
			this.goal, 													//RefundableCrowdsale
			this.foundersFund,
		  this.foundationFund,
		  this.partnersFund,
		  this.releaseTime										//TimedCrowdsale
		)
		
		// Pause Token so tokens cannot be transferred
		await this.token.pause(); //Pausable Token

		//Transfer token ownership to crowdsale
		//Mintable token needs this! After token is deployed
		var origOwner = await this.token.owner();
		await this.token.transferOwnership(this.crowdsale.address);
		var newOwner = await this.token.owner();
		console.log('origOwner', origOwner, 'newOwner', newOwner);

		//WhitelistedCrowdsale: Add investors to whielist
		await this.crowdsale.addManyToWhitelist([investor1, investor2]);

		//RefundableCrowdsale:  Keep track of the Refund Vault
		this.vaultAddress = await this.crowdsale.vault();
		console.log('Vault Address: ', this.vaultAddress);
		this.vault = await RefundVault.at(this.vaultAddress);

		//Advance time to crowdsale start
		await increaseTimeTo(this.openingTime + 1);

	});

	describe('Crowdsale', function() {
		
		it('tracks the rate', async function () {
			const rate = await this.crowdsale.rate();
			(rate.toNumber()).should.equal(this.rate);
		})
	
		// var Rate = 500; //how many tokens can I get from one ether
		// it('tracks the rate', function() {
		// 	this.rate=500;
		// 	this.wallet=wallet;
		// 	this.cap = ether('100');
		// 	this.openingTime = 100;
		// 	this.closingTime = 101;
		//  	TestTokenCrowdsale.new(this.rate, this.wallet, this.token.address, this.cap
		//  		, this.openingTime, this.closingTime
		//  		).then(function(instance) {
		//  		var deployedToken = instance;
		//  		deployedToken.rate().then(function(r) {
		//  			assert.equal(r.toNumber(), Rate);
		//  		})
		//  	})
		// })

		it('tracks the wallet address', async function () {
			const wallet = await this.crowdsale.wallet();
			wallet.should.be.equal(this.wallet);
		});

		it('tracks the token address', async function () {
			const token = await this.crowdsale.token();
			token.should.equal(this.token.address);
		}); 


	});

	
	describe('minted crowdsale', function() { 
		it('mints tokens after purchase', async function () { 
			const originalTotalSupply = await this.token.totalSupply();
			try {
				var receipt = await this.crowdsale.sendTransaction({ value: ether('1'), from: investor1 });
				console.log('Reciept:', receipt);
				// statements
			} catch(e) {
				// statements
				console.log(e);
			}
			const newTotalSupply = await this.token.totalSupply();
			assert.isTrue(newTotalSupply > originalTotalSupply);
		});
	});

	describe('capped crowdsale', function () {
		it('has the correct hard cap', async function () {
			const cap = await this.crowdsale.cap();			
			(cap.toString()).should.equal(this.cap);
		})
	})

	describe('timed crowdsale', function() { 
		it('is open', async function () {
			const isClosed = await this.crowdsale.hasClosed();
			isClosed.should.be.false;
		})
	})

	describe('whitelisted crowdsale', function() { 
		it('rejects contributions from non-whitelisted investors', async function () {
			const notWhitelisted = _; //default account _ is NOT in the whitelist !
			await this.crowdsale.buyTokens(notWhitelisted, {value:ether('1'), from: notWhitelisted }).should.be.rejectedWith(EVMRevert);

		})
	})

	describe('refundable crowdsale', function() { 
		
		beforeEach(async function() {
			//Transfer ETH before the Test by Investor1 (valid transaction)
			await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 });
		})

		describe('during crowdsale', function() {
			it('checks the token Supply', async function()  {
				const originalTotalSupply = await this.token.totalSupply();
				const originalBalance = await web3.eth.getBalance(investor1);
				console.log('origSupply:',originalTotalSupply.toString(),'origBalance:', originalBalance);
				try {
					const receipt = await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 });
					console.log('receipt:', receipt);
				} catch(e) {
					// statements
					console.log(e);
				}
							
				const newBalance = await web3.eth.getBalance(investor1);
				const newTotalSupply = await this.token.totalSupply();
				console.log('newSupply:', newTotalSupply.toString() ,'newBalance:', newBalance);
				(newTotalSupply.toString()).should.be.bignumber.above(originalTotalSupply.toString());
				assert.isTrue(newBalance < originalBalance);
				});

		});

		describe('during crowdsale', function() {
			it('prevents the investor from claiming refund', async function(){
				console.log('Vault Address1 : ', this.vaultAddress);
				//console.log('vault1 				: ', this.vault1);
				await this.vault.refund(investor1, { from: investor1 }).should.be.rejectedWith(EVMRevert);
			})
		});
	

		describe('when the crowdsale stage is PreICO', function() {
		  beforeEach(async function () {
        // Crowdsale stage is already PreICO by default
        await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 });
      });

      it('forwards funds to the wallet', async function () {
        const balance = await web3.eth.getBalance(this.wallet);  //Pre ICO stage forwards ether to the wallet and NOT the vault!

				(balance.toString()).should.be.bignumber.at.least(ether('100'));
      });
		});

		describe('when the crowdsale stage is ICO', function() {
    	beforeEach(async function () {
      	await this.crowdsale.setCrowdsaleStage(this.icoStage, { from: _ });
      	await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 });
    	});

    	it('forwards funds to the refund vault', async function () {
      	const balance = await web3.eth.getBalance(this.vaultAddress);
      	(balance.toString()).should.be.bignumber.above(0);
    	});
  	});
	});

	describe('crowdsale stages', function() { 
		it('starts in Pre ICO stage', async function () {
			var stage = await this.crowdsale.stage();
			(stage.toNumber()).should.equal(this.preIcoStage);
		});

		it('starts at the pre ICO Rate', async function () {
			const rate = await this.crowdsale.rate();
			(rate.toNumber()).should.equal(this.preIcoRate); //this is pre ICO rate
		});

		it('allows admin to update the stage & rate', async function () {
			await this.crowdsale.setCrowdsaleStage(this.icoStage, { from: _ })
			const stage = await this.crowdsale.stage();
			(stage.toNumber()).should.equal(this.icoStage);
			const rate = await this.crowdsale.rate();
			(rate.toNumber()).should.equal(this.icoRate);
		});

		it('prevents a non-admin to be able to update the stage', async function () {
			await this.crowdsale.setCrowdsaleStage(this.icoStage, { from: investor1 }).should.be.rejectedWith(EVMRevert);
		});
	})

	describe('accepting payments', function() { 
		it('should accept payements', async function () {
			const value =  ether('1'); 
			const purchaser = investor2;
			await this.crowdsale.sendTransaction({ value: value, from: investor1 }).should.be.fulfilled;
			//Want to test whether crowdsale can purchase tokens on behalf of someone else
			await this.crowdsale.buyTokens(investor1, { value: value, from: purchaser }).should.be.fulfilled;

		});
	});

	describe('buyTokens()', function() { 
		describe('when the contribution is less than the minimum cap', function() {
			it('rejects the transaction', async function () {
				const value = this.investorMinCap - 1;
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2}).should.be.rejectedWith(EVMRevert);
			})
		});
		describe('when the investor has already met the minimum cap', function() {
			it('allows the investor to contribute below the minimum cap', async function() {
				//First Contribution is valid
				const value1 = ether('1');
				await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });

				//Second contribution is less than investor cap
				const value2 = 1; //wei
				await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.fulfilled;
			});
		});

		describe('when the total contributions exceed the investor cap', function() {
			it('rejects the transaction', async function () {
				//First Contribution is valid
				const value1 = ether('2');
				await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });

				//Second contribution is less than investor cap
				const value2 = ether('49'); //wei
				await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.rejectedWith(EVMRevert);
			})
		});

    describe('when the contributions is in the normal range', function() {
    	const value = ether('2');
			it('succeeeds & updates the contribution amount', async function () {
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.fulfilled;
				const contribution = await this.crowdsale.getUserContribution(investor2);
				//(contribution.toString()).should.equal(value.toString());
				//console.log('Contribution1:', contribution.toString(), 'Value: ', value);
				(contribution.toString()).should.be.bignumber.equal(value);
			})
		});


    //Check for Pausable token
    describe('token transfers', function(){
    	it('does not allow investors to transfer tokens during crowdsale', async function() {
    		//Buy some tokens first
    		await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 });
    		//Attempt to transfer tokens during crowdsale
    		await this.token.transfer(investor2, 1, {from: investor1 }).should.be.rejectedWith(EVMRevert);
    	});

    });

		describe('finalizing the crowdsale', function() {
			describe('when the goal is not reached', function() {
				beforeEach(async function () {
					//Do not meet the goal      		
      		await this.crowdsale.buyTokens(investor2, { value: ether('1'), from: investor2 });
      		// Fastforward past end time to ensure crowdsale is over
      		await increaseTimeTo(this.closingTime + 1);
      		//Finaliye the crowdsale
      		await this.crowdsale.finalize({ from: _ });
    		});

    		it('allows the investor to claim refund', async function(){
    			//GOAL is not reached, but crowdsale is over. So Investors can claim their refund
    			await this.vault.refund(investor2, {from: investor2 }).should.be.fulfilled;
    		});

			});
			describe('when the goal is reached', function() {
				beforeEach(async function () {
					//track current wallet balance
					this.walletBalance = await web3.eth.getBalance(wallet);
					//Meet the goal
					await this.crowdsale.buyTokens(investor1, { value: ether('26'), from: investor1 });
					await this.crowdsale.buyTokens(investor2, { value: ether('26'), from: investor2 });
					// Fastforward past end time to ensure crowdsale is over
					await increaseTimeTo(this.closingTime +1);
					//Finalize crowdsale
					await this.crowdsale.finalize({ from: _ });
				});

				it('handles goal reached', async function(){
					// Tracks the goal is reached in Refundable Crowdsale
					const goalReached = await this.crowdsale.goalReached();
					goalReached.should.be.true;

					// Tracks whether the minting token is finished
					const mintingFinished = await this.token.mintingFinished();
					mintingFinished.should.be.true;

					//PauableToken
					const paused = await this.token.paused();
					paused.should.be.false;

					//Enables token transfers
					await this.token.transfer(investor2, 1, { from: investor2 }).should.be.fulfilled;

					//#########################
					//Checking the FUNDS and TIMELOCK
					//get total amount of tokens sold during 
					let totalSupply = await this.token.totalSupply();
					
					//Founders
					const foundersTimelockAddress = await this.crowdsale.foundersTimelock();
					let foundersTimelockBalance = await this.token.balanceOf(foundersTimelockAddress);
					foundersTimelockBalance = foundersTimelockBalance / (10 ** this.decimals);
					console.log('Founders:',foundersTimelockBalance);
					let foundersAmount = totalSupply / this.foundersPercentage;
					foundersAmount = foundersAmount / (10 ** this.decimals);
					assert.equal(foundersTimelockBalance, foundersAmount);

					//Foundation
					const foundationTimelockAddress = await this.crowdsale.foundationTimelock();
					let foundationTimelockBalance = await this.token.balanceOf(foundationTimelockAddress);
					foundationTimelockBalance = foundationTimelockBalance / (10 ** this.decimals);
					console.log('Foundation:',foundationTimelockBalance);
					let foundationAmount = totalSupply / this.foundationPercentage;
					foundationAmount = foundationAmount / (10 ** this.decimals);
					assert.equal(foundationTimelockBalance, foundationAmount);

					//Partners
					const partnersTimelockAddress = await this.crowdsale.partnersTimelock();
					let partnersTimelockBalance = await this.token.balanceOf(partnersTimelockAddress);
					partnersTimelockBalance = partnersTimelockBalance / (10 ** this.decimals);
					console.log('Partners:',partnersTimelockBalance);
					let partnersAmount = totalSupply / this.partnersPercentage;
					partnersAmount = partnersAmount / (10 ** this.decimals);
					assert.equal(partnersTimelockBalance, partnersAmount);


					//Can't withdraw from timelock accounts
					const foundersTimelock = await TokenTimelock.at(foundersTimelockAddress);
					await foundersTimelock.release().should.be.rejectedWith(EVMRevert);
					
					const foundationTimelock = await TokenTimelock.at(foundationTimelockAddress);
					await foundationTimelock.release().should.be.rejectedWith(EVMRevert);
					
					const partnersTimelock = await TokenTimelock.at(partnersTimelockAddress);
					await partnersTimelock.release().should.be.rejectedWith(EVMRevert);


					//Can withdraw from timelock accounts after crowdsale ended + 1 year (releaseTime is one year)
					//Fast forward Time to a year + 1
					await increaseTimeTo(this.releaseTime + 1);

					await foundersTimelock.release().should.be.fulfilled;
					await foundationTimelock.release().should.be.fulfilled;
					await partnersTimelock.release().should.be.fulfilled;

					//Funds now have balances
					//founders
					let foundersBalance = await this.token.balanceOf(this.foundersFund);
					foundersBalance = foundersBalance / (10 ** this.decimals);
					assert.equal(foundersBalance, foundersAmount); //amount= minted in the crowdsale

					//foundation
					let foundationBalance = await this.token.balanceOf(this.foundationFund);
					foundationBalance = foundationBalance / (10 ** this.decimals);
					assert.equal(foundationBalance, foundationAmount); //amount= minted in the crowdsale

					//partners
					let partnersBalance = await this.token.balanceOf(this.partnersFund);
					partnersBalance = partnersBalance / (10 ** this.decimals);
					assert.equal(partnersBalance, partnersAmount); //amount= minted in the crowdsale
					//#####################################

					// Transfer ownership to the wallet
					const owner = await this.token.owner();
					owner.should.equal(this.wallet);

					//GOAL is reached, crowdsale is over. So Investors are NOT allowed to claim their refunds
    			await this.vault.refund(investor1, {from: investor1 }).should.be.rejectedWith(EVMRevert);
    		});
			});
		});

		describe('token distribution' , function() {
			it('tracks the token distribution correctly', async function() {				
				const tokenSalePercentage = await this.crowdsale.tokenSalePercentage();
				(tokenSalePercentage.toNumber()).should.equal(this.tokenSalePercentage, 'has correct token Sale Percentage');
				const foundersPercentage = await this.crowdsale.foundersPercentage();
				(foundersPercentage.toNumber()).should.equal(this.foundersPercentage, 'has correct founders Percentage');
				const foundationPercentage = await this.crowdsale.foundationPercentage();
				(foundationPercentage.toNumber()).should.equal(this.foundationPercentage, 'has correct foundation Percentage');
				const partnersPercentage = await this.crowdsale.partnersPercentage();
				(partnersPercentage.toNumber()).should.equal(this.partnersPercentage, 'has correct partners Percentage');
			})

			it('is a valid percentage breakdown', async function() {				
				const tokenSalePercentage = await this.crowdsale.tokenSalePercentage();				
				const foundersPercentage = await this.crowdsale.foundersPercentage();				
				const foundationPercentage = await this.crowdsale.foundationPercentage();				
				const partnersPercentage = await this.crowdsale.partnersPercentage();
				const total = tokenSalePercentage.toNumber()+foundersPercentage.toNumber()+foundationPercentage.toNumber()+partnersPercentage.toNumber();
				console.log('TOTAL:', total, 'partnersPercentage', partnersPercentage);
				total.should.equal(100);
			})
		})
	});
});