import { GoogleGenAI } from "@google/genai";
import dirtyJSON from 'dirty-json';

const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
})

const MODEL_FALLBACK_HIERARCHY = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-pro-tts",
    "gemini-3-flash",
    "gemini-3-pro",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro"
];

// Reusable function to try multiple models sequentially on 429 quota errors
async function withModelFallback<T>(
    generateFn: (modelName: string) => Promise<T>,
    maxRetriesPerModel = 2,
    initialDelay = 1000
): Promise<T | null> {
    for (const modelName of MODEL_FALLBACK_HIERARCHY) {
        let retries = 0;
        
        while (retries < maxRetriesPerModel) {
            try {
                return await generateFn(modelName);
            } catch (error: any) {
                // If 429 error, sleep briefly and retry the SAME model (up to maxRetriesPerModel)
                if (error?.message?.includes('429')) {
                    const delay = initialDelay * Math.pow(2, retries);
                    console.warn(`[${modelName}] Rate Limit (429) hit. Retrying in ${delay}ms... (Attempt ${retries + 1}/${maxRetriesPerModel})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                } else {
                    // It's a different error (e.g. 400 Bad Request, 500 Server Error)
                    // Trying a new model won't fix a bad prompt, so just throw
                    throw error;
                }
            }
        }
        
        // If we broke out of the while loop, it means we exhausted retries on THIS model due to 429s.
        console.warn(`[${modelName}] Exhausted all retries. Falling back to next model...`);
    }
    
    console.error("All fallback models exhausted. Cannot fulfill request.");
    return null;
}

export async function askGemini(prompt: string, base64Image?: string, imageMimeType?: string, base64Document?: string, documentMimeType?: string) {
    try {
        const contents: any[] = [{ text: prompt }];

        if (base64Image && imageMimeType) {
            contents.push({
                inlineData: {
                    data: base64Image,
                    mimeType: imageMimeType,
                },
            });
        }

        if (base64Document && documentMimeType) {
            contents.push({
                inlineData: {
                    data: base64Document,
                    mimeType: documentMimeType,
                },
            });
        }

        return withModelFallback(async (modelName) => {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: contents,
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
            
            if (!text) {
                console.error("No JSON found in Gemini response");
                return null;
            }
            try {
                // Pre-process the text because Gemini sometimes returns invalid escape sequences inside JSON values
                // 1. Extract just the JSON object from the text in case Gemini added a preamble or markdown
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.error("No valid JSON structure found in Gemini text response:", text);
                    return null;
                }
                let sanitizedText = jsonMatch[0];
                
                // 2. Just aggressively wipe out weird rogue escapes like \e or \_ or \> that JSON hates
                sanitizedText = sanitizedText.replace(/\\e/g, 'e');
                sanitizedText = sanitizedText.replace(/\\_/g, '_');
                sanitizedText = sanitizedText.replace(/\\>/g, '>');
                sanitizedText = sanitizedText.replace(/\\</g, '<');
                
                // 4. Double escape backslashes so they survive the JSON.parse
                // Look for backslashes that are NOT followed by a valid JSON escape character (", \, /, b, f, n, r, t, u)
                sanitizedText = sanitizedText.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

                try {
                    return JSON.parse(sanitizedText) as { title: string, script: string, questions: any[] };
                } catch (firstError) {
                    console.warn(`Standard JSON.parse failed. Attempting dirty-json fallback...`);
                    // Fall back to dirty-json which is much more lenient about unquoted keys and single quotes
                    return dirtyJSON.parse(sanitizedText) as { title: string, script: string, questions: any[] };
                }
            } catch (e) {
                console.error("JSON Parse Error in Gemini response (even with dirty-json):", e);
                console.error("Original Text:", text);
                return null;
            }
        });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
}

export async function chatAboutReel(topicContext: string, userMessage: string, chatHistory: any[] = []) {
    try {
        const contents = [
            ...chatHistory,
            { role: "user", parts: [{ text: userMessage }] }
        ];

        // Note: For chat, we might want to stay on flash-8b if possible because it's fast,
        // but it's not in the fallback list. Let's let it fallback normally to guarantee delivery.
        return withModelFallback(async (modelName) => {
            const response = await ai.models.generateContent({
                model: modelName, 
                contents: contents,
                config: {
                    systemInstruction: `You are a helpful and engaging tutor on TikTok/Reels. The user is currently watching a short educational video about the following topic script:\n\n"${topicContext}"\n\nYour job is to answer the user's questions specifically related to this topic context. Keep your answers concise, friendly, and easy to read on a mobile screen. Do not use complex formatting.`,
                }
            });
            return response.text;
        });
    } catch (error) {
        console.error("Gemini Chat API Error:", error);
        return "Sorry, I'm having trouble connecting right now.";
    }
}

export async function generateQuizForReel(script: string) {
    try {
        return withModelFallback(async (modelName) => {
            const response = await ai.models.generateContent({
                model: modelName, 
                contents: [{ text: `Based on the following educational reel script, generate exactly 5 high-quality quiz-style multiple choice questions.
                For each question:
                1. Provide a clear question.
                2. Provide exactly 4 options.
                3. Identify the correct answer index (0, 1, 2, or 3).
                4. Provide a concise explanation (max 2 sentences) for why the answer is correct based on the script.

                RETURN THE RESULT ONLY AS A VALID JSON ARRAY OF OBJECTS. NO MARKDOWN, NO EXPLANATION TEXT OUTSIDE JSON.
                JSON structure:
                [
                  {
                    "question": "string",
                    "options": ["string", "string", "string", "string"],
                    "correctAnswerIndex": number,
                    "explanation": "string"
                  }
                ]

                Script:
                ${script}` }],
                config: {
                    responseMimeType: "application/json",
                }
            });
            
            const text = response.text || "";

            if (!text) return null;
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Quiz JSON Parse Error:", e, text);
                return null;
            }
        });
    } catch (error) {
        console.error("Gemini Quiz API Error:", error);
        return null;
    }
}