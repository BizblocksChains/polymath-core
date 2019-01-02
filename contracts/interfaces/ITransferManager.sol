pragma solidity ^0.4.24;

import "./TransferManagerEnums.sol";

/**
 * @title Interface to be implemented by all Transfer Manager modules
 */
interface ITransferManager {

    /**
     * @notice Determines if the transfer between these two accounts can happen
     */
    function verifyTransfer(address _from, address _to, uint256 _amount, bytes _data, bool _isTransfer) external returns(TransferManagerEnums.Result);

}