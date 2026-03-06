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

module.exports = { scanPorts, killProcess, killPort, getProcessDetail };
