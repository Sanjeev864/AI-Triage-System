from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import numpy as np
import joblib
import uuid
from datetime import datetime
import os, sys

sys.path.insert(0, os.path.dirname(__file__))
from utils.preprocess import FEATURE_NAMES, CHIEF_COMPLAINTS
from utils.sepsis import check_sepsis_risk
from utils.nlp_parser import parse_complaint
from utils.report_generator import generate_handover_report

app = Flask(__name__)
app.config['SECRET_KEY'] = 'triage-secret-2024'
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# ── Load model ────────────────────────────────────────────────────────────────
print("Loading triage model...")
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model')
try:
    model   = joblib.load(f'{MODEL_PATH}/triage_model.pkl')
    scaler  = joblib.load(f'{MODEL_PATH}/scaler.pkl')
    print("Model loaded OK")
except Exception as e:
    print(f"Model not found — run train_model.py first: {e}")
    model = scaler = None

# ── In-memory stores ───────────────────────────────────────────────────────────
patient_queue   = []      # active patients
audit_log       = []      # all triage events
vitals_history  = {}      # {patient_id: [vitals_snapshots]}
beds            = {
    'icu': {'total': 6,  'occupied': 4},
    'emergency': {'total': 12, 'occupied': 7},
    'general': {'total': 20, 'occupied': 15},
    'observation': {'total': 8, 'occupied': 3},
}
shift_stats = {
    'total': 0, 'immediate': 0, 'urgent': 0,
    'less_urgent': 0, 'non_urgent': 0,
    'overrides': 0, 'sepsis_flags': 0, 'mass_casualty': 0
}

# ── Config ────────────────────────────────────────────────────────────────────
URGENCY_CONFIG = {
    0: {'label': 'Immediate',   'color': 'red',    'max_wait': '0 min',   'description': 'Life threatening'},
    1: {'label': 'Urgent',      'color': 'orange',  'max_wait': '10 min',  'description': 'May deteriorate'},
    2: {'label': 'Less Urgent', 'color': 'yellow',  'max_wait': '60 min',  'description': 'Stable'},
    3: {'label': 'Non-Urgent',  'color': 'green',   'max_wait': '120 min', 'description': 'Minor condition'},
}
RESOURCES = {
    0: ['ICU Bed', 'Crash Cart', 'Senior Doctor', 'Nurse Immediate'],
    1: ['Monitoring Bed', 'IV Access', 'Doctor Within 10 min'],
    2: ['Standard Bed', 'Nurse Assessment'],
    3: ['Waiting Area', 'Junior Doctor'],
}
PEDIATRIC_HR_NORMAL  = {'infant': (100,160), 'child': (70,120), 'adult': (60,100)}
GERIATRIC_ADJUSTMENTS = {'pain_threshold': 5, 'bp_low': 110}


def _get_age_group(age):
    if age <= 1:   return 'infant'
    if age <= 12:  return 'child'
    if age >= 65:  return 'geriatric'
    return 'adult'


def _pain_validator(pain_score, vitals):
    hr, sbp, spo2 = vitals['heart_rate'], vitals['systolic_bp'], vitals['oxygen_saturation']
    physiological_severity = 0
    if hr > 120: physiological_severity += 2
    if sbp < 100: physiological_severity += 2
    if spo2 < 92: physiological_severity += 3
    if hr > 100: physiological_severity += 1

    reported = pain_score
    inconsistency = False
    message = None

    if reported <= 3 and physiological_severity >= 4:
        inconsistency = True
        message = f"Pain {reported}/10 appears UNDERREPORTED — vitals suggest severity {min(10, physiological_severity*1.5):.0f}/10. Patient may be in shock or minimizing symptoms."
    elif reported >= 8 and physiological_severity == 0:
        message = f"Pain {reported}/10 reported but vitals are within normal range. Assess carefully."

    return {'inconsistency': inconsistency, 'message': message, 'physiological_score': physiological_severity}


def _build_patient(data, urgency_level, confidence, explanation, sepsis):
    pid = str(uuid.uuid4())[:8].upper()
    ug = URGENCY_CONFIG[urgency_level]
    age_group = _get_age_group(data.get('age', 30))
    pain_check = _pain_validator(data.get('pain_score', 0), data)

    p = {
        'id': pid,
        'name': data.get('name', 'Anonymous'),
        'age': data.get('age'),
        'age_group': age_group,
        'chief_complaint': CHIEF_COMPLAINTS.get(data.get('chief_complaint', 7), 'Unknown'),
        'urgency_level': urgency_level,
        'urgency_label': ug['label'],
        'urgency_color': ug['color'],
        'urgency_description': ug['description'],
        'max_wait': ug['max_wait'],
        'confidence': confidence,
        'uncertain': confidence < 70,
        'resources_needed': RESOURCES[urgency_level],
        'explanation': explanation,
        'sepsis_flag': sepsis['flag'],
        'sepsis': sepsis,
        'pain_check': pain_check,
        'vitals': {
            'heart_rate': data.get('heart_rate'),
            'systolic_bp': data.get('systolic_bp'),
            'diastolic_bp': data.get('diastolic_bp'),
            'temperature': data.get('temperature'),
            'oxygen_saturation': data.get('oxygen_saturation'),
            'respiratory_rate': data.get('respiratory_rate'),
            'pain_score': data.get('pain_score'),
        },
        'arrival_time': datetime.now().strftime('%H:%M:%S'),
        'arrival_timestamp': datetime.now().isoformat(),
        'status': 'waiting',
        'overridden': False,
        'override_reason': None,
        'source': data.get('source', 'er'),  # 'er' or 'ambulance'
    }
    return p


