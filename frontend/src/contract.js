import { ethers } from "ethers";
import artifact from "./abi/PropertyRegistry.json";

export const CONTRACT_ADDRESS =
  "0xb311fad5ae8395F209d2D7A60F268293Bd8705aE";

export const CONTRACT_ABI = artifact.abi;

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask not found. Please install the MetaMask browser extension."
    );
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  const sepoliaChainId = "0xaa36a7";
  let chainId = await window.ethereum.request({ method: "eth_chainId" });

  if (chainId !== sepoliaChainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: sepoliaChainId }],
      });
    } catch (error) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: sepoliaChainId,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      } else {
        throw error;
      }
    }
    chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== sepoliaChainId) {
      throw new Error("Please switch MetaMask to the Sepolia network.");
    }
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === "0x") {
    throw new Error("No contract found at this address on Sepolia. Verify the deployment.");
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  return { account: await signer.getAddress(), provider, signer, contract };
}
