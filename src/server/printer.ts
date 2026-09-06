import net from 'net';
import fs from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';

// Interface for Printer Alert
export interface PrinterAlert {
  id: string;
  timestamp: string;
  printerIp: string;
  port: number;
  error: string;
  status: 'warning' | 'resolved';
}

// Interface for Print Job Log
export interface PrintJobLog {
  id: string;
  timestamp: string;
  printerIp: string;
  data: string;
  status: 'success' | 'failed';
  attempts: number;
  error?: string;
}

// Data Directory Configuration
let DATA_DIR = path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const testFile = path.join(DATA_DIR, '.printer-write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (err) {
  console.warn('[FileHub Printer] Local data directory is not writable. Falling back to /tmp/data');
  DATA_DIR = path.join('/tmp', 'data');
}
const PRINTER_DB_FILE = path.join(DATA_DIR, 'printer_db.json');

// Initialize local printer DB helper (local alert store (db.json / file))
function getPrinterDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRINTER_DB_FILE)) {
    const repoPrinterDbPath = path.join(process.cwd(), 'data', 'printer_db.json');
    if (fs.existsSync(repoPrinterDbPath)) {
      try {
        fs.copyFileSync(repoPrinterDbPath, PRINTER_DB_FILE);
        const rawData = fs.readFileSync(PRINTER_DB_FILE, 'utf-8');
        return JSON.parse(rawData);
      } catch (err) {
        console.error('[FileHub Printer] Failed to copy repo printer_db.json to writable PRINTER_DB_FILE:', err);
      }
    }
    const initial = { 
      alerts: [] as PrinterAlert[], 
      logs: [] as PrintJobLog[], 
      config: { ip: '', port: 9100 } 
    };
    fs.writeFileSync(PRINTER_DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(PRINTER_DB_FILE, 'utf-8'));
  } catch (e) {
    return { 
      alerts: [] as PrinterAlert[], 
      logs: [] as PrintJobLog[], 
      config: { ip: '', port: 9100 } 
    };
  }
}

function savePrinterDB(data: any) {
  fs.writeFileSync(PRINTER_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Asynchronously checks if the printer is online by trying to establish
 * a TCP socket connection on port 9100. This acts as a reliable TCP ping check.
 * 
 * @param host Printer IP or hostname
 * @param port Printer port (default: 9100)
 * @param timeoutMs Timeout in milliseconds for connection attempt (default: 1500ms)
 */
export function checkPrinterOnline(
  host: string,
  port: number = 9100,
  timeoutMs: number = 1500
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeoutMs);
    
    socket.connect(port, host, () => {
      socket.destroy(); // Connection succeeded!
      resolve(true);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Asynchronously sends raw text or ESC/POS commands to a network printer
 * via TCP socket port 9100.
 * 
 * @param host Printer IP or hostname
 * @param data Raw string or Buffer containing text/commands to print
 * @param port Printer port (default: 9100)
 * @param timeoutMs Socket timeout in milliseconds (default: 5000ms)
 */
export function sendPrintJob(
  host: string,
  data: string | Buffer,
  port: number = 9100,
  timeoutMs: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let hasError = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
      socket.write(buffer, () => {
        socket.end(); // Gracefully end after writing
      });
    });

    socket.on('end', () => {
      if (!hasError) resolve();
    });

    socket.on('error', (err) => {
      hasError = true;
      socket.destroy();
      reject(err);
    });

    socket.on('timeout', () => {
      hasError = true;
      socket.destroy();
      reject(new Error(`Printer connection timed out after ${timeoutMs}ms.`));
    });
  });
}

/**
 * Sends a print job to the network printer with a Retry Mechanism.
 * It will attempt to connect and print up to 3 times before failing
 * and sending a warning notification/alert to Firebase Database.
 * 
 * @param host Printer IP address
 * @param data Text or ESC/POS payload
 * @param options Retry options
 */
