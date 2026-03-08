require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
});

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`);
        const data = await response.json();
        const models = data.models.map(m => m.name.replace('models/', ''));
        console.log("AVAILABLE MODELS:");
        console.log(models.filter(m => m.includes('gemini')).join('\n'));
    } catch(e) {
        console.error(e);
    }
}
listModels();
