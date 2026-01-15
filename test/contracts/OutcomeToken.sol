// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OutcomeToken is ERC20 {  //OutcomeToken inherits from ERC20
    address public market;   //Stores the prediction market contract address 
    
    constructor(    //  Calls ERC-20 constructor
        string memory name,
        string memory symbol,
        address _market
    ) ERC20(name, symbol) {   
        require(_market != address(0), "Invalid market address"); //Prevents setting zero address
        market = _market;
    }
    
    //Users cannot mint tokens themselves
    modifier onlyMarket() { 
        require(msg.sender == market, "Only market can mint/burn"); 
        _;
    }

    //This function creates (mints) new tokens and sends them to a specific address.
    function mint(address to, uint256 amount) external onlyMarket {
        require(to != address(0), "Mint to zero address");//Without this, tokens could be minted and lost forever.
        require(amount > 0, "Amount must be positive");
        _mint(to, amount);
    }
    

    //This function safely destroys tokens from a user, but only when the Market contract is allowed to do so.
    function burn(address from, uint256 amount) external onlyMarket {
        require(from != address(0), "Burn from zero address");
        require(amount > 0, "Amount must be positive");
        require(balanceOf(from) >= amount, "Insufficient balance");
        _burn(from, amount);
    }
}
