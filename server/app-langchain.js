require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { ChatGroq } = require('@langchain/groq');
const { DynamicTool } = require('@langchain/core/tools');
const { createReactAgent } = require("@langchain/langgraph/prebuilt");

const app = express();
app.use(express.json());

app.use(cors({
    origin: ['http://localhost:3000']
}));

const dbpath = path.join(__dirname, 'employeesData.db');
let db = null;

// ✅ AI MODEL
let llm = null;

// ✅ AGENT
let agentExecutor = null;

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbpath,
            driver: sqlite3.Database
        });

        console.log("Database Connected successfully");

        // ✅ LLM
        llm = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            model: "llama-3.3-70b-versatile",
            temperature: 0,
        });

        console.log("AI Ready");

        // ✅ TOOL (DB QUERY)
        const dbTool = new DynamicTool({
            name: "employee_db_query",
            description: `
                Use this tool to query employee_salary table.
                Columns:
                EmployeeID, Name, Department, Experience_Years,
                Education_Level, Age, Gender, City, Monthly_Salary
                
                Only SELECT queries are allowed.
            `,
            func: async (query) => {
                try {
                    const cleanQuery = query.replace(/```sql|```/g, '').trim();

                    if (!cleanQuery.toLowerCase().startsWith("select")) {
                        return "Error: Only SELECT queries allowed";
                    }

                    const result = await db.all(cleanQuery);

                    return JSON.stringify(result);
                } catch (err) {
                    return "DB Error: " + err.message;
                }
            }
        });

        // ✅ AGENT INITIALIZATION
        agentExecutor = await createReactAgent({
            llm,
            tools: [dbTool],
        });

        console.log("Agent Ready");

        app.listen(3200, () => {
            console.log("Server running at http://localhost:3200");
        });

    } catch (e) {
        console.error("Init Error:", e);
        process.exit(1);
    }
};

initializeDBAndServer();


// ✅ AGENT API
app.post('/ask-employee-bot', async (req, res) => {

    const { userQuestion } = req.body || {};

    if (!userQuestion) {
        return res.status(400).json({ error: "Question is required" });
    }

    try {

        const response = await agentExecutor.invoke({
                messages: [
                    {
                        role: "user",
                        content: `
            You are an intelligent assistant.

            Use the tool to answer employee-related questions.

            Table: employee_salary
            Columns:
            EmployeeID, Name, Department, Experience_Years,
            Education_Level, Age, Gender, City, Monthly_Salary

            Question: ${userQuestion}
            `
                    }
                ]
            });

        res.json({
            answer: response.messages[response.messages.length - 1].content
        });

    } catch (error) {
        console.error("Agent Error:", error);
        res.status(500).json({ error: error.message });
    }
});


// ✅ NORMAL API (UNCHANGED)
app.get('/employee-salary-data', async (req, res) => {
    try {
        const data = await db.all(`SELECT * FROM employee_salary`);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;