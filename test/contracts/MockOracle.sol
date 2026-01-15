// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for PredictionMarket to avoid circular imports
interface IPredictionMarket {
    function resolveMarket(uint8 _outcome) external;
}

contract MockOracle {
    address public admin;
    
    event MarketResolved(address indexed market, uint8 outcome);
    
    constructor() {
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    function resolveRace(address marketAddress, uint8 outcome) external onlyAdmin {
        // Call the resolveMarket function on the prediction market
        IPredictionMarket(marketAddress).resolveMarket(outcome);
        
        emit MarketResolved(marketAddress, outcome);
    }
    
    function transferOwnership(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
}
