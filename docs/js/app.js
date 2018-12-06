
window.addEventListener('load', async () => {
	// Modern dapp 	browsers...
  if (window.ethereum) {
      window.web3 = new Web3(ethereum);
      try {
      	console.log('Inside window.ethereum');
        // Request account access if needed
        await ethereum.enable();
        App.web3Provider = ethereum;
        return App.initContracts();
        // Acccounts now exposed
        //web3.eth.sendTransaction({/* ... */});
      } catch (error) {
          // User denied account access...
          console.log('User denied Access');
      }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
  		App.web3Provider = web3.currentProvider; //Added by Sven
  		console.log('Inside window.web3');
      window.web3 = new Web3(web3.currentProvider);
      return App.initContracts();
      // Acccounts always exposed
      //web3.eth.sendTransaction({/* ... */}); 
  }
  // Non-dapp browsers...
  else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }
  //return App.initContracts();
  
})


App = {
	web3Provider: null,
	contracts: {},
	account: '0x0',
	loading: false,
	transferOwnership: false,
	// tokenPrice: 1000000000000000,
	// tokensSold: 0,
	// tokensAvailable: 750000,
	// tokensTotal: 750000,

	init: function() {
		console.log("App initialized...");
		//return App.initWeb3();
	},


	initWeb3: function() {
		if (typeof web3 !== 'undefined') {
			// If a web3 instance is already provided by Meta Mask.
			App.web3Provider = web3.currentProvider;
			console.log("Found a current provider");
		  web3 = new Web3(web3.currentProvider);
		  
		} else {
			//Specifiy default instance if no web3 instance provided
			App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
			web3 = new Web3(App.web3Provider);
			console.log("Current provider set to localhost");
		}
		return App.initContracts();
	},

	initContracts: function() {
		$.getJSON("TestTokenCrowdsale.json", function(TestTokenCrowdsale) {
			App.contracts.TestTokenCrowdsale = TruffleContract(TestTokenCrowdsale);
			App.contracts.TestTokenCrowdsale.setProvider(App.web3Provider);
			App.contracts.TestTokenCrowdsale.deployed().then(function(TestTokenCrowdsale) {
				App.testTokenCrowdsaleAddress=TestTokenCrowdsale.address;
				console.log("Test Token Crowdsale Address:", App.testTokenCrowdsaleAddress);			
			});
		}).done(function() {
			$.getJSON("TestToken.json", function(TestToken) {
				App.contracts.TestToken = TruffleContract(TestToken);
				App.contracts.TestToken.setProvider(App.web3Provider);
				App.contracts.TestToken.deployed().then(function(TestToken) {
					App.testTokenAddress = TestToken.address;
					console.log("Test Token Address:", App.testTokenAddress);
				});
				App.listenForEvents();
				return App.render();
			});
		})
	},

	//Listen for events emitted from the contract
	listenForEvents: function() {
		App.contracts.TestTokenCrowdsale.deployed().then(function(instance) {
			instance.TokenPurchase({} , {
				fromBlock: 0,
				toBlock: 'latest',
			}).watch(function(error,event) {
				console.log("event triggered", event);
				App.render();
			})
		})
	},

	render: function() {
		if(App.loading){
			return;
		}
		App.loading=true;

		var loader = $('#loader');
		var content = $('#content');
		var whitelist = $('#whitelist');
		var pauseToken1= $('#pauseToken1');
		var transferOwnership= $('#transferOwnership');
		var changeICOStage = $('#changeICOStage');
		var finalizeICO = $('#finalizeICO');

		loader.show();		
		content.hide();
		whitelist.hide();
		changeICOStage.hide();
		finalizeICO.hide();
		pauseToken1.hide();
		transferOwnership.hide();
		//Load account data
		web3.eth.getCoinbase(function(err, account) {
			if(err==null) {
				App.account = account;
				// $('#accountAddress').html("Your Account: " + App.account);
			}
		})

		web3.version.getNetwork(function(err,network) {
			console.log('Network:', network);
			console.log('API Version:',web3.version.api);
		  switch (network) {
		    case "1":
		    	$('.ethereum-network').html("This is the Main Ethereum Network! Be sure what you're doing!");
		      console.log('This is mainnet')
		      break
		    case "2":
		      console.log('This is the deprecated Morden test network.')
		      break
		    case "3":
		    	$('.ethereum-network').html("This is the Ropsten Test Network! Your ETH is not real money.");
		      console.log('This is the ropsten test network.')
		      break
		    case "4":
		    	$('.ethereum-network').html("This is the Rinkeby Test Network! Your ETH is not real money.");
		      console.log('This is the Rinkeby test network.')
		      break
		    case "42":
		      console.log('This is the Kovan test network.')
		      break
		    case "5777":
		    	$('.ethereum-network').html("This is the Ganache Test Network! Your ETH is not real money.");
		      console.log('This is Ganache test network.')
		      break
		      
		    default:
		      console.log('This (', network ,') is an unknown network. Maybe you are using Ganache or probably you need to use Chrome Browser together with MetaMask!')
		  }
		})

		App.contracts.TestTokenCrowdsale.deployed().then(function(instance) {
			testTokenCrowdsaleInstance = instance;

			return testTokenCrowdsaleInstance.owner();	
		}).then(function(owner) {
			console.log("Token Crowdsale Owner Address:", owner);
			App.ownerAddress = owner;	

			return testTokenCrowdsaleInstance.stage();	
		}).then(function(stage) {
			App.stagePreICOorICO=stage.toNumber();
			var help = App.stagePreICOorICO == 0 ? "PreICO" : "ICO";
			console.log("Crowdsale stage: ", help);

			return testTokenCrowdsaleInstance.wallet();	
		}).then(function(wallet) {
			console.log("Token Crowdsale wallet Address", wallet);
			App.wallet= wallet;				// Address where collected funds will be forwarded to
			$('.walletAddress').html(App.wallet);

			return testTokenCrowdsaleInstance.foundersFund();	
		}).then(function(founders) {
			console.log("FoundersFund Address:", founders);
			App.foundersFund = founders;
			$('.foundersAddress').html(App.foundersFund);

			return testTokenCrowdsaleInstance.foundationFund();	
		}).then(function(foundation) {
			console.log("FoundationFund Address:", foundation);
			App.foundationFund = foundation;
			$('.foundationAddress').html(App.foundationFund);

			return testTokenCrowdsaleInstance.partnersFund();	
		}).then(function(partners) {
			console.log("PartnersFund Address:", partners);
			App.partnersFund = partners;	
			$('.partnersAddress').html(App.partnersFund);

			return testTokenCrowdsaleInstance.getUserContribution(App.account);	//Ether invested by User!
		}).then(function(userContr) {
			console.log("Your Contribution so far:", userContr.toNumber());
			App.userContribution = userContr;	
			$('.investedEther').html(App.userContribution/(10 ** 18));
			return testTokenCrowdsaleInstance.rate();	
		}).then(function(rate) {
			App.tokenRate = rate.toNumber();	
			console.log("Token Crowdsale conversion rate:", App.tokenRate);
			$('.tokenRate').html(App.tokenRate);

			return testTokenCrowdsaleInstance.weiRaised();	
		}).then(function(weiRaised) {
			App.weiRaised = weiRaised.toNumber();	
			console.log("Ether Raised:", App.weiRaised/(10 ** 18));
			$('.etherRaised').html(App.weiRaised/(10 ** 18));

			return testTokenCrowdsaleInstance.openingTime();	
		}).then(function(openTime) {
			openTime=openTime.toNumber();
			console.log('OpenTime unixstamp:',openTime);
			var date=new Date(openTime*1000);
			console.log("Opening Time for Crowdsale:", date.toLocaleDateString(), date.toLocaleTimeString());
			$('.timeOpening').html( date.toLocaleDateString() + '  ' +  date.toLocaleTimeString());

			var timeNow=new Date();			
			console.log("Time Now                  :", timeNow.toLocaleDateString(), timeNow.toLocaleTimeString());
			$('.timeNow').html( timeNow.toLocaleDateString() + '  ' +  timeNow.toLocaleTimeString());

			return testTokenCrowdsaleInstance.closingTime();	
		}).then(function(closeTime) {
			closeTime=closeTime.toNumber();
			console.log('CloseTime unixstamp:',closeTime);
			
			var date=new Date(closeTime*1000);			
			console.log("Closing Time for Crowdsale:", date.toLocaleDateString(), date.toLocaleTimeString());
			$('.timeClosing').html( date.toLocaleDateString() + '  ' +  date.toLocaleTimeString());

			return testTokenCrowdsaleInstance.releaseTime();	
		}).then(function(relTime) {
			relTime=relTime.toNumber();
			console.log('ReleaseTime unixstamp:',relTime);
			var date=new Date(relTime*1000);
			console.log("Release Time for Funds    :", date.toLocaleDateString(), date.toLocaleTimeString());
			$('.timeRelease').html( date.toLocaleDateString() + '  ' +  date.toLocaleTimeString());
			App.releaseTime = relTime;	


			return testTokenCrowdsaleInstance.hasClosed();	
		}).then(function(isClosed) {
			App.icoStatus = isClosed == false ? "open" : "closed";
			console.log("Crowdsale ICO status is:", App.icoStatus);
			$('.icoStatus').html("ICO Crowdsale status is: " + App.icoStatus);

			return testTokenCrowdsaleInstance.capReached();	
		}).then(function(capReached) {
			App.capReached = capReached == false ? "(NOT reached)" : "(reached)";
			console.log("Crowdsale CAP reached?", App.capReached);		
			$('.capReached').html(App.capReached);

			return testTokenCrowdsaleInstance.goal();	
		}).then(function(goal) {
			var help = goal.toNumber();
			App.goalEther=help/(10 ** 18);
			$('.crowdsaleGoal').html(App.goalEther);

			return testTokenCrowdsaleInstance.goalReached();	
		}).then(function(goalReached) {
			var help = goalReached == false ? "(NOT reached)" : "(reached)";
			console.log("Crowdsale GOAL reached?", help);
			$('.goalReached').html(help);


			return testTokenCrowdsaleInstance.cap();	
		}).then(function(cap) {
			var help = cap.toNumber();
			App.capEther=help/(10 ** 18);

			var progressPercent = parseFloat((Math.round(App.weiRaised/(10 ** 18)) / App.capEther) * 100).toFixed(1);
			var progressPercent1 = 100 - progressPercent;
			$('#progress').css('width', progressPercent + '%');
			$('#progress1').css('width', progressPercent1 + '%');
			$('.progress-percent').html(progressPercent + '%'); //added by Sven :)
			$('.progress-percent1').html(progressPercent1 + '%'); //added by Sven :)

			console.log("Crowdsale CAP is: ", App.capEther , 'Ether');
			$('.crowdsaleCap').html(App.capEther);

			return testTokenCrowdsaleInstance.whitelist(App.account);	
		}).then(function(whitelisted) {
			var help = whitelisted == false ? "NOT whitelisted!" : "whitelisted";
			console.log("Your account is: ", help);
			$('#accountAddress').html("Your Account (" + help +"): " + App.account);

			web3.eth.getBlock('latest', function(err, block) {
				if(err) { 
					console.log(err);
				}
				else{
					var help = block.timestamp;
					var date=new Date(help*1000);
					var h1 = date.toLocaleDateString();
					var h2 = date.toLocaleTimeString();
					console.log("Block Timestamp:", h1, h2);
					console.log("Block Unix Timestamp:", help);
				}
			})
		})
		
		//Contribution so far: is it ETHER? I think so
		//How many tokens did one buy
		//"Crowdsale Goal" and "Crowdsale goal reached?"

		
		App.contracts.TestToken.deployed().then(function(instance) {
			testTokenInstance=instance;
			return testTokenInstance.name();
		}).then(function(name) {
			console.log("Token Name:", name);
			App.tokenName=name;
			$('.tokenName').html(App.tokenName);
			return testTokenInstance.symbol();
		}).then(function(symbol) {
			console.log("Token Symbol:", symbol);
			App.tokenSymbol=symbol;
			$('.tokenSymbol').html(App.tokenSymbol);

			return testTokenInstance.decimals();
		}).then(function(decimals) {
			App.tokenDecimals=decimals.toNumber();
			console.log("Token Decimals:", App.tokenDecimals);

			return testTokenInstance.balanceOf(App.account);
		}).then(function(balance) {
		 	App.tokenBalance=balance.toNumber();
		 	$('.yourAccountBalance').html(App.tokenBalance/(10 ** App.tokenDecimals));
			console.log("Your Account Balance:", App.tokenBalance); //Amount of Tokens not Ether!

			return testTokenInstance.balanceOf(App.wallet);
		}).then(function(walletBalance) {
		 	App.walletTokenBalance=walletBalance.toNumber();
		 	$('.walletTokenBalance').html(App.walletTokenBalance/(10 ** App.tokenDecimals));
			console.log("Wallet Token Balance:", App.walletTokenBalance); 

			return testTokenInstance.balanceOf(App.foundersFund);
		}).then(function(foundersBalance) {
		 	App.foundersTokenBalance=foundersBalance.toNumber();
		 	$('.foundersTokenBalance').html(App.foundersTokenBalance/(10 ** App.tokenDecimals));
			console.log("Founders Token Balance:", App.foundersTokenBalance); 

			return testTokenInstance.balanceOf(App.foundationFund);
		}).then(function(foundationBalance) {
		 	App.foundationTokenBalance=foundationBalance.toNumber();
		 	$('.foundationTokenBalance').html(App.foundationTokenBalance/(10 ** App.tokenDecimals));
			console.log("Foundation Token Balance:", App.foundationTokenBalance); 

			return testTokenInstance.balanceOf(App.partnersFund);
		}).then(function(partnersBalance) {
		 	App.partnersTokenBalance=partnersBalance.toNumber();
		 	$('.partnersTokenBalance').html(App.partnersTokenBalance/(10 ** App.tokenDecimals));
			console.log("Partners Token Balance:", App.partnersTokenBalance); 

			return testTokenInstance.paused();
		}).then(function(paused) {
			var help = paused == false ? "Test Token is NOT paused" : "Test Token is paused";
			console.log(help); 

			return testTokenInstance.totalSupply();
		}).then(function(totalSupply) {
		 	App.totalSupply=totalSupply.toNumber();  //total number of tokens in existence
			console.log("Total Token Supply:", App.totalSupply);
			$('.tokensSold').html(App.totalSupply/(10 ** App.tokenDecimals));
		 	return testTokenInstance.owner();
		}).then(function(owner) {
		 	App.tokenOwner=owner;  
			console.log("Token Owner Address:", App.tokenOwner);

		 	//$('.totalSupply').html(App.totalSupply);
			App.loading =false;

			loader.hide();
			if(App.account == App.ownerAddress) { 
				whitelist.show();
				pauseToken1.show();
				transferOwnership.show();
				changeICOStage.show();
				finalizeICO.show();

			}
			content.show();
		})
	},
	
		
	changeICOStageManually: function() {
		App.contracts.TestTokenCrowdsale.deployed().then(function(instance) {
			testTokenCrowdsaleInstance = instance;
			return testTokenCrowdsaleInstance.stage();	
		}).then(function(stage) {
			App.stagePreICOorICO=stage.toNumber();
			//var help = App.stagePreICOorICO == 0 ? "PreICO" : "ICO";
			if(App.stagePreICOorICO==0) {
				testTokenCrowdsaleInstance.setCrowdsaleStage(1);
				console.log('Crowdsale stage has been successfully changed to ICO by owner');
			}
			else {
				console.log('Crowdsale stage has already been changed to ICO by owner earlier');
			}
		})
		App.render();
 	},

	finalizeICOManually: function() {
		App.contracts.TestTokenCrowdsale.deployed().then(function(instance) {
			testTokenCrowdsaleInstance = instance;
			return testTokenCrowdsaleInstance.isFinalized();	
		}).then(function(fin) {
			if(!fin) {
				testTokenCrowdsaleInstance.finalize();
				console.log('Crowdsale has been finalized by owner');
			}else {
				console.log('Crowdsale has already been finalized by owner earlier');
			}
		})
		App.render();
	},


	pauseTokenManually: function() {
		App.contracts.TestToken.deployed().then(function(instance) {
			testTokenInstance=instance;
			return testTokenInstance.paused();
		}).then(function(paused) { 
			if(!paused) {
				console.log("Pausing Test Token....");
				return testTokenInstance.pause();
			}
			else {
				console.log("Test Token already paused!");
			}
		})

			App.render();
 	},

 	transferOwnershipManually: function() {
	 	if(App.transferOwnership==false) {
			App.contracts.TestToken.deployed().then(function(instance) {
				testTokenInstance=instance;
				//Transfer token ownership to crowdsale
				//Mintable token needs this! After token is deployed
				return testTokenInstance.transferOwnership(App.testTokenCrowdsaleAddress);
			}).then(function(ownershiptransferred) { 
				console.log('Ownership has been transferred');
			})
			App.transferOwnership=true;
		}else {
			console.log("Ownership has been previoiusly transferred already!");		
		}

		App.render();
		
 	},

	addToWhitelistManually: function() {
		
		var whiteListAddress = $('#whitelistAddress').val();  //Read whitelist input field
		var errorWhiteList = false;
		
		App.contracts.TestTokenCrowdsale.deployed().then(function(instance) {
			testTokenCrowdsaleInstance = instance; 

			//WhitelistedCrowdsale: Add investors to whitelist
			// These three lines can be used for testing
			// var Ganache1='0xFc63d9AcDBC07Dfb65E6fF580f1Fa9aCF59E3563';
			// var Ganache2='0x8Cc77230F1Db0a8FCdFA20b140f6D5058A3F8Ef7';
			// return testTokenCrowdsaleInstance.addManyToWhitelist([Ganache1, Ganache2]);

			return testTokenCrowdsaleInstance.addToWhitelist(whiteListAddress);
		}).catch(function(error) {  
			console.log('ERROR', error.message);		
			errorWhiteList=true;			
		}).then(function(wladdress) {
			if(errorWhiteList) {
				console.log('ERROR: not added to whitelist:', whiteListAddress);					
			}
			else {
				console.log('Added to whitelist:', whiteListAddress);					
			}
		})
		App.render();
 	},

	buyTokens: function() {
		$('#content').hide();
		$('#loader').show();
		var numberOfTokens = $('#numberOfTokens').val();  //Read Input field
		var errorBuy=false;
		var totalWei=numberOfTokens * 1000000000000000000 / App.tokenRate;

		var helpAccount=App.account;
		console.log('TotalWei:', totalWei);
		console.log('HelpAccount:', helpAccount);
		//App.contracts.TestToken.deployed().then(function(instance) {
		App.contracts.TestTokenCrowdsale.deployed().then(function(instance) {	
			return instance.buyTokens(App.account, {	
				from: App.account,
				value: totalWei,
				gas: 500000
					
			}).catch(function(error) {  
				console.log('ERROR', error.message);		
				errorBuy=true;
			});
		}).then(function(result) {
				if(errorBuy) {
					console.log("Buying of Tokens unsuccessful!");
					errorBuy=false;
					App.render();
				}
				else {
					console.log("Congratulations! Tokens successful bought!");
				}
				$('form').trigger('reset');
				//Wait for Sell Event here	
		})	
	}
}

$(function() {
	$(window).load(function() {
		App.init();
	})
});