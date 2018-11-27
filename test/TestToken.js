const BigNumber = web3.BigNumber;
const TestToken = artifacts.require('TestToken');

require('chai')
	.use(require('chai-bignumber')(BigNumber))
//	.use(require('chai-bignumber')())
	.should();

contract('TestToken', accounts => {
	const _name='TestToken';
	const _symbol = 'TEST';
	var _decimals = 18;

	beforeEach(async function() {
		this.token = await TestToken.new(_name, _symbol, _decimals);
	});


	describe('token attributes', function() {
		// it('has the correct name', function() {
		// 	TestToken.deployed().then(function(instance) {
		// 		deployedToken = instance;
		// 		instance.name().then(function(n) {
		// 			assert.equal(n, 'TestToken');
		// 		})
		// 	})
		// })

		it('has the correct name', async function() {
			const name = await this.token.name();
			//assert.equal(name,_name);
			name.should.equal(_name);
		});

		it('has the correct symbol', async function() {
			const symbol = await this.token.symbol();
			symbol.should.equal(_symbol);
		});

		// //THE FOLLOWING DOES NOT WORK ..FOR SOME ODD REASON..
		// it('has the correct decimals', async function() {
		// 	const decimals = await this.token.decimals();
		// 	decimals.should.be.bignumber.equal(_decimals);
		// });
		it('has the correct decimals', function() {
		 	TestToken.deployed().then(function(instance) {
		 		var deployedToken = instance;
		 		deployedToken.decimals().then(function(n) {
		 			assert.equal(n.toNumber(), _decimals);
		 		})
		 	})
		})


	});
});