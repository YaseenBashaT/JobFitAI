const express = require('express');
const multer = require('multer');
const PDFParser = require("pdf2json");
const app = express();
const PORT = process.env.PORT || 3001;  // or your chosen port

// Logging middleware to see incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Configure Multer to store files in the 'uploads' folder
const upload = multer({ dest: 'uploads/' });

// Function to extract text from PDF using pdf2json
function extractTextFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    let pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", errData => {
      console.error("PDF Parsing error:", errData.parserError);
      reject(errData.parserError);
    });
    pdfParser.on("pdfParser_dataReady", pdfData => {
      // Log the full PDF data structure for debugging
      console.log("PDF Data Structure:", JSON.stringify(pdfData, null, 2));
      
      // Try to access pages from either pdfData.formImage.Pages or pdfData.Pages
      let pages;
      if (pdfData.formImage && pdfData.formImage.Pages) {
        pages = pdfData.formImage.Pages;
      } else if (pdfData.Pages) {
        pages = pdfData.Pages;
      } else {
        return reject("Unexpected PDF structure: " + JSON.stringify(pdfData));
      }
      
      // Extract text from the identified pages
      let text = pages.map(page => {
        return page.Texts.map(textItem => {
          // Ensure textItem.R exists and has at least one element
          if (textItem.R && textItem.R.length > 0) {
            return decodeURIComponent(textItem.R[0].T);
          }
          return "";
        }).join(" ");
      }).join("\n");
      resolve(text);
    });

    console.log("Loading PDF from:", filePath);
    pdfParser.loadPDF(filePath);
  });
}


// Updated /upload route with text extraction and simulated AI feedback
app.post('/upload', upload.single('resume'), async (req, res) => {
    if (!req.file) {
      return res.status(400).send({ message: 'Please upload a file' });
    }
    try {
      console.log("Received file upload:", req.file);
      console.log("Attempting to extract text from:", req.file.path);
      const extractedText = await extractTextFromPDF(req.file.path);
      console.log("Extracted text (first 100 chars):", extractedText.substring(0, 100));
      
      // Simulated AI feedback
      const simulatedFeedback = {
        textAnalysis: extractedText,
        suggestions: "The resume layout is clear, but consider improving margin spacing. The design is solid overall. (Simulated feedback)"
      };
      res.json(simulatedFeedback);
    } catch (error) {
      console.error("Error extracting text:", error);
      res.status(500).json({ error: "Failed to extract text from PDF", details: error });
    }
  });
  

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
