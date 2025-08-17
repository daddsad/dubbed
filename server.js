require('dotenv').config();
const express = require("express");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const ytdl = require("ytdl-core");
const cors = require("cors");
const { transcribeTranslateTTS } = require("./utils");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/dubbed", express.static(path.join(__dirname, "dubbed")));

// Función auxiliar para validar URL de YouTube
const isValidYouTubeUrl = (url) => {
    return ytdl.validateURL(url);
};

app.post("/dub", async (req, res) => {
    const { url } = req.body;
    if (!url || !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: "URL de YouTube inválida" });
    }

    const timestamp = Date.now();
    const tempAudioPath = path.join(__dirname, `temp_audio_${timestamp}.mp3`);
    const outputFileName = `dubbed_${timestamp}.mp3`;
    const outputPath = path.join(__dirname, "dubbed", outputFileName);

    let stream;
    let writeStream;

    try {
        // Descargar audio de YouTube
        stream = ytdl(url, { filter: "audioonly" });
        writeStream = fs.createWriteStream(tempAudioPath);

        stream.pipe(writeStream);

        // Esperar que termine la descarga
        await new Promise((resolve, reject) => {
            stream.on("error", reject);
            writeStream.on("error", reject);
            writeStream.on("finish", resolve);
        });

        // Transcribir, traducir y generar TTS
        await transcribeTranslateTTS(tempAudioPath, outputPath);

        // Limpiar temporal
        await fsp.unlink(tempAudioPath);

        res.json({ audioUrl: `https://dubbed.onrender.com/dubbed/${outputFileName}` });
    } catch (err) {
        console.error("Error procesando video:", err);

        // Intentar limpiar archivo temporal si existe
        try {
            if (fs.existsSync(tempAudioPath)) await fsp.unlink(tempAudioPath);
        } catch (cleanupErr) {
            console.error("Error limpiando archivo temporal:", cleanupErr);
        }

        res.status(500).json({ error: "Error generando doblaje" });
    }
});

// Manejo de rutas no existentes
app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
});

app.listen(5000, () => console.log("Backend ElevenLabs escuchando en http://localhost:5000"));
