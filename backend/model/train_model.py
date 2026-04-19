import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from xgboost import XGBClassifier
from sklearn.metrics import classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE
import joblib
import numpy as np
from utils.preprocess import generate_synthetic_data, load_and_preprocess

print("Generating synthetic triage dataset (n=5000)...")
df = generate_synthetic_data(n=5000)
print(f"Shape: {df.shape}")
print(f"Urgency distribution:\n{df['urgency_level'].value_counts().sort_index()}")

X_train, X_test, y_train, y_test = load_and_preprocess(df, save_dir='model')

print("\nApplying SMOTE...")
sm = SMOTE(random_state=42)
X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
print(f"Resampled shape: {X_train_res.shape}")

print("\nTraining XGBoost model...")
model = XGBClassifier(
    n_estimators=300, max_depth=5,
    learning_rate=0.05, subsample=0.8,
    colsample_bytree=0.8, random_state=42,
    eval_metric='mlogloss', use_label_encoder=False
)
model.fit(X_train_res, y_train_res,
          eval_set=[(X_test, y_test)], verbose=50)

y_pred = model.predict(X_test)
print("\n=== Classification Report ===")
print(classification_report(y_test, y_pred,
      target_names=['Immediate','Urgent','Less Urgent','Non-Urgent']))

joblib.dump(model, 'model/triage_model.pkl')
joblib.dump(df[list(df.columns)], 'model/train_data.pkl')
print("\nModel saved. Training complete!")
