require('dotenv').config();
const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const cors= require('cors')

const {google, createGoogleGenerativeAI} = require('@ai-sdk/google')
const {generateText, tool} = require('ai')
const {z} = require('zod')

const app= express()
app.use(express.json())

app.use(cors({
    origin:['http://localhost:3000']
}))

const dbpath = path.join(__dirname,'employeesData.db')
let db = null

const initializeDBAndServer = async () => {
try{

    db= await open({
        filename:dbpath,
        driver:sqlite3.Database
    });

    app.listen(3100, ()=>{
        console.log("Database Connected successfully")
    });

}catch(e){
    console.log(e.name)
    process.exit(1)
}
}

initializeDBAndServer()

app.get('/employee-salary-data', async (req, res) => {
    
    const employeeSalaryData = `
    select * from employee_salary;`
    
    const employeeSalary= await db.all(employeeSalaryData)
    res.send(employeeSalary)
})

app.post('/ask-employee-bot', async (req, res) => {
    const clientApiKey = req.headers['x-api-key'];
    const { userQuestion } = req.body;

    if (!clientApiKey) {
        return res.status(401).json({ error: "API key missing" });
    }

    try {
        const customGoogle = createGoogleGenerativeAI({ apiKey: clientApiKey });

        const { text } = await generateText({
            model: customGoogle('models/gemini-1.5-flash'),  // gemini-2.0-flash-001
            maxSteps: 5,
            experimental_retry: { 
                maxRetries: 2,
                initialDelayInMs: 2000 
            },
            system: `You are a SQL expert.
            Database Table: 'employee_salary'
            Columns: EmployeeID, Name, Department, Experience_Years, Education_Level, Age, Gender, City, Monthly_Salary.
            
            STRICT RULES:
            1. Use 'runQuery' to fetch data.
            2. You MUST provide the SQL query as a string argument named 'sql'.
            3. After getting results, summarize them naturally for the user.
            4. If the database returns an empty list, say "No employees found matching that criteria."`,
            prompt: userQuestion,
            tools: {
                runQuery: tool({
                    description: 'Execute a SQL SELECT query',
                    parameters: z.object({
                        sql: z.string().describe('The SELECT statement to run'),
                    }),
                    execute: async ({ sql }) => {
                        // FIX: Check if sql is actually provided
                        if (!sql) {
                            console.log("Error: AI called tool without SQL");
                            return "Error: SQL query was undefined. Please try again.";
                        }
                        
                        console.log("Agent is running SQL:", sql);
                        const result = await db.all(sql);
                        console.log("Database returned:", result);
                        return JSON.stringify(result);
                    },
                }),
            }
        });

        res.json({ answer: text || "The AI was unable to generate a response." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


module.exports= app