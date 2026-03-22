const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 =  require('sqlite3')

const {ChatGroq} = require('@langchain/groq')

const app = express()
app.use(express.json())

let dbpath =  path.join(__dirname, 'employeesData.db')

let db = null 

let llm = null 

const initializeDBAndServer = async () => {
    try{
        db = await open({
            filename: dbpath,
            driver: sqlite3.Database,
        })

        app.listen(3500, () => {
            console.log("DB connected successfully")
        })

        llm = new ChatGroq({
            apiKey:process.env.ChatGroq,
            model:'llama-3.3-70b-versatile',
            temperature:0,
        })

        
    }

    catch(error){
        console.log(error.message)
    }
}

initializeDBAndServer();

