// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "../BaseBridgeReceiver.sol";
import "./ITelepathy.sol";

contract SuccinctBridgeReceiver is BaseBridgeReceiver, ITelepathyHandler {
    address public telepathyRouter;

    event NewTelepathyRouter(address indexed oldTelepathyRouter, address indexed newTelepathyRouter);

    constructor(address _telepathyRouter) {
        telepathyRouter = _telepathyRouter;
    }

    function handleTelepathy(uint32 _sourceChainId, address _sourceAddress, bytes calldata _data) external returns (bytes4)  {
        processMessage(_sourceAddress, _data);
        return ITelepathyHandler.handleTelepathy.selector;
    }

    // function setTelepathyRouter(address newTelepathyRouter) public {
    //     if (msg.sender != localTimelock) revert Unauthorized();
    //     address oldTelepathyRouter = telepathyRouter;
    //     telepathyRouter = newTelepathyRouter;
    //     emit NewTelepathyRouter(oldTelepathyRouter, telepathyRouter);
    // }
}