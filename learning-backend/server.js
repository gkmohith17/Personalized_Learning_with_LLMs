import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// Log all environment variables (for debugging)
console.log('Environment variables:', {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Present' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
});

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server is working',
        apiKeyStatus: process.env.GEMINI_API_KEY ? 'Present' : 'Missing'
    });
});

app.post('/learning_page', async (req, res) => {
    try {
        console.log('Received request:', req.body);

        const { topic, learning_style } = req.body;
        
        // Validate inputs
        if (!topic) {
            console.log('Missing topic in request');
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Check API key
        if (!process.env.GEMINI_API_KEY) {
            console.log('Missing Gemini API key');
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        // Construct prompt
        // In your server.js, update the prompt in the /learning_page endpoint:
        const prompt = `Generate a comprehensive and engaging explanation about ${topic}. 
        Please structure your response with:
        - A brief introduction paragraph
        - Key concepts as bullet points
        - Examples and applications as separate bullet points
        - A conclusion paragraph

        Make sure to use:
        • Bullet points for lists
        • Clear paragraph breaks between sections
        • Concise, clear language

        The explanation should be detailed, clear, and suitable for a ${learning_style || 'comprehensive'} learning style.`;

        console.log('Sending request to Gemini API...');

        // Get the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

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

// Updated /generate-quiz endpoint with better response handling

app.post('/generate-quiz', async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Updated prompt to ensure cleaner JSON response
        const prompt = `Generate 10 multiple choice questions about ${topic}.
        Respond ONLY with a JSON array containing the questions. No additional text, no markdown formatting, no backticks.
        Each question should be an object with exactly these fields:
        - question (string)
        - options (array of 4 strings)
        - correct (number 0-3)
        - explanation (string)
        
        Example format:
        [
          {
            "question": "What is...",
            "options": ["answer1", "answer2", "answer3", "answer4"],
            "correct": 0,
            "explanation": "This is correct because..."
          }
        ]`;

        // Get the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let responseText = response.text();

        // Clean up the response text
        // Remove any markdown formatting or additional text
        responseText = responseText.replace(/```json\n?/g, '')
                                 .replace(/```\n?/g, '')
                                 .trim();

        let quizData;
        try {
            // Parse the cleaned response text
            quizData = JSON.parse(responseText);
            
            // Validate the response structure
            if (!Array.isArray(quizData)) {
                throw new Error('Response is not an array');
            }

            if (quizData.length !== 10) {
                console.warn(`Expected 10 questions, got ${quizData.length}`);
                // If we got less than 10 questions, we'll still proceed but log a warning
            }

            // Validate each question
            quizData = quizData.map((q, index) => {
                // Verify required fields exist
                if (!q.question || !Array.isArray(q.options) || 
                    !q.options.length || typeof q.correct !== 'number' ||
                    !q.explanation) {
                    throw new Error(`Invalid question structure at index ${index}`);
                }

                // Ensure options array has exactly 4 items
                if (q.options.length !== 4) {
                    throw new Error(`Question ${index} must have exactly 4 options`);
                }

                // Ensure correct answer index is valid (0-3)
                if (q.correct < 0 || q.correct > 3) {
                    throw new Error(`Invalid correct answer index at question ${index}`);
                }

                return {
                    question: String(q.question),
                    options: q.options.map(String), // Ensure all options are strings
                    correct: Number(q.correct),
                    explanation: String(q.explanation)
                };
            });

        } catch (parseError) {
            console.error('Error parsing quiz data:', parseError);
            console.error('Raw response:', responseText);
            return res.status(500).json({ 
                error: 'Failed to generate valid quiz questions',
                details: parseError.message
            });
        }

        // Return the validated quiz data
        return res.json({ questions: quizData });

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
    console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    if (!process.env.GEMINI_API_KEY) {
        console.log('WARNING: GEMINI_API_KEY is not set. Please check your .env file.');
    }
});