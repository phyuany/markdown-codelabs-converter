const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./db/codelabs.db');
        this.initialize();
    }

    initialize() {
        this.db.serialize(() => {
            this.db.run(`CREATE TABLE IF NOT EXISTS codelabs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_url TEXT UNIQUE NOT NULL,
                converted_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }

    storeToDatabase(originalUrl, convertedId, title, content) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO codelabs (original_url, converted_id, title, content, accessed_at) 
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [originalUrl, convertedId, title, content],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getFromDatabase(originalUrl) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM codelabs WHERE original_url = ?`,
                [originalUrl],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    getByConvertedId(convertedId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM codelabs WHERE converted_id = ?`,
                [convertedId],
                (err, row) => {
                    if (err) reject(err);
                    else {
                        if (row) {
                            this.db.run(
                                `UPDATE codelabs SET accessed_at = CURRENT_TIMESTAMP WHERE converted_id = ?`, 
                                [convertedId]
                            );
                        }
                        resolve(row);
                    }
                }
            );
        });
    }

    getAllRecords(limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM codelabs ORDER BY created_at DESC LIMIT ?`,
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new Database();
