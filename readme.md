# DataVista AI — Intelligent Data Visualization Dashboard

DataVista AI is a web-based data analytics and visualization platform that helps users upload CSV datasets, explore data, view statistical summaries, and understand patterns through interactive charts.

## ✨ Features

- **CSV Upload:** Upload CSV files and preview dataset records.
- **Data Analysis:** Calculate row counts, column counts, and numeric statistics.
- **Interactive Visualizations:** Explore data using interactive Plotly charts.
- **Dataset Exploration:** View dataset columns, records, and numeric summaries.
- **Quick Insights:** Display useful information derived from uploaded data.
- **Export Options:** Export available analysis results and CSV data.
- **Responsive Dashboard:** Clean dashboard interface designed for different screen sizes.
- **Backend API:** FastAPI endpoints for CSV upload and analysis.
- **Authentication API:** Backend signup and login endpoints using password hashing and JWT tokens.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development server and build tool |
| CSS | Responsive styling |
| Plotly.js | Interactive charts |
| Python | Backend programming |
| FastAPI | REST API development |
| Pandas | CSV processing and data analysis |
| MongoDB Atlas | Cloud database for user accounts |
| PyMongo | MongoDB integration |
| PyJWT | JWT token generation |
| pwdlib | Password hashing and verification |

## 📁 Project Structure

```text
ai-data-visualization/
├── backend/
│   ├── main.py
│   └── .env                 # Local secrets; do not upload
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Login.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

*This structure describes the intended main files. Keep it aligned with the actual project folders.*

## ⚙️ Requirements

Install the following before running the project:

- Node.js and npm
- Python 3
- A MongoDB Atlas account for backend authentication features

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd ai-data-visualization
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Set up the backend

Open a terminal in the project folder:

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
pip install fastapi uvicorn pandas python-multipart python-dotenv "pwdlib[argon2]" PyJWT pymongo email-validator
```

### 3. Configure environment variables

Create `backend/.env` locally:

```env
JWT_SECRET=YOUR_RANDOM_SECRET
MONGODB_URI=YOUR_MONGODB_ATLAS_URI
MONGODB_DATABASE=datavista
```

Replace the placeholders with your own values. Never commit real credentials, tokens, or database connection strings to GitHub.

### 4. Run the backend

From the `backend` directory:

```bash
python -m uvicorn main:app --reload
```

Backend URL: `http://127.0.0.1:8000`

Interactive API documentation: `http://127.0.0.1:8000/docs`

### 5. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API status |
| GET | `/health` | Health check |
| POST | `/upload-csv` | Upload a CSV and retrieve a preview |
| POST | `/analyze-csv` | Analyze CSV data and return statistics |
| POST | `/signup` | Create an account |
| POST | `/login` | Verify credentials and return a JWT |

For request formats and response examples, run the backend and visit `/docs`.

## 🔐 Security Notes

- Store secrets in local environment variables, not in source code.
- Keep `.env` files out of version control.
- Passwords should be stored as hashes, never as plaintext.
- JWT-protected routes should validate tokens before returning protected data.
- The frontend login interface still needs integration with the backend authentication APIs before it can be described as fully functional authentication.
- Configure MongoDB Atlas network access carefully.

## 🧪 Current Project Status

The project includes CSV upload and analysis APIs, an interactive dashboard, and backend signup/login endpoints. Frontend-to-backend authentication integration and additional testing may still be required.

## 🎯 Project Goals

- Make dataset exploration accessible through a visual interface.
- Simplify common numeric analysis tasks.
- Provide interactive charts for understanding data.
- Build practical experience with full-stack development and data analytics.

## 👩‍💻 Author

**Khushi Pandey**  
BCA Student | Aspiring Developer

---

*Built as a learning project to explore full-stack development, data analytics, and interactive visualization.*
