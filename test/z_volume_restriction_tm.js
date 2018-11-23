import latestTime from './helpers/latestTime';
import {signData} from './helpers/signData';
import { pk }  from './helpers/testprivateKey';
import { duration, promisifyLogWatch, latestBlock } from './helpers/utils';
import { takeSnapshot, increaseTime, revertToSnapshot } from './helpers/time';
import { catchRevert } from "./helpers/exceptions";
import { setUpPolymathNetwork, deployVRTMAndVerifyed } from "./helpers/createInstances";

const SecurityToken = artifacts.require('./SecurityToken.sol');
const GeneralTransferManager = artifacts.require('./GeneralTransferManager.sol');
const VolumeRestrictionTM = artifacts.require('./VolumeRestrictionTM.sol');

const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545")) // Hardcoded development port

contract('VolumeRestrictionTransferManager', accounts => {

    // Accounts Variable declaration
    let account_polymath;
    let account_issuer;
    let token_owner;
    let token_owner_pk;
    let account_investor1;
    let account_investor2;
    let account_investor3;
    let account_investor4;
    let account_delegate;
    let account_delegate2;
    let account_delegate3;
    // investor Details
    let fromTime = latestTime();
    let toTime = latestTime();
    let expiryTime = toTime + duration.days(15);

    let message = "Transaction Should Fail!";

    // Contract Instance Declaration
    let I_VolumeRestrictionTMFactory;
    let P_VolumeRestrictionTMFactory;
    let I_SecurityTokenRegistryProxy;
    let P_VolumeRestrictionTM;
    let I_GeneralTransferManagerFactory;
    let I_VolumeRestrictionTM;
    let I_GeneralTransferManager;
    let I_ModuleRegistryProxy;
    let I_ModuleRegistry;
    let I_FeatureRegistry;
    let I_SecurityTokenRegistry;
    let I_DummySTOFactory;
    let I_STFactory;
    let I_SecurityToken;
    let I_MRProxied;
    let I_STRProxied;
    let I_PolyToken;
    let I_PolymathRegistry;

    // SecurityToken Details
    const name = "Team";
    const symbol = "sap";
    const tokenDetails = "This is equity type of issuance";
    const decimals = 18;
    const contact = "team@polymath.network";
    const delegateDetails = "Hello I am legit delegate";

    // Module key
    const delegateManagerKey = 1;
    const transferManagerKey = 2;
    const stoKey = 3;

    let tempAmount = new BigNumber(0);

    // Initial fee for ticker registry and security token registry
    const initRegFee = web3.utils.toWei("250");

    before(async() => {
        // Accounts setup
        account_polymath = accounts[0];
        account_issuer = accounts[1];

        token_owner = account_issuer;
        token_owner_pk = pk.account_1;

        account_investor1 = accounts[8];
        account_investor2 = accounts[9];
        account_investor3 = accounts[4];
        account_delegate = accounts[7];
        account_delegate2 = accounts[6];
        account_delegate3 = accounts[5];

        // Step 1: Deploy the genral PM ecosystem
        let instances = await setUpPolymathNetwork(account_polymath, token_owner);

        [
            I_PolymathRegistry,
            I_PolyToken,
            I_FeatureRegistry,
            I_ModuleRegistry,
            I_ModuleRegistryProxy,
            I_MRProxied,
            I_GeneralTransferManagerFactory,
            I_STFactory,
            I_SecurityTokenRegistry,
            I_SecurityTokenRegistryProxy,
            I_STRProxied
        ] = instances;

        // STEP 5: Deploy the VolumeRestrictionTMFactory
        [I_VolumeRestrictionTMFactory] = await deployVRTMAndVerifyed(account_polymath, I_MRProxied, I_PolyToken.address, 0);
        // STEP 6: Deploy the VolumeRestrictionTMFactory
        [P_VolumeRestrictionTMFactory] = await deployVRTMAndVerifyed(account_polymath, I_MRProxied, I_PolyToken.address, web3.utils.toWei("500"));

        // Printing all the contract addresses
        console.log(`
        --------------------- Polymath Network Smart Contracts: ---------------------
        PolymathRegistry:                  ${I_PolymathRegistry.address}
        SecurityTokenRegistryProxy:        ${I_SecurityTokenRegistryProxy.address}
        SecurityTokenRegistry:             ${I_SecurityTokenRegistry.address}
        ModuleRegistryProxy                ${I_ModuleRegistryProxy.address}
        ModuleRegistry:                    ${I_ModuleRegistry.address}
        FeatureRegistry:                   ${I_FeatureRegistry.address}

        STFactory:                         ${I_STFactory.address}
        GeneralTransferManagerFactory:     ${I_GeneralTransferManagerFactory.address}
        VolumeRestrictionTMFactory:        ${I_VolumeRestrictionTMFactory.address}
        -----------------------------------------------------------------------------
        `);
    });

    describe("Generate the SecurityToken", async () => {
        it("Should register the ticker before the generation of the security token", async () => {
            await I_PolyToken.approve(I_STRProxied.address, initRegFee, { from: token_owner });
            let tx = await I_STRProxied.registerTicker(token_owner, symbol, contact, { from: token_owner });
            assert.equal(tx.logs[0].args._owner, token_owner);
            assert.equal(tx.logs[0].args._ticker, symbol.toUpperCase());
        });

        it("Should generate the new security token with the same symbol as registered above", async () => {
            await I_PolyToken.approve(I_STRProxied.address, initRegFee, { from: token_owner });
            let _blockNo = latestBlock();
            let tx = await I_STRProxied.generateSecurityToken(name, symbol, tokenDetails, true, { from: token_owner });

            // Verify the successful generation of the security token
            assert.equal(tx.logs[1].args._ticker, symbol.toUpperCase(), "SecurityToken doesn't get deployed");

            I_SecurityToken = SecurityToken.at(tx.logs[1].args._securityTokenAddress);

            const log = await promisifyLogWatch(I_SecurityToken.ModuleAdded({ from: _blockNo }), 1);

            // Verify that GeneralTransferManager module get added successfully or not
            assert.equal(log.args._types[0].toNumber(), 2);
            assert.equal(web3.utils.toAscii(log.args._name).replace(/\u0000/g, ""), "GeneralTransferManager");
        });

        it("Should intialize the auto attached modules", async () => {
            let moduleData = (await I_SecurityToken.getModulesByType(2))[0];
            I_GeneralTransferManager = GeneralTransferManager.at(moduleData);
        });
    });

    describe("Attach the VRTM", async() => {
        it("Deploy the VRTM and attach with the ST", async()=> {
            let tx = await I_SecurityToken.addModule(I_VolumeRestrictionTMFactory.address, 0, 0, 0, {from: token_owner });
            assert.equal(tx.logs[2].args._moduleFactory, I_VolumeRestrictionTMFactory.address);
            assert.equal(
                web3.utils.toUtf8(tx.logs[2].args._name),
                "VolumeRestrictionTM",
                "VolumeRestrictionTMFactory doesn not added");
            I_VolumeRestrictionTM = VolumeRestrictionTM.at(tx.logs[2].args._module);
        });

        it("Transfer some tokens to different account", async() => {
            // Add tokens in to the whitelist
            await I_GeneralTransferManager.modifyWhitelistMulti(
                    [account_investor1, account_investor2, account_investor3],
                    [latestTime(), latestTime(), latestTime()],
                    [latestTime(), latestTime(), latestTime()],
                    [latestTime() + duration.days(30), latestTime() + duration.days(30), latestTime() + duration.days(30)],
                    [true, true, true],
                    {
                        from: token_owner
                    }
            );

            // Mint some tokens and transferred to whitelisted addresses
            await I_SecurityToken.mint(account_investor1, web3.utils.toWei("40", "ether"), {from: token_owner});
            await I_SecurityToken.mint(account_investor2, web3.utils.toWei("30", "ether"), {from: token_owner});
            
            // Check the balance of the investors 
            let bal1 = await I_SecurityToken.balanceOf.call(account_investor1);
            let bal2 = await I_SecurityToken.balanceOf.call(account_investor2);
            // Verifying the balances
            assert.equal(web3.utils.fromWei((bal1.toNumber()).toString()), 40);
            assert.equal(web3.utils.fromWei((bal2.toNumber()).toString()), 30);

        });

        it("Should transfer the tokens freely without any restriction", async() => {
            await I_SecurityToken.transfer(account_investor3, web3.utils.toWei('5', 'ether'), { from: account_investor1 });
            let bal1 = await I_SecurityToken.balanceOf.call(account_investor3);
             // Verifying the balances
            assert.equal(web3.utils.fromWei((bal1.toNumber()).toString()), 5);
        });
    })

    describe("Test for the addIndividualRestriction", async() => {

        it("Should add the restriction succesfully", async() => {
            let tx = await I_VolumeRestrictionTM.addIndividualRestriction(
                    account_investor1,
                    web3.utils.toWei("12"),
                    0,
                    latestTime() + duration.seconds(2),
                    3,
                    latestTime() + duration.days(10),
                    0,
                    {
                        from: token_owner
                    }
                );
            
            assert.equal(tx.logs[0].args._holder, account_investor1);
            assert.equal(tx.logs[0].args._typeOfRestriction, 0);
        });

        it("Should not successfully transact the tokens -- failed because volume is above the limit", async() => {
            await increaseTime(duration.seconds(10));
            await catchRevert(
                I_SecurityToken.transfer(account_investor3, web3.utils.toWei("13"), { from: account_investor1})
            );
        });

        it("Should succesfully transact the tokens just after the starttime", async() => {
            // Check the transfer will be valid or not by calling the verifyTransfer() directly by using _isTransfer = false
            let result = await I_VolumeRestrictionTM.verifyTransfer.call(account_investor1, account_investor3, web3.utils.toWei('.3'), "0x0", false);
            console.log(result);
            assert.equal(result.toNumber(), 1);
            // Perform the transaction
            await I_SecurityToken.transfer(account_investor3, web3.utils.toWei('.3'), {from: account_investor1});
            // Check the balance of the investors 
            let bal1 = await I_SecurityToken.balanceOf.call(account_investor1);
            // Verifying the balances
            assert.equal(web3.utils.fromWei((bal1.toNumber()).toString()), 34.7);

            let data = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            console.log('\n');
            for (let i = 0; i < data[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${data[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, data[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
            }
            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((data[1].toNumber()).toString())}
                Last Timestamp Index : ${data[0].length -1}
            `);
        })

        it("Should successfully transact the tokens after 1 and half days", async() => {
            await increaseTime(duration.days(1.5));
            await I_SecurityToken.transfer(account_investor3, web3.utils.toWei("1"), {from: account_investor1});
            // Check the balance of the investors 
            let bal1 = await I_SecurityToken.balanceOf.call(account_investor1);
            // Verifying the balances
            assert.equal(web3.utils.fromWei((bal1.toNumber()).toString()), 33.7);

            let data = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            for (let i = 0; i < data[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${data[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, data[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
            }
            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((data[1].toNumber()).toString())}
                Last Timestamp Index : ${data[0].length -1}
            `);
        });

        it("Should successfully transact more tokens on the same day (Fuzz test)", async() => {
            // Check the balance of the investors 
            let balBefore = await I_SecurityToken.balanceOf.call(account_investor1);
            let totalAmountTransacted = 0;
            for (let i = 0; i < 10; i++) {
                let amount = Math.random();
                await I_SecurityToken.transfer(account_investor3, web3.utils.toWei(amount.toString()), {from: account_investor1});
                console.log(`${i}: Restricted investor 1 able to transact ${amount} tokens to investor 3`); 
                totalAmountTransacted += amount;
            } 
            
            // Check the balance of the investors 
            let balAfter = await I_SecurityToken.balanceOf.call(account_investor1);
            // Verifying the balances
            assert.closeTo((balBefore.minus(balAfter).dividedBy(new BigNumber(10).pow(18))).toNumber(), totalAmountTransacted, 0.01);

            let data = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            for (let i = 0; i < data[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${data[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, data[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
            }
            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((data[1].toNumber()).toString())}
                Last Timestamp Index : ${data[0].length - 1}
            `);
        });

        it("Should successfully transfer the tokens after half days-- should increase the day covered by 1", async() => {
            await increaseTime(duration.days(.5));
            await I_SecurityToken.transfer(account_investor3, web3.utils.toWei("2"), {from: account_investor1});
            let data = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            for (let i = 0; i < data[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${data[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, data[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
            }
            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((data[1].toNumber()).toString())}
                Last Timestamp Index : ${data[0].length - 1}
            `);
            assert.equal(data[0].length - 1, 2);
        });

        it("Should successfully transfer the tokens in the last day of rolling period", async() => {
            // Check the balance of the investors 
            let balBefore = await I_SecurityToken.balanceOf.call(account_investor1);
            let totalAmountTransacted = 0;
            for (let i = 0; i < 3; i++) {
                let amount = Math.random();
                await I_SecurityToken.transfer(account_investor3, web3.utils.toWei(amount.toString()), {from: account_investor1});
                console.log(`${i}: Restricted investor 1 able to transact ${amount} tokens to investor 3`); 
                totalAmountTransacted += amount;
            }          
            // Check the balance of the investors 
            let balAfter = await I_SecurityToken.balanceOf.call(account_investor1);
            // Verifying the balances
            assert.closeTo((balBefore.minus(balAfter).dividedBy(new BigNumber(10).pow(18))).toNumber(), totalAmountTransacted, 0.01);

            let data = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            for (let i = 0; i < data[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${data[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, data[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
            }
            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((data[1].toNumber()).toString())}
                Last Timestamp Index : ${data[0].length - 1}
            `);
        });

        it("Should fail to transact the tokens more than the allowed tokens in a rolling period", async() => {
            let data = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            let minimumAmount = new BigNumber(12).times(new BigNumber(10).pow(18)).minus(data[1]);
            let testAmount = minimumAmount.plus(new BigNumber(1).times(new BigNumber(10).pow(18)))
            await catchRevert( 
                I_SecurityToken.transfer(account_investor3, testAmount, {from: account_investor1})
            );
        });

        it("Should fail to buy tokens in the new rolling period --failed because amount is more than last two timestamps", async() => {
            await increaseTime(duration.days(2));
            await catchRevert(
                I_SecurityToken.transfer(account_investor3, web3.utils.toWei("10"), {from: account_investor1})
            );
        });

        it("Should transfer the tokens in a new rolling period", async() => {
            let oldData = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            let firstDayAmount;
            tempAmount = new BigNumber(0);
            for (let i = 0; i < oldData[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${oldData[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, oldData[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
                if (i != 2) {
                    firstDayAmount = await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, oldData[0][0]);
                    tempAmount = tempAmount.plus(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, oldData[0][i]));
                }
            }

            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((oldData[1].toNumber()).toString())}
                Last Timestamp Index : ${oldData[0].length -1}
            `);

            let currentDayAmount = firstDayAmount.plus(new BigNumber(1).times(new BigNumber(10).pow(18)));
            let tx = await I_SecurityToken.transfer(account_investor3, currentDayAmount, {from: account_investor1});
            tempAmount = tempAmount.minus(currentDayAmount);
            
            console.log('\n');
            let newData = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            for (let i = 2; i < newData[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${newData[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, newData[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
            }
            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((newData[1].toNumber()).toString())}
                Last Timestamp Index : ${newData[0].length -1}
            `);
            assert.notEqual(oldData[0][0].toNumber(), newData[0][3].toNumber());
            assert.notEqual(oldData[0][1].toNumber(), newData[0][4].toNumber());
        });

        it("Should transfer the more tokens on the same day", async() => {
            // Check the balance of the investors 
            let balBefore = await I_SecurityToken.balanceOf.call(account_investor1);
            console.log(tempAmount.dividedBy(new BigNumber(10).pow(18)).toNumber());
            await I_SecurityToken.transfer(account_investor3, tempAmount, {from: account_investor1});

            // Check the balance of the investors 
            let balAfter = await I_SecurityToken.balanceOf.call(account_investor1);
            // Verifying the balances
            assert.closeTo(
                (balBefore.minus(balAfter).dividedBy(new BigNumber(10).pow(18))).toNumber(),
                tempAmount.dividedBy(new BigNumber(10).pow(18)).toNumber(),
                0.01
            );

            let data = await I_VolumeRestrictionTM.getBucketDetailsToUser.call(account_investor1);
            for (let i = 2; i < data[0].length; i++) {
                console.log(`
                    Timestamps array index ${i}: ${data[0][i].toNumber()}
                    Total Trade till now: ${(await I_VolumeRestrictionTM.getTotalTradeByuser.call(account_investor1, data[0][i]))
                        .dividedBy(new BigNumber(10).pow(18))}
                `);
            }
            console.log(`
                SumOfLastPeriod : ${web3.utils.fromWei((data[1].toNumber()).toString())}
                Last Timestamp Index : ${data[0].length -1}
            `);
        });

        
    });
});