// index.js
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// More detailed CORS configuration
app.use(cors({
    origin: '*', // During development, allow all origins
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.post('/learning_page', async (req, res) => {
    try {
        console.log('Received request:', req.body);

        const { topic, learning_style } = req.body;
        
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const prompt = `Generate a comprehensive and engaging explanation about ${topic}. 
                       The explanation should be detailed, clear, and suitable for a ${learning_style || 'comprehensive'} learning style.
                       Include key concepts, examples, and practical applications where relevant.`;

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        return res.json({ summary });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('GEMINI_API_KEY status:', !!process.env.GEMINI_API_KEY);
});