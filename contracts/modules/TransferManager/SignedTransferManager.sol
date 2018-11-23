pragma solidity ^0.4.24;

import "./ITransferManager.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Transfer Manager module for verifing transations with a signed message
 */
contract SignedTransferManager is ITransferManager {
    using SafeMath for uint256;

    bytes32 constant public ADMIN = "ADMIN";

    //Keeps track of if the signature has been used or invalidated
    mapping (bytes => bool) invalidSignatures;

    //Keeps track of the address that allows to sign messages
    mapping (address => bool) public signers;

    // Emit when signer stats was changed
    event UpdateSigners(address[] _signers, bool[] _signersStats);

    // Emit when a signature has been deemed invalid
    event InvalidSignature(bytes _data);

    /**
     * @notice Constructor
     * @param _securityToken Address of the security token
     * @param _polyAddress Address of the polytoken
     */
    constructor (address _securityToken, address _polyAddress)
    public
    Module(_securityToken, _polyAddress)
    {
    }

    /**
     * @notice This function returns the signature of configure function
     */
    function getInitFunction() public pure returns (bytes4) {
        return bytes4(0);
    }

    /**
    * @notice function to check if a signature is still valid
    * @param _data signature
    */
    function checkSignatureIsInvalid(bytes _data) public view returns(bool){
        return invalidSignatures[_data];
    }

    /**
    * @notice function to remove or add signer(s) onto the signer mapping
    * @param _signers address array of signers
    * @param _signersStats bool array of signers stats
    */
    function updateSigners(address[] _signers, bool[] _signersStats) public withPerm(ADMIN) {
        require(_signers.length == _signersStats.length, "input array length does not match");
        for(uint256 i=0; i<_signers.length; i++){
            signers[_signers[i]] = _signersStats[i];
        }
        emit UpdateSigners(_signers, _signersStats);
    }
    event Log(address _module, uint256 _nonce, bytes _sig);
    /**
    * @notice allow verify transfer with signature
    * @param _from address transfer from
    * @param _to address transfer to
    * @param _amount transfer amount
    * @param _data signature
    * @param _isTransfer bool value of isTransfer
    * Sig needs to be valid (not used or deemed as invalid)
    * Signer needs to be in the signers mapping
    */
    function verifyTransfer(address _from, address _to, uint256 _amount, bytes _data , bool _isTransfer) public returns(Result) {
        require (_isTransfer == false || msg.sender == securityToken, "Sender is not the owner");

        if ((!paused) && (_data.length != 0)) {

            /* bytes sig;
            address thisModule;
            uint256 nonce; */
            (address thisModule, uint256 nonce, bytes memory sig) = parseData(_data);
            emit Log(thisModule, nonce, sig);

            if (invalidSignatures[sig]) {
                return Result.NA;
            }

            bytes32 hash = keccak256(abi.encodePacked(this, _from, _to, _amount));
            bytes32 prependedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
            address signer = _recoverSignerAddress(prependedHash, sig);

            if (signers[signer] != true){
                return Result.NA;
            }

            if(_isTransfer == true) {
                invalidSignatures[sig] = true;
            }

            return Result.VALID;
        }

        return Result.NA;
    }

    function parseData(bytes _data) public returns (address, uint256, bytes) {
        //Check that the signature is valid
        require(_data.length >= 32, "Data input length is invalid");

        address moduleAddress;
        uint256 nonce;
        bytes memory data = new bytes(_data.length - 64);

        assembly {
            moduleAddress := mload(add(_data, 32))
            nonce := mload(add(_data, 64))
            data := mload(add(_data, 68))
        }

        return (moduleAddress, nonce, data);
    }

    /**
    * @notice allow signers to deem a signature invalid
    * @param _from address transfer from
    * @param _to address transfer to
    * @param _amount transfer amount
    * @param _data signature
    * Sig needs to be valid (not used or deemed as invalid)
    * Signer needs to be in the signers mapping
    */
    function invalidSignature(address _from, address _to, uint256 _amount, bytes _data) public {
        require(signers[msg.sender] == true, "Only signer is allowed to invalid signature.");
        require(invalidSignatures[_data] != true, "This signature is invalid.");

        bytes32 hash = keccak256(abi.encodePacked(this, _from, _to, _amount));
        bytes32 prependedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));

        // return signer;
        require(_recoverSignerAddress(prependedHash,_data) == msg.sender, "Incorrect Signer for this signature");

        invalidSignatures[_data] = true;
        emit InvalidSignature(_data);
    }

    /**
     * @notice used to recover signers' add from signature
     */
    function _recoverSignerAddress(bytes32 _hash, bytes _data) internal pure returns(address) {

        //Check that the signature is valid
        require(_data.length == 65, "Sig input length is invalid");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_data, 32))
            s := mload(add(_data, 64))
            v := and(mload(add(_data, 65)), 255)
        }
        if (v < 27) {
            v += 27;
        }
        if (v != 27 && v != 28) {
            return 0;
        }

        return ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)), v, r, s);
    }


    /**
     * @notice Return the permissions flag that are associated with ManualApproval transfer manager
     */
    function getPermissions() public view returns(bytes32[]) {
        bytes32[] memory allPermissions = new bytes32[](1);
        allPermissions[0] = ADMIN;
        return allPermissions;
    }
}
