pragma solidity ^0.4.24;

import "../ModuleFactory.sol";
import "../../libraries/Util.sol";
import "../../proxy/PreSaleSTOProxy.sol";
import "../../interfaces/IBoot.sol";

/**
 * @title Factory for deploying PreSaleSTO module
 */
contract PreSaleSTOFactory is ModuleFactory {

    address public logicContract;

    /**
     * @notice Constructor
     * @param _setupCost Setup cost of the module
     * @param _usageCost Usage cost of the module
     * @param _subscriptionCost Subscription cost of the module
     * @param _logicContract Contract address that contains the logic related to `description`
     */
    constructor (uint256 _setupCost, uint256 _usageCost, uint256 _subscriptionCost, address _logicContract) public
    ModuleFactory(_setupCost, _usageCost, _subscriptionCost)
    {
        require(_logicContract != address(0), "Invalid address");
        version = "1.0.0";
        name = "PreSaleSTO";
        title = "PreSale STO";
        description = "Allows Issuer to configure pre-sale token allocations";
        compatibleSTVersionRange["lowerBound"] = VersionUtils.pack(uint8(0), uint8(0), uint8(0));
        compatibleSTVersionRange["upperBound"] = VersionUtils.pack(uint8(0), uint8(0), uint8(0));
        logicContract = _logicContract;
    }

    /**
     * @notice Used to launch the Module with the help of factory
     * @param _data Data used for the intialization of the module factory variables
     * @return address Contract address of the Module
     */
    function deploy(bytes _data) external returns(address) {
        address polyToken = _takeFee();
        //Check valid bytes - can only call module init function
        PreSaleSTOProxy preSaleSTO = new PreSaleSTOProxy(msg.sender, polyToken, logicContract);
        //Checks that _data is valid (not calling anything it shouldn't)
        require(Util.getSig(_data) == IBoot(preSaleSTO).getInitFunction(), "Invalid data");
        /*solium-disable-next-line security/no-low-level-calls*/
        require(address(preSaleSTO).call(_data), "Unsuccessfull call");
        /*solium-disable-next-line security/no-block-members*/
        emit GenerateModuleFromFactory(address(preSaleSTO), getName(), address(this), msg.sender, setupCost, now);
        return address(preSaleSTO);
    }

    /**
     * @notice Type of the Module factory
     */
    function getTypes() external view returns(uint8[]) {
        uint8[] memory res = new uint8[](1);
        res[0] = 3;
        return res;
    }

    /**
     * @notice Returns the instructions associated with the module
     */
    function getInstructions() external view returns(string) {
        return "Configure and track pre-sale token allocations";
    }

    /**
     * @notice Get the tags related to the module factory
     */
    function getTags() external view returns(bytes32[]) {
        bytes32[] memory availableTags = new bytes32[](1);
        availableTags[0] = "Presale";
        return availableTags;
    }

}
