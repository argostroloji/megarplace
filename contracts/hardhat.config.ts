import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const privateKey = process.env.PRIVATE_KEY?.trim() || "";
const formattedPrivateKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        },
    },
    networks: {
        megaeth: {
            url: "https://carrot.megaeth.com/rpc",
            chainId: 6343,
            accounts: privateKey ? [formattedPrivateKey] : [],
        },
    }
};

export default config;
