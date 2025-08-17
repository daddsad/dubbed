require('dotenv').config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const cors = require("cors");
const { transcribeTranslateTTS } = require("./utils");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/dubbed", express.static(path.join(__dirname, "dubbed")));

app.post("/dub", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL requerida" });

    try {
        const tempAudioPath = path.join(__dirname, "temp_audio.mp3");

        // Descargar audio de YouTube
        const stream = ytdl(url, { filter: "audioonly" });
        const writeStream = fs.createWriteStream(tempAudioPath);
        stream.pipe(writeStream);

        writeStream.on("finish", async () => {
            try {
                const outputFileName = `dubbed_${Date.now()}.mp3`;
                const outputPath = path.join(__dirname, "dubbed", outputFileName);

                // Transcribir, traducir y generar TTS solo con ElevenLabs
                await transcribeTranslateTTS(tempAudioPath, outputPath);

                fs.unlinkSync(tempAudioPath); // Limpiar temporal

                res.json({ audioUrl: `http://localhost:5000/dubbed/${outputFileName}` });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Error generando doblaje" });
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error procesando video" });
    }
});

app.listen(5000, () => console.log("Backend ElevenLabs escuchando en http://localhost:5000"));
