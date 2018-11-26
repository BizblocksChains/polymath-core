#!/usr/bin/env node

var faucet = require('./commands/faucet');
var investor_portal = require('./commands/investor_portal');
var module_manager = require('./commands/module_manager');
var st20generator = require('./commands/ST20Generator');
var transfer = require('./commands/transfer');
var whitelist = require('./commands/whitelist');
var multimint = require('./commands/multi_mint');
var accredit = require('./commands/accredit');
var changeNonAccreditedLimit = require('./commands/changeNonAccreditedLimit');
var transfer_ownership = require('./commands/transfer_ownership');
var dividends_manager = require('./commands/dividends_manager');
var transfer_manager = require('./commands/transfer_manager');
var contract_manager = require('./commands/contract_manager');
var strMigrator = require('./commands/strMigrator');
var permission_manager = require('./commands/permission_manager');
var program = require('commander');
var gbl = require('./commands/common/global');
const yaml = require('js-yaml');
const fs = require('fs');

program
  .version('0.0.1')
  .description('CLI for Polymath-core')
  .option('-r, --remote-node <network>', 'Connect to a remote node');

program
  .command('st20generator')
  .alias('st')
  .option('-c, --config <file>', "Uses configuration file to configure ST and STO")
  .description('Wizard-like script that will guide technical users in the creation and deployment of an ST-20 token')
  .action(async function(cmd) {
    let tokenConfig;
    let mintingConfig;
    let stoCofig;
    if (cmd.config) {
      let config = yaml.safeLoad(fs.readFileSync(`${__dirname}/data/${cmd.config}`, 'utf8'));
      tokenConfig = config.securityToken;
      mintingConfig = config.initialMint;
      stoCofig = config.sto;
    }
    await gbl.initialize(program.remoteNode);
    await st20generator.executeApp(tokenConfig, mintingConfig, stoCofig);
  });

program
  .command('faucet [beneficiary] [amount]')
  .alias('f')
  .description('Poly faucet for local private netwtorks')
  .action(async function(beneficiary, amount) {
    await gbl.initialize(program.remoteNode);
    await faucet.executeApp(beneficiary, amount);
  });

program
  .command('investor_portal [investor] [privateKey] [symbol] [currency] [amount]')
  .alias('i')
  .description('Participate in any STO you have been whitelisted for')
  .action(async function(investor, privateKey, symbol, currency, amount) {
    await gbl.initialize(program.remoteNode);
    await investor_portal.executeApp(investor, privateKey, symbol, currency, amount);
  });

program
  .command('module_manager')
  .alias('mm')
  .description('View modules attached to a token and their status')
  .action(async function() {
    await gbl.initialize(program.remoteNode);
    await module_manager.executeApp();
  });

program
  .command('multi_mint <tokenSymbol> [batchSize]')
  .alias('mi')
  .description('Distribute tokens to previously whitelisted investors')
  .action(async function(tokenSymbol, batchSize) {
    await gbl.initialize(program.remoteNode);
    await multimint.executeApp(tokenSymbol, batchSize);
  });

program
  .command('transfer <tokenSymbol> <transferTo> <transferAmount>')
  .alias('t')
  .description('Transfer ST tokens to another account')
  .action(async function(tokenSymbol, transferTo, transferAmount) {
    await gbl.initialize(program.remoteNode);
    await transfer.executeApp(tokenSymbol, transferTo, transferAmount);
  });

program
  .command('transfer_ownership <contractAddress> <transferTo>')
  .alias('to')
  .description('Transfer Ownership of an own contract to another account')
  .action(async function(contractAddress, transferTo) {
    await gbl.initialize(program.remoteNode);
    await transfer_ownership.executeApp(contractAddress, transferTo);
  });

program
  .command('whitelist <tokenSymbol> [batchSize]')
  .alias('w')
  .description('Mass-update a whitelist of allowed/known investors')
  .action(async function(tokenSymbol, batchSize) {
    await gbl.initialize(program.remoteNode);
    await whitelist.executeApp(tokenSymbol, batchSize);
  });

program
  .command('dividends_manager [dividendsType]')
  .alias('dm')
  .description('Runs dividends_manager')
  .action(async function(dividendsType) {
    await gbl.initialize(program.remoteNode);
    await dividends_manager.executeApp(dividendsType);
  });

program
  .command('transfer_manager')
  .alias('tm')
  .description('Runs transfer_manager')
  .action(async function() {
    await gbl.initialize(program.remoteNode);
    await transfer_manager.executeApp();
  });

program
  .command('contract_manager')
  .alias('cm')
  .description('Runs contract_manager')
  .action(async function() {
    await gbl.initialize(program.remoteNode);
    await contract_manager.executeApp();
  });

program
  .command('accredit <tokenSymbol> [batchSize]')
  .alias('a')
  .description('Runs accredit')
  .action(async function(tokenSymbol, batchSize) {
    await gbl.initialize(program.remoteNode);
    await accredit.executeApp(tokenSymbol, batchSize);
  });

program
  .command('nonAccreditedLimit <tokenSymbol> [batchSize]')
  .alias('nal')
  .description('Runs changeNonAccreditedLimit')
  .action(async function(tokenSymbol, batchSize) {
    await gbl.initialize(program.remoteNode);
    await changeNonAccreditedLimit.executeApp(tokenSymbol, batchSize);
  });

program
  .command('strMigrator [toStrAddress] [fromTrAddress] [fromStrAddress]')
  .alias('str')
  .description('Runs STR Migrator')
  .action(async function(toStrAddress, fromTrAddress, fromStrAddress) {
    await gbl.initialize(program.remoteNode);
    await strMigrator.executeApp(toStrAddress, fromTrAddress, fromStrAddress);
  });

program
  .command('permission_manager')
  .alias('pm')
  .description('Runs permission_manager')
  .action(async function() {
    await gbl.initialize(program.remoteNode);
    await permission_manager.executeApp();
  });

program.parse(process.argv);

if (typeof program.commands.length == 0) {
  console.error('No command given!');
  process.exit(1);
}