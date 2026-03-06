// ═══════════════════════════════════════════
// PortPolice – Internationalization (i18n)
// ═══════════════════════════════════════════

const LANG_KEY = 'portpolice_lang';

const translations = {
  en: {
    // Sidebar - Dashboard
    dashboard: 'Dashboard',
    activePorts: 'Active Ports',
    listening: 'Listening',

    // Sidebar - Quick Filters
    quickFilters: 'Quick Filters',
    allPorts: 'All Ports',
    tcpOnly: 'TCP Only',
    udpOnly: 'UDP Only',
    established: 'Established',

    // Sidebar - Browser Filter
    browserFilter: 'Browser Filter',
    allBrowsers: 'All Browsers',

    // Sidebar - Auto Refresh
    autoRefresh: 'Auto Refresh',

    // Sidebar - System Monitor
    systemMonitor: 'System Monitor',
    ramUsed: 'RAM Used',

    // Sidebar - Uptime
    uptime: 'Uptime',

    // Sidebar - Network
    network: 'Network',
    noExternalInterfaces: 'No external interfaces',
    loading: 'Loading...',

    // Sidebar - Quick Port Check
    quickPortCheck: 'Quick Port Check',
    check: 'Check',
    portPlaceholder: 'Port #',

    // Sidebar - Watchlist
    watchlist: 'Watchlist',
    noPortsWatched: 'No ports watched',
    active: 'Active',
    inactive: 'Inactive',

    // Sidebar - Threshold Alerts
    thresholdAlerts: 'Threshold Alerts',
    save: 'Save',

    // Top Bar
    searchPlaceholder: 'Search by port, PID, or process name...',
    range: 'Range',
    remote: 'Remote',
    forward: 'Forward',
    export: 'Export',
    launch: 'Launch',
    refresh: 'Refresh',
    shown: 'shown',

    // Top Bar Tooltips
    portRangeScan: 'Port Range Scan',
    remoteHostScan: 'Remote Host Scan',
    portForwarding: 'Port Forwarding',
    exportData: 'Export Data',
    quickLaunch: 'Quick Launch',

    // Export
    exportCsv: '📄 Export CSV',
    exportJson: '📋 Export JSON',

    // Table Headers
    protocol: 'Protocol',
    port: 'Port',
    address: 'Address',
    pid: 'PID',
    process: 'Process',
    status: 'Status',
    actions: 'Actions',

    // Table States
    scanningPorts: 'Scanning ports...',
    noPortsFound: 'No ports found matching your criteria',

    // Pagination
    page: 'Page',
    of: 'of',
    items: 'items',
    perPage: 'per page',

    // Detail Panel
    processDetails: 'Process Details',
    loadingDetails: 'Loading details...',
    close: 'Close',
    generalInfo: 'General Info',
    category: 'Category',
    description: 'Description',
    product: 'Product',
    company: 'Company',
    version: 'Version',
    window: 'Window',
    networkSection: 'Network',
    portLabel: 'Port',
    protocolLabel: 'Protocol',
    addressLabel: 'Address',
    foreign: 'Foreign',
    statusLabel: 'Status',
    processSection: 'Process',
    pidLabel: 'PID',
    parent: 'Parent',
    memory: 'Memory',
    cpuTime: 'CPU Time',
    threads: 'Threads',
    started: 'Started',
    fileLocation: 'File Location',
    path: 'Path',
    commandLine: 'Command Line',
    killProcessPid: 'Kill Process (PID: {pid})',

    // Kill Modal
    confirmKillProcess: '⚠️ Confirm Kill Process',
    killConfirmMsg: 'Are you sure you want to kill this process?',
    processLabel: 'Process:',
    pidModalLabel: 'PID:',
    portModalLabel: 'Port:',
    cancel: 'Cancel',
    killProcess: 'Kill Process',
    killBtn: '✕ Kill',

    // Port Range Modal
    portRangeScanTitle: '🔍 Port Range Scan',
    portRangeScanDesc: 'Scan ports within a specific range on localhost',
    startPort: 'Start Port',
    endPort: 'End Port',
    portsFound: 'ports found',
    scan: 'Scan',

    // Remote Scan Modal
    remoteHostScanTitle: '🌐 Remote Host Port Scan',
    remoteHostScanDesc: 'Scan ports on a remote host (TCP connect scan)',
    hostIp: 'Host / IP',
    openPortsOn: 'open ports on',

    // Port Forwarding Modal
    portForwardingTitle: '🔀 Port Forwarding',
    portForwardingDesc: 'Manage port forwarding rules (requires Administrator)',
    listenPort: 'Listen Port',
    connectAddress: 'Connect Address',
    connectPort: 'Connect Port',
    addRule: '+ Add Rule',
    activeRules: 'Active Rules',
    noForwardingRules: 'No forwarding rules',

    // Known Port Info Modal
    portInfo: '📖 Port Info',
    noKnownService: 'No known service registered for this port',
    suspiciousPort: '🚨 Suspicious Port',
    risk: 'risk',
    errorLoadingPortInfo: 'Error loading port info',

    // Keyboard Shortcuts Modal
    keyboardShortcuts: '⌨️ Keyboard Shortcuts',
    focusSearch: 'Focus Search',
    refreshPorts: 'Refresh Ports',
    exportMenu: 'Export Menu',
    quickPortCheckShort: 'Quick Port Check',
    portRangeScanShort: 'Port Range Scan',
    remoteHostScanShort: 'Remote Host Scan',
    closeModalClear: 'Close Modal / Clear',
    showThisHelp: 'Show This Help',

    // Context Menu
    viewDetails: '📋 View Details',
    ctxPortInfo: '📖 Port Info',
    addToWatchlist: '👁️ Add to Watchlist',
    copyPort: '📋 Copy Port',
    copyPid: '📋 Copy PID',
    copyRow: '📋 Copy Row',
    ctxKillProcess: '⚡ Kill Process',

    // Notification Panel
    portChanges: '🔔 Port Changes',

    // Quick Launch
    quickLaunchTitle: '🚀 Quick Launch',
    newProfile: 'New Profile',
    noProfilesYet: 'No workspace profiles yet',
    createProfileHint: 'Create a profile to launch multiple services at once',
    runningServices: 'Running Services',
    noRunningServices: 'No running services',
    profileName: 'Profile Name',
    icon: 'Icon',
    services: 'Services',
    addService: '+ Add Service',
    saveProfile: '💾 Save Profile',
    editProfile: '✏️ Edit Profile',
    newProfileTitle: '✨ New Profile',
    service: 'Service',

    // Toast Messages
    scanFailed: 'Scan failed: {error}',
    errorMsg: 'Error: {error}',
    enterValidPort: 'Enter a valid port (1-65535)',
    portInUse: '🔴 Port {port} is IN USE',
    portFree: '🟢 Port {port} is FREE',
    portRemovedWatchlist: 'Port {port} removed from watchlist',
    portAddedWatchlist: 'Port {port} added to watchlist',
    thresholdsSet: 'Thresholds set: CPU {cpu}%, RAM {memory}%',
    cpuExceedsThreshold: 'CPU usage {cpu}% exceeds threshold ({threshold}%)',
    ramExceedsThreshold: 'RAM usage {ram}% exceeds threshold ({threshold}%)',
    suspiciousDetected: '⚠️ Suspicious port(s) detected: {ports}',
    suspiciousCountDetected: '⚠️ {count} suspicious ports detected!',
    duplicateListening: '⚠️ Duplicate listening on port(s): {ports}',
    portsOpened: '🟢 {count} port(s) opened',
    portsClosed: '🔴 {count} port(s) closed',
    opened: 'opened',
    closed: 'closed',
    enterValidRange: 'Enter a valid port range',
    noActivePortsRange: 'No active ports in this range',
    noOpenPortsFound: 'No open ports found',
    enterHostAddress: 'Enter a host address',
    portForwardingAdded: 'Port forwarding added: {lp} → {addr}:{cp}',
    fillAllFields: 'Fill in all fields',
    ruleRemoved: 'Rule removed',
    exported: 'Exported {count} ports as {format}',
    portCopied: 'Port {port} copied',
    pidCopied: 'PID {pid} copied',
    rowCopied: 'Row copied',
    killingProcesses: 'Killing all processes on port {port}...',
    portFreed: 'Port {port} freed! Killed {count} process(es).',
    portStillInUse: 'Killed {count} process(es) but port {port} may still be in use. Try running as Administrator.',
    processesNotKilled: '{count} process(es) could not be killed (access denied).',
    serviceExited: 'Service exited (code {code}): {msg}',
    serviceExitedCode: 'Service exited with code {code}',
    serviceStopped: 'Service stopped',
    serviceError: 'Service error: {msg}',
    scanning: '⏳ Scanning...',
    enterProfileName: 'Please enter a profile name',
    addAtLeastOneService: 'Add at least one service with a folder and command',
    profileUpdated: 'Profile updated',
    profileCreated: 'Profile created',
    noPackageJson: '{name}: No package.json found',
    svcError: '{name}: {error}',
    startedServices: 'Started {count} service(s) in "{name}"',
    starting: '⏳ Starting...',
    stopping: '⏳ Stopping...',
    stoppedServices: 'Stopped services in "{name}"',
    deleteConfirm: 'Delete profile "{name}"?',
    profileDeleted: 'Profile "{name}" deleted',
    runningCount: '{running}/{total} running',
    serviceCount: '{count} service(s)',
    startAll: '▶ Start All',
    stopAll: '■ Stop All',
    runningBadge: 'Running',
    stopBtn: '■ Stop',
    stopFailed: 'Stop failed: {error}',
    deleteBtn: 'Delete',
    editBtn: 'Edit',
    multipleProcesses: 'Multiple processes on this port',
    suspiciousPort: 'Suspicious port',
    watched: 'Watched',
    removeService: 'Remove service',

    // Language
    language: 'Language',
  },

  tr: {
    // Sidebar - Dashboard
    dashboard: 'Gösterge Paneli',
    activePorts: 'Aktif Portlar',
    listening: 'Dinleniyor',

    // Sidebar - Quick Filters
    quickFilters: 'Hızlı Filtreler',
    allPorts: 'Tüm Portlar',
    tcpOnly: 'Sadece TCP',
    udpOnly: 'Sadece UDP',
    established: 'Bağlı',

    // Sidebar - Browser Filter
    browserFilter: 'Tarayıcı Filtresi',
    allBrowsers: 'Tüm Tarayıcılar',

    // Sidebar - Auto Refresh
    autoRefresh: 'Otomatik Yenileme',

    // Sidebar - System Monitor
    systemMonitor: 'Sistem Monitörü',
    ramUsed: 'Kullanılan RAM',

    // Sidebar - Uptime
    uptime: 'Çalışma Süresi',

    // Sidebar - Network
    network: 'Ağ',
    noExternalInterfaces: 'Harici arayüz yok',
    loading: 'Yükleniyor...',

    // Sidebar - Quick Port Check
    quickPortCheck: 'Hızlı Port Kontrolü',
    check: 'Kontrol',
    portPlaceholder: 'Port #',

    // Sidebar - Watchlist
    watchlist: 'İzleme Listesi',
    noPortsWatched: 'İzlenen port yok',
    active: 'Aktif',
    inactive: 'Pasif',

    // Sidebar - Threshold Alerts
    thresholdAlerts: 'Eşik Uyarıları',
    save: 'Kaydet',

    // Top Bar
    searchPlaceholder: 'Port, PID veya işlem adına göre ara...',
    range: 'Aralık',
    remote: 'Uzak',
    forward: 'Yönlendir',
    export: 'Dışa Aktar',
    launch: 'Başlat',
    refresh: 'Yenile',
    shown: 'gösterilen',

    // Top Bar Tooltips
    portRangeScan: 'Port Aralığı Taraması',
    remoteHostScan: 'Uzak Bilgisayar Taraması',
    portForwarding: 'Port Yönlendirme',
    exportData: 'Veriyi Dışa Aktar',
    quickLaunch: 'Hızlı Başlat',

    // Export
    exportCsv: '📄 CSV Olarak Aktar',
    exportJson: '📋 JSON Olarak Aktar',

    // Table Headers
    protocol: 'Protokol',
    port: 'Port',
    address: 'Adres',
    pid: 'PID',
    process: 'İşlem',
    status: 'Durum',
    actions: 'İşlemler',

    // Table States
    scanningPorts: 'Portlar taranıyor...',
    noPortsFound: 'Kriterlere uygun port bulunamadı',

    // Pagination
    page: 'Sayfa',
    of: '/',
    items: 'öğe',
    perPage: 'sayfa başına',

    // Detail Panel
    processDetails: 'İşlem Detayları',
    loadingDetails: 'Detaylar yükleniyor...',
    close: 'Kapat',
    generalInfo: 'Genel Bilgiler',
    category: 'Kategori',
    description: 'Açıklama',
    product: 'Ürün',
    company: 'Şirket',
    version: 'Sürüm',
    window: 'Pencere',
    networkSection: 'Ağ',
    portLabel: 'Port',
    protocolLabel: 'Protokol',
    addressLabel: 'Adres',
    foreign: 'Uzak Adres',
    statusLabel: 'Durum',
    processSection: 'İşlem',
    pidLabel: 'PID',
    parent: 'Üst İşlem',
    memory: 'Bellek',
    cpuTime: 'CPU Süresi',
    threads: 'İş Parçacıkları',
    started: 'Başlangıç',
    fileLocation: 'Dosya Konumu',
    path: 'Yol',
    commandLine: 'Komut Satırı',
    killProcessPid: 'İşlemi Sonlandır (PID: {pid})',

    // Kill Modal
    confirmKillProcess: '⚠️ İşlemi Sonlandırmayı Onayla',
    killConfirmMsg: 'Bu işlemi sonlandırmak istediğinize emin misiniz?',
    processLabel: 'İşlem:',
    pidModalLabel: 'PID:',
    portModalLabel: 'Port:',
    cancel: 'İptal',
    killProcess: 'İşlemi Sonlandır',
    killBtn: '✕ Sonlandır',

    // Port Range Modal
    portRangeScanTitle: '🔍 Port Aralığı Taraması',
    portRangeScanDesc: 'Localhost üzerinde belirli bir aralıktaki portları tara',
    startPort: 'Başlangıç Portu',
    endPort: 'Bitiş Portu',
    portsFound: 'port bulundu',
    scan: 'Tara',

    // Remote Scan Modal
    remoteHostScanTitle: '🌐 Uzak Bilgisayar Port Taraması',
    remoteHostScanDesc: 'Uzak bilgisayardaki portları tara (TCP bağlantı taraması)',
    hostIp: 'Ana Bilgisayar / IP',
    openPortsOn: 'açık port -',

    // Port Forwarding Modal
    portForwardingTitle: '🔀 Port Yönlendirme',
    portForwardingDesc: 'Port yönlendirme kurallarını yönetin (Yönetici gerektirir)',
    listenPort: 'Dinleme Portu',
    connectAddress: 'Bağlantı Adresi',
    connectPort: 'Bağlantı Portu',
    addRule: '+ Kural Ekle',
    activeRules: 'Aktif Kurallar',
    noForwardingRules: 'Yönlendirme kuralı yok',

    // Known Port Info Modal
    portInfo: '📖 Port Bilgisi',
    noKnownService: 'Bu port için kayıtlı bilinen servis yok',
    suspiciousPort: '🚨 Şüpheli Port',
    risk: 'risk',
    errorLoadingPortInfo: 'Port bilgisi yüklenirken hata oluştu',

    // Keyboard Shortcuts Modal
    keyboardShortcuts: '⌨️ Klavye Kısayolları',
    focusSearch: 'Aramaya Odaklan',
    refreshPorts: 'Portları Yenile',
    exportMenu: 'Dışa Aktarma Menüsü',
    quickPortCheckShort: 'Hızlı Port Kontrolü',
    portRangeScanShort: 'Port Aralığı Taraması',
    remoteHostScanShort: 'Uzak Bilgisayar Taraması',
    closeModalClear: 'Modalı Kapat / Temizle',
    showThisHelp: 'Bu Yardımı Göster',

    // Context Menu
    viewDetails: '📋 Detayları Görüntüle',
    ctxPortInfo: '📖 Port Bilgisi',
    addToWatchlist: '👁️ İzleme Listesine Ekle',
    copyPort: '📋 Portu Kopyala',
    copyPid: '📋 PID Kopyala',
    copyRow: '📋 Satırı Kopyala',
    ctxKillProcess: '⚡ İşlemi Sonlandır',

    // Notification Panel
    portChanges: '🔔 Port Değişiklikleri',

    // Quick Launch
    quickLaunchTitle: '🚀 Hızlı Başlat',
    newProfile: 'Yeni Profil',
    noProfilesYet: 'Henüz profil oluşturulmadı',
    createProfileHint: 'Birden fazla servisi aynı anda başlatmak için profil oluşturun',
    runningServices: 'Çalışan Servisler',
    noRunningServices: 'Çalışan servis yok',
    profileName: 'Profil Adı',
    icon: 'Simge',
    services: 'Servisler',
    addService: '+ Servis Ekle',
    saveProfile: '💾 Profili Kaydet',
    editProfile: '✏️ Profili Düzenle',
    newProfileTitle: '✨ Yeni Profil',
    service: 'Servis',

    // Toast Messages
    scanFailed: 'Tarama başarısız: {error}',
    errorMsg: 'Hata: {error}',
    enterValidPort: 'Geçerli bir port girin (1-65535)',
    portInUse: '🔴 Port {port} KULLANILIYOR',
    portFree: '🟢 Port {port} SERBEST',
    portRemovedWatchlist: 'Port {port} izleme listesinden kaldırıldı',
    portAddedWatchlist: 'Port {port} izleme listesine eklendi',
    thresholdsSet: 'Eşikler ayarlandı: CPU {cpu}%, RAM {memory}%',
    cpuExceedsThreshold: 'CPU kullanımı {cpu}% eşiği aştı ({threshold}%)',
    ramExceedsThreshold: 'RAM kullanımı {ram}% eşiği aştı ({threshold}%)',
    suspiciousDetected: '⚠️ Şüpheli port(lar) tespit edildi: {ports}',
    suspiciousCountDetected: '⚠️ {count} şüpheli port tespit edildi!',
    duplicateListening: '⚠️ Aynı port(lar)da çoklu dinleme: {ports}',
    portsOpened: '🟢 {count} port açıldı',
    portsClosed: '🔴 {count} port kapandı',
    opened: 'açıldı',
    closed: 'kapandı',
    enterValidRange: 'Geçerli bir port aralığı girin',
    noActivePortsRange: 'Bu aralıkta aktif port yok',
    noOpenPortsFound: 'Açık port bulunamadı',
    enterHostAddress: 'Bir ana bilgisayar adresi girin',
    portForwardingAdded: 'Port yönlendirme eklendi: {lp} → {addr}:{cp}',
    fillAllFields: 'Tüm alanları doldurun',
    ruleRemoved: 'Kural kaldırıldı',
    exported: '{count} port {format} olarak dışa aktarıldı',
    portCopied: 'Port {port} kopyalandı',
    pidCopied: 'PID {pid} kopyalandı',
    rowCopied: 'Satır kopyalandı',
    killingProcesses: 'Port {port} üzerindeki tüm işlemler sonlandırılıyor...',
    portFreed: 'Port {port} serbest bırakıldı! {count} işlem sonlandırıldı.',
    portStillInUse: '{count} işlem sonlandırıldı ancak port {port} hâlâ kullanımda olabilir. Yönetici olarak çalıştırmayı deneyin.',
    processesNotKilled: '{count} işlem sonlandırılamadı (erişim engellendi).',
    serviceExited: 'Servis çıktı (kod {code}): {msg}',
    serviceExitedCode: 'Servis {code} koduyla çıktı',
    serviceStopped: 'Servis durduruldu',
    serviceError: 'Servis hatası: {msg}',
    scanning: '⏳ Taranıyor...',
    enterProfileName: 'Lütfen bir profil adı girin',
    addAtLeastOneService: 'En az bir servis ekleyin (klasör ve komut gerekli)',
    profileUpdated: 'Profil güncellendi',
    profileCreated: 'Profil oluşturuldu',
    noPackageJson: '{name}: package.json bulunamadı',
    svcError: '{name}: {error}',
    startedServices: '"{name}" içinde {count} servis başlatıldı',
    starting: '⏳ Başlatılıyor...',
    stopping: '⏳ Durduruluyor...',
    stoppedServices: '"{name}" servisleri durduruldu',
    deleteConfirm: '"{name}" profili silinsin mi?',
    profileDeleted: '"{name}" profili silindi',
    runningCount: '{running}/{total} çalışıyor',
    serviceCount: '{count} servis',
    startAll: '▶ Tümünü Başlat',
    stopAll: '■ Tümünü Durdur',
    runningBadge: 'Çalışıyor',
    stopBtn: '■ Durdur',
    stopFailed: 'Durdurma başarısız: {error}',
    deleteBtn: 'Sil',
    editBtn: 'Düzenle',
    multipleProcesses: 'Bu portta birden fazla işlem',
    suspiciousPort: 'Şüpheli port',
    watched: 'İzleniyor',
    removeService: 'Servisi kaldır',

    // Language
    language: 'Dil',
  }
};

let currentLang = localStorage.getItem(LANG_KEY) || 'en';

function t(key, params) {
  const str = (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyLanguage();
}

function applyLanguage() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  // Update all elements with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  // Update all elements with data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  // Update language switcher active state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  // Pagination static text
  const paginationInfo = document.querySelector('.pagination-info');
  if (paginationInfo) {
    const cur = document.getElementById('page-current').textContent;
    const tot = document.getElementById('page-total').textContent;
    const cnt = document.getElementById('page-item-count').textContent;
    paginationInfo.innerHTML = `${t('page')} <span id="page-current">${cur}</span> ${t('of')} <span id="page-total">${tot}</span> (<span id="page-item-count">${cnt}</span> ${t('items')})`;
  }

  const pageSizeLabel = document.querySelector('.page-size-label');
  if (pageSizeLabel) pageSizeLabel.textContent = t('perPage');

  // Port count
  const portCount = document.querySelector('.port-count');
  if (portCount) {
    const vis = document.getElementById('visible-count').textContent;
    const tot = document.getElementById('total-count').textContent;
    portCount.innerHTML = `<span id="visible-count">${vis}</span> / <span id="total-count">${tot}</span> ${t('shown')}`;
  }
}
