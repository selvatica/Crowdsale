export default function ether(n) {
	//return new web3.BigNumber(web3.toWei(n, 'ether'));
	return new web3.utils.BN(web3.utils.toWei(n , 'ether'));
}