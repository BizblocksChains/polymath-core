pragma solidity ^0.4.24;

import "../modules/STO/DummySTOFactory.sol";

/**
 * @title Mock Contract Not fit for production environment
 */

contract MockFactory is DummySTOFactory {

    bool public switchTypes = false;

    /**
     * @notice Constructor
     * @param _setupCost Setup cost of the module
     * @param _usageCost Usage cost of the module
     * @param _subscriptionCost Subscription cost of the module
     */
    constructor (uint256 _setupCost, uint256 _usageCost, uint256 _subscriptionCost) public
      DummySTOFactory(_setupCost, _usageCost, _subscriptionCost)
    {

    }

    /**
     * @notice Type of the Module factory
     */
    function getTypes() external view returns(uint8[]) {
        if (!switchTypes) {
            uint8[] memory types = new uint8[](0);
            return types;
        } else {
            uint8[] memory res = new uint8[](2);
            res[0] = 1;
            res[1] = 1;
            return res;
        }
        
    }

    function changeTypes() external onlyOwner {
        switchTypes = !switchTypes;
    }

}