def _get_stats():
    return {
        'total': len(patient_queue),
        'immediate': sum(1 for p in patient_queue if p['urgency_level'] == 0),
        'urgent':    sum(1 for p in patient_queue if p['urgency_level'] == 1),
        'less_urgent': sum(1 for p in patient_queue if p['urgency_level'] == 2),
        'non_urgent': sum(1 for p in patient_queue if p['urgency_level'] == 3),
        **beds
    }


# ── Core Triage ───────────────────────────────────────────────────────────────
@app.route('/api/triage', methods=['POST'])
def triage_patient():
    try:
        data = request.json
        if not model:
            return jsonify({'success': False, 'error': 'Model not loaded. Run train_model.py'}), 500

        features = np.array([[
            data['age'], data['heart_rate'], data['systolic_bp'],
            data['diastolic_bp'], data['temperature'], data['oxygen_saturation'],
            data['respiratory_rate'], data['pain_score'],
            data['conscious_level'], data['arrival_mode'], data['chief_complaint']
        ]])
        scaled = scaler.transform(features)
        urgency = int(model.predict(scaled)[0])
        proba   = model.predict_proba(scaled)[0]
        confidence = float(proba[urgency] * 100)

        # SHAP explanation (safe fallback)
        try:
            from utils.explainer import get_explanation
            expl = get_explanation(scaled)
            explanation = expl['top_factors']
        except Exception:
            explanation = []

        sepsis = check_sepsis_risk(data)
        patient = _build_patient(data, urgency, round(confidence, 1), explanation, sepsis)

        patient_queue.append(patient)
        patient_queue.sort(key=lambda x: x['urgency_level'])
        vitals_history[patient['id']] = [{
            'timestamp': datetime.now().isoformat(),
            **patient['vitals']
        }]

        # Update shift stats
        shift_stats['total'] += 1
        key = ['immediate','urgent','less_urgent','non_urgent'][urgency]
        shift_stats[key] += 1
        if sepsis['flag']:
            shift_stats['sepsis_flags'] += 1

        # Audit log entry
        audit_log.append({
            'timestamp': datetime.now().isoformat(),
            'patient_id': patient['id'],
            'patient_name': patient['name'],
            'action': 'triage',
            'urgency_level': urgency,
            'urgency_label': URGENCY_CONFIG[urgency]['label'],
            'confidence': round(confidence, 1),
            'overridden': False,
            'sepsis_flag': sepsis['flag'],
        })

        socketio.emit('queue_update', {'queue': patient_queue, 'stats': _get_stats()})

        # Auto re-triage alert check for waiting patients
        _check_retriage_needed()

        return jsonify({'success': True, 'patient': patient})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Ambulance Pre-Triage ──────────────────────────────────────────────────────
@app.route('/api/ambulance/pretriage', methods=['POST'])
def ambulance_pretriage():
    try:
        data = request.json
        data['source'] = 'ambulance'
        data['arrival_mode'] = 1

        if not model:
            return jsonify({'success': False, 'error': 'Model not loaded'}), 500

        features = np.array([[
            data['age'], data['heart_rate'], data['systolic_bp'],
            data['diastolic_bp'], data['temperature'], data['oxygen_saturation'],
            data['respiratory_rate'], data['pain_score'],
            data['conscious_level'], 1, data.get('chief_complaint', 0)
        ]])
        scaled = scaler.transform(features)
        urgency = int(model.predict(scaled)[0])
        proba = model.predict_proba(scaled)[0]
        confidence = round(float(proba[urgency] * 100), 1)
        sepsis = check_sepsis_risk(data)

        pre_alert = {
            'id': 'AMB-' + str(uuid.uuid4())[:6].upper(),
            'patient_name': data.get('name', 'Incoming Patient'),
            'age': data.get('age'),
            'eta_minutes': data.get('eta_minutes', 5),
            'urgency_level': urgency,
            'urgency_label': URGENCY_CONFIG[urgency]['label'],
            'urgency_color': URGENCY_CONFIG[urgency]['color'],
            'resources_needed': RESOURCES[urgency],
            'sepsis_flag': sepsis['flag'],
            'confidence': confidence,
            'vitals': data,
            'timestamp': datetime.now().isoformat(),
        }

        socketio.emit('ambulance_incoming', pre_alert)
        return jsonify({'success': True, 'pre_alert': pre_alert})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Vital Signs Update (Trend Tracking) ───────────────────────────────────────
