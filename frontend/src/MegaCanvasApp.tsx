import React, { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { MegaCanvasRenderer } from './MegaCanvasRenderer';
import { ethers } from 'ethers';
import MegaCanvasArtifact from './contracts/MegaCanvas.json';
import './CyberAesthetic.css';
import MatrixBackground from './components/MatrixBackground';
import GameLogo from './assets/logo.jpg';

declare global {
    interface Window {
        ethereum?: any;
    }
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x613f9bE6Ddb7e18bC5b914226Da4a8B975A362a6";
const MEGAETH_CHAIN_ID = 6343; // Corrected ID for MegaETH Testnet

// The 16 colors (matched to Solidity design 4-bit)
export const PALETTE = [
    0x000000ff, 0xffffffff, 0xff0000ff, 0x00ff00ff,
    0x0000ffff, 0xffff00ff, 0x00ffffff, 0xff00ffff,
    0x808080ff, 0xc0c0c0ff, 0x800000ff, 0x808000ff,
    0x008000ff, 0x800080ff, 0x008080ff, 0x000080ff,
];

// This acts as the main game container wrapper (Dark mode, Neon Glow, Cyber-warfare)

export default function MegaCanvasApp() {
    const { login, logout, authenticated, user, exportWallet } = usePrivy();
    const rendererRef = React.useRef<any>(null);
    const { wallets } = useWallets();
    const activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    const [balance, setBalance] = useState("0.00");

    // Auto-fetch balance when wallet is available
    useEffect(() => {
        const fetchBalance = async () => {
            if (activeWallet) {
                try {
                    const ethProvider = await activeWallet.getEthereumProvider();
                    const provider = new ethers.BrowserProvider(ethProvider);
                    const bal = await provider.getBalance(activeWallet.address);
                    setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
                } catch (e) {
                    console.error("Failed to fetch balance", e);
                }
            }
        };
        fetchBalance();
        const interval = setInterval(fetchBalance, 2000); // 2s poll for faster UX
        return () => clearInterval(interval);
    }, [activeWallet]);

    const [selectedColor, setSelectedColor] = useState(2); // Default Red
    const [leaderboard, setLeaderboard] = useState([]);
    const [liveStream, setLiveStream] = useState([]);
    const [initialPixels, setInitialPixels] = useState(new Uint8Array(1024 * 1024));
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState("");

    // 24h Reset Timer Logic
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const resetTime = new Date();
            resetTime.setHours(24, 0, 0, 0); // Next midnight

            const diff = resetTime.getTime() - now.getTime();

            if (diff <= 0) {
                setLeaderboard([]); // WIPE LEADERBOARD
                setInitialPixels(new Uint8Array(1024 * 1024)); // RESET STATE
                if (rendererRef.current) rendererRef.current.clearCanvas(); // WIPE CANVAS
                setLiveStream(prev => [
                    { id: Date.now(), text: "[SYSTEM] NEURAL LINK RESET: TOTAL WIPE COMPLETED." },
                    ...prev.slice(0, 9)
                ]);
                return;
            }

            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };

        const timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timerInterval);
    }, []);


    // Event Listener for Real-Time Sync
    useEffect(() => {
        const setupEventListener = async () => {
            if (activeWallet) {
                try {
                    const ethProvider = await activeWallet.getEthereumProvider();
                    const provider = new ethers.BrowserProvider(ethProvider);
                    const contract = new ethers.Contract(CONTRACT_ADDRESS, MegaCanvasArtifact.abi, provider);

                    contract.on("PixelPainted", (x, y, color, painter) => {
                        console.log(`Event: Pixel (${x},${y}) painted by ${painter}`);

                        // Update canvas instantly via ref
                        if (rendererRef.current) {
                            rendererRef.current.updatePixel(Number(x), Number(y), Number(color));
                        }

                        // Update leaderboard real-time with animation logic
                        setLeaderboard((prev: any) => {
                            const shortPainter = `${painter.slice(0, 6)}...${painter.slice(-4)}`;
                            const exists = prev.find((u: any) => u.address === shortPainter);
                            let newList;
                            if (exists) {
                                newList = prev.map((u: any) =>
                                    u.address === shortPainter ? { ...u, pixels: u.pixels + 1 } : u
                                );
                            } else {
                                newList = [...prev, { address: shortPainter, pixels: 1 }];
                            }
                            // Sort by pixel count and keep top 10
                            return newList.sort((a: any, b: any) => b.pixels - a.pixels).slice(0, 10);
                        });

                        // Update livestream
                        setLiveStream(prev => [
                            { id: Date.now(), text: `[SYNC] ${painter.slice(0, 6)}... painted (${x},${y})` },
                            ...prev.slice(0, 9)
                        ]);
                    });

                    return () => {
                        contract.removeAllListeners("PixelPainted");
                    };
                } catch (e) {
                    console.error("Failed to setup event listener", e);
                }
            }
        };
        setupEventListener();
    }, [activeWallet]);

    // Initial Load & User Score Fetch
    useEffect(() => {
        const fetchUserData = async () => {
            if (activeWallet) {
                try {
                    const ethProvider = await activeWallet.getEthereumProvider();
                    const provider = new ethers.BrowserProvider(ethProvider);
                    const contract = new ethers.Contract(CONTRACT_ADDRESS, MegaCanvasArtifact.abi, provider);

                    const count = await contract.pixelCount(activeWallet.address);
                    if (Number(count) > 0) {
                        const shortAddr = `${activeWallet.address.slice(0, 6)}...${activeWallet.address.slice(-4)}`;
                        setLeaderboard([{ address: shortAddr, pixels: Number(count) }]);
                    }
                } catch (e) {
                    console.error("Initial score fetch fail", e);
                }
            }
            setLoading(false);
        };
        fetchUserData();
    }, [activeWallet]);


    const handlePixelClick = async (x, y, color) => {
        if (!authenticated) {
            alert("Please CONNECT TO PLAY first to join the game!");
            return;
        }

        try {
            // First display pending text 
            setLiveStream(prev => [
                { id: Date.now(), text: `⏳ Confirming Tx in Background: (${x},${y})` },
                ...prev.slice(0, 9)
            ]);

            // Simulate Account Abstraction seamless tx for smart wallets
            // In a real AA (Privy Server Wallet) this would send gaslessly via paymaster.
            // Balance Check
            if (parseFloat(balance) < 0.01) {
                setLiveStream(prev => [
                    { id: Date.now(), text: `[SYSTEM: ERROR] Insufficient ETH balance.` },
                    ...prev.slice(0, 9)
                ]);
                alert("Insufficient ETH! Please request test tokens from the faucet to paint.");
                return;
            }

            const isSmartWallet = activeWallet?.walletClientType === 'privy';

            // Fallback for direct Metamask connections (if not embedded)
            let provider, signer;

            if (isSmartWallet && activeWallet) {
                const ethProvider = await activeWallet.getEthereumProvider();
                provider = new ethers.BrowserProvider(ethProvider);
                signer = await provider.getSigner();
            } else if (window.ethereum) {
                provider = new ethers.BrowserProvider(window.ethereum);
                signer = await provider.getSigner();
            } else {
                alert("MetaMask (or a embedded wallet) not found!");
                return;
            }

            const network = await provider.getNetwork();

            // Try to force the correct network if mismatched
            if (Number(network.chainId) !== MEGAETH_CHAIN_ID) {
                try {
                    if (isSmartWallet && activeWallet) {
                        await activeWallet.switchChain(MEGAETH_CHAIN_ID);
                    } else if (window.ethereum) {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: ethers.toBeHex(MEGAETH_CHAIN_ID) }],
                        });
                    }
                } catch (switchError: any) {
                    alert("Please switch to MegaETH Testnet!");
                    return;
                }
            }

            const contract = new ethers.Contract(CONTRACT_ADDRESS, MegaCanvasArtifact.abi, signer);

            // 0.01 ETH fee defined in contract
            const tx = await contract.paint(x, y, color, { value: ethers.parseEther("0.01") });

            setLiveStream(prev => [
                { id: Date.now(), text: `[CMD: UPLOAD] TX Sent: Waiting for block...` },
                ...prev.slice(0, 9)
            ]);

            await tx.wait(1); // Wait for 1 block confirmation (10ms on MegaETH!)

            setLiveStream(prev => [
                { id: Date.now(), text: `[STATUS: OK] Pixel (${x},${y}) synced to on-chain.` },
                ...prev.slice(0, 9)
            ]);

        } catch (err: any) {
            console.error(err);
            setLiveStream(prev => [
                { id: Date.now(), text: `[SYSTEM: FAIL] Transaction rejected by client.` },
                ...prev.slice(0, 9)
            ]);
        }
    };



    if (loading) return <div className="cyber-loader">CONNECTING TO MEGAETH...</div>;

    return (
        <div className="mega-canvas-container">
            <div className="scanline"></div>

            {/* HUD Decoration Brackets */}
            <div className="hud-corner top-left"></div>
            <div className="hud-corner top-right"></div>
            <div className="hud-corner bottom-left"></div>
            <div className="hud-corner bottom-right"></div>

            {/* HUD Layer Overlaying the Canvas */}
            <div className="hud-layer">

                {/* Top Header */}
                <header className="cyber-header">
                    <img src={GameLogo} alt="MegaRplace Logo" className="game-logo" />
                    <div className="stats">
                        <span className="neon-blue">10ms BLOCK TIME</span>
                        <span className="neon-yellow">NEXT RESET: {timeLeft}</span>
                        <span className="neon-green">LIVE TX STREAM</span>
                    </div>

                    <div className="auth-section">
                        {authenticated && user ? (
                            <div className="action-buttons">
                                <div className="balance-display neon-yellow">
                                    {balance} ETH
                                </div>
                                <button
                                    className={`cyber-btn withdraw-btn ${parseFloat(balance) < 0.001 ? 'pulse highlight' : ''}`}
                                    onClick={() => {
                                        if (activeWallet) {
                                            navigator.clipboard.writeText(activeWallet.address);
                                            alert("Wallet address copied! Opening faucet in new tab...");
                                            window.open("https://testnet.megaeth.com/#2", "_blank");
                                        }
                                    }}
                                >
                                    💧 FAUCET
                                </button>
                                <button className="cyber-btn export-btn" onClick={exportWallet}>
                                    🔑 EXPORT KEY
                                </button>
                                {activeWallet && (
                                    <button className="cyber-btn highlight" onClick={() => {
                                        navigator.clipboard.writeText(activeWallet.address);
                                        alert("Wallet address copied to clipboard!");
                                    }}>
                                        📋 COPY WALLET ({activeWallet.address.slice(0, 6)}...)
                                    </button>
                                )}
                                <button className="cyber-btn disconnect-btn" onClick={logout}>
                                    ✕ DISCONNECT
                                </button>
                            </div>
                        ) : (
                            <button className="cyber-btn highlight" onClick={login}>
                                CONNECT TO PLAY
                            </button>
                        )}
                    </div>
                </header>

                {/* Color Picker Palette */}
                <div className="color-picker-sidebar">
                    {PALETTE.map((hex, i) => (
                        <div
                            key={i}
                            className={`color-swatch ${selectedColor === i ? 'active' : ''}`}
                            style={{ backgroundColor: `#${(hex >>> 8).toString(16).padStart(6, '0')}` }}
                            onClick={() => setSelectedColor(i)}
                        />
                    ))}
                </div>

                {/* Leaderboard & Live TX Stream Sidebar */}
                <div className="sidebar-right">

                    <div className="leaderboard-panel cyber-panel">
                        <h3 className="glitch" data-text="TOP PAINT MASTERS">TOP PAINT MASTERS</h3>
                        <ul>
                            {leaderboard.map((user: any, idx) => (
                                <li key={user.address} style={{ top: `${idx * 42}px` }}>
                                    <span className="rank">#{idx + 1}</span>
                                    <span className="address">{user.address}</span>
                                    <span className="score neon-yellow">{user.pixels}px</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="live-tx-stream cyber-panel mt-4">
                        <h3>🔴 LIVE TX STREAM</h3>
                        <div className="stream-content">
                            {liveStream.map(tx => (
                                <div key={tx.id} className="tx-item type-writer">
                                    {tx.text}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Background WebGL PixiJS Layer */}
            <div className="canvas-layer">
                <MegaCanvasRenderer
                    ref={rendererRef}
                    initialPixels={initialPixels}
                    onPixelClick={handlePixelClick}
                    selectedColor={selectedColor}
                />
            </div>
        </div>
    );
}
