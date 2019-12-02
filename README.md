# Blockchain-Network
Blockchain network project as part of Kingsland University course.

Implement a simple fully-functional blockchain network consisting of nodes, miners, wallet app, faucet app and blockchain explorer app.

<b>Key Components:</b> <br/>

<b>Node App</b> <br/>
	&emsp;&emsp;Provides list of REST API end points for interacting with the blockchain <br/>
	&emsp;&emsp;&emsp;&emsp;Implements the Blocks <br/>
	&emsp;&emsp;&emsp;&emsp;Implements the Transactions, Addresses, and Balances <br/>
	&emsp;&emsp;&emsp;&emsp;Implements the Mining Process <br/>
	&emsp;&emsp;&emsp;&emsp;Peers, Synchronization and Consensus <br/>

<b>Miner App</b> <br/>	
	&emsp;&emsp;Take a mining job from the Node app through its REST API. <br/>
	&emsp;&emsp;Mine the mining job (change the nonce until you find a hash matching the block difficulty). <br/>
	&emsp;&emsp;Submit the mined job to the Node in order to build the next block in the chain. <br/>
	
<b>Wallet App</b> <br/>
	&emsp;&emsp;Manage private keys + sign and send transactions. <br/>
	&emsp;&emsp;Based on HD wallet and password protected. <br/>
	&emsp;&emsp;Create new wallet / open existing wallet / Delete wallet <br/>
	&emsp;&emsp;Check account balance for certain blockchain address. <br/>
	&emsp;&emsp;Create, sign and send transactions. <br/>
	
<b>Faucet App</b> <br/>
	&emsp;&emsp;A web app that holds some coins which is donated from the genesis transaction. <br/>
	&emsp;&emsp;The faucet works like a wallet with hard coded private key. <br/>
	&emsp;&emsp;It sends 1 coin (or less) to anyone who requests coins (one request per address per hour). <br/>
	&emsp;&emsp;For each request, the faucet creates a transaction, signs it and sends it to the specified node app URL. <br/>


<b>Blockchain Explorer App</b> <br/>
	&emsp;&emsp;View blockchain info, debug info and reset-chain <br/>
	&emsp;&emsp;View blocks <br/>
	&emsp;&emsp;View pending and confirmed transactions <br/>
	&emsp;&emsp;View accounts and balances <br/>
	&emsp;&emsp;View Mining jobs and debug with given difficulty <br/>
	&emsp;&emsp;View Peers <br/>
	
<b>Steps to run:</b> <br/>

<b>Run Node-App</b> <br/>
&emsp;&emsp;npm init <br/>
&emsp;&emsp;npm install <br/>
&emsp;&emsp;node src/server.js --listeningPort 5555 --listeningHost localhost <br/>
&emsp;&emsp;node src/server.js --listeningPort 5556 --listeningHost localhost <br/>
&emsp;&emsp;node src/server.js --listeningPort 5557 --listeningHost localhost <br/>
&emsp;&emsp;node src/server.js --listeningPort 5558 --listeningHost localhost <br/>

<b>Run Miner-App</b> <br/>
&emsp;&emsp;npm init <br/>
&emsp;&emsp;npm install <br/>
&emsp;&emsp;node src/miner.js --listeningNodePort 5555 --listeningNodeHost localhost --minerAddress 1e5506bdb8596eff354ffd5638146aea3646d8bb --mineOnlyOnce true <br/>
&emsp;&emsp;node src/miner.js --listeningNodePort 5556 --listeningNodeHost localhost --minerAddress 1e5506bdb8596eff354ffd5638146aea3646d8bb --mineOnlyOnce true <br/>
&emsp;&emsp;node src/miner.js --listeningNodePort 5557 --listeningNodeHost localhost --minerAddress 1e5506bdb8596eff354ffd5638146aea3646d8bb --mineOnlyOnce true <br/>
&emsp;&emsp;node src/miner.js --listeningNodePort 5558 --listeningNodeHost localhost --minerAddress 1e5506bdb8596eff354ffd5638146aea3646d8bb --mineOnlyOnce true <br/>

<b>Run Wallet-App-HD</b> <br/>
&emsp;&emsp;Open index.html in browser<br/>

<b>Run Faucet-App</b> <br/>
&emsp;&emsp;npm init <br/>
&emsp;&emsp;npm install <br/>
&emsp;&emsp;node server.js --listeningPort 7777 --listeningHost localhost <br/>
&emsp;&emsp;Launch URL -> http://localhost:7777/faucet.html# <br/>

<b>Run Block-Explorer</b> <br/>
&emsp;&emsp;npm init <br/>
&emsp;&emsp;npm install <br/>
&emsp;&emsp;node server.js --listeningPort 9999 --listeningHost localhost <br/>
&emsp;&emsp;Launch URL -> http://localhost:9999/blockExplorer.html# <br/>


