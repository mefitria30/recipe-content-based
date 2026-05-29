from flask import Flask, request, jsonify, render_template
import pandas as pd
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from flask_cors import CORS   # <── tambahin ini

app = Flask(__name__)
CORS(app)  # <── dan ini langsung setelah app dibuat

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/about")
def about():
    return render_template("about.html")

# === Fungsi pipeline generate ulang ===
def update_pipeline(csv_path="resep_dataset_clean.csv"):
    global df_clean, X_resep, model

    # Load dataset
    df = pd.read_csv(csv_path)
    df_clean = df.copy()

    # Gabungkan teks untuk embedding (sesuai Colab)
    texts = [
        row['nama_resep'] +
        " kategori: " + " ".join(eval(row['kategori_norm'])) +
        " waktu: " + str(row['waktu_norm']) + " menit" +
        " bahan: " + " ".join(eval(row['list_bahan_norm']))
        for _, row in df_clean.iterrows()
    ]

    # Generate embedding
    model = SentenceTransformer('paraphrase-MiniLM-L3-v2')
    X_resep = model.encode(texts)

    # Export ulang (dataset + embedding)
    df_clean.to_csv("resep_dataset_clean.csv", index=False)
    with open("resep_embeddings.pkl", "wb") as f:
        pickle.dump(X_resep, f)

    print("✅ Dataset & embedding berhasil diupdate")

# === Load awal (pakai hasil export dari Colab) ===
df_clean = pd.read_csv("resep_dataset_clean.csv")
with open("resep_embeddings.pkl", "rb") as f:
    X_resep = pickle.load(f)

# Model di-load ulang
model = SentenceTransformer('paraphrase-MiniLM-L3-v2')

# === Fungsi rekomendasi (tanpa hard-code) ===
def rekomendasi_resep_embed(nama_resep, top_n=12, cat_boost=0.1, threshold=0.5):
    idx_list = df_clean.index[df_clean['nama_resep'] == nama_resep].tolist()
    if not idx_list:
        return []
    idx = idx_list[0]

    resep_vec = X_resep[idx].reshape(1, -1)
    sim_scores = cosine_similarity(resep_vec, X_resep).flatten()

    # kategori boost
    query_cat = set(eval(df_clean.iloc[idx]['kategori_norm'])) if isinstance(df_clean.iloc[idx]['kategori_norm'], str) else set(df_clean.iloc[idx]['kategori_norm'])
    for i in range(len(df_clean)):
        cat_i = set(eval(df_clean.iloc[i]['kategori_norm'])) if isinstance(df_clean.iloc[i]['kategori_norm'], str) else set(df_clean.iloc[i]['kategori_norm'])
        if query_cat & cat_i:
            sim_scores[i] += cat_boost

    # bahan overlap (Jaccard)
    def jaccard(list1, list2):
        s1, s2 = set(list1), set(list2)
        return len(s1 & s2) / len(s1 | s2) if s1 | s2 else 0
    jaccard_scores = np.array([
        jaccard(eval(df_clean.iloc[idx]['list_bahan_norm']), eval(df_clean.iloc[i]['list_bahan_norm']))
        for i in range(len(df_clean))
    ])
    sim_scores += 0.2 * jaccard_scores

    # filter skor >= threshold
    valid_idx = [i for i in sim_scores.argsort()[::-1] if i != idx and sim_scores[i] >= threshold]
    valid_idx = valid_idx[:top_n]

    results = []
    for i in valid_idx:
        results.append({
            "judul": str(df_clean.iloc[i]['nama_resep']),
            "kategori": eval(df_clean.iloc[i]['kategori_norm']) if isinstance(df_clean.iloc[i]['kategori_norm'], str) else df_clean.iloc[i]['kategori_norm'],
            "waktu": int(df_clean.iloc[i]['waktu_norm']) if pd.notnull(df_clean.iloc[i]['waktu_norm']) else None,
            "skor": round(float(sim_scores[i]), 3)
        })
    return results

# === Endpoint rekomendasi ===
@app.route("/recommend", methods=["GET"])
def recommend():
    nama_resep = request.args.get("nama_resep")
    top_n = int(request.args.get("top_n", 12))
    results = rekomendasi_resep_embed(nama_resep, top_n=top_n)
    return jsonify(results)

# === Endpoint update dataset & regenerate embedding ===
@app.route("/update", methods=["POST"])
def update():
    csv_path = request.json.get("csv_path", "resep_dataset_clean.csv")
    update_pipeline(csv_path)
    return jsonify({"status": "✅ dataset & embedding berhasil diupdate"})

@app.route("/service-worker.js")
def sw():
    return app.send_static_file("service-worker.js")


if __name__ == "__main__":
    app.run(debug=True)
