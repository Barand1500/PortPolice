const { execFile, exec } = require('child_process');
const path = require('path');

// Known browser process names
const BROWSER_MAP = {
  'chrome.exe': { name: 'Google Chrome', icon: '🌐' },
  'msedge.exe': { name: 'Microsoft Edge', icon: '🔵' },
  'firefox.exe': { name: 'Mozilla Firefox', icon: '🦊' },
  'opera.exe': { name: 'Opera', icon: '🔴' },
  'brave.exe': { name: 'Brave', icon: '🦁' },
  'vivaldi.exe': { name: 'Vivaldi', icon: '🎵' },
  'zen.exe': { name: 'Zen Browser', icon: '🧘' },
  'safari.exe': { name: 'Safari', icon: '🧭' },
  'iexplore.exe': { name: 'Internet Explorer', icon: '📘' },
};

// Known app categories
const APP_CATEGORIES = {
  'node.exe': { category: 'Runtime', icon: '💚' },
  'python.exe': { category: 'Runtime', icon: '🐍' },
  'pythonw.exe': { category: 'Runtime', icon: '🐍' },
  'java.exe': { category: 'Runtime', icon: '☕' },
  'javaw.exe': { category: 'Runtime', icon: '☕' },
  'php.exe': { category: 'Runtime', icon: '🐘' },
  'ruby.exe': { category: 'Runtime', icon: '💎' },
  'mysqld.exe': { category: 'Database', icon: '🗄️' },
  'postgres.exe': { category: 'Database', icon: '🐘' },
  'mongod.exe': { category: 'Database', icon: '🍃' },
  'redis-server.exe': { category: 'Database', icon: '🔴' },
  'sqlservr.exe': { category: 'Database', icon: '🗄️' },
  'httpd.exe': { category: 'Web Server', icon: '🌐' },
  'nginx.exe': { category: 'Web Server', icon: '🌐' },
  'svchost.exe': { category: 'System', icon: '⚙️' },
  'System': { category: 'System', icon: '💻' },
  'lsass.exe': { category: 'System', icon: '🔒' },
  'services.exe': { category: 'System', icon: '⚙️' },
  'code.exe': { category: 'IDE', icon: '💙' },
  'devenv.exe': { category: 'IDE', icon: '💜' },
  'spotify.exe': { category: 'Media', icon: '🎵' },
  'discord.exe': { category: 'Communication', icon: '💬' },
  'slack.exe': { category: 'Communication', icon: '💬' },
  'teams.exe': { category: 'Communication', icon: '💬' },
};

function getAppInfo(processName) {
  const lower = processName.toLowerCase();
  
  if (BROWSER_MAP[lower]) {
    return { ...BROWSER_MAP[lower], category: 'Browser' };
  }
  if (APP_CATEGORIES[lower]) {
    return { name: processName, ...APP_CATEGORIES[lower] };
  }
  return { name: processName, category: 'Application', icon: '📦' };
}

/**
 * Parse netstat output and return structured port data
 */
function parseNetstatOutput(output) {
  const lines = output.split('\n');
  const ports = [];
  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Active') || trimmed.startsWith('Proto')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;

    const proto = parts[0];
    const localAddress = parts[1];
    const foreignAddress = parts[2];
    let state, pid;

    if (proto === 'UDP') {
      state = '-';
      pid = parts[3] || '';
    } else {
      state = parts[3] || '';
      pid = parts[4] || '';
    }

    pid = pid.replace(/[^0-9]/g, '');
    if (!pid || pid === '0') continue;

    const addressParts = localAddress.split(':');
    const port = addressParts[addressParts.length - 1];
    if (!port || isNaN(port)) continue;

    const key = `${proto}-${port}-${pid}`;
    if (seen.has(key)) continue;
    seen.add(key);

    ports.push({
      proto,
      localAddress,
      foreignAddress,
      port: parseInt(port),
      state,
      pid: parseInt(pid),
      processName: ''
    });
  }

  return ports;
}

