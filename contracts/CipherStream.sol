// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CipherStream
 * @notice Encrypted time-locked video access platform on Arbitrum.
 *
 * Architecture:
 *  - Creators upload AES-GCM encrypted video files to IPFS/Pinata off-chain.
 *  - Only the encrypted CID and metadata are stored on-chain.
 *  - Viewers pay ETH to unlock time-limited access.
 *  - Access expiry is enforced on-chain; the frontend checks before decrypting.
 *
 * Key Management (MVP):
 *  - AES keys are stored in a server-side demo registry for MVP purposes.
 *  - TODO (production): Replace with Lit Protocol threshold encryption,
 *    wallet-based encryption (ECIES), or a TEE/FHE-based key management system.
 *
 * Security notes:
 *  - Uses ReentrancyGuard on all ETH-moving functions.
 *  - Follows checks-effects-interactions pattern.
 *  - No owner-only centralization; creators control their own videos.
 *  - Excess ETH is refunded automatically.
 */
contract CipherStream is ReentrancyGuard {
    // =========================================================
    // Structs
    // =========================================================

    struct Video {
        uint256 id;
        address creator;
        string title;
        string description;
        string encryptedVideoCID; // IPFS CID of AES-GCM encrypted video
        string thumbnailCID;      // IPFS CID of thumbnail image
        uint256 price;            // Access price in wei
        uint256 accessDuration;   // Access duration in seconds
        uint256 createdAt;
        bool active;
    }

    // =========================================================
    // State
    // =========================================================

    uint256 public videoCount;

    /// @dev videoId => Video
    mapping(uint256 => Video) public videos;

    /// @dev videoId => viewer address => access expiry timestamp
    mapping(uint256 => mapping(address => uint256)) public accessExpiry;

    /// @dev creator address => pending ETH withdrawal balance
    mapping(address => uint256) public pendingWithdrawals;

    /// @dev videoId => total unlock count
    mapping(uint256 => uint256) public unlockCount;

    // =========================================================
    // Events
    // =========================================================

    event VideoCreated(
        uint256 indexed videoId,
        address indexed creator,
        string title,
        uint256 price
    );

    event AccessUnlocked(
        uint256 indexed videoId,
        address indexed viewer,
        uint256 expiry
    );

    event VideoStatusChanged(uint256 indexed videoId, bool active);

    event Withdrawal(address indexed creator, uint256 amount);

    // =========================================================
    // Functions
    // =========================================================

    /**
     * @notice Create a new video listing.
     * @param title          Human-readable title.
     * @param description    Short description.
     * @param encryptedVideoCID  IPFS CID of the AES-GCM encrypted video blob.
     * @param thumbnailCID   IPFS CID of the thumbnail image.
     * @param price          Access price in wei (must be > 0).
     * @param accessDuration Access duration in seconds (must be > 0).
     */
    function createVideo(
        string memory title,
        string memory description,
        string memory encryptedVideoCID,
        string memory thumbnailCID,
        uint256 price,
        uint256 accessDuration
    ) external {
        require(bytes(title).length > 0, "CipherStream: title required");
        require(
            bytes(encryptedVideoCID).length > 0,
            "CipherStream: encrypted video CID required"
        );
        require(price > 0, "CipherStream: price must be > 0");
        require(accessDuration > 0, "CipherStream: duration must be > 0");

        videoCount++;
        uint256 videoId = videoCount;

        videos[videoId] = Video({
            id: videoId,
            creator: msg.sender,
            title: title,
            description: description,
            encryptedVideoCID: encryptedVideoCID,
            thumbnailCID: thumbnailCID,
            price: price,
            accessDuration: accessDuration,
            createdAt: block.timestamp,
            active: true
        });

        emit VideoCreated(videoId, msg.sender, title, price);
    }

    /**
     * @notice Unlock time-limited access to a video.
     *         If the viewer already has active access, the duration is extended
     *         from the current expiry rather than from now.
     * @param videoId The video to unlock.
     */
    function unlockAccess(uint256 videoId) external payable nonReentrant {
        Video storage video = videos[videoId];
        require(video.id != 0, "CipherStream: video does not exist");
        require(video.active, "CipherStream: video is not active");
        require(msg.value >= video.price, "CipherStream: insufficient payment");

        // Extend from current expiry if still active, otherwise from now
        uint256 baseTime = accessExpiry[videoId][msg.sender] > block.timestamp
            ? accessExpiry[videoId][msg.sender]
            : block.timestamp;

        uint256 newExpiry = baseTime + video.accessDuration;
        accessExpiry[videoId][msg.sender] = newExpiry;

        // Credit creator (checks-effects-interactions)
        pendingWithdrawals[video.creator] += video.price;

        // Refund excess ETH
        uint256 excess = msg.value - video.price;
        if (excess > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");
            require(refunded, "CipherStream: refund failed");
        }

        unlockCount[videoId]++;

        emit AccessUnlocked(videoId, msg.sender, newExpiry);
    }

    /**
     * @notice Check whether a viewer currently has active access.
     */
    function hasAccess(uint256 videoId, address viewer)
        external
        view
        returns (bool)
    {
        return accessExpiry[videoId][viewer] > block.timestamp;
    }

    /**
     * @notice Get the raw expiry timestamp for a viewer.
     */
    function getAccessExpiry(uint256 videoId, address viewer)
        external
        view
        returns (uint256)
    {
        return accessExpiry[videoId][viewer];
    }

    /**
     * @notice Toggle a video's active status. Only the creator can call this.
     */
    function setVideoActive(uint256 videoId, bool active) external {
        require(
            videos[videoId].creator == msg.sender,
            "CipherStream: not the creator"
        );
        require(videos[videoId].id != 0, "CipherStream: video does not exist");
        videos[videoId].active = active;
        emit VideoStatusChanged(videoId, active);
    }

    /**
     * @notice Withdraw accumulated earnings.
     *         Uses checks-effects-interactions to prevent reentrancy.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "CipherStream: nothing to withdraw");

        // Effects before interaction
        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "CipherStream: withdrawal failed");

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Get a single video by ID.
     */
    function getVideo(uint256 videoId)
        external
        view
        returns (Video memory)
    {
        require(videos[videoId].id != 0, "CipherStream: video does not exist");
        return videos[videoId];
    }

    /**
     * @notice Get all videos.
     * @dev Acceptable for MVP. For production, use pagination or an indexer
     *      (e.g., The Graph) to avoid gas limits on large datasets.
     */
    function getAllVideos() external view returns (Video[] memory) {
        Video[] memory result = new Video[](videoCount);
        for (uint256 i = 1; i <= videoCount; i++) {
            result[i - 1] = videos[i];
        }
        return result;
    }

    /**
     * @notice Get all videos created by a specific address.
     */
    function getCreatorVideos(address creator)
        external
        view
        returns (Video[] memory)
    {
        // Count first
        uint256 count = 0;
        for (uint256 i = 1; i <= videoCount; i++) {
            if (videos[i].creator == creator) count++;
        }

        Video[] memory result = new Video[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= videoCount; i++) {
            if (videos[i].creator == creator) {
                result[idx++] = videos[i];
            }
        }
        return result;
    }

    /**
     * @notice Get a viewer's access expiry for a video (alias for getAccessExpiry).
     */
    function getViewerAccess(uint256 videoId, address viewer)
        external
        view
        returns (uint256)
    {
        return accessExpiry[videoId][viewer];
    }
}