@app.route('/api/vitals/update', methods=['POST'])
def update_vitals():
    try:
        data = request.json
        pid = data['patient_id']
        new_vitals = data['vitals']

        patient = next((p for p in patient_queue if p['id'] == pid), None)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        if pid not in vitals_history:
            vitals_history[pid] = []

        vitals_history[pid].append({
            'timestamp': datetime.now().isoformat(),
            **new_vitals
        })

        patient['vitals'] = {**patient['vitals'], **new_vitals}

        # Trend analysis — check if patient is deteriorating
        trend = _analyze_trend(pid)
        upgrade_needed = False

        if trend['deteriorating'] and patient['urgency_level'] > 0:
            old_level = patient['urgency_level']
            patient['urgency_level'] = max(0, patient['urgency_level'] - 1)
            patient['urgency_label'] = URGENCY_CONFIG[patient['urgency_level']]['label']
            patient['urgency_color'] = URGENCY_CONFIG[patient['urgency_level']]['color']
            upgrade_needed = True
            patient_queue.sort(key=lambda x: x['urgency_level'])
            audit_log.append({
                'timestamp': datetime.now().isoformat(),
                'patient_id': pid,
                'patient_name': patient['name'],
                'action': 'auto_upgrade',
                'urgency_level': patient['urgency_level'],
                'urgency_label': URGENCY_CONFIG[patient['urgency_level']]['label'],
                'confidence': None,
                'overridden': False,
                'sepsis_flag': False,
                'note': f"Auto-upgraded from {URGENCY_CONFIG[old_level]['label']} due to deteriorating vitals"
            })
            socketio.emit('patient_upgraded', {'patient_id': pid, 'new_urgency': patient['urgency_level']})

        socketio.emit('queue_update', {'queue': patient_queue, 'stats': _get_stats()})
        return jsonify({'success': True, 'trend': trend, 'upgraded': upgrade_needed})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/vitals/history/<patient_id>', methods=['GET'])
def get_vitals_history(patient_id):
    history = vitals_history.get(patient_id, [])
    trend = _analyze_trend(patient_id) if len(history) >= 2 else {'deteriorating': False}
    return jsonify({'success': True, 'history': history, 'trend': trend})


def _analyze_trend(pid):
    history = vitals_history.get(pid, [])
    if len(history) < 2:
        return {'deteriorating': False, 'signals': []}

    latest = history[-1]
    first  = history[0]
    signals = []

    if latest.get('oxygen_saturation', 100) < first.get('oxygen_saturation', 100) - 3:
        signals.append('SpO2 dropping')
    if latest.get('heart_rate', 80) > first.get('heart_rate', 80) + 15:
        signals.append('Heart rate rising')
    if latest.get('systolic_bp', 120) < first.get('systolic_bp', 120) - 15:
        signals.append('BP dropping')
    if latest.get('respiratory_rate', 16) > first.get('respiratory_rate', 16) + 5:
        signals.append('Respiratory rate rising')

    return {'deteriorating': len(signals) >= 2, 'signals': signals}


# ── Re-triage Check ───────────────────────────────────────────────────────────
def _check_retriage_needed():
    now = datetime.now()
    alerts = []
    wait_limits = {0: 0, 1: 10, 2: 60, 3: 120}
    for p in patient_queue:
        arrival = datetime.fromisoformat(p['arrival_timestamp'])
        waited_min = (now - arrival).seconds / 60
        limit = wait_limits.get(p['urgency_level'], 120)
        if waited_min > limit:
            alerts.append({'patient_id': p['id'], 'name': p['name'], 'waited_minutes': round(waited_min, 1), 'limit': limit})

    if alerts:
        socketio.emit('retriage_alerts', alerts)


@app.route('/api/retriage/check', methods=['GET'])
def check_retriage():
    _check_retriage_needed()
    return jsonify({'success': True})


