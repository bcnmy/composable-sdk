// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.26;

event ResultEmitted(uint256 result);

contract StorageWriteExample {

    // -------------------------------------------------------------------------
    // execResult — single output
    // -------------------------------------------------------------------------

    /// @dev Returns a * 2. Single static uint256 for execResult capture.
    function oneOutput(uint256 a) external returns (uint256 result) {
        result = a * 2;
        emit ResultEmitted(result);
    }

    /// @dev Returns a string (dynamic type). execResult capture must reject this.
    function oneOutputString(uint256 a) external returns (string memory result) {
        result = a > 0 ? "nonzero" : "zero";
        emit ResultEmitted(a);
    }

    // -------------------------------------------------------------------------
    // execResult — multiple outputs
    // -------------------------------------------------------------------------

    /// @dev Returns (a + b, a * b, a > b). Three static outputs for execResult capture.
    ///      Values stored at slot / slot+1 / slot+2.
    function multipleOutput(uint256 a, uint256 b) external returns (uint256 sum, uint256 product, bool greater) {
        sum = a + b;
        product = a * b;
        greater = a > b;
        emit ResultEmitted(sum);
    }

    /// @dev Returns (a + b, label). Mixed static + dynamic. execResult capture must reject this.
    function multipleOutputString(uint256 a, uint256 b) external returns (uint256 sum, string memory label) {
        sum = a + b;
        label = sum > 100 ? "large" : "small";
        emit ResultEmitted(sum);
    }

    // -------------------------------------------------------------------------
    // staticCall — single output
    // -------------------------------------------------------------------------

    /// @dev Returns a * 3. Single static uint256 for staticCall capture.
    function oneOutputStaticCall(uint256 a) external pure returns (uint256 result) {
        result = a * 3;
    }

    /// @dev Returns a string (dynamic type). staticCall capture must reject this.
    function oneOutputStringStaticCall(uint256 a) external pure returns (string memory result) {
        result = a > 0 ? "nonzero" : "zero";
    }

    // -------------------------------------------------------------------------
    // staticCall — multiple outputs
    // -------------------------------------------------------------------------

    /// @dev Returns (a * 3, a * 4, a * 5). Three static uint256 outputs for staticCall capture.
    ///      Values stored at slot / slot+1 / slot+2.
    function multipleOutputStaticCall(uint256 a) external pure returns (uint256 triple, uint256 quad, uint256 quint) {
        triple = a * 3;
        quad = a * 4;
        quint = a * 5;
    }

    /// @dev Returns (a * 3, label). Mixed static + dynamic. staticCall capture must reject this.
    function multipleOutputStringStaticCall(uint256 a) external pure returns (uint256 triple, string memory label) {
        triple = a * 3;
        label = triple > 100 ? "large" : "small";
    }
}
