require('dotenv').config();
const { ethers } = require('ethers');
const Redis = require('ioredis');
const WebSocket = require('ws');

// --- SETUP ---
// Connect to Redis: We use a raw Redis String to store the 1MB canvas dataset.
// A Redis string can be up to 512MB, so 1MB (1M pixels x 1 byte/pixel) is extremely fast.
const redis = new Redis(process.env.REDIS_URL);

// Connect to MegaETH RPC
const provider = new ethers.JsonRpcProvider(process.env.MEGAETH_RPC_URL);
const CANVAS_CONTRACT_ADDRESS = process.env.CANVAS_CONTRACT_ADDRESS;

// Minimal ABI for the event and leaderboard count
const abi = [
    "event PixelPainted(uint16 indexed x, uint16 indexed y, uint8 color, address indexed painter)",
    "function pixelCount(address) view returns (uint256)"
];
const contract = new ethers.Contract(CANVAS_CONTRACT_ADDRESS, abi, provider);

// WebSocket Server for Real-Time Broadcasting
const wss = new WebSocket.Server({ port: 8080 });

const REDIS_CANVAS_KEY = "megacanvas:v1:grid";
const REDIS_LEADERBOARD_KEY = "megacanvas:v1:leaderboard";

// Initialize Redis string if it doesn't exist
async function initRedis() {
    const exists = await redis.exists(REDIS_CANVAS_KEY);
    if (!exists) {
        // 1024 * 1024 = 1,048,576 pixels initialized to 0 (Black)
        const zeroBuffer = Buffer.alloc(1024 * 1024, 0);
        await redis.set(REDIS_CANVAS_KEY, zeroBuffer);
        console.log("Redis grid initialized.");
    }
}

// Broadcast helper for connected clients
function broadcast(messageObj) {
    const data = JSON.stringify(messageObj);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// --- INDEXER LOGIC ---
async function startIndexer() {
    console.log("Listening for PixelPainted events on MegaETH...");

    contract.on("PixelPainted", async (x, y, color, painter, event) => {
        // Calculate 1D index
        const pixelIndex = y * 1024 + x;

        // 1. UPDATE REDIS CANVAS CACHE
        // Use SETRANGE to update a single byte in the 1MB string in O(1) time
        // Buffer.from([color]) converts the 4-bit uint8 to a 1-byte buffer
        await redis.setrange(REDIS_CANVAS_KEY, pixelIndex, Buffer.from([color]));

        // 2. UPDATE LEADERBOARD (ZSET)
        // We increment the score natively in Redis
        const newScore = await redis.zincrby(REDIS_LEADERBOARD_KEY, 1, painter);

        // 3. BROADCAST TO WEBSOCKET CLIENTS
        // WebSockets handle the real-time "Stream" for the UI
        broadcast({
            type: "pixel_update",
            x, y, color, painter,
            timestamp: Date.now(),
            txHash: event.log.transactionHash
        });
    });
}

// --- WEBSOCKET API ---
wss.on('connection', async (ws) => {
    console.log("New client connected");

    // On connection, serve the FULL snapshot lightning fast from Redis
    try {
        const fullCanvasBuffer = await redis.getBuffer(REDIS_CANVAS_KEY);

        // We send binary data directly for maximum efficiency
        ws.send(fullCanvasBuffer, { binary: true });

        // Then send the top 10 leaderboard
        const topPainters = await redis.zrevrange(REDIS_LEADERBOARD_KEY, 0, 9, "WITHSCORES");
        const leaderboard = [];
        for (let i = 0; i < topPainters.length; i += 2) {
            leaderboard.push({
                address: topPainters[i],
                pixels: parseInt(topPainters[i + 1], 10)
            });
        }

        ws.send(JSON.stringify({ type: "leaderboard_init", data: leaderboard }));

    } catch (err) {
        console.error("Error serving initial state:", err);
    }
});

// Start the service
initRedis().then(startIndexer).catch(console.error);
