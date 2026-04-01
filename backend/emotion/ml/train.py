from datasets import load_dataset
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
import joblib
import numpy as np

# ── Label mapping (6 classes → 4) ──────────────────────────────────────────
LABEL_MAP = {
    "joy":      "happy",
    "love":     "happy",
    "surprise": "happy",
    "sadness":  "sad",
    "fear":     "anxious",
    "anger":    "angry",
}

# ── Load dataset ────────────────────────────────────────────────────────────
print("Loading dair-ai/emotion dataset...")
dataset = load_dataset("dair-ai/emotion", trust_remote_code=True)

def prepare_split(split):
    texts, labels = [], []
    for row in split:
        original_label = row["label"]
        # dataset stores labels as ints — get string name
        label_name = split.features["label"].int2str(original_label)
        if label_name not in LABEL_MAP:
            continue
        texts.append(row["text"])
        labels.append(LABEL_MAP[label_name])
    return texts, labels

X_train, y_train = prepare_split(dataset["train"])
X_test,  y_test  = prepare_split(dataset["test"])

print(f"Train samples : {len(X_train)}")
print(f"Test  samples : {len(X_test)}")

# ── Build and train pipeline ─────────────────────────────────────────────────
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        max_features=30000,
        ngram_range=(1, 2),
        sublinear_tf=True,
    )),
    ("clf", LogisticRegression(
        max_iter=1000,
        C=5.0,
        class_weight="balanced",
        solver="lbfgs",
        multi_class="multinomial",
    )),
])

print("\nTraining...")
pipeline.fit(X_train, y_train)

# ── Evaluate ─────────────────────────────────────────────────────────────────
y_pred   = pipeline.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
classes  = ["happy", "sad", "anxious", "angry"]

print(f"\n{'='*45}")
print(f"  Accuracy : {accuracy:.4f}  ({accuracy*100:.2f}%)")
print(f"{'='*45}")

print("\nPer-class F1 scores:")
f1_scores = f1_score(y_test, y_pred, labels=classes, average=None)
for cls, score in zip(classes, f1_scores):
    print(f"  {cls:<10} F1 = {score:.4f}")

print("\nConfusion Matrix (rows=actual, cols=predicted):")
print(f"{'':>12}", "  ".join(f"{c:>8}" for c in classes))
cm = confusion_matrix(y_test, y_pred, labels=classes)
for i, row in enumerate(cm):
    print(f"  {classes[i]:<10}", "  ".join(f"{v:>8}" for v in row))

# ── Accuracy gate ─────────────────────────────────────────────────────────────
MIN_ACCURACY = 0.80
if accuracy < MIN_ACCURACY:
    raise ValueError(
        f"Accuracy {accuracy:.4f} is below the minimum threshold of {MIN_ACCURACY}. "
        "Do not use this model. Retrain with better hyperparameters."
    )

# ── Save model ────────────────────────────────────────────────────────────────
MODEL_PATH = "model.pkl"
joblib.dump(pipeline, MODEL_PATH)
print(f"\nModel saved to {MODEL_PATH}")
print("Training complete. Ready for Phase 2 Step 2.")
