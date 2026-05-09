import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("CipherStream", function () {
  let cipherStream;
  let owner, creator, viewer, other;

  const VIDEO_PRICE = ethers.parseEther("0.01");
  const ACCESS_DURATION = 3600;

  beforeEach(async function () {
    [owner, creator, viewer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CipherStream");
    cipherStream = await Factory.deploy();
    await cipherStream.waitForDeployment();
  });

  describe("createVideo", function () {
    it("creates a video and emits VideoCreated", async function () {
      await expect(
        cipherStream.connect(creator).createVideo(
          "Test Video", "desc", "QmEncCID", "QmThumb", VIDEO_PRICE, ACCESS_DURATION
        )
      ).to.emit(cipherStream, "VideoCreated")
        .withArgs(1, creator.address, "Test Video", VIDEO_PRICE);
      expect(await cipherStream.videoCount()).to.equal(1);
    });

    it("reverts if title is empty", async function () {
      await expect(
        cipherStream.connect(creator).createVideo("", "d", "QmC", "QmT", VIDEO_PRICE, ACCESS_DURATION)
      ).to.be.revertedWith("CipherStream: title required");
    });

    it("reverts if price is 0", async function () {
      await expect(
        cipherStream.connect(creator).createVideo("T", "d", "QmC", "QmT", 0, ACCESS_DURATION)
      ).to.be.revertedWith("CipherStream: price must be > 0");
    });

    it("reverts if duration is 0", async function () {
      await expect(
        cipherStream.connect(creator).createVideo("T", "d", "QmC", "QmT", VIDEO_PRICE, 0)
      ).to.be.revertedWith("CipherStream: duration must be > 0");
    });
  });

  describe("unlockAccess", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video", "desc", "QmEncCID", "QmThumb", VIDEO_PRICE, ACCESS_DURATION
      );
    });

    it("grants access after payment", async function () {
      await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE });
      expect(await cipherStream.hasAccess(1, viewer.address)).to.be.true;
    });

    it("credits creator pending withdrawals", async function () {
      await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE });
      expect(await cipherStream.pendingWithdrawals(creator.address)).to.equal(VIDEO_PRICE);
    });

    it("refunds excess ETH", async function () {
      const excess = ethers.parseEther("0.05");
      const before = await ethers.provider.getBalance(viewer.address);
      const tx = await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE + excess });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(viewer.address);
      expect(before - after - gasUsed).to.equal(VIDEO_PRICE);
    });

    it("extends access if already active", async function () {
      await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE });
      const first = await cipherStream.getAccessExpiry(1, viewer.address);
      await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE });
      const second = await cipherStream.getAccessExpiry(1, viewer.address);
      expect(second).to.equal(first + BigInt(ACCESS_DURATION));
    });

    it("reverts if video does not exist", async function () {
      await expect(
        cipherStream.connect(viewer).unlockAccess(999, { value: VIDEO_PRICE })
      ).to.be.revertedWith("CipherStream: video does not exist");
    });

    it("reverts if payment insufficient", async function () {
      await expect(
        cipherStream.connect(viewer).unlockAccess(1, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("CipherStream: insufficient payment");
    });

    it("increments unlockCount", async function () {
      await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE });
      await cipherStream.connect(other).unlockAccess(1, { value: VIDEO_PRICE });
      expect(await cipherStream.unlockCount(1)).to.equal(2);
    });
  });

  describe("hasAccess expiry", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video", "desc", "QmEncCID", "QmThumb", VIDEO_PRICE, ACCESS_DURATION
      );
    });

    it("returns false before unlock", async function () {
      expect(await cipherStream.hasAccess(1, viewer.address)).to.be.false;
    });

    it("returns false after access expires", async function () {
      await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE });
      await time.increase(ACCESS_DURATION + 1);
      expect(await cipherStream.hasAccess(1, viewer.address)).to.be.false;
    });
  });

  describe("setVideoActive", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video", "desc", "QmEncCID", "QmThumb", VIDEO_PRICE, ACCESS_DURATION
      );
    });

    it("allows creator to deactivate", async function () {
      await expect(cipherStream.connect(creator).setVideoActive(1, false))
        .to.emit(cipherStream, "VideoStatusChanged").withArgs(1, false);
    });

    it("reverts if non-creator tries", async function () {
      await expect(cipherStream.connect(other).setVideoActive(1, false))
        .to.be.revertedWith("CipherStream: not the creator");
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await cipherStream.connect(creator).createVideo(
        "Test Video", "desc", "QmEncCID", "QmThumb", VIDEO_PRICE, ACCESS_DURATION
      );
      await cipherStream.connect(viewer).unlockAccess(1, { value: VIDEO_PRICE });
    });

    it("allows creator to withdraw earnings", async function () {
      const before = await ethers.provider.getBalance(creator.address);
      const tx = await cipherStream.connect(creator).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(creator.address);
      expect(after - before + gasUsed).to.equal(VIDEO_PRICE);
    });

    it("emits Withdrawal event", async function () {
      await expect(cipherStream.connect(creator).withdraw())
        .to.emit(cipherStream, "Withdrawal").withArgs(creator.address, VIDEO_PRICE);
    });

    it("reverts if nothing to withdraw", async function () {
      await expect(cipherStream.connect(other).withdraw())
        .to.be.revertedWith("CipherStream: nothing to withdraw");
    });
  });

  describe("getAllVideos / getCreatorVideos", function () {
    it("returns all videos", async function () {
      await cipherStream.connect(creator).createVideo("V1", "d", "C1", "T1", VIDEO_PRICE, ACCESS_DURATION);
      await cipherStream.connect(other).createVideo("V2", "d", "C2", "T2", VIDEO_PRICE, ACCESS_DURATION);
      expect((await cipherStream.getAllVideos()).length).to.equal(2);
    });

    it("returns only creator videos", async function () {
      await cipherStream.connect(creator).createVideo("CV", "d", "C1", "T1", VIDEO_PRICE, ACCESS_DURATION);
      await cipherStream.connect(other).createVideo("OV", "d", "C2", "T2", VIDEO_PRICE, ACCESS_DURATION);
      const vids = await cipherStream.getCreatorVideos(creator.address);
      expect(vids.length).to.equal(1);
      expect(vids[0].title).to.equal("CV");
    });
  });
});
