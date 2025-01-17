import express from 'express'; 
import sqlite3 from 'sqlite3'; 
import bodyParser from 'body-parser'; 
import fetch from 'node-fetch'; // Import fetch for making API calls
import http from 'http'; // Import http for creating the server
import { Server } from 'socket.io'; // Import socket.io for WebSocket communication

const app = express();
const PORT = 3000;

// Configure Hugging Face API key
const HUGGING_FACE_API_KEY = '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'; // Replace with your Hugging Face API key

// Connect to SQLite Database
const db = new sqlite3.Database('./clinics.db');

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const io = new Server(server);

// Conversation state (for tracking each user's progress)
let conversationState = {}; // Use user's IP as the key for session tracking

// WebSocket connection handler
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('chat message', async (msg) => {
        console.log('Received message from client:', msg);
        const userIp = socket.id;

        // Initialize or get user conversation state
        if (!conversationState[userIp]) {
            conversationState[userIp] = {
                step: 0,
                treatmentType: null,
                location: null,
            };
        }

        const userState = conversationState[userIp];
        let systemContext = "";

        // Conversation flow logic
        switch (userState.step) {
            case 0: // Ask for treatment type
                systemContext = "What type of treatment are you looking for? (Dental, IVF, Hair Transplant, Cosmetic)";
                if (msg.match(/(dental|ivf|hair|cosmetic)/i)) {
                    userState.treatmentType = msg.toLowerCase();
                    userState.step++;
                    systemContext = `You selected ${userState.treatmentType} treatment. Now, can you please share your location?`;
                }
                socket.emit('chat message', { sender: 'AI', message: systemContext });
                break;

            case 1: // Ask for location
                userState.location = msg;
                userState.step++;
                systemContext = `You are looking for ${userState.treatmentType} treatment in ${userState.location}. Please wait while I fetch recommendations.`;
                socket.emit('chat message', { sender: 'AI', message: systemContext });

                // Fetch recommendations immediately after asking for location
                let tableName;
                switch (userState.treatmentType) {
                    case 'dental':
                        tableName = 'dendata';
                        break;
                    case 'ivf':
                        tableName = 'ivfdata';
                        break;
                    case 'hair':
                        tableName = 'hairdata';
                        break;
                    case 'cosmetic':
                        tableName = 'cosdata';
                        break;
                    default:
                        socket.emit('chat message', { sender: 'AI', message: "Invalid treatment type." });
                        return;
                }

                const query = `
                    SELECT Name, Fulladdress, "Average Rating", "Review Count"
                    FROM ${tableName}
                    WHERE Fulladdress LIKE ?`;
                const queryParams = [`%${userState.location}%`];

                // Send progress update to the client
                socket.emit('chat message', { sender: 'System', message: 'Searching for clinics in the database...' });

                console.time('Database Query Time');
                db.all(query, queryParams, (err, rows) => {
                    console.timeEnd('Database Query Time');
                    if (err) {
                        console.error("Database Error:", err);
                        socket.emit('chat message', { sender: 'System', message: 'Error fetching clinics.' });
                        return;
                    }

                    if (rows.length > 0) {
                        const clinicList = rows
                            .map((row, index) => `
                                <div class="clinic">
                                    <strong><u>${index + 1}. ${row.Name}</u></strong><br>
                                    ${row.Fulladdress || 'N/A'}<br>
                                    <span class="rating">Rated: ${row["Average Rating"] || 'N/A'}/5</span><br>
                                    <span class="reviews">Reviews: ${row["Review Count"] || 'N/A'}</span>
                                </div>
                            `)
                            .join("<br>");

                        systemContext = `Here are some clinics that match your criteria:<br>${clinicList}`;
                    } else {
                        systemContext = "No clinics found matching your criteria. Please try again with different details.";
                    }

                    // Send final update to the client
                    socket.emit('chat message', { sender: 'System', message: 'Recommendations found.' });
                    socket.emit('chat message', { sender: 'AI', message: systemContext });

                    // Reset conversation state after completion
                    delete conversationState[userIp];
                });
                break;

            default:
                systemContext = "The conversation is complete.";
                socket.emit('chat message', { sender: 'AI', message: systemContext });
                break;
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});