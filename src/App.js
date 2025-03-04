import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import mammoth from "mammoth";
import { read, utils } from "xlsx";
import "pdfjs-dist/build/pdf.worker";
import "./App.css"; // Import the CSS file

const GOOGLE_API_KEY = "AIzaSyB-4gjYzQiXWk595DfoIz7SkOHrGKGVz-w"; // Replace with your Google API Key

function App() {
  const [files, setFiles] = useState([]);
  const [documentText, setDocumentText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (selectedFiles.some((file) => !allowedTypes.includes(file.type))) {
      setError("Only PDF, DOCX, and XLSX files are allowed.");
      return;
    }
    setError("");
    setFiles(selectedFiles);
  };

  const extractText = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = async (event) => {
        if (file.type === "application/pdf") {
          const pdf = await pdfjsLib.getDocument({
            data: event.target.result,
          }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item) => item.str).join(" ") + " ";
          }
          resolve(text);
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const result = await mammoth.extractRawText({
            arrayBuffer: event.target.result,
          });
          resolve(result.value);
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
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
    if (files.length === 0) {
      setError("Please upload at least one file.");
      return;
    }
    setError("");
    setLoading(true);
    let text = "";
    for (const file of files) {
      text += (await extractText(file)) + " ";
    }
    setDocumentText(text);
    setLoading(false);
  };

  const handleAsk = async () => {
    if (!documentText) {
      setError("Please upload a document before asking a question.");
      return;
    }
    if (!question.trim()) {
      setError("Question cannot be empty.");
      return;
    }
    setError("");
    setLoading(true);

    const requestBody = {
      model: "models/gemini-1.5-pro",
      contents: [
        {
          parts: [
            {
              text: `Based on the document: ${documentText}\n\nQ: ${question}\nA:`,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();
      const generatedAnswer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No relevant answer found.";
      setAnswer(generatedAnswer);
      setHistory([...history, { question, answer: generatedAnswer }]);
    } catch (error) {
      console.error("Error fetching answer:", error);
      setAnswer("Error retrieving answer.");
    }
    setLoading(false);
  };

  return (
    <div className="body">
      <div className="chatContainer">
        <h1 className="header">GenieChat</h1>

        {loading && <div className="loading">Loading...</div>}
        <div className="historySection">
          <ul>
            {history.map((entry, index) => (
              <li key={index}>
                <div className="questionCls">
                  {entry.question}
                </div>
                <div className="answerCls">
                  <p className="message-text">{entry.answer}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="questionSection">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question"
            className="questionInput"
          />
          <button onClick={handleAsk} className="askButton">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              stroke="white"
              fill="none"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="uploadFileOption">
          <div>
            <div className="upload-container">
              <label className="upload-box" for="fileUpload">
                <img src="https://cdn-icons-png.flaticon.com/512/748/748113.png" alt="Upload Icon" />
              </label>
              <input type="file" title="Choose File" onChange={handleFileChange} className="file-input" />
            </div>
            {/* <span>Choose file</span> */}

          </div>


          <div >
            <div className="uploadSection">

              <button onClick={handleUpload} title="Upload" className="uploadButton">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="white"
                >
                  <path d="M5 20h14v-2H5v2Zm7-18-5 5h3v6h4V7h3l-5-5Z" />
                </svg>
              </button>
            </div>
            {/* <span>Upload</span> */}

          </div>
          <div>
            <div className="uploadSection">
              <button title="Reference" className="uploadButton">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="white"
                >
                  <path d="M11 9h2v6h-2V9Zm0 8h2v2h-2v-2ZM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8Z" />
                </svg>

              </button>
            </div>
            {/* <span>Info</span> */}

          </div>
        </div>
        
        <textarea value={documentText} readOnly rows="5" cols="50" className="textarea" />
      </div>
    </div>
  );
}

export default App;