/**
 * Get process name by PID using tasklist
 */
function getProcessNames(pids) {
  return new Promise((resolve) => {
    if (pids.length === 0) return resolve({});

    const uniquePids = [...new Set(pids)];
    
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (error, stdout) => {
      if (error) return resolve({});

      const nameMap = {};
      const lines = stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/"([^"]+)","(\d+)"/);
        if (match) {
          const name = match[1];
          const pid = parseInt(match[2]);
          if (uniquePids.includes(pid)) {
            nameMap[pid] = name;
          }
        }
      }

      resolve(nameMap);
    });
  });
}

/**
 * Scan all active ports with app info
 */
function scanPorts() {
  return new Promise((resolve, reject) => {
    execFile('netstat', ['-ano'], { windowsHide: true }, async (error, stdout) => {
      if (error) return reject(error);

      const ports = parseNetstatOutput(stdout);
      const pids = ports.map(p => p.pid);
      const nameMap = await getProcessNames(pids);

      for (const port of ports) {
        port.processName = nameMap[port.pid] || 'Unknown';
        const info = getAppInfo(port.processName);
        port.appCategory = info.category;
        port.appIcon = info.icon;
        port.appDisplayName = info.name || port.processName;
      }

      ports.sort((a, b) => a.port - b.port);
      resolve(ports);
    });
  });
}

/**
 * Find ALL PIDs using a specific port
 */
function findPidsOnPort(port) {
  return new Promise((resolve) => {
    const safePort = parseInt(port);
    if (isNaN(safePort)) return resolve([]);

    execFile('netstat', ['-ano'], { windowsHide: true }, (error, stdout) => {
      if (error) return resolve([]);

      const pids = new Set();
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Match lines containing :<port> in the local address
        const regex = new RegExp(`:${safePort}\\s`);
        if (regex.test(trimmed)) {
          const parts = trimmed.split(/\s+/);
          const lastPart = parts[parts.length - 1].replace(/[^0-9]/g, '');
          if (lastPart && lastPart !== '0') {
            pids.add(parseInt(lastPart));
          }
        }
      }

      resolve([...pids]);
    });
  });
}

/**
 * Check if a port is still in use
 */
function isPortStillActive(port) {
  return new Promise((resolve) => {
    const safePort = parseInt(port);
    execFile('netstat', ['-ano'], { windowsHide: true }, (error, stdout) => {
      if (error) return resolve(false);
      const regex = new RegExp(`:${safePort}\\s`);
      resolve(regex.test(stdout));
    });
  });
}

/**
 * Kill a single PID with taskkill
 */
function killSinglePid(pid) {
  return new Promise((resolve) => {
    const safePid = String(parseInt(pid));
    execFile('taskkill', ['/PID', safePid, '/T', '/F'], { windowsHide: true }, (error, stdout, stderr) => {
      resolve({ pid: parseInt(safePid), success: !error, output: stdout || '', error: stderr || '' });
    });
  });
}

/**
 * Kill a single PID with PowerShell Stop-Process
 */
function killSinglePidPS(pid) {
  return new Promise((resolve) => {
    const safePid = parseInt(pid);
    const cmd = `Stop-Process -Id ${safePid} -Force -ErrorAction SilentlyContinue; $?`;
    execFile('powershell.exe', ['-NoProfile', '-Command', cmd],
      { windowsHide: true, timeout: 8000 }, (error, stdout) => {
        resolve({ pid: safePid, success: !error, output: stdout?.trim() || '' });
    });
  });
}

/**
 * Kill a port completely - finds ALL processes using the port and kills them all
 * Then verifies the port is actually freed
 */
