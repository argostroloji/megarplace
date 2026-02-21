// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MegaCanvas
 * @dev Real-time pixel battle game optimized for MegaETH.
 * 1024x1024 grid, 16 colors (4 bits per pixel), 64 pixels mapped to a single uint256 slot.
 */
contract MegaCanvas {
    uint16 public constant CANVAS_SIZE = 1024;
    uint256 public constant PIXEL_FEE = 0.01 ether;
    address public immutable owner;

    // 1024 * 1024 pixels = 1,048,576
    // 64 pixels per uint256 slot => 16,384 slots
    mapping(uint256 => uint256) public grid;

    // Leaderboard tracking: mapping(address => pixelCount)
    mapping(address => uint256) public pixelCount;

    event PixelPainted(uint16 indexed x, uint16 indexed y, uint8 color, address indexed painter);

    error InvalidCoordinates();
    error InvalidColor();
    error InsufficientFee();
    error ArraysLengthMismatch();
    error Unauthorized();

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Paint a single pixel.
     * @param x X coordinate (0 to 1023)
     * @param y Y coordinate (0 to 1023)
     * @param colorIndex 4-bit color index (0 to 15)
     */
    function paint(uint16 x, uint16 y, uint8 colorIndex) external payable {
        if (x >= CANVAS_SIZE || y >= CANVAS_SIZE) revert InvalidCoordinates();
        if (colorIndex >= 16) revert InvalidColor();
        if (msg.value < PIXEL_FEE) revert InsufficientFee();

        _paintPixel(x, y, colorIndex);

        unchecked {
            pixelCount[msg.sender]++;
        }

        emit PixelPainted(x, y, colorIndex, msg.sender);
    }

    /**
     * @dev Mass painting for power users or bots in one TX.
     */
    function paintBatch(uint16[] calldata xs, uint16[] calldata ys, uint8[] calldata colorIndexes) external payable {
        uint256 len = xs.length;
        if (len != ys.length || len != colorIndexes.length) revert ArraysLengthMismatch();
        
        uint256 requiredFee = PIXEL_FEE * len;
        if (msg.value < requiredFee) revert InsufficientFee();

        for (uint256 i = 0; i < len; ) {
            uint16 x = xs[i];
            uint16 y = ys[i];
            uint8 color = colorIndexes[i];

            if (x >= CANVAS_SIZE || y >= CANVAS_SIZE) revert InvalidCoordinates();
            if (color >= 16) revert InvalidColor();

            _paintPixel(x, y, color);

            emit PixelPainted(x, y, color, msg.sender);

            unchecked { ++i; }
        }

        unchecked {
            pixelCount[msg.sender] += len;
        }
    }

    /**
     * @dev Internal function to apply bit-packing updates.
     */
    function _paintPixel(uint16 x, uint16 y, uint8 color) private {
        uint256 pixelIndex = uint256(y) * CANVAS_SIZE + uint256(x);
        
        // 64 pixels per slot (256 bits / 4 bits)
        uint256 slotIndex = pixelIndex / 64;
        
        // Offset within the uint256 slot (0 to 252)
        uint256 bitOffset = (pixelIndex % 64) * 4;

        uint256 slotValue = grid[slotIndex];

        // Mask to clear the 4 bits for this specific pixel
        uint256 mask = ~(uint256(0xF) << bitOffset);
        
        // Set the new color bits
        slotValue = (slotValue & mask) | (uint256(color) << bitOffset);

        grid[slotIndex] = slotValue;
    }

    /**
     * @dev Withdraw collected fees to the owner.
     */
    function withdraw() external {
        if (msg.sender != owner) revert Unauthorized();
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
