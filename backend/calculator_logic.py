# -*- coding: utf-8 -*-

import math

def calculate_equitable_distribution(total_items, total_recipients):
    """
    Calculates how to distribute a number of items as equitably as possible.
    Returns a dictionary with the distribution details.
    """
    if total_recipients == 0:
        return {
            "base_items": 0,
            "higher_items": 0,
            "num_recipients_higher": 0,
            "num_recipients_base": 0,
        }

    base_items_per_recipient = math.floor(total_items / total_recipients)
    extra_items = total_items % total_recipients

    num_with_extra = extra_items
    num_with_base = total_recipients - extra_items

    return {
        "base_items": base_items_per_recipient,
        "higher_items": base_items_per_recipient + 1,
        "num_recipients_higher": num_with_extra,
        "num_recipients_base": num_with_base,
    }

def shift_distribution_calculator(days_in_month, total_operators, shifts_config):
    """
    Calculates the equitable distribution of shifts and returns the results as a dictionary.

    Args:
        days_in_month (int): The number of days for the calculation period.
        total_operators (int): The total number of operators in the team.
        shifts_config (list): A list of shift configuration dictionaries.
                              Each dict should have 'hours' and 'operators'.

    Returns:
        dict: A dictionary containing the full breakdown of the calculation.
    """
    results = {}
    total_service_hours = 0
    total_shifts_month = 0

    shifts_by_duration = {}

    for config in shifts_config:
        # Ensure 'hours' and 'operators' are numbers
        try:
            hours = float(config.get("hours", 0))
            operators_per_shift = int(config.get("operators", 0))
        except (ValueError, TypeError):
            hours = 0
            operators_per_shift = 0

        monthly_shifts = operators_per_shift * days_in_month
        monthly_hours = hours * monthly_shifts

        # Group by duration
        duration_key = str(int(hours))
        if duration_key not in shifts_by_duration:
            shifts_by_duration[duration_key] = {"total_shifts": 0, "hours": hours}

        shifts_by_duration[duration_key]["total_shifts"] += monthly_shifts
        total_service_hours += monthly_hours
        total_shifts_month += monthly_shifts

    # Calculate average hours and shifts per operator
    avg_hours_per_operator = total_service_hours / total_operators if total_operators > 0 else 0
    avg_shifts_per_operator = total_shifts_month / total_operators if total_operators > 0 else 0

    # Calculate distribution for each shift duration
    for duration, data in shifts_by_duration.items():
        total_shifts = data["total_shifts"]
        distribution = calculate_equitable_distribution(total_shifts, total_operators)
        data["distribution"] = distribution
        data["avg_shifts_per_operator"] = total_shifts / total_operators if total_operators > 0 else 0

    # --- Construct final results dictionary ---
    final_result = {
        "summary": {
            "days_in_period": days_in_month,
            "total_operators": total_operators,
            "total_service_hours": total_service_hours,
            "avg_hours_per_operator": round(avg_hours_per_operator, 2),
            "total_shifts": total_shifts_month,
            "avg_shifts_per_operator": round(avg_shifts_per_operator, 2),
        },
        "distribution_by_duration": shifts_by_duration
    }

    return final_result
