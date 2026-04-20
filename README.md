# AI Triage System 🩺

[](https://opensource.org/licenses/MIT)
[](https://reactjs.org/)
[](https://www.python.org/)

> **Efficient. Intelligent. Life-Saving.** \> An automated patient prioritization system designed to reduce Emergency Room (ER) wait times and assist medical staff in identifying high-risk cases using Machine Learning.

-----

## 📌 Overview

In high-pressure medical environments, every second counts. The **AI Triage System** streamlines the patient intake process by analyzing vitals, symptoms, and medical history to provide an instantaneous "Urgency Score." This ensures that critical patients receive immediate attention while optimizing resource allocation for others.

### The Problem

  * **ER Overcrowding:** Subjective triage can lead to bottlenecks.
  * **Human Fatigue:** Manual assessments are prone to error during peak hours.
  * **Data Fragmentation:** Vitals are often recorded but not immediately analyzed for risk.

### The Solution

A digital-first approach that uses an AI engine to categorize patients into standardized triage levels (e.g., ESI 1-5), providing doctors with a real-time dashboard of the waiting room's clinical priority.

-----

## 🚀 Key Features

  * **Smart Intake Form:** Intuitive UI for capturing vitals and symptoms.
  * **Predictive Triage:** ML-driven classification based on historical clinical data.
  * **Real-time Dashboard:** A high-contrast clinical view for nurses and doctors to track patient status.
  * **Automated Red-Flagging:** Immediate alerts for life-threatening vitals (e.g., extreme tachycardia or low SpO2).
  * **Secure Data Handling:** HIPAA-inspired data structures for patient privacy.

-----

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS, Framer Motion (for smooth UI) |
| **Backend** | Python (FastAPI / Flask) |
| **Database** | Firebase (Real-time DB / Firestore) |
| **AI / ML** | Scikit-learn (Random Forest / Gradient Boosting), Pandas |
| **Deployment** | Vercel (Frontend), Railway/Render (Backend) |

-----

## 📁 Project Structure

```text
AI-Triage-System/
├── client/                # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Dashboard, Intake, Login
│   │   └── assets/        # Icons and design elements
│   └── tailwind.config.js
├── server/                # Python API
│   ├── app.py             # Main entry point
│   ├── models/            # Trained ML models (.pkl files)
│   └── routes/            # API endpoints (Triage logic, Auth)
├── data/                  # Datasets & Preprocessing scripts
├── docs/                  # Project documentation & images
├── .env.example           # Template for environment variables
└── README.md
```

-----

## ⚙️ Installation & Setup

1.  **Clone the repository**

    ```bash
    git clone https://github.com/Sanjeev864/AI-Triage-System.git
    cd AI-Triage-System
    ```

2.  **Frontend Setup**

    ```bash
    cd client
    npm install
    npm start
    ```

3.  **Backend Setup**

    ```bash
    cd server
    pip install -r requirements.txt
    python app.py
    ```

-----

## 🏆 Hackathon Spotlight

### 💡 The Vision

To bridge the gap between patient arrival and clinical intervention through explainable AI. We aim to move beyond "black-box" predictions by providing doctors with the *reasoning* behind every triage score.

### 🛑 Challenges Faced

  * **Data Imbalance:** Managing datasets where critical "Level 1" cases are rarer than routine "Level 4" cases.
  * **Latency:** Optimizing the ML inference to ensure the dashboard updates in near real-time.

### 🛤️ Future Roadmap

  * **Vitals Integration:** IoT support for direct data sync from wearable monitors.
  * **Multi-lingual Support:** NLP-driven intake forms for non-native speakers.
  * **Offline Mode:** Local-first syncing for disaster relief zones with poor connectivity.

-----

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.
