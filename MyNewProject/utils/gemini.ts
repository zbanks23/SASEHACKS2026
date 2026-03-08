import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
})

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T | null> {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await fn();
        } catch (error: any) {
            if (error?.message?.includes('429') && retries < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, retries);
                console.warn(`Gemini Rate Limit (429) hit. Retrying in ${delay}ms... (Attempt ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
            } else {
                throw error;
            }
        }
    }
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

        return withRetry(async () => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: contents,
                config: {
                    systemInstruction: `You are an expert scriptwriter for educational TikToks, Instagram Reels, and YouTube Shorts. Your job is to take the provided transcript, notes, or image and create multiple fast-paced, engaging, and highly informative 60-second video scripts based on each topic discussed in the notes or transcript. The scripts should start with a strong hook, strong explanation of the topic, and end with asking a question 'Now it's your turn: {question}' about the topic to make the viewer think about what they just learned/watched.

                    CRITICAL FORMATTING RULES:
                    1. Title each distinct video script exactly as 'Topic X:' (e.g., 'Topic 1:', 'Topic 2:'). Do NOT use asterisks or markdown around the titles. Use 'Topic ' followed by the number and a colon.
                    2. The output MUST be a clean, highly readable script for a human to follow along and read on screen. Do NOT include ANY internal director notes, TTS instructions, or markdown formatting (no asterisks, bolding, etc.).
                    3. For any math symbols, formulas, or expressions, seamlessly integrate the actual formula into the text so it is easy to read directly (e.g., 'The equation E=mc² shows us that...'). Do NOT spell out the audio pronunciation.
                    4. For the ENTIRE set of topics, generate exactly 5 high-quality quiz-style multiple choice questions for the user to test their knowledge.
                    5. RETURN THE RESULT ONLY AS A VALID JSON OBJECT with the following structure:
                    {
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
                return JSON.parse(text) as { script: string, questions: any[] };
            } catch (e) {
                console.error("JSON Parse Error in Gemini response:", e, text);
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

        return withRetry(async () => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash", 
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
        return withRetry(async () => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash", 
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