# CivicFlo 🏙️

**"Turning Citizen Noise into Civic Intelligence"**

CivicFlo is an AI-driven Progressive Web App (PWA) that transforms citizen reports into a prioritized, actionable task list for city authorities.

## 🚀 Key Features

*   **🧠 AI Visual Validation**: Automatically identifies issues (potholes, trash, etc.) using YOLOv8.
*   **📍 Geospatial Deduplication**: Prevents duplicate tickets by clustering nearby reports (within 10m).
*   **🚦 Auto-Prioritization**: Ranks issues based on severity, votes, and age.
*   **📊 Live Dashboard**: Real-time heatmap and priority queue for authorities.
*   **📋 Kanban Workflow**: Drag-and-drop style board for authorities to manage ticket status (Received -> Verifying -> In Progress -> Fixed).
*   **🏆 Civic Karma**: Gamification system rewarding citizens for valid reports (Observer -> Guardian).
*   **🌙 Dark Mode**: Fully responsive UI with dark mode support.

---

## 🛠️ Prerequisites

*   Node.js (v18+)
*   Python (v3.9+)
*   MongoDB (Optional - System falls back to In-Memory mode if not available)

---

## 📦 Installation & Setup

### 1. Backend (Node.js)

```bash
cd server
npm install
# Start the server (runs on port 4000)
node server.js
```
*Note: If MongoDB is not running locally on port 27017, the server will automatically start in **Demo (In-Memory)** mode.*

### 2. AI Service (Python)

```bash
# Open a new terminal
# Create virtual env (if not already done)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install flask ultralytics torch requests pymongo python-dotenv flask-cors

# Start the service (runs on port 5000)
python ai_service/app.py
```

### 3. Frontend (Next.js PWA)

```bash
# Open a new terminal
cd client
npm install
# Start the development server (runs on port 3000)
npm run dev
```

---

## 📱 How to Demo

1.  **Open the App**: Go to `http://localhost:3000` (or the port shown in terminal).
2.  **Report an Issue**:
    *   Click the camera icon.
    *   Upload an image (e.g., a photo of a pothole, trash, or car).
    *   The AI will analyze it. If valid, it submits.
3.  **Test Deduplication**:
    *   Upload the **same image** (or another image) while staying in the **same location** (simulated or real GPS).
    *   The system should say "Duplicate report found" and increment the vote count instead of creating a new ticket.
4.  **View Dashboard**:
    *   Check the **Priority Queue** to see issues ranked by importance.
    *   Toggle **Map View** / **Kanban Board** to see the authority interface.
    *   In Kanban view, click "Next" to move tickets through the workflow.
5.  **Check Karma**:
    *   See your **Civic Karma** score increase with each report.
6.  **Toggle Theme**:
    *   Use the Moon/Sun icon in the header to switch between Light and Dark modes.

---

## 🏗️ Architecture

*   **Frontend**: Next.js, Tailwind CSS, Leaflet Maps
*   **Backend**: Express.js, MongoDB (or In-Memory), Multer
*   **AI Microservice**: Python Flask, YOLOv8 (Object Detection)

## ⚠️ Notes for Hackathon

*   **Data Persistence**: If MongoDB is not connected, data is stored in memory and will be lost if the backend server restarts.
*   **AI Model**: Uses `yolov8n` (nano) for speed. First run will download the model weights (~6MB).