# ── Mass Casualty Mode ────────────────────────────────────────────────────────
@app.route('/api/mass-casualty', methods=['POST'])
def mass_casualty():
    try:
        patients_data = request.json.get('patients', [])
        if not model:
            return jsonify({'success': False, 'error': 'Model not loaded'}), 500

        results = []
        for data in patients_data:
            features = np.array([[
                data.get('age', 30), data.get('heart_rate', 80),
                data.get('systolic_bp', 120), data.get('diastolic_bp', 80),
                data.get('temperature', 37.0), data.get('oxygen_saturation', 98),
                data.get('respiratory_rate', 16), data.get('pain_score', 0),
                data.get('conscious_level', 0), data.get('arrival_mode', 0),
                data.get('chief_complaint', 7)
            ]])
            scaled = scaler.transform(features)
            urgency = int(model.predict(scaled)[0])
            proba = model.predict_proba(scaled)[0]
            sepsis = check_sepsis_risk(data)

            patient = _build_patient(
                data, urgency,
                round(float(proba[urgency]*100), 1),
                [], sepsis
            )
            patient['source'] = 'mass_casualty'
            patient_queue.append(patient)
            vitals_history[patient['id']] = [{'timestamp': datetime.now().isoformat(), **patient['vitals']}]
            results.append(patient)

        patient_queue.sort(key=lambda x: x['urgency_level'])
        shift_stats['total'] += len(results)
        shift_stats['mass_casualty'] += 1
        socketio.emit('queue_update', {'queue': patient_queue, 'stats': _get_stats()})

        return jsonify({
            'success': True,
            'processed': len(results),
            'results': results,
            'summary': {
                'immediate': sum(1 for r in results if r['urgency_level'] == 0),
                'urgent':    sum(1 for r in results if r['urgency_level'] == 1),
                'less_urgent': sum(1 for r in results if r['urgency_level'] == 2),
                'non_urgent':  sum(1 for r in results if r['urgency_level'] == 3),
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Queue Management ──────────────────────────────────────────────────────────
@app.route('/api/queue', methods=['GET'])
def get_queue():
    return jsonify({'success': True, 'queue': patient_queue, 'stats': _get_stats()})


@app.route('/api/override', methods=['POST'])
def override_triage():
    data = request.json
    pid = data['patient_id']
    new_level = data['new_urgency_level']
    reason = data.get('reason', 'Clinical judgment')

    for p in patient_queue:
        if p['id'] == pid:
            p['urgency_level'] = new_level
            p['urgency_label'] = URGENCY_CONFIG[new_level]['label']
            p['urgency_color'] = URGENCY_CONFIG[new_level]['color']
            p['overridden'] = True
            p['override_reason'] = reason
            break

    patient_queue.sort(key=lambda x: x['urgency_level'])
    shift_stats['overrides'] += 1
    audit_log.append({
        'timestamp': datetime.now().isoformat(),
        'patient_id': pid, 'action': 'override',
        'urgency_level': new_level,
        'urgency_label': URGENCY_CONFIG[new_level]['label'],
        'note': reason, 'overridden': True, 'confidence': None, 'sepsis_flag': False,
        'patient_name': next((p['name'] for p in patient_queue if p['id'] == pid), '?')
    })
    socketio.emit('queue_update', {'queue': patient_queue, 'stats': _get_stats()})
    return jsonify({'success': True})


@app.route('/api/discharge', methods=['POST'])
def discharge_patient():
    global patient_queue
    pid = request.json['patient_id']
    patient_queue = [p for p in patient_queue if p['id'] != pid]
    socketio.emit('queue_update', {'queue': patient_queue, 'stats': _get_stats()})
    return jsonify({'success': True})


# ── NLP Parser ────────────────────────────────────────────────────────────────
@app.route('/api/parse-complaint', methods=['POST'])
def parse_complaint_endpoint():
    text = request.json.get('text', '')
    result = parse_complaint(text)
    return jsonify({'success': True, 'result': result})


# ── Bed Management ────────────────────────────────────────────────────────────
@app.route('/api/beds', methods=['GET'])
def get_beds():
    return jsonify({'success': True, 'beds': beds})


@app.route('/api/beds/update', methods=['POST'])
def update_beds():
    data = request.json
    bed_type = data['type']
    action = data['action']
    if bed_type in beds:
        if action == 'occupy' and beds[bed_type]['occupied'] < beds[bed_type]['total']:
            beds[bed_type]['occupied'] += 1
        elif action == 'free' and beds[bed_type]['occupied'] > 0:
            beds[bed_type]['occupied'] -= 1
    socketio.emit('bed_update', beds)
    return jsonify({'success': True, 'beds': beds})


# ── Audit Log ────────────────────────────────────────────────────────────────
@app.route('/api/audit', methods=['GET'])
def get_audit_log():
    return jsonify({'success': True, 'log': list(reversed(audit_log))})


# ── Shift Handover Report ─────────────────────────────────────────────────────
@app.route('/api/handover', methods=['POST'])
def generate_handover():
    shift_info = request.json or {}
    filename = generate_handover_report(patient_queue, shift_stats, shift_info)
    return send_file(filename, as_attachment=True,
                     download_name='shift_handover.pdf', mimetype='application/pdf')


# ── Health ────────────────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'loaded' if model else 'not_loaded'})


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
