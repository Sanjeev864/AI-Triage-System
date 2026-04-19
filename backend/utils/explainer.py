import shap
import numpy as np
import joblib

_model = None
_explainer = None
_feature_names = None

FEATURE_LABELS = {
    'age': 'Age', 'heart_rate': 'Heart Rate',
    'systolic_bp': 'Systolic BP', 'diastolic_bp': 'Diastolic BP',
    'temperature': 'Temperature', 'oxygen_saturation': 'SpO2 (%)',
    'respiratory_rate': 'Resp. Rate', 'pain_score': 'Pain Score',
    'conscious_level': 'Conscious Level', 'arrival_mode': 'Arrival Mode',
    'chief_complaint': 'Chief Complaint'
}


def _load():
    global _model, _explainer, _feature_names
    if _model is None:
        _model = joblib.load('model/triage_model.pkl')
        _feature_names = joblib.load('model/feature_names.pkl')
        _explainer = shap.TreeExplainer(_model)


def get_explanation(patient_array):
    _load()
    shap_values = _explainer.shap_values(patient_array)
    proba = _model.predict_proba(patient_array)[0]
    predicted_class = int(np.argmax(proba))

    class_shap = shap_values[predicted_class][0]
    factors = []
    for i, fname in enumerate(_feature_names):
        factors.append({
            'feature': fname,
            'label': FEATURE_LABELS.get(fname, fname),
            'value': float(patient_array[0][i]),
            'shap_value': float(class_shap[i]),
            'direction': 'increases' if class_shap[i] > 0 else 'decreases'
        })
    factors.sort(key=lambda x: abs(x['shap_value']), reverse=True)

    confidence = float(proba[predicted_class] * 100)
    uncertainty = confidence < 70

    return {
        'top_factors': factors[:5],
        'all_factors': factors,
        'predicted_class': predicted_class,
        'confidence': round(confidence, 1),
        'uncertain': uncertainty,
        'probabilities': {
            'Immediate': round(float(proba[0]) * 100, 1),
            'Urgent': round(float(proba[1]) * 100, 1),
            'Less Urgent': round(float(proba[2]) * 100, 1),
            'Non-Urgent': round(float(proba[3]) * 100, 1),
        }
    }
