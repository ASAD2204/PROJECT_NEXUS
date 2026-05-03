import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

MODEL_PATH = "app/risk_model.pkl"


def train_model(training_data: list):
    """Train a RandomForest classifier on labelled student-risk data and persist it."""
    df = pd.DataFrame(training_data)
    X = df[["attendance_pct", "avg_quiz_score", "assignment_submission_rate", "cgpa"]]
    le = LabelEncoder()
    y = le.fit_transform(df["label"])
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    joblib.dump((model, le), MODEL_PATH)
    return {"status": "Model trained", "samples": len(df)}


def predict_risk(
    attendance_pct: float,
    avg_quiz_score: float,
    submission_rate: float,
    cgpa: float,
) -> str:
    """Return a risk label (Red / Yellow / Green) for a single student.

    If no trained model exists on disk, a deterministic heuristic is used instead.
    """
    if not os.path.exists(MODEL_PATH):
        # Heuristic fallback when no ML model has been trained yet
        if attendance_pct < 75 or cgpa < 2.0:
            return "Red"
        elif attendance_pct < 85 or cgpa < 2.8:
            return "Yellow"
        return "Green"

    model, le = joblib.load(MODEL_PATH)
    features = [[attendance_pct, avg_quiz_score, submission_rate, cgpa]]
    prediction = model.predict(features)[0]
    return le.inverse_transform([prediction])[0]
