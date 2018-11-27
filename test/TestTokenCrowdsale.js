import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import {increaseTimeTo, duration, latestTime } from './helpers/increaseTime';

const BigNumber = web3.BigNumber;
//var BigNumber1 = require('bignumber.js');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	//.use(require('chai-bignumber'))
	.should();


const TestToken = artifacts.require('TestToken');
const TestTokenCrowdsale = artifacts.require('TestTokenCrowdsale');

//_ is deployer,  wallet is our wallet
contract('TestTokenCrowdsale', function([_, wallet, investor1, investor2]) {

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
		this.cap = ether('100');

		var openT;
		var closeT;
		//var res=await web3.eth.getBlock('latest');
		//openT=res.timestamp;
		
		this.openingTime=await latestTime();

		//await web3.eth.getBlock('latest', function(e,res) { 
				//this.openingTime=res.timestamp; 
				//this.closingTime=res.timestamp+10000; 
		//closeT=openT+1000; 
				//closeT=openT+10000; 

				//console.log('OPEN  :', openT);
				//console.log('CLOSED:', closeT);
				//return(openT,closeT);
		//})
		
		this.closingTime=this.openingTime+1000;
		//console.log('OpeningTime:',this.openingTime);
		//console.log('ClosingTime:',this.closingTime);
		// console.log('OPEN  :', openT);
		// console.log('CLOSED:', closeT);
		// //this.closingTime=closeT;
		
		
		// Investor Caps
		this.investorMinCap  = ether('0.002');
		this.investorHardCap = ether('50');

		this.crowdsale = await TestTokenCrowdsale.new(
			this.rate, 
			this.wallet, 
			this.token.address,
			this.cap,
			this.openingTime, this.closingTime
			//openT,closeT
		)
		
		//Transfer token ownership to crowdsale
		//Mintable token needs this! After token is deployed
		await this.token.transferOwnership(this.crowdsale.address);


	});

	describe('Crowdsale', function() {
		// it('tracks the rate', async function () {
		// 	const rate = await this.crowdsale.rate();
		// 	rate.should.be.bignumber.equal(this.rate);
		// });

		it('tracks the rate', async function () {
			const rate = await this.crowdsale.rate();
			(rate.toString()).should.equal(this.rate.toString());
			//cap.should.be.bignumber.equal(this.cap);
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

		it('tracks the wallet', async function () {
			const wallet = await this.crowdsale.wallet();
			wallet.should.be.equal(this.wallet);
		});

		it('tracks the token', async function () {
			const token = await this.crowdsale.token();
			token.should.equal(this.token.address);
		}); 


	});

	
	describe('minted crowdsale', function() { 
		it('mints tokens after purchase', async function () { 
			const originalTotalSupply = await this.token.totalSupply();
			await this.crowdsale.sendTransaction({ value: ether('1'), from: investor1 });
			const newTotalSupply = await this.token.totalSupply();
			assert.isTrue(newTotalSupply > originalTotalSupply);
		});
	});

	describe('capped crowdsale', function () {
		it('has the correct hard cap', async function () {
			const cap = await this.crowdsale.cap();
			(cap.toString()).should.equal(this.cap.toString());
			//cap.should.be.bignumber.equal(this.cap);
		})
	})

	describe('timed crowdsale', function() { 
		it('is open', async function () {
			const isClosed = await this.crowdsale.hasClosed();
			isClosed.should.be.false;
		})
	})

	describe('crowdsale', function() { 
		it('should accept payements', async function () {
			const value =  ether('1'); //new web3.utils.BN(web3.utils.toWei('1', 'ether'));
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
				//await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.rejectedWith('doesn\'t have enough funds');
				await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.rejectedWith(EVMRevert);
			})
		});

    describe('when the contributions is in the normal range', function() {
    	const value = ether('2');
			it('succeeeds & updates the contribution amount', async function () {
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.fulfilled;
				const contribution = await this.crowdsale.getUserContribution(investor2);
				//contribution.should.be.bignumber.equal(value);
				(contribution.toString()).should.equal(value.toString());
			})
		});

	});
});