async function killPort(port, pid) {
  const safePort = parseInt(port);
  const safePid = parseInt(pid);
  
  if (!safePort || !safePid || safePid <= 4) {
    throw new Error('Invalid or system-critical PID');
  }

  const results = { killed: [], failed: [], portFreed: false };

  // Step 1: Find ALL PIDs on this port
  let pidsOnPort = await findPidsOnPort(safePort);
  
  // Add the original PID if not already in list
  if (!pidsOnPort.includes(safePid)) {
    pidsOnPort.push(safePid);
  }

  // Filter out system PIDs (0, 4)
  pidsOnPort = pidsOnPort.filter(p => p > 4);

  // Step 2: Kill each PID with taskkill /T /F
  for (const targetPid of pidsOnPort) {
    const result = await killSinglePid(targetPid);
    if (result.success) {
      results.killed.push(targetPid);
    } else {
      results.failed.push(targetPid);
    }
  }

  // Step 3: Wait a moment and check if port is still active
  await new Promise(r => setTimeout(r, 500));
  let stillActive = await isPortStillActive(safePort);

  // Step 4: If port still active, find remaining PIDs and try PowerShell
  if (stillActive) {
    const remainingPids = await findPidsOnPort(safePort);
    const validRemaining = remainingPids.filter(p => p > 4);
    
    for (const targetPid of validRemaining) {
      const result = await killSinglePidPS(targetPid);
      if (result.success) {
        if (!results.killed.includes(targetPid)) results.killed.push(targetPid);
        // Remove from failed if it was there
        results.failed = results.failed.filter(p => p !== targetPid);
      }
    }

    // Step 5: Final check
    await new Promise(r => setTimeout(r, 500));
    stillActive = await isPortStillActive(safePort);
  }

  results.portFreed = !stillActive;

  if (results.killed.length === 0 && results.failed.length > 0) {
    throw new Error('Access denied. Run PortPolice as Administrator to kill this process.');
  }

  return results;
}

/**
 * Simple PID kill (fallback for non-port-specific kills)
 */
