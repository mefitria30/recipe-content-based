import pandas as pd

# 1. Baca file CSV
df = pd.read_csv("resep_dataset_clean.csv")

# 2. Convert ke JSON
# orient="records" → setiap baris jadi object JSON
data_json = df.to_json(orient="records", force_ascii=False)

# 3. Simpan ke file
with open("resep_dataset_clean.json", "w", encoding="utf-8") as f:
    f.write(data_json)

print("✅ CSV berhasil di-convert ke JSON")
