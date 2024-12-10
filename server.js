const http = require('http');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');
dotenv.config();

// Initialiser OpenAI-klienten
const openai = new OpenAI({ apiKey: process.env.API_KEY });

let documents = []; // Lager til dokumenter

// Funktion til at læse og ekstrahere tekst fra PDF-filer
async function loadPDFDocuments() {
    const pdfFiles = ['./docs/9000-120-02-Didaktiske-Design-Overvejelser-1.pdf', './docs/Faglaerer-i-Haeren.pdf', './docs/Instruktoervirke-i-Forsvaret.pdf']; // Angiv dine PDF-filer her
    for (const filePath of pdfFiles) {
        const fileBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(fileBuffer);
        documents.push({ id: filePath, content: pdfData.text });
    }
    console.log('PDF-dokumenter indlæst:', documents.map(doc => doc.id));
}

// Funktion til at finde relevante tekstuddrag baseret på brugerens forespørgsel
function findRelevantContent(query, documents) {
    return documents
        .map(doc => {
            const match = doc.content.includes(query) ? doc.content : '';
            return { id: doc.id, content: match };
        })
        .filter(result => result.content);
}

// Funktion til at håndtere AI-svar med PDF-kontekst
async function getAIResponse(query) {
    const relevantContent = findRelevantContent(query, documents)
        .map(doc => doc.content)
        .join('\n\n'); // Saml al relevant tekst

    const prompt = `Dokumenter:\n${relevantContent}\n\nSpørgsmål: ${query}`;

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: `Du er en AI-kadet, der besvarer spørgsmål baseret på de ${documents} du har tilgængelig.`},
            { role: "user", content: prompt },
            {role: "assistant", content: "Jeg har gennemgået de relevante dokumenter for at besvare dit spørgsmål. Mit svar er baseret på information fra disse dokumenter."}
        ]
    });

    return completion.choices[0].message.content;
}

// Start serveren
const server = http.createServer(async (req, res) => {
    // Serve static files
    if (req.method === 'GET') {
        const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
        const extname = path.extname(filePath);
        let contentType = 'text/html';

        if (extname === '.js') contentType = 'text/javascript';
        else if (extname === '.css') contentType = 'text/css';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }

    // Handle chat API
    if (req.method === 'POST' && req.url === '/chat') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { message } = JSON.parse(body);

                // Få svar fra AI med dokumentkontekst
                const aiResponse = await getAIResponse(message);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: aiResponse }));
            } catch (error) {
                console.error('Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
        });
    }
});

// Indlæs PDF-dokumenter, før serveren starter
loadPDFDocuments().then(() => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
