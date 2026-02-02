import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { Message } from "../../shared/schema";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper to convert file to base64
function fileToGenerativePart(filePath: string, mimeType: string): Part {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType,
        },
    };
}

export async function generateChatResponse(history: Message[], newMessage: string, attachments: any[] = []) {
    try {
        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            })),
        });

        const parts: Part[] = [{ text: newMessage }];

        // Handle new attachments
        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                // Extract filename from URL (assuming /uploads/filename)
                const filename = att.url.split('/').pop();
                if (filename) {
                    const filePath = path.join(process.cwd(), 'uploads', filename);
                    if (fs.existsSync(filePath)) {
                        // Determine mime type based on extension or type
                        const mimeType = att.type === 'image' ? 'image/png' : // Simplify for now, detection could be better
                            att.type === 'video' ? 'video/mp4' : 'application/pdf';
                        // Note: We should store mimeType in DB really.

                        // Quick fix for mime detection
                        const ext = path.extname(filename).toLowerCase();
                        let finalMime = mimeType;
                        if (ext === '.jpg' || ext === '.jpeg') finalMime = 'image/jpeg';
                        if (ext === '.png') finalMime = 'image/png';
                        if (ext === '.webp') finalMime = 'image/webp';

                        parts.push(fileToGenerativePart(filePath, finalMime));
                    }
                }
            }
        }

        const result = await chat.sendMessageStream(parts);
        return result.stream;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