function killProcess(pid) {
  return new Promise((resolve, reject) => {
    if (!pid || isNaN(pid) || pid <= 0 || pid === 4) {
      return reject(new Error('Invalid or system-critical PID'));
    }

    const safePid = String(parseInt(pid));
    execFile('taskkill', ['/PID', safePid, '/T', '/F'], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const errMsg = stderr || error.message;
        if (errMsg.includes('Access is denied') || errMsg.includes('Erişim engellendi')) {
          return reject(new Error('Access denied. Run PortPolice as Administrator to kill this process.'));
        }
        return reject(new Error(errMsg));
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Get detailed info about a specific process using PowerShell
 */
function getProcessDetail(pid) {
  return new Promise((resolve, reject) => {
    if (!pid || isNaN(pid)) return reject(new Error('Invalid PID'));

    const safePid = parseInt(pid);
    const psCommand = `
      $p = Get-Process -Id ${safePid} -ErrorAction SilentlyContinue
      if ($p) {
        $wmi = Get-CimInstance Win32_Process -Filter "ProcessId = ${safePid}" -ErrorAction SilentlyContinue
        [PSCustomObject]@{
          Name = $p.ProcessName
          PID = $p.Id
          Path = $p.Path
          CommandLine = if($wmi) { $wmi.CommandLine } else { '' }
          WorkingDir = if($wmi) { $wmi.ExecutablePath } else { '' }
          ParentPID = if($wmi) { $wmi.ParentProcessId } else { 0 }
          MemoryMB = [math]::Round($p.WorkingSet64 / 1MB, 1)
          CPU = [math]::Round($p.CPU, 2)
          StartTime = if($p.StartTime) { $p.StartTime.ToString('yyyy-MM-dd HH:mm:ss') } else { '' }
          Threads = $p.Threads.Count
          Company = $p.Company
          Description = $p.Description
          FileVersion = $p.FileVersion
          ProductName = $p.Product
          MainWindowTitle = $p.MainWindowTitle
        } | ConvertTo-Json -Depth 1
      } else {
        Write-Output '{}'
      }
    `;

    execFile('powershell.exe', ['-NoProfile', '-Command', psCommand], 
      { windowsHide: true, timeout: 10000 }, (error, stdout) => {
        if (error) return reject(error);

        try {
          const detail = JSON.parse(stdout.trim());
          if (detail && detail.PID) {
            // Get parent process name
            if (detail.ParentPID && detail.ParentPID > 0) {
              getParentProcessName(detail.ParentPID).then(parentName => {
                detail.ParentName = parentName;
                resolve(detail);
              }).catch(() => {
                detail.ParentName = 'Unknown';
                resolve(detail);
              });
            } else {
              detail.ParentName = 'N/A';
              resolve(detail);
            }
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
    });
  });
}

/**
 * Get parent process name
 */
function getParentProcessName(pid) {
  return new Promise((resolve) => {
    const safePid = parseInt(pid);
    execFile('powershell.exe', ['-NoProfile', '-Command', 
      `(Get-Process -Id ${safePid} -ErrorAction SilentlyContinue).ProcessName`
    ], { windowsHide: true, timeout: 5000 }, (error, stdout) => {
      resolve(error ? 'Unknown' : stdout.trim() || 'Unknown');
    });
  });
}

// ═══════════════════════════════════════════
// Known Ports Database
// ═══════════════════════════════════════════

const KNOWN_PORTS = {
  20: { name: 'FTP Data', description: 'File Transfer Protocol - Data transfer', category: 'File Transfer', risk: 'low' },
  21: { name: 'FTP Control', description: 'File Transfer Protocol - Control', category: 'File Transfer', risk: 'low' },
  22: { name: 'SSH', description: 'Secure Shell - Encrypted remote access', category: 'Remote Access', risk: 'low' },
  23: { name: 'Telnet', description: 'Telnet - Unencrypted remote access (insecure)', category: 'Remote Access', risk: 'medium' },
  25: { name: 'SMTP', description: 'Simple Mail Transfer Protocol', category: 'Email', risk: 'low' },
  53: { name: 'DNS', description: 'Domain Name System', category: 'Network', risk: 'low' },
  67: { name: 'DHCP Server', description: 'Dynamic Host Configuration Protocol', category: 'Network', risk: 'low' },
  68: { name: 'DHCP Client', description: 'DHCP Client', category: 'Network', risk: 'low' },
  80: { name: 'HTTP', description: 'Hypertext Transfer Protocol', category: 'Web', risk: 'low' },
  110: { name: 'POP3', description: 'Post Office Protocol v3', category: 'Email', risk: 'low' },
  123: { name: 'NTP', description: 'Network Time Protocol', category: 'Network', risk: 'low' },
  135: { name: 'RPC', description: 'Remote Procedure Call', category: 'System', risk: 'medium' },
  137: { name: 'NetBIOS Name', description: 'NetBIOS Name Service', category: 'File Sharing', risk: 'medium' },
  138: { name: 'NetBIOS Datagram', description: 'NetBIOS Datagram Service', category: 'File Sharing', risk: 'medium' },
  139: { name: 'NetBIOS Session', description: 'NetBIOS Session Service', category: 'File Sharing', risk: 'medium' },
  143: { name: 'IMAP', description: 'Internet Message Access Protocol', category: 'Email', risk: 'low' },
  161: { name: 'SNMP', description: 'Simple Network Management Protocol', category: 'Network', risk: 'medium' },
  389: { name: 'LDAP', description: 'Lightweight Directory Access Protocol', category: 'Directory', risk: 'low' },
  443: { name: 'HTTPS', description: 'HTTP Secure (TLS/SSL)', category: 'Web', risk: 'low' },
  445: { name: 'SMB', description: 'Server Message Block - File Sharing', category: 'File Sharing', risk: 'medium' },
  465: { name: 'SMTPS', description: 'SMTP over SSL', category: 'Email', risk: 'low' },
  514: { name: 'Syslog', description: 'System Logging Protocol', category: 'Logging', risk: 'low' },
  587: { name: 'SMTP Submission', description: 'Email message submission', category: 'Email', risk: 'low' },
  636: { name: 'LDAPS', description: 'LDAP over SSL', category: 'Directory', risk: 'low' },
  993: { name: 'IMAPS', description: 'IMAP over SSL', category: 'Email', risk: 'low' },
  995: { name: 'POP3S', description: 'POP3 over SSL', category: 'Email', risk: 'low' },
  1080: { name: 'SOCKS Proxy', description: 'SOCKS Proxy Server', category: 'Proxy', risk: 'medium' },
  1433: { name: 'MSSQL', description: 'Microsoft SQL Server', category: 'Database', risk: 'low' },
  1434: { name: 'MSSQL Browser', description: 'MS SQL Server Browser', category: 'Database', risk: 'low' },
  1521: { name: 'Oracle DB', description: 'Oracle Database Listener', category: 'Database', risk: 'low' },
  1723: { name: 'PPTP VPN', description: 'Point-to-Point Tunneling Protocol', category: 'VPN', risk: 'low' },
  2049: { name: 'NFS', description: 'Network File System', category: 'File Sharing', risk: 'medium' },
  3000: { name: 'Dev Server', description: 'React/Express/Rails development server', category: 'Development', risk: 'low' },
  3001: { name: 'Dev Server', description: 'Common dev server alternate', category: 'Development', risk: 'low' },
  3306: { name: 'MySQL', description: 'MySQL Database Server', category: 'Database', risk: 'low' },
  3389: { name: 'RDP', description: 'Remote Desktop Protocol', category: 'Remote Access', risk: 'medium' },
  4200: { name: 'Angular', description: 'Angular development server', category: 'Development', risk: 'low' },
  4443: { name: 'Pharos', description: 'Pharos / Alt HTTPS', category: 'Web', risk: 'low' },
  5000: { name: 'Flask/ASP.NET', description: 'Flask or ASP.NET development', category: 'Development', risk: 'low' },
  5173: { name: 'Vite', description: 'Vite development server', category: 'Development', risk: 'low' },
  5174: { name: 'Vite Alt', description: 'Vite alternate port', category: 'Development', risk: 'low' },
  5432: { name: 'PostgreSQL', description: 'PostgreSQL Database Server', category: 'Database', risk: 'low' },
  5500: { name: 'Live Server', description: 'VS Code Live Server', category: 'Development', risk: 'low' },
  5672: { name: 'RabbitMQ', description: 'RabbitMQ AMQP Message Broker', category: 'Messaging', risk: 'low' },
  5900: { name: 'VNC', description: 'Virtual Network Computing', category: 'Remote Access', risk: 'medium' },
  6379: { name: 'Redis', description: 'Redis In-Memory Data Store', category: 'Database', risk: 'low' },
  8000: { name: 'HTTP Alt', description: 'Alternative HTTP / Django dev', category: 'Development', risk: 'low' },
  8080: { name: 'HTTP Proxy', description: 'HTTP Proxy / Tomcat / Jenkins', category: 'Web', risk: 'low' },
  8443: { name: 'HTTPS Alt', description: 'Alternative HTTPS port', category: 'Web', risk: 'low' },
  8888: { name: 'Jupyter', description: 'Jupyter Notebook Server', category: 'Development', risk: 'low' },
  9090: { name: 'Prometheus', description: 'Prometheus Monitoring', category: 'Monitoring', risk: 'low' },
  9200: { name: 'Elasticsearch', description: 'Elasticsearch HTTP', category: 'Database', risk: 'low' },
  9300: { name: 'ES Transport', description: 'Elasticsearch Transport', category: 'Database', risk: 'low' },
  11211: { name: 'Memcached', description: 'Memcached Cache Server', category: 'Database', risk: 'low' },
  15672: { name: 'RabbitMQ Mgmt', description: 'RabbitMQ Management UI', category: 'Messaging', risk: 'low' },
  27017: { name: 'MongoDB', description: 'MongoDB Database Server', category: 'Database', risk: 'low' },
  27018: { name: 'MongoDB Shard', description: 'MongoDB Shard Server', category: 'Database', risk: 'low' },
};

// ═══════════════════════════════════════════
// Suspicious Ports Database
// ═══════════════════════════════════════════

const SUSPICIOUS_PORTS = {
  1: { name: 'TCPmux', risk: 'high', description: 'TCP Port Multiplexer - rarely used legitimately' },
  31: { name: 'Agent 31', risk: 'high', description: 'Known trojan port' },
  1234: { name: 'SubSeven', risk: 'high', description: 'SubSeven trojan default port' },
  1337: { name: 'Elite', risk: 'medium', description: 'Leet port - sometimes used by backdoors' },
  2745: { name: 'Bagle Worm', risk: 'high', description: 'Bagle worm backdoor' },
  3127: { name: 'MyDoom', risk: 'high', description: 'MyDoom worm backdoor' },
  3410: { name: 'OptixPro', risk: 'high', description: 'OptixPro trojan' },
  4444: { name: 'Metasploit', risk: 'high', description: 'Default Metasploit reverse shell handler' },
  4899: { name: 'Radmin', risk: 'medium', description: 'Radmin remote admin - sometimes abused' },
  5555: { name: 'ADB', risk: 'medium', description: 'Android Debug Bridge - potential device exposure' },
  6660: { name: 'IRC', risk: 'medium', description: 'IRC range - often used by botnets' },
  6661: { name: 'IRC', risk: 'medium', description: 'IRC range - often used by botnets' },
  6666: { name: 'IRC/DarkFTP', risk: 'medium', description: 'IRC / DarkFTP trojan' },
  6667: { name: 'IRC', risk: 'medium', description: 'IRC - commonly used by botnets for C2' },
  6668: { name: 'IRC', risk: 'medium', description: 'IRC range' },
  6669: { name: 'IRC', risk: 'medium', description: 'IRC range' },
  6697: { name: 'IRC SSL', risk: 'medium', description: 'IRC over SSL' },
  7777: { name: 'trin00', risk: 'high', description: 'trin00 DDoS tool' },
  8787: { name: 'Back Orifice 2k', risk: 'high', description: 'Back Orifice 2000 trojan' },
  9999: { name: 'RAT', risk: 'medium', description: 'Various RATs use this port' },
  12345: { name: 'NetBus', risk: 'high', description: 'NetBus trojan default port' },
  12346: { name: 'NetBus', risk: 'high', description: 'NetBus trojan data port' },
  20034: { name: 'NetBus Pro', risk: 'high', description: 'NetBus Pro trojan' },
  27374: { name: 'SubSeven', risk: 'high', description: 'SubSeven trojan' },
  31337: { name: 'Back Orifice', risk: 'high', description: 'Back Orifice trojan - classic backdoor' },
  31338: { name: 'Back Orifice', risk: 'high', description: 'Back Orifice deep variant' },
  54321: { name: 'Backdoor', risk: 'high', description: 'Common reverse backdoor port' },
  65535: { name: 'Max Port', risk: 'low', description: 'Maximum port number - sometimes used suspiciously' },
};

/**
 * Get known port info
 */
function getKnownPortInfo(port) {
  const p = parseInt(port);
  const known = KNOWN_PORTS[p] || null;
  const suspicious = SUSPICIOUS_PORTS[p] || null;
  return { known, suspicious };
}

/**
 * Quick check if a single port is in use
 */
function checkSinglePort(port) {
  return new Promise((resolve) => {
    const safePort = parseInt(port);
    if (isNaN(safePort) || safePort < 1 || safePort > 65535) {
      return resolve({ inUse: false, error: 'Invalid port number' });
    }

    execFile('netstat', ['-ano'], { windowsHide: true }, async (error, stdout) => {
      if (error) return resolve({ inUse: false, error: error.message });

      const lines = stdout.split('\n');
      const matches = [];

      for (const line of lines) {
        const trimmed = line.trim();
        const regex = new RegExp(`:${safePort}\\s`);
        if (regex.test(trimmed)) {
          const parts = trimmed.split(/\s+/);
          const proto = parts[0];
          const localAddr = parts[1];
          const foreignAddr = parts[2];
          let state, pid;
          if (proto === 'UDP') {
            state = '-';
            pid = parts[3] || '';
          } else {
            state = parts[3] || '';
            pid = parts[4] || '';
          }
          pid = pid.replace(/[^0-9]/g, '');
          if (pid && pid !== '0') {
            matches.push({
              proto, localAddress: localAddr, foreignAddress: foreignAddr,
              state, pid: parseInt(pid), port: safePort
            });
          }
        }
      }

      if (matches.length > 0) {
        const pids = matches.map(m => m.pid);
        const nameMap = await getProcessNames(pids);
        for (const m of matches) {
          m.processName = nameMap[m.pid] || 'Unknown';
          const info = getAppInfo(m.processName);
          m.appIcon = info.icon;
          m.appDisplayName = info.name;
          m.appCategory = info.category;
        }
      }

      const portInfo = getKnownPortInfo(safePort);
      resolve({
        inUse: matches.length > 0,
        port: safePort,
        matches,
        knownInfo: portInfo.known,
        suspiciousInfo: portInfo.suspicious
      });
    });
  });
}

/**
 * Scan a range of ports on localhost
 */
function scanPortRange(startPort, endPort) {
  return new Promise((resolve, reject) => {
    const start = parseInt(startPort);
    const end = parseInt(endPort);
    if (isNaN(start) || isNaN(end) || start < 1 || end > 65535 || start > end) {
      return reject(new Error('Invalid port range'));
    }
    if (end - start > 10000) {
      return reject(new Error('Port range too large (max 10000)'));
    }

    execFile('netstat', ['-ano'], { windowsHide: true }, async (error, stdout) => {
      if (error) return reject(error);

      const ports = parseNetstatOutput(stdout);
      const filtered = ports.filter(p => p.port >= start && p.port <= end);
      const pids = filtered.map(p => p.pid);
      const nameMap = await getProcessNames(pids);

      for (const port of filtered) {
        port.processName = nameMap[port.pid] || 'Unknown';
        const info = getAppInfo(port.processName);
        port.appCategory = info.category;
        port.appIcon = info.icon;
        port.appDisplayName = info.name || port.processName;
        const portInfo = getKnownPortInfo(port.port);
        port.knownInfo = portInfo.known;
        port.suspiciousInfo = portInfo.suspicious;
      }

      filtered.sort((a, b) => a.port - b.port);
      resolve(filtered);
    });
  });
}

/**
 * Scan remote host ports using TCP connection test
 */
function scanRemoteHost(host, startPort, endPort, timeoutMs = 1500) {
  const net = require('net');
  const start = parseInt(startPort);
  const end = parseInt(endPort);

  if (!host || typeof host !== 'string') {
    return Promise.reject(new Error('Invalid host'));
  }

  // Basic host validation - only allow hostname/IP patterns
  const hostPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  if (!hostPattern.test(host)) {
    return Promise.reject(new Error('Invalid host format'));
  }

  if (isNaN(start) || isNaN(end) || start < 1 || end > 65535 || start > end) {
    return Promise.reject(new Error('Invalid port range'));
  }
  if (end - start > 1000) {
    return Promise.reject(new Error('Remote scan range too large (max 1000)'));
  }

  return new Promise((resolve) => {
    const results = [];
    let completed = 0;
    const total = end - start + 1;
    const concurrency = 100;
    let currentIdx = start;

    function scanNext() {
      if (currentIdx > end) return;
      const portToScan = currentIdx++;

      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        results.push({ port: portToScan, status: 'open', host });
        socket.destroy();
        done();
      });

      socket.on('timeout', () => {
        results.push({ port: portToScan, status: 'filtered', host });
        socket.destroy();
        done();
      });

      socket.on('error', () => {
        results.push({ port: portToScan, status: 'closed', host });
        done();
      });

      socket.connect(portToScan, host);
    }

    function done() {
      completed++;
      if (completed >= total) {
        results.sort((a, b) => a.port - b.port);
        for (const r of results) {
          const portInfo = getKnownPortInfo(r.port);
          r.knownInfo = portInfo.known;
          r.suspiciousInfo = portInfo.suspicious;
        }
        resolve(results);
      } else {
        scanNext();
      }
    }

    const initialBatch = Math.min(concurrency, total);
    for (let i = 0; i < initialBatch; i++) {
      scanNext();
    }
  });
}

/**
 * Get system CPU and RAM usage
 */
function getSystemStats() {
  return new Promise((resolve) => {
    const os = require('os');

    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);

    resolve({
      cpu: cpuUsage,
      memUsage,
      memTotal: Math.round(totalMem / 1024 / 1024),
      memUsed: Math.round(usedMem / 1024 / 1024),
      memFree: Math.round(freeMem / 1024 / 1024),
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length
    });
  });
}

/**
 * Get network interface info
 */
function getNetworkTraffic() {
  return new Promise((resolve) => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const result = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (!addr.internal) {
          result.push({
            name,
            address: addr.address,
            family: addr.family,
            mac: addr.mac,
            netmask: addr.netmask
          });
        }
      }
    }
    resolve(result);
  });
}

