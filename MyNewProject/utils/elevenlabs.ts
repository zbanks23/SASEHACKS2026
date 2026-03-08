import * as FileSystem from 'expo-file-system/legacy';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;

// Default voice ID: "JBFqnCBsd6RMkjVDRZzb" (George - American) or any other. Let's use a standard one.
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; 

export async function generateTTS(text: string, index: number, voiceId: string = DEFAULT_VOICE_ID): Promise<string | null> {
    if (!ELEVENLABS_API_KEY) {
        console.error("ElevenLabs API Key is missing.");
        return null;
    }

    try {
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        
        // Define where we'll download the file permanently
        const fileUri = `${FileSystem.documentDirectory}tts_${index}_${Date.now()}.mp3`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_flash_v2_5",
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    resolve(dataUrl.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Verify the file was actually saved
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (fileInfo.exists) {
                console.log(`✅ [ElevenLabs] Successfully generated and saved audio to: ${fileUri}`);
                console.log(`✅ [ElevenLabs] File size: ${fileInfo.size} bytes`);
            } else {
                console.warn(`⚠️ [ElevenLabs] Audio seemed to download, but file not found at: ${fileUri}`);
            }

            return fileUri;
        } else {
            console.error("ElevenLabs API Error:", response.status, await response.text());
            return null;
        }

    } catch (error) {
        console.error("Error generating TTS:", error);
        return null;
    }
}
