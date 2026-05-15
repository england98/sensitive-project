import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(rootDir, 'public')));

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL_HERE') 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;

/**
 * POST /api/analyze
 * Analyzes the sentiment of provided text using OpenAI.
 */
app.post('/api/analyze', async (req, res) => {
    const { text } = req.body;

    // 1. Validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: '분석할 텍스트를 입력해 주세요.' });
    }

    if (text.length > 1000) {
        return res.status(400).json({ error: '텍스트는 1000자 이내로 입력해 주세요.' });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
        return res.status(500).json({ error: 'OpenAI API 키가 설정되지 않았습니다. 서버 설정을 확인해 주세요.' });
    }

    try {
        // 2. OpenAI Request (Structured Output)
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use a fast and cost-effective model
            messages: [
                {
                    role: "system",
                    content: "너는 한국어 텍스트 감성 분석기다. 결과를 반드시 JSON 형식으로 출력한다. 사용자 텍스트를 positive, negative, neutral 중 하나로 분류한다. confidence는 0부터 100 사이의 정수로 작성한다. reason은 한국어로 한 문장만 작성한다. 과장하지 말고 텍스트 근거만 사용한다."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Basic normalization check
        if (!['positive', 'negative', 'neutral'].includes(result.sentiment)) {
            result.sentiment = 'neutral';
        }

        // 3. Supabase Logging (Async, don't block response)
        if (supabase) {
            supabase.from('sentiment_logs').insert([
                {
                    input_text: text,
                    sentiment: result.sentiment,
                    confidence: result.confidence,
                    reason: result.reason
                }
            ]).then(({ error }) => {
                if (error) console.error('Supabase logging error:', error);
            });
        } else {
            console.warn('Supabase not configured, skipping log storage.');
        }

        // 4. Return result
        res.json(result);

    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ error: '감성 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    if (!supabase) {
        console.warn('Warning: Supabase is not connected. Logs will not be saved.');
    }
});
