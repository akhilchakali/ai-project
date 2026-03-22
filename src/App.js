import React from "react";
import { useState, useEffect } from "react";

const Aiporject = () => {
const [data,setData] = useState()
useEffect(() => {
  async function fetchData() {
    const response = await fetch('http://localhost:3100/data') 
    const text = await response.text(); 
      setData(text);
    
  }
  fetchData();
}, []);
return (
  <div>
    <h1>AI Powered Project</h1>
    <p>{data}</p>
  </div>
)
}

export default Aiporject