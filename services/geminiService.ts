import { GoogleGenAI, Modality } from "@google/genai";

// A helper to create a new GoogleGenAI instance.
const getAiInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an image using the Imagen model.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Image generation failed:", error);
        throw error;
    }
};

// --- Audio Helper Functions ---

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
): Promise<AudioBuffer> {
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


/**
 * Generates speech from text using the TTS model.
 */
export const generateSpeech = async (text: string, audioContext: AudioContext): Promise<AudioBuffer> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }

        const decodedBytes = decode(base64Audio);
        return await decodeAudioData(decodedBytes, audioContext);

    } catch (error) {
        console.error("Speech generation failed:", error);
        throw error;
    }
};