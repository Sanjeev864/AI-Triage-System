import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os

FEATURE_NAMES = [
    'age', 'heart_rate', 'systolic_bp', 'diastolic_bp',
    'temperature', 'oxygen_saturation', 'respiratory_rate',
    'pain_score', 'conscious_level', 'arrival_mode', 'chief_complaint'
]

CHIEF_COMPLAINTS = {
    0: 'Chest Pain', 1: 'Breathlessness', 2: 'Trauma / Injury',
    3: 'Fever', 4: 'Abdominal Pain', 5: 'Headache',
    6: 'Fracture', 7: 'Minor Injury'
}

ARRIVAL_MODES = {0: 'Walk-in', 1: 'Ambulance', 2: 'Police'}

CONSCIOUS_LEVELS = {
    0: 'Alert', 1: 'Responds to Voice',
    2: 'Responds to Pain', 3: 'Unresponsive'
}


def generate_synthetic_data(n=5000):
    np.random.seed(42)
    data = {
        'age': np.random.randint(1, 95, n),
        'heart_rate': np.random.randint(35, 185, n),
        'systolic_bp': np.random.randint(65, 210, n),
        'diastolic_bp': np.random.randint(35, 135, n),
        'temperature': np.round(np.random.uniform(34.5, 42.0, n), 1),
        'oxygen_saturation': np.random.randint(65, 100, n),
        'respiratory_rate': np.random.randint(6, 42, n),
        'pain_score': np.random.randint(0, 11, n),
        'conscious_level': np.random.choice([0,1,2,3], n, p=[0.70,0.15,0.10,0.05]),
        'arrival_mode': np.random.choice([0,1,2], n, p=[0.60,0.35,0.05]),
        'chief_complaint': np.random.choice(range(8), n,
                           p=[0.15,0.15,0.15,0.15,0.10,0.10,0.10,0.10]),
    }
    df = pd.DataFrame(data)

    def assign_urgency(row):
        # Immediate (0)
        if (row['oxygen_saturation'] < 85 or
            row['conscious_level'] >= 2 or
            row['systolic_bp'] < 80 or
            row['heart_rate'] > 155 or row['heart_rate'] < 38 or
            row['respiratory_rate'] > 35 or row['respiratory_rate'] < 8 or
            row['temperature'] > 41.0 or
            (row['chief_complaint'] == 0 and row['pain_score'] >= 9) or
            (row['arrival_mode'] == 1 and row['conscious_level'] >= 1)):
            return 0
        # Urgent (1)
        elif (row['oxygen_saturation'] < 92 or
              row['conscious_level'] == 1 or
              row['systolic_bp'] < 100 or
              row['heart_rate'] > 125 or row['heart_rate'] < 50 or
              row['respiratory_rate'] > 26 or
              row['temperature'] > 39.8 or
              row['pain_score'] >= 7 or
              row['arrival_mode'] == 1):
            return 1
        # Less Urgent (2)
        elif (row['pain_score'] >= 4 or
              row['temperature'] > 38.0 or
              row['chief_complaint'] in [3, 4, 5]):
            return 2
        # Non-Urgent (3)
        else:
            return 3

    df['urgency_level'] = df.apply(assign_urgency, axis=1)
    return df


def load_and_preprocess(df, save_dir='model'):
    X = df[FEATURE_NAMES]
    y = df['urgency_level']
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    os.makedirs(save_dir, exist_ok=True)
    joblib.dump(scaler, f'{save_dir}/scaler.pkl')
    joblib.dump(FEATURE_NAMES, f'{save_dir}/feature_names.pkl')
    return train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
