import React, { useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";

// Animation variants for text typing and morph effect
const typingVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const morphVariants = {
  hidden: { clipPath: "circle(0% at 50% 50%)" },
  visible: {
    clipPath: "circle(100% at 50% 50%)",
    transition: { duration: 2, ease: "easeOut" },
  },
};

// Dropzone component for file upload
// Dropzone component for file upload
const Dropzone = ({ file, setFile, label }) => {
  const { getRootProps, getInputProps } = useDropzone({
    accept: ".xlsx",
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
  });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      <p>{file ? file.name : label}</p>
    </div>
  );
};


// Main FileUpload component
const FileUpload = () => {
  const [file1, setFile1] = useState(null);  // S2T Columns file state
  const [file2, setFile2] = useState(null);  // Naming Standards file state
  const [outputFile, setOutputFile] = useState(null);  // Output file state
  const [loading, setLoading] = useState(false);  // Loading state during file processing
  const [error, setError] = useState(null);  // Error state for any upload or processing issues

// Handle file upload and processing
const handleUpload = async () => {
  if (!file1 || !file2) {
    setError("Please upload both files.");
    return;
  }
  
  console.log(file1, file2, 'File upload original'); // Check if the files are available
  
  setLoading(true);
  const formData = new FormData();
  
  // Log file objects before appending them
  console.log("Appending files to FormData");
  console.log("File 1:", file1);
  console.log("File 2:", file2);
  
  // Append files to FormData
  formData.append("s2t_file", file1);  // Append S2T file
  formData.append("naming_standards_file", file2);  // Append Naming Standards file
  
  // Log FormData entries
  for (let pair of formData.entries()) {
    console.log(pair[0] + ': ' + pair[1].name);  // Log the field name and the file name
  }
  
  try {
    // POST request to Flask backend for file processing
    console.log("FormData:", formData); // Log FormData
    
    // Remove the Content-Type header to allow Axios to set it automatically
    const response = await axios.post("http://localhost:5000/process", formData);
  console.log("response:",response) 
    setOutputFile(response.data.download_url);  // Set output file path from backend response
  } catch (error) {
    console.error("Error uploading files", error);
    setError("File processing failed. Please try again.");
  } finally {
    setLoading(false);
  }
};


  
  return (
    <div className="container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
        body, html {
          margin: 0;
          padding: 0;
          background-color: rgb(174, 199, 231);
          color: white;
          font-family: 'Inter', sans-serif;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          padding: 20px;
        }
        .title {
          font-size: 3.5rem;
          font-weight: 600;
          margin-bottom: 20px;
          margin-top: 80px;
          color: black;
        }
        .description {
          font-size: 1.2rem;
          margin-bottom: 40px;
          max-width: 80%;
          text-align: center;
          color: black;
          transition: transform 0.3s ease, color 0.3s ease;
        }
        .description:hover {
          transform: scale(1.1);
          color: purple;
        }
        .dropzone-container {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }
        .dropzone {
          width: 300px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px dashed purple;
          border-radius: 20px;
          cursor: pointer;
          background-color: #23272a;
          transition: transform 0.3s ease, background-color 0.3s ease;
        }
        .dropzone:hover {
          transform: scale(1.1);
          background-color: #393e46;
        }
        .error-message {
          color: red;
          margin-bottom: 10px;
        }
        .process-button, .download-button {
          padding: 12px 24px;
          font-size: 1rem;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          background-color: #7289da;
          color: white;
          margin-top: 15px;
          transition: all 0.3s ease-in-out;
        }
        .process-button:hover, .download-button:hover {
          background-color: #5a6eb9;
        }
        .process-button:disabled {
          background-color: gray;
        }
      `}</style>

      {/* Title with animation */}
      <motion.h1 
        className="title" 
        variants={typingVariants}
        initial="hidden" 
        animate="visible"
      >
        {"S2T Generator".split(" ").map((word, i) => (
          <span key={i}>
            {word.split("").map((letter, j) => (
              <motion.span key={j} variants={letterVariants}>{letter}</motion.span>
            ))} 
          </span>
        ))}
      </motion.h1>

      {/* Description with morphing animation */}
      <motion.p 
        className="description" 
        variants={morphVariants}
        initial="hidden" 
        animate="visible"
      >
        This tool helps automate the process of generating standardized target columns and table names. Simply upload your S2T Columns file and Naming Standards file to begin.
      </motion.p>

      {/* Dropzones for file uploads */}
      <div className="dropzone-container">
        <Dropzone file={file1} setFile={setFile1} label="Upload S2T Columns File" />
        <Dropzone file={file2} setFile={setFile2} label="Upload Naming Standards File" />
      </div>

      {/* Error message */}
      {error && <p className="error-message">{error}</p>}

      {/* Upload button */}
      <motion.button 
        onClick={handleUpload} 
        disabled={loading} 
        className="process-button"
        whileHover={{ scale: 1.1, opacity: 0.9 }}
      >
        {loading ? "Processing..." : "Process"}
      </motion.button>

      {/* Download link for processed file */}
      {outputFile && (
        <a href={`http://localhost:5000/download/${outputFile}`} download className="download-button">
          Download Processed File
        </a>
      )}
    </div>
  );
};

export default FileUpload;
