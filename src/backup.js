import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import mammoth from "mammoth";
import { read, utils } from "xlsx";
import "pdfjs-dist/build/pdf.worker";

import Image from "../src/images/chatBotImg.webp"

const GOOGLE_API_KEY = "AIzaSyB-4gjYzQiXWk595DfoIz7SkOHrGKGVz-w"; // Replace with your Google API Key
const GOOGLE_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";

function App() {
  const [files, setFiles] = useState([]);
  const [documentText, setDocumentText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const extractText = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = async (event) => {
        if (file.type === "application/pdf") {
          const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item) => item.str).join(" ") + " ";
          }
          resolve(text);
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
          resolve(result.value);
        } else if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
          const workbook = read(event.target.result, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const csv = utils.sheet_to_csv(sheet);
          resolve(csv);
        } else {
          resolve("Unsupported file format.");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    setLoading(true);
    let text = "";
    for (const file of files) {
      text += await extractText(file) + " ";
    }
    setDocumentText(text);
    setLoading(false);
  };

  const handleAsk = async () => {
    if (!documentText) return;
    setLoading(true);

    const requestBody = {
      model: "models/gemini-1.5-pro",
      contents: [{
        parts: [{ text: `Based on the document: ${documentText}\n\nQ: ${question}\nA:` }]
      }]
    };

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      setAnswer(data?.candidates?.[0]?.content?.parts?.[0]?.text || "No relevant answer found.");
    } catch (error) {
      console.error("Error fetching answer:", error);
      setAnswer("Error retrieving answer.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.body}>
      <div style={styles.chatContainer}>
        <h1 style={styles.header}>Chat with Documents</h1>
        
        {/* File Upload Section */}
        <div style={styles.uploadSection}>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            style={styles.fileInput}
          />
          <button onClick={handleUpload} style={styles.uploadButton}>Upload</button>
        </div>

        {/* Document Text Display */}
        <textarea
          value={documentText}
          readOnly
          rows="5"
          cols="50"
          style={styles.textarea}
        />
        
        {/* Question Section */}
        <div style={styles.questionSection}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question"
            style={styles.questionInput}
          />
          <button onClick={handleAsk} style={styles.askButton}>Ask</button>
        </div>

        {/* Loading State */}
        {loading && <div style={styles.loading}>Loading...</div>}

        {/* Answer Section */}
        <h3 style={styles.answerHeader}>Answer: {answer}</h3>
      </div>
    </div>
  );
}

// Styles
const styles = {
  body: {
    display: "flex",
    backgroundImage: `url(${Image})`,
    backgroundSize: "cover",
    backgroundPosition: "100px -45px",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
    justifyContent: "space-between",
    position: "relative"
  },
  chatContainer: {
    left: "15%",
    top: "15%",
    position: "absolute",
    width: "30%",
    maxHeight: "500px",
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Light translucent background
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  },
  header: {
    textAlign: "center",
    color: "#333",
    fontSize: "2em",
    marginBottom: "20px",
  },
  uploadSection: {
    textAlign: "center",
    marginBottom: "20px",
  },
  fileInput: {
    padding: "10px",
    fontSize: "16px",
  },
  uploadButton: {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    marginLeft: "10px",
    backgroundColor: "#FF4081", // Unique color (pinkish)
    color: "white",
    border: "none",
    borderRadius: "5px",
    transition: "background-color 0.3s ease",
  },
  uploadButtonHover: {
    backgroundColor: "#D500F9", // Hover effect (purple)
  },
  textarea: {
    width: "100%",
    marginTop: "10px",
    padding: "10px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    resize: "vertical",
    backgroundColor: "#F3F3F3", // Light gray
  },
  questionSection: {
    textAlign: "center",
    marginTop: "20px",
  },
  questionInput: {
    padding: "10px",
    fontSize: "16px",
    width: "60%",
    marginRight: "10px",
    borderRadius: "5px",
  },
  askButton: {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#6200EA", // Unique color (purple)
    color: "white",
    border: "none",
    borderRadius: "5px",
    transition: "background-color 0.3s ease",
  },
  askButtonHover: {
    backgroundColor: "#3700B3", // Hover effect (darker purple)
  },
  loading: {
    textAlign: "center",
    fontSize: "18px",
    color: "#2196F3",
  },
  answerHeader: {
    marginTop: "20px",
    fontSize: "18px",
    color: "#333",
    textAlign: "center",
  },
  chatbotImageContainer: {
    width: "40%",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  chatbotImage: {
    width: "80%", // Adjust size as needed
    height: "auto",
  },
};

export default App;
