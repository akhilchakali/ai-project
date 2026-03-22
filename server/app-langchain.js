require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { ChatGroq } = require('@langchain/groq');

const app = express();
app.use(express.json());

app.use(cors({
    origin: ['http://localhost:3000']
}));

const dbpath = path.join(__dirname, 'employeesData.db');
let db = null;

// ✅ AI MODEL
let llm = null;

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbpath,
            driver: sqlite3.Database
        });

        console.log("Database Connected successfully");

        // FREE AI (Groq)
        llm = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            model: "llama-3.3-70b-versatile",
            temperature: 0,
        });

        console.log("AI Ready");

        app.listen(3200, () => {
            console.log("Server running at http://localhost:3200");
        });

    } catch (e) {
        console.error("Init Error:", e);
        process.exit(1);
    }
};

initializeDBAndServer();

app.post('/ask-employee-bot', async (req, res) => {

    const { userQuestion } = req.body || {};

    if (!userQuestion) {
        return res.status(400).json({ error: "Question is required" });
    }

    try {

        // Step 1: Generate SQL query
        const sqlResponse = await llm.invoke(`
                                                You are a SQL expert.
                                                Database Table: employee_salary
                                                Columns:
                                                EmployeeID, Name, Department, Experience_Years,
                                                Education_Level, Age, Gender, City, Monthly_Salary
                                                STRICT RULES:
                                                1. Only generate SELECT queries
                                                2. No explanation
                                                3. Do not use INSERT, UPDATE, DELETE, DROP
                                                Question: ${userQuestion}
                                            `);

        let sql = sqlResponse.content.trim();

        // Clean output (remove markdown if any)
        sql = sql.replace(/```sql|```/g, '').trim();

        console.log("Generated SQL:", sql);

        // Safety check
            if (!sql.toLowerCase().startsWith("select")) {
                return res.json({
                    error: "Only SELECT queries are allowed"
                });
            }

        // Step 2: Execute SQL
        const result = await db.all(sql);

        console.log("DB Result:", result);

        // Step 3: Explain result
        const explanation = await llm.invoke(`Explain this data in simple terms:${JSON.stringify(result)}`);

        res.json({
            sql,
            data: result,
            answer: explanation.content
        });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/employee-salary-data', async (req, res) => {
    try {
        const data = await db.all(`SELECT * FROM employee_salary`);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;