"""
Chief Complaint NLP Parser
Parses free-text complaints into structured categories
without requiring an external API
"""
import re

COMPLAINT_PATTERNS = {
    0: {  # Chest Pain
        'keywords': ['chest', 'heart', 'cardiac', 'palpitation', 'angina',
                     'pressure in chest', 'chest tightness', 'left arm pain'],
        'label': 'Chest Pain'
    },
    1: {  # Breathlessness
        'keywords': ['breath', 'breathing', 'breathless', 'suffocating',
                     'can\'t breathe', 'shortness of breath', 'dyspnea',
                     'wheezing', 'asthma', 'respiratory'],
        'label': 'Breathlessness'
    },
    2: {  # Trauma
        'keywords': ['accident', 'fall', 'fell', 'hit', 'collision', 'crash',
                     'injury', 'trauma', 'wound', 'cut', 'bleeding heavily',
                     'road accident', 'rta', 'mvа'],
        'label': 'Trauma / Injury'
    },
    3: {  # Fever
        'keywords': ['fever', 'temperature', 'chills', 'shivering', 'hot',
                     'dengue', 'malaria', 'typhoid', 'infection'],
        'label': 'Fever'
    },
    4: {  # Abdominal
        'keywords': ['stomach', 'abdomen', 'abdominal', 'belly', 'nausea',
                     'vomiting', 'diarrhea', 'appendix', 'gastric', 'ulcer',
                     'bowel', 'digestion'],
        'label': 'Abdominal Pain'
    },
    5: {  # Headache
        'keywords': ['headache', 'head pain', 'migraine', 'dizziness',
                     'vertigo', 'head injury', 'concussion', 'confusion'],
        'label': 'Headache'
    },
    6: {  # Fracture
        'keywords': ['fracture', 'broken', 'bone', 'limb', 'leg', 'arm',
                     'wrist', 'ankle', 'unable to walk', 'swelling limb'],
        'label': 'Fracture'
    },
    7: {  # Minor
        'keywords': ['minor', 'small cut', 'bruise', 'sprain', 'rash',
                     'allergy', 'insect bite', 'eye', 'ear', 'dental'],
        'label': 'Minor Injury'
    }
}

URGENCY_KEYWORDS = {
    'high': ['unconscious', 'not breathing', 'no pulse', 'severe bleeding',
             'unresponsive', 'collapse', 'collapsed', 'seizure', 'stroke',
             'choking', 'drowning', 'poisoning', 'overdose'],
    'medium': ['severe', 'extreme', 'unbearable', 'cannot move', 'spreading'],
    'low': ['mild', 'minor', 'slight', 'small', 'routine']
}


def parse_complaint(text: str) -> dict:
    text_lower = text.lower().strip()
    words = re.split(r'[\s,.\-!?]+', text_lower)

    scores = {i: 0 for i in range(8)}
    matched_keywords = []

    for category, data in COMPLAINT_PATTERNS.items():
        for kw in data['keywords']:
            if kw in text_lower:
                scores[category] += 2 if ' ' in kw else 1
                matched_keywords.append(kw)

    best_category = max(scores, key=scores.get)
    confidence = min(100, scores[best_category] * 20) if scores[best_category] > 0 else 0

    urgency_hint = 'normal'
    for word in URGENCY_KEYWORDS['high']:
        if word in text_lower:
            urgency_hint = 'high'
            break
    if urgency_hint == 'normal':
        for word in URGENCY_KEYWORDS['medium']:
            if word in text_lower:
                urgency_hint = 'medium'
                break

    return {
        'category_id': best_category,
        'category_label': COMPLAINT_PATTERNS[best_category]['label'],
        'confidence': confidence if confidence > 0 else 30,
        'urgency_hint': urgency_hint,
        'matched_keywords': list(set(matched_keywords))[:5],
        'fallback': confidence == 0
    }
