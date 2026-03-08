require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");
const dirtyJSON = require('dirty-json');

const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
});

async function testPrompt() {
    const prompt = "How do you do the integration test for sequences and series in calc 2?";
    console.log("Sending prompt to Gemini...");
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [{ text: prompt }],
            config: {
                systemInstruction: `You are an expert scriptwriter for educational TikToks, Instagram Reels, and YouTube Shorts. Your job is to take the provided transcript, notes, or image and create multiple fast-paced, engaging, and highly informative 60-second video scripts based on each topic discussed in the notes or transcript. The scripts should start with a strong hook, strong explanation of the topic, and end with asking a question 'Now it's your turn: {question}' about the topic to make the viewer think about what they just learned/watched.

                CRITICAL FORMATTING RULES:
                1. Title each distinct video script exactly as 'Topic X:' (e.g., 'Topic 1:', 'Topic 2:'). Do NOT use asterisks or markdown around the titles. Use 'Topic ' followed by the number and a colon.
                2. The output MUST be a clean, highly readable script for a human to follow along and read on screen. Do NOT include ANY internal director notes, TTS instructions, or markdown formatting (no asterisks, bolding, etc.).
                3. For any math symbols, formulas, or expressions, seamlessly integrate the actual formula into the text so it is easy to read directly (e.g., 'The equation E=mc² shows us that...'). Do NOT spell out the audio pronunciation. CRITICAL: Provide all LaTeX equations escaped correctly for JSON. (e.g. use \\\\. instead of \\).
                4. For the ENTIRE set of topics, generate exactly 5 high-quality quiz-style multiple choice questions for the user to test their knowledge.
                5. RETURN THE RESULT ONLY AS A VALID JSON OBJECT with the following structure:
                {
                    "title": "A short, engaging 3-5 word summary of the overall topic discussed.",
                    "script": "The full combined text of all topic scripts, separated by double newlines. Make sure to include the 'Topic 1:' headers in this text.",
                    "questions": [
                        {
                            "question": "string",
                            "options": ["string", "string", "string", "string"],
                            "correctAnswerIndex": number,
                            "explanation": "string"
                        }
                    ]
                }
                DO NOT include any extra text or preamble.`,
                responseMimeType: "application/json",
            }
        });
        
        const text = response.text || "";
        console.log("\nRAW GEMINI RESPONSE:");
        console.log(text);
        
        console.log("\n--- STARTING PROCESSING ---");
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("❌ No valid JSON structure found in text.");
            return;
        }
        let sanitizedText = jsonMatch[0];
        
        sanitizedText = sanitizedText.replace(/\\e/g, 'e');
        sanitizedText = sanitizedText.replace(/\\_/g, '_');
        sanitizedText = sanitizedText.replace(/\\>/g, '>');
        sanitizedText = sanitizedText.replace(/\\</g, '<');
        
        sanitizedText = sanitizedText.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        
        try {
            const parsed = JSON.parse(sanitizedText);
            console.log("✅ SUCCESS: Parsed with standard JSON.parse!");
            console.log("Title extracted:", parsed.title);
        } catch (firstError) {
            console.log("⚠️ Standard JSON.parse failed. Trying dirty-json...");
            try {
                const parsedDirty = dirtyJSON.parse(sanitizedText);
                console.log("✅ SUCCESS: Parsed with dirty-json fallback!");
                console.log("Title extracted:", parsedDirty.title);
            } catch (dirtyError) {
                console.error("❌ Both parsers failed!");
                console.error("Standard error:", firstError.message);
                console.error("Dirty error:", dirtyError.message);
                console.error("Sanitized Text causing error:\n", sanitizedText);
            }
        }
        
    } catch (e) {
        console.error("API call failed:", e);
    }
}

testPrompt();
