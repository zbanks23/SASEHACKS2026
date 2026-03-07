import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
})

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

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: contents,
            config: {
                systemInstruction: "You are an expert scriptwriter for educational TikToks, Instagram Reels, and YouTube Shorts. Your job is to take the provided transcript, notes, or image and create multiple fast-paced, engaging, and highly informative 60-second video scripts based on each topic discussed in the notes or transcript. The scripts should start with a strong hook, strong explanation of the topic, and end with asking a question 'Now it's your turn: {question}' about the topic to make the viewer think about what they just learned/watched.\n\nCRITICAL FORMATTING RULES:\n1. Title each distinct video script as 'Topic 1', 'Topic 2', etc. (Do NOT use 'Video 1', 'Script 1', etc.).\n2. The output MUST be a clean, highly readable script for a human to follow along and read on screen. Do NOT include ANY internal director notes, TTS instructions, or syntax like '[ON-SCREEN: ... | AUDIO: ...]'.\n3. For any math symbols, formulas, or expressions, seamlessly integrate the actual formula into the text so it is easy to read directly (e.g., 'The equation E=mc² shows us that...'). Do NOT spell out the audio pronunciation.",
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
}