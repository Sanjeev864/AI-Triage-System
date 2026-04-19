"""
Sepsis Early Warning using SIRS criteria
(Systemic Inflammatory Response Syndrome)
"""


def check_sepsis_risk(vitals: dict) -> dict:
    """
    SIRS criteria — 2 or more = sepsis risk
    1. Temperature > 38.3°C or < 36°C
    2. Heart Rate > 90 bpm
    3. Respiratory Rate > 20 /min
    4. Altered consciousness
    """
    sirs_met = []

    temp = vitals.get('temperature', 37.0)
    if temp > 38.3 or temp < 36.0:
        sirs_met.append({
            'criterion': 'Abnormal Temperature',
            'value': f"{temp}°C",
            'threshold': '>38.3 or <36.0°C'
        })

    hr = vitals.get('heart_rate', 80)
    if hr > 90:
        sirs_met.append({
            'criterion': 'Tachycardia',
            'value': f"{hr} bpm",
            'threshold': '>90 bpm'
        })

    rr = vitals.get('respiratory_rate', 16)
    if rr > 20:
        sirs_met.append({
            'criterion': 'Tachypnea',
            'value': f"{rr} /min",
            'threshold': '>20 /min'
        })

    conscious = vitals.get('conscious_level', 0)
    if conscious >= 1:
        sirs_met.append({
            'criterion': 'Altered Consciousness',
            'value': ['Alert','Voice','Pain','Unresponsive'][conscious],
            'threshold': 'Not Alert'
        })

    spo2 = vitals.get('oxygen_saturation', 98)
    sbp = vitals.get('systolic_bp', 120)

    count = len(sirs_met)
    risk_level = 'none'
    if count >= 2:
        if sbp < 90 or spo2 < 90:
            risk_level = 'critical'
        elif count >= 3:
            risk_level = 'high'
        else:
            risk_level = 'moderate'

    return {
        'sirs_count': count,
        'sirs_criteria_met': sirs_met,
        'risk_level': risk_level,
        'flag': risk_level in ['high', 'critical'],
        'message': _get_message(risk_level, count)
    }


def _get_message(risk_level, count):
    if risk_level == 'critical':
        return 'SEPSIS CRITICAL — Hypotension + SIRS. Immediate IV access, blood cultures, broad-spectrum antibiotics.'
    elif risk_level == 'high':
        return f'SEPSIS HIGH RISK — {count}/4 SIRS criteria met. Order blood cultures, lactate, CBC. Consider early antibiotics.'
    elif risk_level == 'moderate':
        return f'SEPSIS WATCH — {count}/4 SIRS criteria met. Monitor closely. Re-assess in 15 minutes.'
    return 'No sepsis indicators.'
