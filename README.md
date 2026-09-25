# Project Pragati 🚀

Project Pragati is a comprehensive web platform designed to analyze, predict, and monitor infrastructure project metrics, with a specialized focus on **Cost Overrun Prediction** using Machine Learning. It integrates a fast, interactive frontend dashboard with a powerful AI-driven backend.

## 🌟 Key Features
- **Predictive Analytics**: Machine learning models (Scikit-Learn) predict potential cost overruns for ongoing projects.
- **Explainable AI (XAI)**: Utilizes SHAP to explain exactly which factors are driving the predicted cost overruns.
- **Generative AI Insights**: Integrates Google GenAI (Gemini) to extract metrics and provide intelligent insights from unstructured project data.
- **Interactive Dashboard**: Modern UI built with React, Vite, and Tailwind CSS.
- **Data Visualization**: Rich geospatial visualizations with React Simple Maps and data charts using Recharts.
- **Secure Data Management**: Powered by Supabase for authentication and PostgreSQL data storage.

## 🛠️ Tech Stack

### Frontend
- **React & Vite**: Core framework and bundler for a blazing fast UI.
- **Tailwind CSS**: Utility-first CSS for styling.
- **Recharts & React Simple Maps**: For data and geographical visualizations.
- **Framer Motion**: For smooth UI animations.

### Backend & Machine Learning
- **FastAPI & Uvicorn**: High-performance Python backend API.
- **Scikit-Learn & PyTorch**: Core machine learning frameworks.
- **SHAP**: For model interpretability.
- **Google GenAI (Gemini API)**: For unstructured data analysis.
- **SQLAlchemy & PostgreSQL**: Database ORM and relational database management.

## 📁 Project Structure
```text
Project_Pragati/
├── backend/                   # FastAPI Server & ML Pipelines
│   ├── api/                   # API endpoints
│   ├── ml_pipeline/           # ML models, training, and evaluation (Cost Overrun)
│   ├── data_extraction/       # Data ingestion scripts
│   ├── requirements.txt       # Python dependencies
│   └── run_api.sh             # Backend startup script
├── src/                       # React Frontend Source Code
│   ├── components/            # Reusable UI components
│   ├── services/              # API and Supabase integrations
│   └── App.tsx                # Main React component
├── public/                    # Static assets
├── package.json               # Node.js dependencies
└── README.md                  # Project documentation
```

## ⚙️ Prerequisites
Before running the project locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python 3.9+](https://www.python.org/downloads/)
- [Supabase Account](https://supabase.com/)

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd Project_Pragati
```

### 2. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Create a .env.local file and add your Supabase and Gemini API keys (see .env.example)

# Start the frontend development server
npm run dev
```

### 3. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
./run_api.sh
# Alternatively: uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

## 🌐 Usage
- Access the frontend dashboard at `http://localhost:5173`
- Access the backend API interactive documentation (Swagger UI) at `http://127.0.0.1:8000/docs`
