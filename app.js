const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// Hugging Face API details
const HF_API_URL = "https://api.llamaapi.com/v1/text ";
const HF_API_KEY = LA-ee8f7241321f441a80c7e97ef876b10c8a7301d4b34f43c4ad558c827591f791
;

app.post('/generate-summary', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: "Topic is required" });
        }

        const response = await axios.post(
            HF_API_URL,
            { inputs: `Summarize this topic: ${topic}` },
            { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
        );

        res.json({ summary: response.data[0].summary_text });
    } catch (error) {
        console.error("Error generating summary:", error);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
