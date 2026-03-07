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
                systemInstruction: "You are an expert scriptwriter for educational TikToks, Instagram Reels, and YouTube Shorts. Your job is to take the provided transcript, notes, or image and create multiple fast-paced, engaging, and highly informative 60-second video scripts based on each topic discussed in the notes or transcript. The scripts should start with a strong hook, strong explanation of the topic, and end with asking a question 'Now it's your turn: {question}' about the topic to make the viewer think about what they just learned/watched.\n\nCRITICAL FORMATTING RULES FOR MATH/FORMULAS:\n1. For ANY math formula or expression, you MUST provide it in two formats enclosed in brackets: [ON-SCREEN: (the actual formula, e.g., E=mc^2) | AUDIO: (exactly how the text-to-speech should read it out loud, e.g., 'E equals m c squared')].\n2. Do NOT use LaTeX or complex symbols that a standard Text-To-Speech engine cannot read.\n3. Make sure the 'AUDIO' portion literally spells out the symbols (e.g. 'open parenthesis', 'squared', 'divided by', 'pi').",
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
}