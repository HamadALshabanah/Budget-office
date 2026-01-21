# Budget Office - Personal Finance Tracker

A personal finance API built with **FastAPI** designed to automatically ingest, extract, and categorize expenses from SMS transaction notifications.

## 🚀 Features

* **SMS Parsing**: Automatically extracts the *Amount* and *Merchant* from bank SMS messages.
*  **Auto-Classification**: Uses a database-backed rule system to categorize merchants (e.g., "Al Nahdi" -> "Health").
*   **Learning System**: If a merchant is unknown, it saves the transaction as "Unclassified." You can then manually update it and create a rule for future transactions.
*   **Persistent Storage**: Stores all transaction history and classification rules in a SQLite database.

## 🛠️ Technology Stack

*   **Python 3.9+**
*   **FastAPI**: For the REST API.
*   **SQLAlchemy**: For database ORM.
*   **SQLite**: Lightweight database storage.
*   **Pydantic**: For data validation.

## 🏃‍♂️ How to Run

1.  **Install Dependencies**
    ```bash
    pip install fastapi uvicorn sqlalchemy pydantic
    ```

2.  **Start the Server**
    ```bash
    uvicorn main:app --reload
    ```

3.  **Access Documentation**
    Open your browser and navigate to:
    *   Swagger UI: `http://127.0.0.1:8000/docs`
    *   ReDoc: `http://127.0.0.1:8000/redoc`

## 📡 API Endpoints

### 1. Ingest SMS
**POST** `/sms/`
Simulates receiving an SMS. It parses the text and attempts to categorize it.
```json
{
  "message": "عملية شراء\nمبلغ: 50.00 SAR\nلدى: Al Nahdi"
}