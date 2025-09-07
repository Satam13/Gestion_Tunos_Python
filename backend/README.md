# Backend for Shift Management Application

This directory contains the Python Flask backend for the shift management application. Its purpose is to handle complex calculations, such as the equitable distribution of shifts.

## How to Run the Backend

To run the backend server, you need to have Python 3 installed. Follow these steps from the root directory of the project:

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a virtual environment (recommended):**
    This keeps the project's dependencies isolated from other Python projects on your system.
    ```bash
    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install the required dependencies:**
    The necessary libraries are listed in `requirements.txt`.
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Flask server:**
    This will start the backend server on your local machine.
    ```bash
    python app.py
    ```

The server will start and listen for requests on `http://127.0.0.1:5000`. The frontend application is configured to send requests to this address. You can now open the `index.html` file in your browser and use the "Calculate Equitable Distribution" feature.

To stop the server, press `Ctrl+C` in the terminal where it is running.
