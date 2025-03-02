from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Border, Side, Alignment
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet
import re
import os

# NLTK Setup
nltk.download('punkt')
nltk.download('wordnet')
nltk.download('averaged_perceptron_tagger')

# Initialize Flask
app = Flask(__name__)
CORS(app)  # Allow React frontend to communicate with Flask backend

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Initialize lemmatizer
lemmatizer = WordNetLemmatizer()

# Stop words
stop_words = {"and", "for", "of", "by", "be", "the", "with", "in", "on", "at", "a", "an", "is", "to", "from", "or"}

# Helper Functions
def get_wordnet_pos(tag):
    if tag.startswith('J'):
        return wordnet.ADJ
    elif tag.startswith('V'):
        return wordnet.VERB
    elif tag.startswith('N'):
        return wordnet.NOUN
    elif tag.startswith('R'):
        return wordnet.ADV
    else:
        return wordnet.NOUN

def lemmatize_text_field(text):
    words = nltk.word_tokenize(text.lower())
    pos_tags = nltk.pos_tag(words)
    return " ".join([lemmatizer.lemmatize(word, get_wordnet_pos(tag)) for word, tag in pos_tags])

def reconstruct_and_remove_stop_words(description, naming_dict):
    if pd.isna(description) or not description:
        return ""
    words = lemmatize_text_field(description).split()
    words = [word for word in words if word not in stop_words]
    words = [re.sub(r'[^\w\s]', '', word) for word in words]
    target_parts = [naming_dict.get(word, word) for word in words]
    target_name = "_".join(target_parts)
    if any(term in description.lower() for term in ['guid', 'uid']):
        target_name = target_name.replace('guid', '').replace('uid', '').strip('') + '_id'
    return target_name.lower()

def generate_target_table_name(source_name, naming_dict):
    if pd.isna(source_name) or not isinstance(source_name, str):
        return ""
    parts = source_name.split("_")[1:]
    target_parts = [naming_dict.get(part.lower(), part.lower()) for part in parts]
    return "_".join(target_parts)

def process_files(s2t_path, naming_standards_path, output_path):
    try:
        s2t_df = pd.read_excel(s2t_path, engine='openpyxl')
        naming_standards_df = pd.read_excel(naming_standards_path, engine='openpyxl')
        
        # Ensure the necessary columns exist
        if 'Real Meaning' not in naming_standards_df.columns:
            raise ValueError("Naming Standards file must contain a 'Real Meaning' column.")
        
        # Create naming dictionary
        naming_dict = {}
        for _, row in naming_standards_df.iterrows():
            if len(row) < 2:
                raise ValueError("Each row in Naming Standards file must have at least two columns.")
            real_meaning = str(row['Real Meaning']).strip().lower()
            standard_name = str(row.iloc[1]).strip()
            naming_dict[real_meaning] = standard_name
        
        if 'Business Description' in s2t_df.columns:
            s2t_df['Target Column'] = s2t_df['Business Description'].apply(lambda x: reconstruct_and_remove_stop_words(x, naming_dict))
        if 'Source Table Name' in s2t_df.columns:
            s2t_df['Target Table'] = s2t_df['Source Table Name'].apply(lambda x: generate_target_table_name(x, naming_dict))
        
        s2t_df.to_excel(output_path, index=False)
        return output_path
    except Exception as e:
        raise Exception(f"Error processing files: {str(e)}")

@app.route('/')
def home():
    return "Flask Backend is Running!"

@app.route('/process', methods=['POST'])
def upload_files():
    if 's2t_file' not in request.files or 'naming_standards_file' not in request.files:
        return jsonify({"error": "Both S2T file and Naming Standards file are required."}), 400
    
    s2t_file = request.files['s2t_file']
    naming_standards_file = request.files['naming_standards_file']
    
    s2t_path = os.path.join(UPLOAD_FOLDER, s2t_file.filename)
    naming_standards_path = os.path.join(UPLOAD_FOLDER, naming_standards_file.filename)
    output_path = os.path.join(OUTPUT_FOLDER, "Processed_S2T.xlsx")
    
    s2t_file.save(s2t_path)
    naming_standards_file.save(naming_standards_path)
    
    try:
        processed_file = process_files(s2t_path, naming_standards_path, output_path)
        return jsonify({"message": "Processing complete", "download_url": f"/download?file={processed_file}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download', methods=['GET'])
def download_file():
    file_path = request.args.get('file')
    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "File not found."}), 404
    return send_file(file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
