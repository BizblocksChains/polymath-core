[![Build Status](https://travis-ci.org/PolymathNetwork/polymath-core.svg?branch=master)](https://travis-ci.org/PolymathNetwork/polymath-core)
[![Coverage Status](https://coveralls.io/repos/github/PolymathNetwork/polymath-core/badge.svg?branch=master)](https://coveralls.io/github/PolymathNetwork/polymath-core?branch=master)
[![Gitter](https://img.shields.io/badge/chat-gitter-green.svg)](https://gitter.im/PolymathNetwork/Lobby)
[![Telegram](https://img.shields.io/badge/50k+-telegram-blue.svg)](https://gitter.im/PolymathNetwork/Lobby)

![Polymath logo](Polymath.png)

# Polymath Core

The Polymath Core smart contracts provide a system for launching regulatory-compliant securities tokens on a decentralized blockchain. This particular repository is the implementation of a system that allows for the creation of ST-20-compatible tokens. This system has a modular design that promotes a variety of pluggable components for various types of issuances, legal requirements, and offering processes.


# ST-20 Interface Overview
## Description
An ST-20 token is an Ethereum-based token implemented on top of the ERC-20 protocol that adds the ability for tokens to control transfers based on specific rules. ST-20 tokens rely on Transfer Managers to determine the ruleset the token should apply in order to allow or deny a transfer, be it between the issuer and investors, in a peer to peer exchange, or a transaction with an exchange.

## How it works
ST-20 tokens must implement a `verifyTransfer` method which will be called when attempting to execute a `transfer` or `transferFrom` method. The `verifyTransfer` method will determine whether that transaction can be completed or not. The implementation of `verifyTransfer` can take many forms, but the default approach is a whitelist controlled by the `GeneralTransferManager`.

### The ST-20 Interface

```
contract IST20 {

    // off-chain hash
    bytes32 public tokenDetails;

    //transfer, transferFrom must respect the result of verifyTransfer
    function verifyTransfer(address _from, address _to, uint256 _amount) view public returns (bool success);

    //used to create tokens
    function mint(address _investor, uint256 _amount) public returns (bool success);
}
```


# The Polymath Core Architecture
The diagram below depicts a high-level view of the various modules, registries, and contracts implemented in Polymath Core:

![Polymath Core architecture](https://github.com/PolymathNetwork/polymath-core/blob/master/docs/images/PolymathCore.png)

## Components
### SecurityToken
`SecurityToken` is an implementation of the ST-20 protocol that allows the addition of different modules to control its behavior. Different modules can be attached to `SecurityToken`:
- [TransferManager modules](contracts/modules/TransferManager): These control the logic behind transfers and how they are allowed or disallowed.
By default, the ST (Security Token) gets a `GeneralTransferManager` module attached in order to determine if transfers should be allowed based on a whitelist approach. The `GeneralTransferManager` behaves differently depending who is trying to transfer the tokens.
a) In an offering setting (investors buying tokens from the issuer) the investor's address should be present on an internal whitelist managed by the issuer within the `GeneralTransferManager`.
b) In a peer to peer transfer, restrictions apply based on real-life lockups that are enforced on-chain. For example, if a particular holder has a 1-year sale restriction for the token, the transaction will fail until that year passes.
- [Security Token Offering (STO) modules](contracts/modules/STO): A `SecurityToken` can be attached to one (and only one) STO module that will dictate the logic of how those tokens will be sold/distributed. An STO is the equivalent to the Crowdsale contracts often found present in traditional ICOs.
- [Permission Manager modules](contracts/modules/PermissionManager): These modules manage permissions on different aspects of the issuance process. The issuer can use this module to manage permissions and designate administrators on his token. For example, the issuer might give a KYC firm permissions to add investors to the whitelist.   
- [Checkpoint Modules](contracts/modules/Checkpoint): These modules allow the issuer to define checkpoints at which token balances and the total supply of a token can be consistently queried. This functionality is useful for dividend payment mechanisms and on-chain governance, both of which need to be able to determine token balances consistently as of a specified point in time.

### TickerRegistry
The ticker registry manages the sign up process to the Polymath platform. Issuers can use this contract to register a token symbol (which are unique within the Polymath network). Token Symbol registrations have an expiration period (7 days by default) in which the issuer has to complete the process of deploying their SecurityToken. If they do not complete the process in time, their ticker symbol will be made available for someone else to register.

### SecurityTokenRegistry
The security token registry keeps track of deployed STs on the Polymath Platform and uses the TickerRegistry to allow only registered symbols to be deployed.

### ModuleRegistry
Modules allow custom add-in functionality in the issuance process and beyond. The module registry keeps track of modules added by Polymath or any other users. Modules can only be attached to STs if Polymath has previously verified them. If not, the only user able to utilize a module is its owner, and they should be using it "at their own risk".


# Stepping through an issuance with the CLI Tool
First, assure that you have [setup Polymath Core properly](#setup).

The Polymath CLI (Command Line Interface) commands are operated from a *nix command prompt (unix or mac).

It can be used in three differents ways:

1. Connected to a full ethereum node:
You have to save your Parity account password to `$HOME/password.file` and run Parity with the following command to get started (make sure the node is fully synced before using the CLI tool):
```bash
parity --chain ropsten  --rpcapi "eth,net,web3,personal,parity" --unlock YOUR_ETH_ACCOUNT --password $HOME/password.file
```
2. Connected to a remote ethereum node:
You can access Ethereum via the Infura load-balanced nodes. You have to save your private key to `./privKey` file and run CLI command adding `--remote-node <network>` option.
```bash
node CLI/polymath-cli faucet --remote-node kovan
```
3. Connected to a local private test network using `ganache-cli`.
You have to save the private key for the one of the accounts generated by ganache into `./privKeyLocal`.


## Poly Faucet

If you are working on a local private network, you should run the faucet command to get Poly necessary to pay fees for the other commands.

```bash
node CLI/polymath-cli faucet
```

## Generating ST-20 token

The ST-20 Generator command is a wizard-like script that will guide technical users in the creation and deployment of an ST-20 token.

1. Edit `CLI/commands/helpers/contract_addresses.js` to make sure scripts are pointing to the correct contract addresses
2. On the terminal, run the following command: 
```bash
node CLI/polymath-cli st20generator
```
3. Follow the text prompts:
    * You will be asked for a token symbol. Enter a new symbol to register or a symbol you have already registered.
    * Enter a token name (long name seen by investors) to complete the token registration process. The token will be deployed to the blockchain.
    * (Optional) If you want to issue tokens to an address you own enter the address and then how many tokens you want to issue. If you want to issue tokens to a list of affiliates press `Y` and it will update a whitelist with them and then tokens will be issued.
    Make sure the `whitelist_data.csv` and `multi_mint_data.csv` files are present in the data folder and fulfilled with the right information.
    * Choose between Capped STO and USD Tiered STO.
    * Configure the selected STO. Enter start and end times, the issuance type, and exchange rate.
4. Once the process is finished, you can run the `node CLI/polymath-cli st20generator` command again and enter the token symbol to see the STO's live-progress.

## Whitelisting investors

After starting the STO you can run a command to mass-update a whitelist of allowed/known investors.
Make sure the `whitelist_data.csv` file is present in the data folder.
The command takes 2 parameters:
- The token symbol for the STO you want to invest in
- (Optional) The size of each batch 

```bash
node CLI/polymath-cli whitelist TOKEN_SYMBOL [BATCH_SIZE]
```

## Initial minting

Before starting the STO you can run a command to distribute tokens to previously whitelisted investors.
Make sure the `multi_mint_data` file is present in the data folder.
The command takes 2 parameters:
- The token symbol for the STO you want to invest in
- (Optional) The size of each batch 

```bash
node CLI/polymath-cli multi_mint TOKEN_SYMBOL [BATCH_SIZE]
```

## Investing in the STO

You can run the investor_portal command to participate in any STO you have been whitelisted for.
You will be asked for an account, the token symbol and amount for the STO you want to invest in.

```bash
node CLI/polymath-cli investor_portal
```

## Transferring tokens

You can run the transfer command to transfer ST tokens to another account (as long as both are whitelisted and have been cleared of any lockup periods).
- The token symbol of the ST you want to transfer
- The account that will receive the tokens
- How many tokens to send

```bash
node CLI/polymath-cli transfer TOKEN_SYMBOL ACCOUNT_TO AMOUNT
```

## Managing modules

You can run the module manager command to view all the modules attached to a token and their status.
You will be asked for a token symbol.

```bash
node CLI/polymath-cli module_manager
```

## Dividends manager

You can run this command to create dividends and paid them out proportionally to token holder balances as of the time that the dividend was created, or at the time of a specified checkpoint that was created previously. You can choose between Ether or ERC20 dividens.

```bash
node CLI/polymath-cli dividends_manager
```

# Setting up Polymath Core

### v2.0.0 KOVAN

    ----------------------- Polymath Network Smart Contracts: -----------------------
    PolymathRegistry:                     0xad09dc7939f09601674c69a07132bc642abeeb10
    SecurityTokenRegistry (Proxy):        0xef600e4904fe0a2f4587ae94bcbed4c9e9aeb37a
    ModuleRegistry (Proxy):               0xe8e30fd7d65a5e3b1134ce29d3afb49cc27b7086
    FeatureRegistry:                      0x35a8f211763be879541656d692f057d108eec9aa

    ETHOracle:                            0xCE5551FC9d43E9D2CC255139169FC889352405C8
    POLYOracle:                           0x461d98EF2A0c7Ac1416EF065840fF5d4C946206C

    STFactory:                            0x1f08b1473fbb5bfc2bbaea99520291b6120be529
    GeneralTransferManagerFactory:        0xc100ec8f8e397b426a52a5c7acc02892e1d92a53
    GeneralPermissionManagerFactory:      0x96d7d693edd4a2ae773e4dd9739d997f0c38738f

    CappedSTOFactory:                     0xfde869904bbc1e881601b2ebde4a77ba3808dfad
    USDTieredSTOFactory:                  0x01c17f387224148931ce03788e61836e7fe5d753
    USDTieredSTOProxyFactory:             0x63d0371a3dfa419a50670770b55618f6b5269057

    CountTransferManagerFactory:          0x6691d4e4f8e48c7a3df04c25088169cb101b2882
    PercentageTransferManagerFactory:     0x62dd693e8864874d3d806286983e9da41cd5a035
    ManualApprovalTransferManagerFactory: 0x20ba9fd6907ff42f033df5cfdbaced6426b5e682
    EtherDividendCheckpointFactory:       0xceba16202ce878d1c01a1f5bf3f219b58d712d5f
    ERC20DividendCheckpointFactory:       0x5c0051ffdc9655ae7b87a8a79542178be2e973e4
    ---------------------------------------------------------------------------------
    


## Mainnet

### v1.3.0 (TORO Release)

| Contract                                                         | Address                                                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SecurityTokenRegistry (Proxy):                                | [0x240f9f86b1465bf1b8eb29bc88cbf65573dfdd97](https://etherscan.io/address/0x240f9f86b1465bf1b8eb29bc88cbf65573dfdd97)                                              |
| ModuleRegistry (Proxy):                                       | [0x4566d68ea96fc2213f2446f0dd0f482146cee96d](https://etherscan.io/address/0x4566d68ea96fc2213f2446f0dd0f482146cee96d)                                              |
| Polymath Registry:                                            | [0xdfabf3e4793cd30affb47ab6fa4cf4eef26bbc27](https://etherscan.io/address/0xdfabf3e4793cd30affb47ab6fa4cf4eef26bbc27)                                              |
| Feature Registry:                                            | [0xa3eacb03622bf1513880892b7270d965f693ffb5](https://etherscan.io/address/0xa3eacb03622bf1513880892b7270d965f693ffb5)                                              |
| ETHOracle:                                                   | [0x60055e9a93aae267da5a052e95846fa9469c0e7a](https://etherscan.io/address/0x60055e9a93aae267da5a052e95846fa9469c0e7a)                                              |
| POLYOracle:                                                   | [0x52cb4616E191Ff664B0bff247469ce7b74579D1B](https://etherscan.io/address/0x52cb4616E191Ff664B0bff247469ce7b74579D1B)                                              |
| General Transfer Manager Factory:                              | [0xdc95598ef2bbfdb66d02d5f3eea98ea39fbc8b26](https://etherscan.io/address/0xdc95598ef2bbfdb66d02d5f3eea98ea39fbc8b26)                                              |
| General Permission Manager Factory:                             | [0xf0aa1856360277c60052d6095c5b787b01388cdd](https://etherscan.io/address/0xf0aa1856360277c60052d6095c5b787b01388cdd)                                              |
| CappedSTOFactory:                                               | [0x77d89663e8819023a87bfe2bc9baaa6922c0e57c](https://etherscan.io/address/0x77d89663e8819023a87bfe2bc9baaa6922c0e57c)                                              |
| USDTieredSTO Factory:                                           | [0x5a3a30bddae1f857a19b1aed93b5cdb3c3da809a](https://etherscan.io/address/0x5a3a30bddae1f857a19b1aed93b5cdb3c3da809a)                                              |
| EthDividendsCheckpointFactory:                                  | [0x968c74c52f15b2de323eca8c677f6c9266bfefd6](https://etherscan.io/address/0x968c74c52f15b2de323eca8c677f6c9266bfefd6)                                              |
| ERC20 Dividends Checkpoint Factory:                             | [0x82f9f1ab41bacb1433c79492e54bf13bccd7f9ae](https://etherscan.io/address/0x82f9f1ab41bacb1433c79492e54bf13bccd7f9ae)                                              |
| Count Transfer Manager Factory:                               | [0xd9fd7e34d6e2c47a69e02131cf8554d52c3445d5](https://etherscan.io/address/0xd9fd7e34d6e2c47a69e02131cf8554d52c3445d5)                                              |
| Percentage Transfer Manager Factory:                             | [0xe6267a9c0a227d21c95b782b1bd32bb41fc3b43b](https://etherscan.io/address/0xe6267a9c0a227d21c95b782b1bd32bb41fc3b43b)                                              |
| Manual Approval Transfer Manager Factory (2.0.1):                        | [0x6af2afad53cb334e62b90ddbdcf3a086f654c298](https://etherscan.io/address/0x6af2afad53cb334e62b90ddbdcf3a086f654c298)                                              |


New SecurityTokenRegistry (2.0.1): 0x538136ed73011a766bf0a126a27300c3a7a2e6a6
(fixed bug with getTickersByOwner())

New ModuleRegistry (2.0.1): 0xbc18f144ccf87f2d98e6fa0661799fcdc3170119
(fixed bug with missing transferOwnership function)

New ManualApprovalTransferManager 0x6af2afad53cb334e62b90ddbdcf3a086f654c298
(Fixed 0x0 from bug)

## KOVAN

### v1.3.0 (TORO Release)

| Contract                                                         | Address                                                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SecurityTokenRegistry (Proxy):                                | [0xbefb81114d532bddddc724af20c3516fa75f0afb](https://kovan.etherscan.io/address/0xbefb81114d532bddddc724af20c3516fa75f0afb)                                              |
| ModuleRegistry (Proxy):                                       | [0x0fac8d8cce224eead73c1187df96570aa80a568b](https://kovan.etherscan.io/address/0x0fac8d8cce224eead73c1187df96570aa80a568b)                                              |
| Polymath Registry:                                            | [0x9903e7b5acfe5fa9713771a8d861eb1df8cd7046](https://kovan.etherscan.io/address/0x9903e7b5acfe5fa9713771a8d861eb1df8cd7046)                                              |
| Feature Registry:                                            | [0xa8f85006fdacb3d59ffae564c05433f0c949e911](https://kovan.etherscan.io/address/0xa8f85006fdacb3d59ffae564c05433f0c949e911)                                              |
| ETHOracle:                                                   | [0xCE5551FC9d43E9D2CC255139169FC889352405C8](https://kovan.etherscan.io/address/0xCE5551FC9d43E9D2CC255139169FC889352405C8)                                              |
| POLYOracle:                                                   | [0x461d98EF2A0c7Ac1416EF065840fF5d4C946206C](https://kovan.etherscan.io/address/0x461d98EF2A0c7Ac1416EF065840fF5d4C946206C)                                              |
| General Transfer Manager Factory:                              | [0xfe7e2bb6c200d5222c82d0f8fecca5f8fe4ab8ce](https://kovan.etherscan.io/address/0xfe7e2bb6c200d5222c82d0f8fecca5f8fe4ab8ce)                                              |
| General Permission Manager Factory:                             | [0xde5eaa8d73f43fc5e7badb203f03ecae2b29bd92](https://kovan.etherscan.io/address/0xde5eaa8d73f43fc5e7badb203f03ecae2b29bd92)                                              |
| CappedSTOFactory:                                               | [0xe14d7dd044cc6cfe37548b6791416c59f19bfc0d](https://kovan.etherscan.io/address/0xe14d7dd044cc6cfe37548b6791416c59f19bfc0d)                                              |
| USDTieredSTO Factory:                                           | [0xf9f0bb9f868d411dd9a9511a79d172449e3c15f5](https://kovan.etherscan.io/address/0xf9f0bb9f868d411dd9a9511a79d172449e3c15f5)                                              |
| EthDividendsCheckpointFactory:                                  | [0x2861425ba5abbf50089c473b28f6c40a8ea5262a](https://kovan.etherscan.io/address/0x2861425ba5abbf50089c473b28f6c40a8ea5262a)                                              |
| ERC20 Dividends Checkpoint Factory:                             | [0xbf9495550417feaacc43f86d2244581b6d688431](https://kovan.etherscan.io/address/0xbf9495550417feaacc43f86d2244581b6d688431)                                              |
| Count Transfer Manager Factory:                               | [0x3c3c1f40ae2bdca82b90541b2cfbd41caa941c0e](https://kovan.etherscan.io/address/0x3c3c1f40ae2bdca82b90541b2cfbd41caa941c0e)                                              |
| Percentage Transfer Manager Factory:                             | [0x8cd00c3914b2967a8b79815037f51c76874236b8](https://kovan.etherscan.io/address/0x8cd00c3914b2967a8b79815037f51c76874236b8)                                              |
| Manual Approval Transfer Manager Factory:                        | [0x9faa79e2ccf0eb49aa6ebde1795ad2e951ce78f8](https://kovan.etherscan.io/address/0x9faa79e2ccf0eb49aa6ebde1795ad2e951ce78f8)                                              |


New ManualApprovalTransferManager 0x9faa79e2ccf0eb49aa6ebde1795ad2e951ce78f8
(Fixed 0x0 from bug)


## Package version requirements for your machine:

- node v8.x.x or v9.x.x
- npm v6.x.x or newer
- Yarn v1.3 or newer
- Homebrew v1.6.7 (for macOS)
- Truffle v4.1.11 (core: 4.1.11)
- Solidity v0.4.24 (solc-js)
- Ganache CLI v6.1.3 (ganache-core: 2.1.2) or newer

## Setup

The smart contracts are written in [Solidity](https://github.com/ethereum/solidity) and tested/deployed using [Truffle](https://github.com/trufflesuite/truffle) version 4.1.0. The new version of Truffle doesn't require testrpc to be installed separately so you can just run the following:

```bash
# Install Truffle package globally:
$ npm install --global truffle

# (Only for windows) set up build tools for node-gyp by running below command in powershell:
$ npm install --global --production windows-build-tools

# Install local node dependencies:
$ yarn
```

## Testing

To test the code simply run:

```bash
# on *nix systems
$ npm run test

# on windows systems
$ npm run wintest
```


# Extending Polymath Core

1. Deploy `ModuleRegistry`. `ModuleRegistry` keeps track of all available modules that add new functionalities to
Polymath-based security tokens.

2. Deploy `GeneralTransferManagerFactory`. This module allows the use of a general `TransferManager` for newly issued security tokens. The General Transfer Manager gives STs the ability to have their transfers restricted by using an on-chain whitelist.

3. Add the `GeneralTransferManagerFactory` module to `ModuleRegistry` by calling `ModuleRegistry.registerModule()`.

4. Deploy `TickerRegistry`. This contract handles the registration of unique token symbols. Issuers first have to claim their token symbol through the `TickerRegistry`. If it's available they will be able to deploy a ST with the same symbol for a set number of days before the registration expires.

5. Deploy SecurityTokenRegistry. This contract is responsible for deploying new Security Tokens. STs should always be deployed by using the SecurityTokenRegistry.

## Deploying Security Token Offerings (Network Admin Only)

Security Token Offerings (STOs) grant STs the ability to be distributed in an initial offering. Polymath offers a few out-of-the-box STO models for issuers to select from and, as the platform evolves, 3rd party developers will be able to create their own offerings and make them available to the network.

As an example, we've included a `CappedSTO` and `CappedSTOFactory` contracts.

In order to create a new STO, developers first have to create an STO Factory contract which will be responsible for instantiating STOs as Issuers select them. Each STO Factory has an STO contract attached to it, which will be instantiated for each Security Token that wants to use that particular STO.

To make an STO available for Issuers, first, deploy the STO Factory and take note of its address. Then, call `moduleRegistry.registerModule(STO Factory address);`

Once the STO Factory has been registered to the Module Registry, issuers will be able to see it on the Polymath dApp and they will be able to add it as a module of the ST.

Note that while anyone can register an STO Factory, only those "approved" by Polymath will be enabled to be attached by the general community. An STO Factory not yet approved by Polymath may only be used by it's author.


# Code Styleguide

The polymath-core repo follows the [Solidity style guide](http://solidity.readthedocs.io/en/develop/style-guide.html).

# Links    

- [Polymath Website](https://polymath.network)
- [Ethereum Project](https://www.ethereum.org/)
- [Solidity Docs](https://solidity.readthedocs.io/en/develop/)
- [Truffle Framework](http://truffleframework.com/)
- [Ganache CLI / TestRPC](https://github.com/trufflesuite/ganache-cli)
