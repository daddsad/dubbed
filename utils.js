require('dotenv').config();
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { execSync } = require("child_process");

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "zR7eV8hMFnxhSSAcCYW0"; // Puedes cambiar la voz

async function transcribeTranslateTTS(inputPath, outputPath) {
    // 1️⃣ Transcribir audio usando Whisper local o API
    console.log("Transcribiendo audio...");
    const transcriptionFile = path.join(__dirname, "temp_transcription.txt");
    execSync(`whisper ${inputPath} --model small --language auto --output_txt_dir ${__dirname}`);
    const transcription = fs.readFileSync(transcriptionFile, "utf-8");

    // 2️⃣ Traducir al español (simple con Google Translate API o librería)
    console.log("Traduciendo al español...");
    const translatedText = await translateToSpanish(transcription);

    // 3️⃣ Generar TTS con ElevenLabs
    console.log("Generando audio con ElevenLabs...");
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: "POST",
        headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: translatedText,
            voice_settings: { stability: 0.7, similarity_boost: 0.85 }
        })
    });

    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log("Doblaje completado: ", outputPath);
}

// Función simple de traducción usando API gratuita
async function translateToSpanish(text) {
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`);
    const data = await response.json();
    return data.responseData.translatedText || text;
}

module.exports = { transcribeTranslateTTS };
