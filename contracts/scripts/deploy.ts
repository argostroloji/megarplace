import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH/MEGA");

    const MegaCanvas = await ethers.getContractFactory("MegaCanvas");
    const megaCanvas = await MegaCanvas.deploy();

    await megaCanvas.waitForDeployment();

    console.log("MegaCanvas deployed to:", await megaCanvas.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
