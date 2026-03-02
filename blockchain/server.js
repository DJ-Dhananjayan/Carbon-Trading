const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory ledger (simulates Hyperledger Fabric)
const ledger = {};

function generateTxId() {
    return crypto.randomBytes(32).toString('hex');
}

// POST /api/credits — Create carbon credit on blockchain
app.post('/api/credits', (req, res) => {
    const { creator_id, species, carbon_value, carbon_points } = req.body;
    const assetId = `CREDIT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const txId = generateTxId();

    ledger[assetId] = {
        asset_id: assetId,
        creator_id,
        owner_id: creator_id,
        species,
        carbon_value,
        carbon_points,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        history: [
            { tx_id: txId, action: 'CREATE', by: creator_id, timestamp: new Date().toISOString() }
        ]
    };

    console.log(`[BLOCKCHAIN] Credit created: ${assetId}, tx: ${txId}`);
    res.json({ transaction_id: txId, asset_id: assetId, status: 'committed' });
});

// POST /api/transfer — Transfer credit ownership
app.post('/api/transfer', (req, res) => {
    const { asset_id, from_owner, to_owner } = req.body;
    const txId = generateTxId();

    if (ledger[asset_id]) {
        ledger[asset_id].owner_id = to_owner;
        ledger[asset_id].history.push({
            tx_id: txId, action: 'TRANSFER', from: from_owner, to: to_owner,
            timestamp: new Date().toISOString()
        });
        console.log(`[BLOCKCHAIN] Transfer: ${asset_id} from ${from_owner} to ${to_owner}`);
        res.json({ transaction_id: txId, asset_id, new_owner: to_owner, status: 'committed' });
    } else {
        // create it if missing
        ledger[asset_id] = {
            asset_id, owner_id: to_owner, status: 'ACTIVE', created_at: new Date().toISOString(),
            history: [{ tx_id: txId, action: 'TRANSFER', from: from_owner, to: to_owner, timestamp: new Date().toISOString() }]
        };
        res.json({ transaction_id: txId, asset_id, new_owner: to_owner, status: 'committed' });
    }
});

// GET /api/credits/:assetId — Query credit
app.get('/api/credits/:assetId', (req, res) => {
    const asset = ledger[req.params.assetId];
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
});

// GET /api/ledger — List all assets
app.get('/api/ledger', (_req, res) => {
    res.json({ assets: Object.values(ledger), total: Object.keys(ledger).length });
});

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'greencoins-blockchain', ledger_size: Object.keys(ledger).length });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Blockchain service running on port ${PORT}`));