/**
 * Port forwarding (add a rule via netsh)
 */
function addPortForwarding(listenPort, connectAddress, connectPort) {
  return new Promise((resolve, reject) => {
    const lp = parseInt(listenPort);
    const cp = parseInt(connectPort);
    if (isNaN(lp) || isNaN(cp) || lp < 1 || lp > 65535 || cp < 1 || cp > 65535) {
      return reject(new Error('Invalid port numbers'));
    }
    // Basic validation for connectAddress
    const addrPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    if (!addrPattern.test(connectAddress)) {
      return reject(new Error('Invalid connect address'));
    }

    execFile('netsh', [
      'interface', 'portproxy', 'add', 'v4tov4',
      `listenport=${lp}`,
      `listenaddress=0.0.0.0`,
      `connectport=${cp}`,
      `connectaddress=${connectAddress}`
    ], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve({ success: true, message: `Port ${lp} → ${connectAddress}:${cp}` });
    });
  });
}

/**
 * Remove a port forwarding rule
 */
function removePortForwarding(listenPort) {
  return new Promise((resolve, reject) => {
    const lp = parseInt(listenPort);
    if (isNaN(lp)) return reject(new Error('Invalid port'));

    execFile('netsh', [
      'interface', 'portproxy', 'delete', 'v4tov4',
      `listenport=${lp}`,
      `listenaddress=0.0.0.0`
    ], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve({ success: true });
    });
  });
}

/**
 * List port forwarding rules
 */
function listPortForwarding() {
  return new Promise((resolve) => {
    execFile('netsh', ['interface', 'portproxy', 'show', 'all'], { windowsHide: true }, (error, stdout) => {
      if (error) return resolve([]);
      const rules = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4 && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
          rules.push({
            listenAddress: parts[0],
            listenPort: parseInt(parts[1]),
            connectAddress: parts[2],
            connectPort: parseInt(parts[3])
          });
        }
      }
      resolve(rules);
    });
  });
}

module.exports = {
  scanPorts, killProcess, killPort, getProcessDetail,
  checkSinglePort, scanPortRange, scanRemoteHost,
  getSystemStats, getNetworkTraffic,
  getKnownPortInfo, KNOWN_PORTS, SUSPICIOUS_PORTS,
  addPortForwarding, removePortForwarding, listPortForwarding
};
