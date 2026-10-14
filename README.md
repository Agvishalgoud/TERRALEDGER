TERRALEDGER — Blockchain-Based Land Registry Protocol



Trust through transparency. Property records made verifiable.



TERRALEDGER is a blockchain-based land registry prototype designed to demonstrate transparent property registration, ownership record verification, and authority-based approval using Ethereum smart contracts.



The project uses the Sepolia test network to record property information and approval status on-chain. It aims to demonstrate how blockchain can help make property records more traceable, tamper-resistant, and independently verifiable.



Disclaimer: TERRALEDGER is an educational prototype deployed on the Sepolia testnet. It is not an official government land registry and does not establish legal ownership of real property.



Key Features



Blockchain Property Registration: Register properties using a unique property reference ID, location hash, document hash, and area.



Property Verification: Retrieve a property record from the deployed smart contract and inspect its recorded ownership and approval status.



Authority-Based Approval: Allow the contract admin to grant or revoke authority permissions. Authorized wallets can approve registered properties.



Duplicate ID Prevention: Check whether a property ID already exists before attempting registration. Contract-level uniqueness enforcement is required for reliable protection.



Ownership Transfer Workflow: Support ownership transfer requests, approval, and cancellation through smart contract functions.



Blockchain Transaction History: Read available smart contract events and display block information, timestamps, and transaction links.



MetaMask Integration: Connect a wallet and interact with the smart contract on Sepolia.



Dashboard: Display property records, verification results, authority permissions, and blockchain activity.



Technology Stack



Component



Technology



Frontend



React, Vite, CSS



Smart Contracts



Solidity



Blockchain Development



Hardhat



Blockchain Network



Ethereum Sepolia Testnet



Wallet Integration



MetaMask



Blockchain Interaction



ethers.js



Smart Contract Interface



ABI



Block Explorer



Sepolia Etherscan



System Architecture



User Interface: The React frontend provides property registration, verification, and authority management interfaces.



Wallet Connection: MetaMask connects the user to Sepolia and signs blockchain transactions.



Smart Contract: The PropertyRegistry contract manages property records, authority permissions, approval, and ownership transfer operations.



Blockchain: Sepolia stores the contract state and transaction records.



History and Verification: The frontend reads contract state and available event logs to display property information and transaction history.



Property Registration and Verification Workflow



A property owner connects MetaMask.



The owner enters a property ID, location, area, and document reference.



The application hashes the location and document reference before submitting them to the contract.



The smart contract registers the property on Sepolia.



An authorized authority reviews the relevant records outside the blockchain.



The authority connects its authorized wallet and approves the property.



Users can retrieve the property record and inspect its approval status.



Approval statuses:



Pending approval: The property is registered but has not been approved by an authority.



Property verified: The property exists and its on-chain approval flag is true.



Property not found: The contract does not return an existing record for the requested ID.



On-chain approval records an authority's decision; it does not independently prove that the underlying documents are genuine.



Smart Contract Functions



The deployed PropertyRegistry contract provides the following operations:



Function



Purpose



admin()



Retrieve the contract administrator



authorities(address)



Check whether a wallet is authorized



setAuthority(address, bool)



Grant or revoke authority permissions



registerProperty(...)



Register a property



approveProperty(string)



Approve a registered property



verifyProperty(string)



Retrieve a property's on-chain details



requestOwnershipTransfer(...)



Request an ownership transfer



approveOwnershipTransfer(string)



Approve a transfer request



cancelOwnershipTransfer(string)



Cancel a transfer request



getPropertyKey(string)



Retrieve the property key



Access permissions and validation are enforced by the deployed smart contract, not merely by the frontend.



Deployed Contract



Network: Ethereum Sepolia Testnet



Chain ID: 11155111



Contract Address: 0xb311fad5ae8395F209d2D7A60F268293Bd8705aE



View Contract on Etherscan: https://sepolia.etherscan.io/address/0xb311fad5ae8395F209d2D7A60F268293Bd8705aE



Sepolia is a test network. Use test ETH for testing transactions.



Project Structure



TERRALEDGER/

├── contracts/

│   ├── contracts/

│   │   └── PropertyRegistry.sol

│   ├── scripts/

│   ├── test/

│   ├── hardhat.config.js

│   └── package.json

│

├── frontend/

│   ├── src/

│   │   ├── abi/

│   │   │   └── PropertyRegistry.json

│   │   ├── App.jsx

│   │   ├── contract.js

│   │   ├── history.js

│   │   ├── index.css

│   │   └── main.jsx

│   ├── index.html

│   └── package.json

│

├── .gitignore

└── README.md

