pragma solidity ^0.4.24;

import "./MockRedemptionManager.sol";
import "../modules/Experimental/Burn/TrackedRedemptionFactory.sol";

/**
 * @title Mock Contract Not fit for production environment
 */

contract MockBurnFactory is TrackedRedemptionFactory {

    /**
    * @notice Constructor
    * @param _setupCost Setup cost of the module
    * @param _usageCost Usage cost of the module
    * @param _subscriptionCost Subscription cost of the module
    */
    constructor (uint256 _setupCost, uint256 _usageCost, uint256 _subscriptionCost) public
      TrackedRedemptionFactory(_setupCost, _usageCost, _subscriptionCost)
    {
    }

    /**
     * @notice Used to launch the Module with the help of factory
     * @return Address Contract address of the Module
     */
    function deploy(bytes /*_data*/) external returns(address) {
        _takeFee();
        //Check valid bytes - can only call module init function
        MockRedemptionManager mockRedemptionManager = new MockRedemptionManager(msg.sender);
        /*solium-disable-next-line security/no-block-members*/
        emit GenerateModuleFromFactory(address(mockRedemptionManager), getName(), address(this), msg.sender, setupCost, now);
        return address(mockRedemptionManager);
    }

}
