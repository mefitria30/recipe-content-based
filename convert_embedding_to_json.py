import pickle
import json

# Load embeddings dari file .pkl
with open("resep_embeddings.pkl", "rb") as f:
    X_resep = pickle.load(f)

# Convert ke list supaya bisa di-serialize ke JSON
embeddings_list = X_resep.tolist()

# Simpan ke file JSON
with open("static/resep_embeddings.json", "w", encoding="utf-8") as f:
    json.dump(embeddings_list, f)

print("✅ Embeddings berhasil di-convert ke JSON")
