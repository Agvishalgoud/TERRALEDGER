# TERRALEDGER — Blockchain-Based Land Registry Protocol

### Trust Through Transparency | Verifiable Property Records

TERRALEDGER is a blockchain-based land registry prototype that demonstrates property registration, ownership record verification, authority-based approval, and ownership transfer workflows using Ethereum smart contracts.

The project explores how blockchain technology can improve the transparency, traceability, and integrity of property records by maintaining verifiable on-chain records and transaction history.

> **Disclaimer:** TERRALEDGER is an educational prototype deployed on the Ethereum Sepolia testnet. It is not an official government land registry and does not establish legal ownership of real property.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [How It Works](#how-it-works)
- [Smart Contract Functions](#smart-contract-functions)
- [Blockchain Deployment](#blockchain-deployment)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
- [Using the Application](#using-the-application)
- [Security and Privacy](#security-and-privacy)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Traditional property record systems can face challenges involving record tampering, limited transparency, fragmented documentation, and difficulties verifying ownership history.

TERRALEDGER demonstrates a decentralized approach in which property information and approval decisions are recorded through Ethereum smart contracts.

The application provides interfaces for property registration, property verification, authority management, and blockchain transaction history.

## Key Features

- **Property Registration:** Register a property using a unique property reference ID, location hash, document hash, and area.
- **On-Chain Verification:** Retrieve property details and check the recorded ownership and approval status.
- **Authority Management:** Allow the contract administrator to grant or revoke authority permissions for wallet addresses.
- **Authority Approval:** Enable authorized wallets to approve registered properties.
- **Duplicate ID Checks:** Check for an existing property ID before submitting a registration transaction.
- **Ownership Transfer:** Support ownership transfer requests, approval, and cancellation through smart contract functions.
- **Blockchain History:** Display available contract events, block numbers, timestamps, and transaction links.
- **MetaMask Integration:** Connect a wallet and sign transactions on the Sepolia test network.
- **Dashboard:** View property records, verification information, authority permissions, and blockchain activity.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite, CSS |
| Smart Contracts | Solidity |
| Development Framework | Hardhat |
| Blockchain | Ethereum Sepolia Testnet |
| Wallet | MetaMask |
| Blockchain Interaction | ethers.js |
| Contract Interface | Application Binary Interface (ABI) |
| Block Explorer | Sepolia Etherscan |
| Package Management | npm |
| Version Control | Git and GitHub |

---

## System Architecture

TERRALEDGER follows a frontend-to-smart-contract architecture.

1. **Frontend:** React provides the user interface for registration, verification, authority approval, and history.
2. **Wallet:** MetaMask connects users to Ethereum and signs transactions.
3. **Smart Contract:** The `PropertyRegistry` contract handles property records, authority permissions, approval, and ownership transfer operations.
4. **Blockchain:** Ethereum Sepolia records contract state changes and transaction data.
5. **Verification and History:** The application reads contract state and available event logs to display information to users.

```text
          Property Owner / Authority / Admin
                         |
                         v
                React + Vite Frontend
                         |
                         v
                   MetaMask Wallet
                         |
                         v
              PropertyRegistry.sol
                  Smart Contract
                         |
                         v
              Ethereum Sepolia Testnet
                         |
             +-----------+-----------+
             |                       |
             v                       v
       Property State          Transaction Logs
             |                       |
             +-----------+-----------+
                         |
                         v
              Verification Dashboard
```

## How It Works

### 1. Property Registration

1. The property owner connects MetaMask.
2. The owner enters a property reference ID, location, area, and document reference.
3. The frontend generates hashes for the location and document reference.
4. The owner confirms the transaction in MetaMask.
5. The smart contract records the property on Sepolia.

### 2. Authority Management

1. The administrator connects the wallet associated with the contract admin.
2. The administrator enters an authority's wallet address.
3. The administrator grants permission using `setAuthority(address, true)`.
4. The authority can subsequently perform operations permitted by the smart contract.
5. The administrator can revoke access using `setAuthority(address, false)`.

### 3. Property Approval

1. An authority reviews the relevant property documents and official records outside the blockchain.
2. The authority connects its authorized wallet.
3. The authority submits an approval transaction using `approveProperty(propertyId)`.
4. Once confirmed, the contract's approval state can be retrieved through the verification interface.

### 4. Property Verification

Users enter a property ID to retrieve its record from the deployed contract.

The application can display the recorded owner, property area, document hash, location hash, pending ownership transfer, and authority approval status.

- **Property Verified:** The property exists and the contract reports it as approved.
- **Pending Authority Approval:** The property is registered but has not yet been approved.
- **Property Not Found:** No existing property record was returned for the supplied ID.

Blockchain approval records an authority's decision; it does not independently confirm the authenticity of documents or establish legal ownership.

### 5. Ownership Transfer

The contract supports requesting, approving, and cancelling ownership transfers. The exact permissions and state transitions depend on the deployed smart contract implementation.

### 6. Blockchain History

The application can read available smart contract events and display transaction links, block numbers, and block timestamps. History depends on the events emitted by the contract and the capabilities of the configured RPC provider.

---

## Smart Contract Functions

The deployed `PropertyRegistry` contract includes the following functions:

| Function | Description |
|---|---|
| `admin()` | Retrieves the contract administrator |
| `authorities(address)` | Checks authority permissions for an address |
| `setAuthority(address, bool)` | Grants or revokes authority access |
| `registerProperty(...)` | Registers a property record |
| `approveProperty(string)` | Approves a registered property |
| `verifyProperty(string)` | Retrieves a property's record and status |
| `requestOwnershipTransfer(...)` | Requests an ownership transfer |
| `approveOwnershipTransfer(string)` | Approves a transfer request |
| `cancelOwnershipTransfer(string)` | Cancels a transfer request |
| `getPropertyKey(string)` | Retrieves a property key |

Actual authorization rules and validation are enforced by the deployed contract.

---

## Blockchain Deployment

TERRALEDGER is deployed on the Ethereum Sepolia test network.

| Detail | Value |
|---|---|
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Contract Name | `PropertyRegistry` |
| Contract Address | `0xb311fad5ae8395F209d2D7A60F268293Bd8705aE` |
| Block Explorer | [View Contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xb311fad5ae8395F209d2D7A60F268293Bd8705aE) |

Sepolia is a test network. Test ETH is used to pay transaction fees during development and testing.

---

## Project Structure

```text
TERRALEDGER/
|
|-- contracts/
|   |-- contracts/
|   |   |-- PropertyRegistry.sol
|   |-- scripts/
|   |   |-- deploy.js
|   |-- test/
|   |   |-- PropertyRegistry.test.js
|   |-- ignition/
|   |-- hardhat.config.js
|   |-- package.json
|   |-- package-lock.json
|   |-- README.md
|
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- abi/
|   |   |   |-- PropertyRegistry.json
|   |   |-- assets/
|   |   |-- App.jsx
|   |   |-- App.css
|   |   |-- contract.js
|   |   |-- history.js
|   |   |-- index.css
|   |   |-- main.jsx
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   |-- README.md
|
|-- .gitignore
|-- README.md
```

*This structure reflects the main files in the project;

---

## Installation and Setup

### Prerequisites

Install the following tools:

- [Node.js and npm](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [MetaMask](https://metamask.io/)
- A GitHub account
- Sepolia test ETH for blockchain transactions

### 1. Clone the Repository

```bash
git clone https://github.com/Agvishalgoud/TERRALEDGER.git
cd TERRALEDGER
```

### 2. Install Smart Contract Dependencies

```bash
cd contracts
npm install
```

### 3. Compile the Smart Contract

```bash
npx hardhat compile
```

### 4. Run Smart Contract Tests

```bash
npx hardhat test
```

### 5. Install Frontend Dependencies

From the project root, run:

```bash
cd frontend
npm install
```

### 6. Start the Frontend

```bash
npm run dev
```

Open the local URL printed in the terminal by Vite, usually `http://localhost:5173`.

The frontend is configured to interact with the deployed Sepolia contract. You do not need to redeploy it unless you modify the contract or intentionally deploy a new version.

---

## Using the Application

1. Start the frontend.
2. Connect MetaMask to the Sepolia network.
3. Register a test property using the registration page.
4. Connect the administrator wallet to grant authority permissions.
5. Connect an authorized wallet to approve the property.
6. Use the verification page to retrieve the property's on-chain status.
7. Review available blockchain events and transaction links in Blockchain History.

Use test property information and test wallets during development.

---

## Security and Privacy

- Never commit private keys, seed phrases, wallet recovery phrases, or RPC API secrets.
- Keep environment files such as `.env` out of version control.
- Never store confidential property documents directly on a public blockchain.
- A hash can support integrity checking when compared with a trusted original, but it does not prove that a document is authentic.
- Frontend duplicate checks alone do not guarantee unique property registration. Uniqueness should also be enforced in the smart contract.
- Grant authority permissions only to trusted wallets.
- Review smart contract access controls and test the contract before considering any production use.
- Sepolia testnet records are not legally authoritative land records.

---

## Future Enhancements

- Integration with authorized government land-record systems.
- Secure document storage and document integrity verification.
- Stronger duplicate parcel detection using verified parcel identifiers.
- Improved authority dashboards and approval workflows.
- Enhanced event indexing for efficient property history and statistics.
- Automated testing, access-control reviews, and smart contract security audits.
- Production deployment following legal, regulatory, and security reviews.


**TERRALEDGER — Exploring a more transparent and verifiable approach to property records using blockchain technology.**
