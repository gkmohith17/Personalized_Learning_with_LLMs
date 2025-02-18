import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Initialize Replicate client with Mistral AI API key
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

app.post('/learning_page', async (req, res) => {
    try {
        console.log('Received request:', req.body); // Log incoming request

        const { topic, learning_style } = req.body;
        
        // Validate inputs
        if (!topic) {
            console.log('Missing topic in request');
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Check API key
        const replicateApiKey = process.env.REPLICATE_API_TOKEN;
        if (!replicateApiKey) {
            console.log('Missing Replicate API key');
            return res.status(500).json({ error: 'Replicate API key not configured' });
        }

        // Construct prompt
        const prompt = `Generate a comprehensive and engaging explanation about ${topic}. 
                       The explanation should be detailed, clear, and suitable for a ${learning_style || 'comprehensive'} learning style.
                       Include key concepts, examples, and practical applications where relevant.`;

        console.log('Sending request to Mistral AI API...'); // Log API request

        // Make request to Mistral AI
        const input = {
            prompt: prompt,
            max_new_tokens: 500, // Adjust as needed
            temperature: 0.7,
            top_p: 0.9
        };

        // Stream the response from Mistral AI
        let summary = '';
        for await (const event of replicate.stream("mistralai/mistral-7b-v0.1", { input })) {
            summary += event;
        }

        console.log('Generated summary:', summary);

        // Return the generated summary
        return res.json({ summary });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log('REPLICATE_API_TOKEN present:', !!process.env.REPLICATE_API_TOKEN);
});