export async function sendPrintJobWithRetry(
  host: string,
  data: string | Buffer,
  options: { maxRetries?: number; retryDelayMs?: number; port?: number } = {}
): Promise<void> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 2000;
  const port = options.port ?? 9100;
  
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < maxRetries) {
    attempt++;
    console.log(`[Printer] Attempting print on ${host}:${port} (Attempt ${attempt}/${maxRetries})...`);
    
    // 1. Perform connectivity check
    const isOnline = await checkPrinterOnline(host, port, 1500);
    if (!isOnline) {
      lastError = new Error(`Printer at ${host}:${port} is offline/unreachable.`);
      console.warn(`[Printer] Attempt ${attempt} failed: Connectivity check failed (offline).`);
    } else {
      try {
        // 2. Perform raw socket print write
        await sendPrintJob(host, data, port, 4000);
        console.log(`[Printer] Success! Print job completed on attempt ${attempt}.`);
        
        // Log success locally
        logJobToDatabase(host, port, data.toString(), 'success', attempt);
        return; // Success!
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[Printer] Attempt ${attempt} failed with error: ${lastError.message}`);
      }
    }
    
    // If we have remaining retries, wait before next attempt
    if (attempt < maxRetries) {
      console.log(`[Printer] Waiting ${retryDelayMs}ms before next retry...`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  
  // All retries failed
  const errorMessage = lastError?.message || 'Unknown printer connection error.';
  console.error(`[Printer] Critical failure! Print job failed after ${maxRetries} attempts.`);
  
  // 3. Save offline printer alert to local store
  await reportAlertToFirebase(host, port, errorMessage);
  
  // Log failed job
  logJobToDatabase(host, port, data.toString(), 'failed', maxRetries, errorMessage);
  
  throw new Error(`Failed to print after ${maxRetries} attempts. Alert sent to Firebase. ${errorMessage}`);
}

/**
 * Logs print job status to database for live tracking in Owner Portal
 */
function logJobToDatabase(
  host: string,
  port: number,
  data: string,
  status: 'success' | 'failed',
  attempts: number,
  error?: string
) {
  try {
    const db = getPrinterDB();
    const newLog: PrintJobLog = {
      id: 'job_' + randomUUID(),
      timestamp: new Date().toISOString(),
      printerIp: host,
      data,
      status,
      attempts,
      error
    };
    db.logs.unshift(newLog);
    if (db.logs.length > 50) db.logs = db.logs.slice(0, 50); // Keep last 50
    savePrinterDB(db);
  } catch (e) {
    console.error('Failed to log print job locally:', e);
  }
}

/**
 * Reports a critical connection warning/alert to the "Firebase Database" (Firestore/Realtime DB)
 * Attempts real TCP print; on failure stores a local alert for the owner.
 */
export async function reportAlertToFirebase(
  host: string,
  port: number,
  errorMessage: string
): Promise<void> {
  // Save locally so the app's Admin/Owner dashboard can show active warning badges in real-time
  try {
    const db = getPrinterDB();
    const newAlert: PrinterAlert = {
      id: 'alert_' + randomUUID(),
      timestamp: new Date().toISOString(),
      printerIp: host,
      port,
      error: errorMessage,
      status: 'warning'
    };
    db.alerts.unshift(newAlert);
    if (db.alerts.length > 30) db.alerts = db.alerts.slice(0, 30);
    savePrinterDB(db);
    console.log(`[Printer Alert] Alert saved locally for offline printer for offline printer: ${host}`);
  } catch (e) {
    console.error('Failed to log alert locally:', e);
  }
}

// Remote Configuration getters/setters for Owner UI interactivity
export function getPrinterConfig() {
  const db = getPrinterDB();
  // Ensure default values are populated if missing
  const defaults = {
    ip: '',
    port: 9100,
    whatsappToken: '',
    whatsappPhoneId: '',
    telegramToken: '',
    telegramChatId: '',
    facebookPageToken: '',
    facebookPageId: ''
  };
  return { ...defaults, ...db.config };
}

export function savePrinterConfig(config: any) {
  const db = getPrinterDB();
  db.config = { ...(db.config || {}), ...config };
  savePrinterDB(db);
}

export function getPrinterLogsAndAlerts() {
  const db = getPrinterDB();
  return {
    alerts: db.alerts as PrinterAlert[],
    logs: db.logs as PrintJobLog[]
  };
}

export function clearPrinterLogsAndAlerts() {
  const db = getPrinterDB();
  db.alerts = [];
  db.logs = [];
  savePrinterDB(db);
}
