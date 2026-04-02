# AI-Powered SQL Assistant (LangChain + LLM + Node.js)

## Overview
AI-powered backend system that converts **natural language queries into SQL queries** and retrieves data from a relational database.

Built using **LangChain + LLM (Groq - LLaMA 3.3)** with a secure execution layer to ensure safe database access.

## Key Features

- Natural Language → SQL Query Conversion  
- AI Agent using LangChain (ReAct pattern)  
- Secure Query Execution (Only SELECT allowed)  
- Dynamic Data Retrieval from SQLite Database  
- Human-readable AI-generated responses  
- REST API for seamless integration  

## Tech Stack

- **Backend**: Node.js, Express.js  
- **AI/LLM**: LangChain, Groq (LLaMA 3.3-70B)  
- **Database**: SQLite  
- **Agent System**: LangGraph ReAct Agent  
- **Tools**: DynamicTool (LangChain)  

## How It Works

1. User sends a natural language question  
2. LangChain Agent processes the query  
3. Agent decides to use the **DB tool**  
4. Generates SQL query dynamically  
5. Executes query securely (only SELECT allowed)  
6. Returns structured + human-readable response  

---

##  Example

### Input:
