import { expect } from "chai";
import { ethers } from "hardhat";
import { CipherStream } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("CipherStream", function () {
  let cipherStream: CipherStream;
  let owner: HardhatEthersSigner;
  let creator: HardhatEthersSigner;
  let viewer: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const VIDEO_PRICE = ethers.parseEther("0.01");
  const ACCESS_DURATION = 3600; // 1 hour in seconds

  beforeEach(async function () {
    [owner, creator, viewer, other] = await ethers.getSigners();

    const CipherStreamFactory = await ethers.getContractFactory("CipherStream");
    cipherStream = await CipherStreamFactory.deploy();
    await cipherStream.waitForDeployment();
  });

  // =========================================================
  // createVideo
  // =========================================================
  describe("createVideo", function () {
    it("should create a video and emit VideoCreated", async function () {
      await expect(
        cipherStream.connect(creator).createVideo(
          "Test Video",
          "A test description",
          "QmEncryptedCID123",
          "QmThumbnailCID456",
          VIDEO_PRICE,
          ACCESS_DURATION
        )
      )
        .to.emit(cipherStream, "VideoCreated")
        .withArgs(1, creator.address, "Test Video", VIDEO_PRICE);

      expect(await cipherStream.videoCount()).to.equal(1);
    });

    it("should store video data correctly", async function () {
      await cipherStream.connect(creator).createVideo(
        "My Video",
        "Description",
        "QmEncCID",
        "QmThumbCID",
        VIDEO_PRICE,
        ACCESS_DURATION
      );

      const video = await cipherStream.getVideo(1);
      expect(video.id).to.equal(1);
      expect(video.creator).to.equal(creator.address);
      expect(video.title).to.equal("My Video");
      expect(video.encryptedVideoCID).to.equal("QmEncCID");
      expect(video.thumbnailCID).to.equal("QmThumbCID");
      expect(video.price).to.equal(VIDEO_PRICE);
      expect(video.accessDuration).to.equal(ACCESS_DURATION);
      expect(video.active).to.be.true;
    });

    it("should revert if title is empty", async function () {
      await expect(
        cipherStream.connect(creator).createVideo(
          "",
          "desc",
          "QmCID",
          "QmThumb",
          VIDEO_PRICE,
          ACCESS_DURATION
        )
      ).to.be.revertedWith("CipherStream: title required");
    });

    it("should revert if encryptedVideoCID is empty", async function () {
      await expect(
        cipherStream.connect(creator).createVideo(
          "Title",
          "desc",
          "",
          "QmThumb",
          VIDEO_PRICE,
          ACCESS_DURATION
        )
      ).to.be.revertedWith("CipherStream: encrypted video CID required");
    });

    it("should revert if price is 0", async function () {
      await expect(
        cipherStream.connect(creator).createVideo(
          "Title",
          "desc",
          "QmCID",
          "QmThumb",
          0,
          ACCESS_DURATION
        )
      ).to.be.revertedWith("CipherStream: price must be > 0");
    });

    it("should revert if accessDuration is 0", async function () {
      await expect(
        cipherStream.connect(creator).createVideo(
          "Title",
          "desc",
          "QmCID",
          "QmThumb",
          VIDEO_PRICE,
          0
        )
      ).to.be.revertedWith("CipherStream: duration must be > 0");
    });

    it("should increment videoCount for multiple videos", async function () {
      for (let i = 0; i < 3; i++) {
        await cipherStream.connect(creator).createVideo(
          `Video ${i}`,
          "desc",
          `QmCID${i}`,
          `QmThumb${i}`,
          VIDEO_PRICE,
          ACCESS_DURATION
        );
      }
      expect(await cipherStream.videoCount()).to.equal(3);
    });
  });

  // =========================================================
  // unlockAccess
  // =========================================================
  describe("unlockAccess", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video",
        "desc",
        "QmEncCID",
        "QmThumb",
        VIDEO_PRICE,
        ACCESS_DURATION
      );
    });

    it("should unlock access and emit AccessUnlocked", async function () {
      const tx = await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expectedExpiry = block!.timestamp + ACCESS_DURATION;

      await expect(tx)
        .to.emit(cipherStream, "AccessUnlocked")
        .withArgs(1, viewer.address, expectedExpiry);
    });

    it("should grant access after payment", async function () {
      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      expect(await cipherStream.hasAccess(1, viewer.address)).to.be.true;
    });

    it("should credit creator's pending withdrawals", async function () {
      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      expect(await cipherStream.pendingWithdrawals(creator.address)).to.equal(
        VIDEO_PRICE
      );
    });

    it("should refund excess ETH", async function () {
      const excess = ethers.parseEther("0.05");
      const viewerBalanceBefore = await ethers.provider.getBalance(
        viewer.address
      );

      const tx = await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE + excess });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const viewerBalanceAfter = await ethers.provider.getBalance(
        viewer.address
      );
      // Should only have paid VIDEO_PRICE + gas
      expect(viewerBalanceBefore - viewerBalanceAfter).to.be.closeTo(
        VIDEO_PRICE + gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("should extend access if already active", async function () {
      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      const firstExpiry = await cipherStream.getAccessExpiry(1, viewer.address);

      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      const secondExpiry = await cipherStream.getAccessExpiry(
        1,
        viewer.address
      );

      expect(secondExpiry).to.equal(firstExpiry + BigInt(ACCESS_DURATION));
    });

    it("should revert if video does not exist", async function () {
      await expect(
        cipherStream.connect(viewer).unlockAccess(999, { value: VIDEO_PRICE })
      ).to.be.revertedWith("CipherStream: video does not exist");
    });

    it("should revert if video is inactive", async function () {
      await cipherStream.connect(creator).setVideoActive(1, false);
      await expect(
        cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE })
      ).to.be.revertedWith("CipherStream: video is not active");
    });

    it("should revert if payment is insufficient", async function () {
      await expect(
        cipherStream
          .connect(viewer)
          .unlockAccess(1, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("CipherStream: insufficient payment");
    });

    it("should increment unlockCount", async function () {
      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      await cipherStream
        .connect(other)
        .unlockAccess(1, { value: VIDEO_PRICE });
      expect(await cipherStream.unlockCount(1)).to.equal(2);
    });
  });

  // =========================================================
  // hasAccess / getAccessExpiry
  // =========================================================
  describe("hasAccess", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video",
        "desc",
        "QmEncCID",
        "QmThumb",
        VIDEO_PRICE,
        ACCESS_DURATION
      );
    });

    it("should return false before unlock", async function () {
      expect(await cipherStream.hasAccess(1, viewer.address)).to.be.false;
    });

    it("should return true after unlock", async function () {
      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      expect(await cipherStream.hasAccess(1, viewer.address)).to.be.true;
    });

    it("should return false after access expires", async function () {
      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
      // Fast-forward past expiry
      await time.increase(ACCESS_DURATION + 1);
      expect(await cipherStream.hasAccess(1, viewer.address)).to.be.false;
    });
  });

  // =========================================================
  // setVideoActive
  // =========================================================
  describe("setVideoActive", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video",
        "desc",
        "QmEncCID",
        "QmThumb",
        VIDEO_PRICE,
        ACCESS_DURATION
      );
    });

    it("should allow creator to deactivate video", async function () {
      await expect(cipherStream.connect(creator).setVideoActive(1, false))
        .to.emit(cipherStream, "VideoStatusChanged")
        .withArgs(1, false);

      const video = await cipherStream.getVideo(1);
      expect(video.active).to.be.false;
    });

    it("should revert if non-creator tries to change status", async function () {
      await expect(
        cipherStream.connect(other).setVideoActive(1, false)
      ).to.be.revertedWith("CipherStream: not the creator");
    });
  });

  // =========================================================
  // withdraw
  // =========================================================
  describe("withdraw", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video",
        "desc",
        "QmEncCID",
        "QmThumb",
        VIDEO_PRICE,
        ACCESS_DURATION
      );
      await cipherStream
        .connect(viewer)
        .unlockAccess(1, { value: VIDEO_PRICE });
    });

    it("should allow creator to withdraw earnings", async function () {
      const balanceBefore = await ethers.provider.getBalance(creator.address);

      const tx = await cipherStream.connect(creator).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(creator.address);
      expect(balanceAfter - balanceBefore + gasUsed).to.equal(VIDEO_PRICE);
    });

    it("should emit Withdrawal event", async function () {
      await expect(cipherStream.connect(creator).withdraw())
        .to.emit(cipherStream, "Withdrawal")
        .withArgs(creator.address, VIDEO_PRICE);
    });

    it("should reset pending balance after withdrawal", async function () {
      await cipherStream.connect(creator).withdraw();
      expect(await cipherStream.pendingWithdrawals(creator.address)).to.equal(
        0
      );
    });

    it("should revert if nothing to withdraw", async function () {
      await expect(
        cipherStream.connect(other).withdraw()
      ).to.be.revertedWith("CipherStream: nothing to withdraw");
    });
  });

  // =========================================================
  // getAllVideos / getCreatorVideos
  // =========================================================
  describe("getAllVideos / getCreatorVideos", function () {
    it("should return all videos", async function () {
      await cipherStream.connect(creator).createVideo(
        "Video 1",
        "desc",
        "QmCID1",
        "QmThumb1",
        VIDEO_PRICE,
        ACCESS_DURATION
      );
      await cipherStream.connect(other).createVideo(
        "Video 2",
        "desc",
        "QmCID2",
        "QmThumb2",
        VIDEO_PRICE,
        ACCESS_DURATION
      );

      const all = await cipherStream.getAllVideos();
      expect(all.length).to.equal(2);
    });

    it("should return only creator's videos", async function () {
      await cipherStream.connect(creator).createVideo(
        "Creator Video",
        "desc",
        "QmCID1",
        "QmThumb1",
        VIDEO_PRICE,
        ACCESS_DURATION
      );
      await cipherStream.connect(other).createVideo(
        "Other Video",
        "desc",
        "QmCID2",
        "QmThumb2",
        VIDEO_PRICE,
        ACCESS_DURATION
      );

      const creatorVideos = await cipherStream.getCreatorVideos(
        creator.address
      );
      expect(creatorVideos.length).to.equal(1);
      expect(creatorVideos[0].title).to.equal("Creator Video");
    });
  });
});
