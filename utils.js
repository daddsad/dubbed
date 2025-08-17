require('dotenv').config();
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const fetch = require("node-fetch");
const { execSync } = require("child_process");

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "zR7eV8hMFnxhSSAcCYW0"; // Cambiar voz si quieres

async function transcribeTranslateTTS(inputPath, outputPath) {
    const transcriptionFile = path.join(__dirname, `temp_transcription_${Date.now()}.txt`);
    let transcription = "";

    try {
        // 1️⃣ Transcribir audio usando Whisper
        console.log("Transcribiendo audio...");
        execSync(`whisper "${inputPath}" --model small --language auto --output_txt_dir "${__dirname}"`);
        transcription = fs.readFileSync(transcriptionFile, "utf-8").trim();
        if (!transcription) throw new Error("Transcripción vacía");
    } catch (err) {
        console.error("Error en transcripción:", err.message);
        throw new Error("No se pudo transcribir el audio");
    } finally {
        // Limpiar archivo de transcripción temporal si existe
        try { if (fs.existsSync(transcriptionFile)) await fsp.unlink(transcriptionFile); } catch {}
    }

    let translatedText = transcription;

    try {
        // 2️⃣ Traducir al español
        console.log("Traduciendo al español...");
        translatedText = await translateToSpanish(transcription);
        if (!translatedText) translatedText = transcription; // fallback
    } catch (err) {
        console.error("Error en traducción:", err.message);
    }

    try {
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

        if (!ttsResponse.ok) throw new Error(`ElevenLabs API error: ${ttsResponse.status} ${ttsResponse.statusText}`);
        const buffer = Buffer.from(await ttsResponse.arrayBuffer());
        await fsp.writeFile(outputPath, buffer);
        console.log("Doblaje completado:", outputPath);
    } catch (err) {
        console.error("Error generando TTS:", err.message);
        throw new Error("No se pudo generar el audio TTS");
    }
}

// Función de traducción simple con manejo de errores
async function translateToSpanish(text) {
    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`);
        const data = await response.json();
        return data?.responseData?.translatedText || text;
    } catch (err) {
        console.error("Error en translateToSpanish:", err.message);
        return text; // fallback al texto original
    }
}

module.exports = { transcribeTranslateTTS };
