# 🚔 PortPolice

<div align="center">

![PortPolice Banner](https://img.shields.io/badge/PortPolice-v1.0-6c5ce7?style=for-the-badge&logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078d4?style=for-the-badge&logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-00cec9?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-40+-47848F?style=for-the-badge&logo=electron&logoColor=white)

**A modern, sleek desktop application to monitor, manage and kill active network ports.**

**Aktif ağ portlarını izlemek, yönetmek ve durdurmak için modern bir masaüstü uygulaması.**

---

```
  ╔══════════════════════════════════════════════════════╗
  ║  🚔 PortPolice v1.0                     — □ ✕      ║
  ╠══════════════════════════════════════════════════════╣
  ║  Dashboard    │  🔍 Search ports...                 ║
  ║  ┌────┬────┐  │                                     ║
  ║  │ 42 │ 38 │  │  Proto  Port   PID   Process    Act ║
  ║  │ All│ TCP│  │  ──────────────────────────────────  ║
  ║  ├────┼────┤  │  TCP    80     1234  nginx     [✕]  ║
  ║  │  4 │ 12 │  │  TCP    3000   5678  node      [✕]  ║
  ║  │ UDP│List│  │  TCP    5432   9012  postgres   [✕]  ║
  ║  └────┴────┘  │  UDP    8080   3456  java       [✕]  ║
  ║               │  TCP    3306   7890  mysqld     [✕]  ║
  ║  Filters      │  TCP    27017  2345  mongod     [✕]  ║
  ║  ● All Ports  │                                     ║
  ║  ○ TCP Only   │                        42 shown     ║
  ║  ○ UDP Only   │                                     ║
  ╚══════════════════════════════════════════════════════╝
```

</div>

---

## 🇬🇧 English

### ✨ Features

| Feature | Description |
|---------|-------------|
| 📋 **Port Listing** | View all active ports with PID, process name, protocol, and status |
| 🔪 **Kill Process** | Terminate any process with a single click (with confirmation dialog) |
| 🔍 **Smart Search** | Filter by port number, PID, process name, or protocol |
| 🎛️ **Quick Filters** | One-click filters: All, TCP, UDP, Listening, Established |
| 📊 **Dashboard** | Real-time statistics showing active ports, protocols, and states |
| 🔄 **Auto Refresh** | Configurable auto-refresh (3s, 5s, 10s, 30s intervals) |
| 🌙 **Dark Mode** | Beautiful glassmorphism dark theme by default |
| 🖥️ **Custom Titlebar** | Frameless window with custom minimize/maximize/close controls |
| 🔔 **Notifications** | Toast notifications for all actions (kill success/failure) |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+F` for search, `Esc` to clear |

### 📦 Installation

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/) (optional)

#### Steps

```bash
# Clone the repository
git clone https://github.com/yourusername/PortPolice.git
cd PortPolice

# Install dependencies
npm install

# Run the application
npm start
```

### 🚀 Usage

1. **Launch** the app — it automatically scans all active ports
2. **Search** using the search bar or press `Ctrl+F`
3. **Filter** ports using sidebar quick filters (TCP, UDP, Listening, etc.)
4. **Sort** by clicking any column header (Port, PID, Process, Status)
5. **Kill** a process by clicking the red `✕ Kill` button
6. **Auto Refresh** — toggle auto-refresh from the sidebar and set your interval

### 🏗️ Project Structure

```
PortPolice/
├── 📁 src/
│   ├── main.js           # Electron main process
│   ├── preload.js         # IPC bridge (context isolation)
│   └── port-scanner.js    # Port scanning & process management
├── 📁 ui/
│   ├── index.html         # Application UI structure
│   ├── styles.css         # Glassmorphism dark theme
│   └── renderer.js        # Frontend logic & DOM management
├── 📁 assets/
│   └── icon.png           # Application icon
├── package.json
└── README.md
```

### 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Electron.js** | Desktop application framework |
| **HTML5** | UI structure |
| **CSS3** | Glassmorphism design, animations |
| **Vanilla JavaScript** | Frontend logic, no frameworks needed |
| **Node.js child_process** | System commands (netstat, taskkill) |

### ⚙️ How It Works

```
┌─────────────┐     IPC      ┌──────────────┐     exec      ┌──────────┐
│  Renderer    │◄────────────►│  Main Process │◄─────────────►│  System  │
│  (Frontend)  │   invoke/    │  (Backend)    │   netstat     │  (OS)    │
│  HTML/CSS/JS │   send       │  Electron     │   taskkill    │  Windows │
└─────────────┘              └──────────────┘               └──────────┘
```

1. **Renderer** sends IPC request → `scan-ports`
2. **Main process** runs `netstat -ano` via `child_process.execFile`
3. Output is parsed into structured JSON
4. **Process names** are resolved via `tasklist /FO CSV`
5. Data is sent back to renderer for display
6. **Kill** sends `taskkill /PID <id> /F` command

### ⚠️ Important Notes

- **Administrator privileges** may be required to kill system processes
- **System-critical processes** (PID 0, PID 4) are protected and cannot be killed
- The app uses `execFile` instead of `exec` for security (no shell injection)
- Context isolation is enabled for security best practices

---

## 🇹🇷 Türkçe

### ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 📋 **Port Listeleme** | Tüm aktif portları PID, işlem adı, protokol ve durum bilgileriyle görüntüle |
| 🔪 **İşlem Durdurma** | Herhangi bir işlemi tek tıkla sonlandır (onay diyaloğu ile) |
| 🔍 **Akıllı Arama** | Port numarası, PID, işlem adı veya protokole göre filtrele |
| 🎛️ **Hızlı Filtreler** | Tek tıkla filtreler: Tümü, TCP, UDP, Dinleniyor, Bağlı |
| 📊 **Gösterge Paneli** | Aktif portlar, protokoller ve durumları gösteren gerçek zamanlı istatistikler |
| 🔄 **Otomatik Yenileme** | Ayarlanabilir otomatik yenileme (3s, 5s, 10s, 30s aralıklar) |
| 🌙 **Karanlık Mod** | Varsayılan olarak güzel glassmorphism karanlık tema |
| 🖥️ **Özel Başlık Çubuğu** | Çerçevesiz pencere, özel küçült/büyüt/kapat kontrolleri |
| 🔔 **Bildirimler** | Tüm işlemler için toast bildirimleri |
| ⌨️ **Klavye Kısayolları** | Arama için `Ctrl+F`, temizlemek için `Esc` |

### 📦 Kurulum

#### Gereksinimler
- [Node.js](https://nodejs.org/) (v18 veya üzeri)
- [Git](https://git-scm.com/) (isteğe bağlı)

#### Adımlar

```bash
# Depoyu klonlayın
git clone https://github.com/yourusername/PortPolice.git
cd PortPolice

# Bağımlılıkları yükleyin
npm install

# Uygulamayı çalıştırın
npm start
```

### 🚀 Kullanım

1. **Başlatın** — uygulama otomatik olarak tüm aktif portları tarar
2. **Arayın** — arama çubuğunu kullanın veya `Ctrl+F` basın
3. **Filtreleyin** — yan paneldeki hızlı filtrelerle (TCP, UDP, Dinleniyor, vb.)
4. **Sıralayın** — herhangi bir sütun başlığına tıklayarak (Port, PID, İşlem, Durum)
5. **Durdurun** — kırmızı `✕ Kill` butonuna tıklayarak bir işlemi sonlandırın
6. **Otomatik Yenileme** — yan panelden otomatik yenilemeyi açın ve süreyi ayarlayın

### 🏗️ Proje Yapısı

```
PortPolice/
├── 📁 src/
│   ├── main.js           # Electron ana işlem
│   ├── preload.js         # IPC köprüsü (bağlam izolasyonu)
│   └── port-scanner.js    # Port tarama & işlem yönetimi
├── 📁 ui/
│   ├── index.html         # Uygulama arayüzü yapısı
│   ├── styles.css         # Glassmorphism karanlık tema
│   └── renderer.js        # Ön yüz mantığı & DOM yönetimi
├── 📁 assets/
│   └── icon.png           # Uygulama ikonu
├── package.json
└── README.md
```

### 🛠️ Teknoloji Yığını

| Teknoloji | Amaç |
|-----------|------|
| **Electron.js** | Masaüstü uygulama çerçevesi |
| **HTML5** | Arayüz yapısı |
| **CSS3** | Glassmorphism tasarım, animasyonlar |
| **Saf JavaScript** | Ön yüz mantığı, framework gereksiz |
| **Node.js child_process** | Sistem komutları (netstat, taskkill) |

### ⚙️ Nasıl Çalışır

```
┌─────────────┐     IPC      ┌──────────────┐    komut     ┌──────────┐
│  Renderer    │◄────────────►│  Ana İşlem    │◄────────────►│  Sistem  │
│  (Ön Yüz)   │   invoke/    │  (Arka Plan)  │   netstat    │  (İS)    │
│  HTML/CSS/JS │   send       │  Electron     │   taskkill   │  Windows │
└─────────────┘              └──────────────┘              └──────────┘
```

1. **Renderer** IPC isteği gönderir → `scan-ports`
2. **Ana işlem** `child_process.execFile` ile `netstat -ano` çalıştırır
3. Çıktı yapılandırılmış JSON'a dönüştürülür
4. **İşlem adları** `tasklist /FO CSV` ile çözümlenir
5. Veri gösterim için renderer'a geri gönderilir
6. **Durdurma** `taskkill /PID <id> /F` komutunu gönderir

### ⚠️ Önemli Notlar

- Sistem işlemlerini durdurmak için **yönetici yetkileri** gerekebilir
- **Sistem kritik işlemler** (PID 0, PID 4) korunmaktadır ve durdurulamaz
- Güvenlik için `exec` yerine `execFile` kullanılır (shell injection önlenir)
- Güvenlik en iyi uygulamaları için bağlam izolasyonu etkindir

---

<div align="center">

### 📄 License / Lisans

MIT License — see [LICENSE](LICENSE) for details.

MIT Lisansı — detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

**Made with ❤️ by Baran**

</div>
