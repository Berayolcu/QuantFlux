# ⚡ QuantFlux - Algorithmic Risk Engine & Big Data Stream (v3.2)

QuantFlux, Borsa İstanbul (BIST) şirketlerinin bilanço verilerini (Point-in-Time UFRS), fiyat serilerini ve makroekonomik değişkenleri birleştiren çok katmanlı bir **Kantitatif Araştırma ve Risk Yönetim Terminali**dir.

---

## 🏛️ Mimari ve Temel Modüller

QuantFlux, akademik ekonometri standartları ve kurumsal portföy yönetimi yaklaşımları üzerine inşa edilmiştir:

1. **Point-in-Time (PIT) Bilanço & Rasyo Motoru:**
   - Look-Ahead Bias (bilgi sızıntısı) koruması: `period_end_date` ile `disclosure_date` (KAP ilan tarihi) kesin olarak ayrıştırılmıştır.
   - TTM bazlı piyasa çarpanları ($F/K$, $PD/DD$, $FD/FAV\ddot{O}K$, Cari Oran, Net Borç/$FAV\ddot{O}K$, $ROE$).

2. **Finansal Sağlık & Temerrüt Skorlaması:**
   - **Piotroski F-Score (0-9):** Kârlılık, kaldıraç/likidite ve operasyonel verimlilik kriterlerinin çeyreklik takibi.
   - **Altman Z''-Score:** Gelişmekte olan piyasalar kalibrasyonu ile güvenli, gri ve riskli bölge sınıflandırması.

3. **İstatistiki Kümeleme (Unsupervised Learning):**
   - Rasyo uzayında `RobustScaler` ve `K-Means (k=4)` ile sektörden bağımsız finansal profil segmentasyonu (Scatter & Spider Radar analizi).

4. **Bilanço Olay Çalışması (Event Study - CAR):**
   - $[-120, -21]$ gün CAPM OLS piyasa modeli kalibrasyonu.
   - Bilanço ilan günü ($t_0$) çevresinde $[-5, +5]$ gün Kümülatif Anormal Getiri ($CAR$) ve $t$-istatistiği anlamlılık testleri.

5. **Çok Faktörlü Panel Regresyonu:**
   - Gelecek dönem getirisini ($R_{t+1}$) açıklayan faktör analizi (Statsmodels OLS).
   - Çoklu doğrusal bağlantıyı önlemek için katı $VIF < 5.0$ filtresi ve White/Newey-West dirençli standart hatalar.

6. **What-If Stres Testi & Senaryo Simülasyonu:**
   - Şirketin yabancı para net pozisyonu ve borç vadesine duyarlı döviz şoku, maliyet artışı ve faiz artırımı duyarlılık köprüsü (Waterfall analizi).

7. **⚡ Sinyal Konsensüsü & Akıllı Copilot:**
   - Modüllerden beslenen tek tıkla indirilebilir JSON/PDF analitik raporu ve bağlamsal asistan.

---

## 🛠️ Teknoloji Yığını

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, SQLite/PostgreSQL
- **Kantitatif / İstatistik:** Statsmodels, Scikit-Learn, Pandas, NumPy
- **Frontend / Terminal:** Modern JavaScript (ES6+), Plotly.js, Tailwind CSS / Next.js React bileşenleri
- **Veri & Protokoller:** UFRS/KAP PIT şeması, RESTful API, Server-Sent Logs

---

## 🚀 Kurulum ve Çalıştırma

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/KULLANICI_ADINIZ/quantflux-terminal.git
cd quantflux-terminal
```

### 2. Sanal Ortam ve Bağımlılıklar
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Backend API Sunucusunu Başlatın
```bash
python3 backend/api_server.py
# veya
uvicorn backend.fastapi_app:app --reload --port 8000
```

### 4. Terminal Paneline Erişin
Tarayıcınızda `http://localhost:3000` veya `pulsedata-ops/index.html` dosyasını açarak terminali kullanmaya başlayabilirsiniz.
