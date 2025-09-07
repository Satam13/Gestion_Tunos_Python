# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify
from flask_cors import CORS
from calculator_logic import shift_distribution_calculator

# Create Flask app
app = Flask(__name__)

# Apply CORS to allow requests from the frontend, which is likely served from a different origin
CORS(app)

@app.route('/api/calculate_distribution', methods=['POST'])
def calculate_distribution_endpoint():
    """
    API endpoint to calculate the equitable shift distribution.
    Expects a JSON payload with:
    - daysInMonth: integer
    - totalOperators: integer
    - shiftsConfig: list of objects, each with 'title', 'startTime', 'endTime', and 'operators'
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        # --- Extract and validate input ---
        days_in_month = data.get('daysInMonth')
        total_operators = data.get('totalOperators')
        shifts_config_raw = data.get('shiftsConfig')

        if not all([isinstance(days_in_month, int), isinstance(total_operators, int), isinstance(shifts_config_raw, list)]):
            return jsonify({"error": "Missing or invalid data types for daysInMonth, totalOperators, or shiftsConfig"}), 400

        if total_operators <= 0:
            return jsonify({"error": "Total operators must be greater than zero"}), 400

        # --- Process shift configs to calculate duration ---
        shifts_config_processed = []
        for config in shifts_config_raw:
            start_time_str = config.get('startTime')
            end_time_str = config.get('endTime')
            operators_per_shift = config.get('operators')

            if not all([start_time_str, end_time_str, operators_per_shift is not None]):
                continue # Skip configs with missing data

            try:
                # Calculate duration in hours
                start_h, start_m = map(int, start_time_str.split(':'))
                end_h, end_m = map(int, end_time_str.split(':'))

                start_total_hours = start_h + start_m / 60.0
                end_total_hours = end_h + end_m / 60.0

                duration = end_total_hours - start_total_hours
                if duration < 0:
                    duration += 24 # Handles overnight shifts

                shifts_config_processed.append({
                    "hours": duration,
                    "operators": int(operators_per_shift)
                })

            except (ValueError, TypeError) as e:
                # Log error for debugging but continue if possible
                print(f"Skipping invalid shift config: {config}. Error: {e}")
                continue

        if not shifts_config_processed:
            return jsonify({"error": "No valid shift configurations provided"}), 400

        # --- Call the calculation logic ---
        result = shift_distribution_calculator(days_in_month, total_operators, shifts_config_processed)

        return jsonify(result)

    except Exception as e:
        # Generic error handler for unexpected issues
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


if __name__ == '__main__':
    # Runs the app on http://127.0.0.1:5000
    # In a production environment, this would be run by a proper WSGI server like Gunicorn.
    app.run(debug=True, port=5000)
