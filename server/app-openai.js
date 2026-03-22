require('dotenv').config();

const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require('cors');

const { openai } = require('@ai-sdk/openai');
const { generateText, tool } = require('ai');
const { z } = require('zod');

const app = express();
app.use(express.json());

app.use(cors({
    origin: ['http://localhost:3000']
}));

const dbPath = path.join(__dirname, 'employeesData.db');
let db = null;

//
// ✅ Initialize DB & Server
//
const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        app.listen(3100, () => {
            console.log("Server running at http://localhost:3100");
        });

    } catch (e) {
        console.error("DB Error:", e.message);
        process.exit(1);
    }
};

initializeDBAndServer();

//
// ✅ Test API
//
app.get('/employee-salary-data', async (req, res) => {
    try {
        const data = await db.all(`SELECT * FROM employee_salary`);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//
// 🔥 AI SQL Agent API
//
app.post('/ask-employee-bot', async (req, res) => {

    const { userQuestion } = req.body || {};

    if (!userQuestion) {
        return res.status(400).json({ error: "Question is required" });
    }

    try {
        const { text } = await generateText({
            model: openai('gpt-4.1-mini'), // ✅ Updated model
            maxSteps: 5,

            system: `
                    You are a SQL expert.
                    Database Table: employee_salary
                    Columns:
                    EmployeeID, Name, Department, Experience_Years,
                    Education_Level, Age, Gender, City, Monthly_Salary
                    STRICT RULES:
                    1. Only generate SELECT queries.
                    2. Always use the 'runQuery' tool to fetch data.
                    3. Never use INSERT, UPDATE, DELETE, DROP.
                    4. After getting results, explain them in simple terms.
                    5. If no data found, say "No employees found matching that criteria."
                    `,

            prompt: userQuestion,

           tools: {
                runQuery: tool({
                    description: 'Execute SQL SELECT query',

                    // ✅ IMPORTANT: use "inputSchema" instead of "parameters"
                    inputSchema: z.object({
                        sql: z.string().describe("SQL SELECT query")
                    }),

                    execute: async ({ sql }) => {
                        console.log("Generated SQL:", sql);

                        if (!sql || !sql.toLowerCase().startsWith("select")) {
                            return "Only SELECT queries are allowed.";
                        }

                        try {
                            const result = await db.all(sql);
                            console.log("Result:", result);

                            return JSON.stringify(result);
                        } catch (err) {
                            return `Database Error: ${err.message}`;
                        }
                    },
                }),
            }
        });

        res.json({
            answer: text || "AI could not generate a response"
        });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;