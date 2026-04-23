// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Interface for the ERC20 token contract
interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract RuntimeTransfer {
    // Address of the ERC20 token contract
    IERC20 public token;

    // Constructor to set the ERC20 token address
    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    struct Payload {
        address recipient;
        uint256 amount;
    }

    // Function to transfer funds to the recipient from the contract's balance
    function transferFunds(address recipient, uint256 amount) external returns (bool) {
        // Ensure that the contract has enough tokens to send
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient balance in the contract");

        // Transfer tokens from the contract to the recipient
        bool success = token.transfer(recipient, amount);
        require(success, "Transfer failed");

        return success;
    }

    // Function to transfer funds to the recipient from the contract's balance
    function transferFundsWithStruct(address selfContractAddress, Payload calldata payload) external returns (bool) {
        // Ensure that the contract has enough tokens to send
        uint256 contractBalance = token.balanceOf(selfContractAddress);
        require(contractBalance >= payload.amount, "Insufficient balance in the contract");

        // Transfer tokens from the contract to the recipient
        bool success = token.transfer(payload.recipient, payload.amount);
        require(success, "Transfer failed");

        return success;
    }

    // Function to transfer funds to the recipient from the contract's balance
    function transferFundsWithDynamicArray(address, address[] calldata addresses, uint256 amount) external returns (bool) {
        // Ensure that the contract has enough tokens to send
        require(addresses.length == 2, "Insufficient array values");
        uint256 contractBalance = token.balanceOf(addresses[0]);
        require(contractBalance >= amount, "Insufficient balance in the contract");

        // Transfer tokens from the contract to the recipient
        bool success = token.transfer(addresses[1], amount);
        require(success, "Transfer failed");

        return success;
    }

    function transferFundsWithString(string calldata, address[] calldata addresses, uint256 amount) external returns (bool) {
        // Ensure that the contract has enough tokens to send
        require(addresses.length == 2, "Insufficient array values");
        uint256 contractBalance = token.balanceOf(addresses[0]);
        require(contractBalance >= amount, "Insufficient balance in the contract");

        // Transfer tokens from the contract to the recipient
        bool success = token.transfer(addresses[1], amount);
        require(success, "Transfer failed");

        return success;
    }

    function transferFundsWithBytes(bytes calldata, address[] calldata addresses, uint256 amount) external returns (bool) {
        // Ensure that the contract has enough tokens to send
        require(addresses.length == 2, "Insufficient array values");
        uint256 contractBalance = token.balanceOf(addresses[0]);
        require(contractBalance >= amount, "Insufficient balance in the contract");

        // Transfer tokens from the contract to the recipient
        bool success = token.transfer(addresses[1], amount);
        require(success, "Transfer failed");

        return success;
    }

    function transferFundsWithRuntimeParamInsideArray(address[] calldata addresses, uint256[] calldata amounts) external returns (bool) {
        // Ensure that the contract has enough tokens to send
        require(addresses.length == 2, "Insufficient addresses array values");
        require(amounts.length == 1, "Insufficient ammount array values");
        uint256 contractBalance = token.balanceOf(addresses[0]);
        require(contractBalance >= amounts[0], "Insufficient balance in the contract");

        // Transfer tokens from the contract to the recipient
        bool success = token.transfer(addresses[1], amounts[0]);
        require(success, "Transfer failed");

        return success;
    }
}
