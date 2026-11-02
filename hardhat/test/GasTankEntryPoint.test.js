import { expect } from "chai";
import hre from "hardhat";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const entryPointArtifact = require("@account-abstraction/contracts/artifacts/EntryPoint.json");
const { ethers } = hre;

describe("Gas tank real EntryPoint prefunding", function () {
  for (const kind of ["Creator", "Statement"]) {
    it(`${kind} v0.6 face can manage its own stake`, async function () {
      const [owner, stranger] = await ethers.getSigners();
      const ep = await new ethers.ContractFactory(entryPointArtifact.abi, entryPointArtifact.bytecode, owner).deploy();
      const tank = await (await ethers.getContractFactory(`${kind}GasTank`)).deploy(
        owner.address, ethers.parseEther("1"), 3600, ...(kind === "Creator" ? [0] : []),
      );
      const face = await (await ethers.getContractFactory(`${kind}GasTankPaymasterV06`)).deploy(ep, tank);
      await expect(face.connect(stranger).addStake(1, { value: 1n })).to.be.revertedWithCustomError(face, "OwnableUnauthorizedAccount");
      await face.addStake(1, { value: 1000n });
      expect((await ep.getDepositInfo(face)).stake).to.equal(1000n);
      await expect(face.connect(stranger).unlockStake()).to.be.revertedWithCustomError(face, "OwnableUnauthorizedAccount");
      await face.unlockStake();
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      await expect(face.connect(stranger).withdrawStake(stranger.address)).to.be.revertedWithCustomError(face, "OwnableUnauthorizedAccount");
      await face.withdrawStake(owner.address);
      expect((await ep.getDepositInfo(face)).stake).to.equal(0n);
    });

    // Known blocker for PR #229. After fixing prefunding, replace the AA31
    // expectation with a successful UserOperationEvent assertion.
    it(`${kind} reproduces AA31 despite a funded vault (unresolved PR #229 blocker)`, async function () {
      const [owner, target] = await ethers.getSigners();
      const ep = await new ethers.ContractFactory(entryPointArtifact.abi, entryPointArtifact.bytecode, owner).deploy();
      const account = await (await ethers.getContractFactory("GasTankTestAccount")).deploy();
      const tankFactory = await ethers.getContractFactory(`${kind}GasTank`);
      const tank = await tankFactory.deploy(target.address, ethers.parseEther("1"), 3600, ...(kind === "Creator" ? [0] : []));
      const face = await (await ethers.getContractFactory(`${kind}GasTankPaymaster`)).deploy(ep, tank);
      await tank.addPaymasterFace(face);
      const anchor = kind === "Creator" ? target.address : ethers.id("statement");
      await tank.enroll(anchor);
      await tank.fundTank(owner.address, { value: ethers.parseEther("0.02") });
      const inner = kind === "Creator"
        ? new ethers.Interface(["function buyERC1155(address,address,uint256[],uint256[],bytes)"]).encodeFunctionData("buyERC1155", [await account.getAddress(), target.address, [1], [1], "0x"])
        : new ethers.Interface(["function setBelief(bytes32,uint8)"]).encodeFunctionData("setBelief", [anchor, 1]);
      const op = {
        sender: await account.getAddress(), nonce: 0, initCode: "0x",
        callData: account.interface.encodeFunctionData("execute", [target.address, 0, inner]),
        accountGasLimits: ethers.solidityPacked(["uint128", "uint128"], [200000, 100000]),
        preVerificationGas: 50000,
        gasFees: ethers.solidityPacked(["uint128", "uint128"], [1000000000, 1000000000]),
        paymasterAndData: ethers.solidityPacked(
          ["address", "uint128", "uint128", kind === "Creator" ? "address" : "bytes32"],
          [await face.getAddress(), 500000, 100000, anchor],
        ),
        signature: "0x",
      };
      await expect(ep.handleOps([op], owner.address))
        .to.be.revertedWithCustomError(ep, "FailedOp")
        .withArgs(0, "AA31 paymaster deposit too low");
    });
  }
});
