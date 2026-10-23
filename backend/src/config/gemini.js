const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ Cảnh báo: GEMINI_API_KEY chưa được thiết lập trong .env!');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

module.exports = ai;
