const express = require("express");
const axios = require("axios");
const app = express();


app.use(express.json());


const API_KEY = proccess.env.ELEVEN_LABS_API;

/**
 * Convert text to speech using Eleven Labs API.
 * @param {string} text - The text to convert to speech.
 * @returns {Promise<Buffer>} - The MP3 audio data as a buffer.
 */
async function textToSpeech(text,voice_ID) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_ID}`;

    const headers = {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
    };

    const data = {
        text: text,
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
        },
    };

    try {
        const response = await axios.post(url, data, {
            headers: headers,
            responseType: "arraybuffer", 
        });

        return response.data; 
    } catch (error) {
        console.error("Error calling Eleven Labs API:", error.response?.data || error.message);
        throw new Error("Failed to convert text to speech");
    }
}

/**
 * HTTP endpoint to convert text to speech and return the MP3 file.
 */
app.post("/text-to-speech", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const mp3Data = await textToSpeech(text);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", "attachment; filename=output.mp3");

        
        res.send(mp3Data);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
