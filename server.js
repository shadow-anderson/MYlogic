const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

// Connect to the SQLite database
const db = new sqlite3.Database('./clinics.db');

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// API endpoint to get clinic names based on table selection
app.get('/get-clinics', (req, res) => {
    const tableName = req.query.table;

    const query = `SELECT Name FROM ${tableName}`;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(rows);
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
