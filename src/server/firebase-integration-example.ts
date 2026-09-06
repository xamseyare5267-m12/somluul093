// @ts-nocheck
/**
 * SomLuul Network Printing - Firebase Integration Example
 * 
 * Sida loo dhexgeliyo (integrate) nidaamka daabacaada ee network printer-ka iyo 
 * database-ka Firebase adoo isticmaalaya Firebase Cloud Functions (V2).
 * 
 * Marka xog cusub (tusaale: invoice, resiit ama ticket) lagu daro Firestore database,
 * Cloud Function-ka ayaa si toos ah u kici doona, hubin doona haddii printer-ku online yahay,
 * iskuna dayi doona inuu daabaco isagoo adeegsanaya qalabkeena (Retry Mechanism).
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { sendPrintJobWithRetry } from "./printer";

/**
 * 1. Cloud Function oo kicinaya marka Receipt cusub la abuuro
 * Path: /receipts/{receiptId}
 */
export const onNewReceiptPrint = onDocumentCreated("receipts/{receiptId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.warn("No data associated with receipt creation event.");
    return;
  }

  const receiptData = snapshot.data();
  logger.info(`[Receipt Trigger] Received new receipt: ${event.params.receiptId}`);

  // Soo qaado macluumaadka la daabacayo iyo cinwaanka IP-ga printer-ka
  const printerIp = receiptData.printerIp || ""; // Default IP
  const printerPort = receiptData.printerPort || 9100;        // Default Port
  
  // ESC/POS ama plain text formatting
  const printPayload = formatEscPosReceipt(receiptData);

  try {
    logger.info(`[Receipt Trigger] Starting printing job to ${printerIp}:${printerPort}`);
    
    // U dir xogta printer-ka iyadoo la adeegsanayo Retry Mechanism (3 jeer isku dayaya)
    await sendPrintJobWithRetry(printerIp, printPayload, {
      port: printerPort,
      maxRetries: 3,
      retryDelayMs: 2000 // Sug 2 ilbiriqsi ka hor intaanad dib u isku dayin
    });

    logger.info(`[Receipt Trigger] Receipt ${event.params.receiptId} successfully printed!`);
  } catch (error: any) {
    logger.error(`[Receipt Trigger] Printing failed after 3 retries: ${error.message}`);
    
    // Fadlan u dir fariinta digniinta ah database-ka Firebase oo ah "printer_alerts"
    // (Adoo isticmaalaya Firebase Admin SDK si toos ah loogu qoro collection gaarka ah)
    const db = snapshot.ref.firestore;
    await db.collection("printer_alerts").add({
      timestamp: new Date().toISOString(),
      printerIp: printerIp,
      port: printerPort,
      error: error.message || "Failed after 3 socket retries.",
      status: "warning",
      receiptId: event.params.receiptId
    });
    
    logger.error(`[Receipt Trigger] Dispatched printer alert to Firestore printer_alerts collection.`);
  }
});

/**
 * 2. Helper function oo u habaynaya (format) xogta habka ESC/POS thermal printing
 */
function formatEscPosReceipt(receipt: any): string {
  // ESC/POS Commands (Standard Bytes)
  const ESC = "\x1b";
  const GS = "\x1d";
  
  const INIT = ESC + "@";         // Initialize printer
  const CENTER = ESC + "a" + "\x01"; // Center align
  const LEFT = ESC + "a" + "\x00";   // Left align
  const RIGHT = ESC + "a" + "\x02";  // Right align
  const DOUBLE_SIZE = ESC + "!" + "\x30"; // Double height + double width text
  const NORMAL_SIZE = ESC + "!" + "\x00"; // Normal size text
  const BOLD_ON = ESC + "E" + "\x01";     // Bold font on
  const BOLD_OFF = ESC + "E" + "\x00";    // Bold font off
  const CUT_PAPER = GS + "V" + "\x42" + "\x00"; // Cut paper (66 0x42)

  const lineSeparator = "--------------------------------\n";
  
  let p = "";
  p += INIT;
  
  // Header (Centered & Bold & Double Size)
  p += CENTER + BOLD_ON + DOUBLE_SIZE + "SOMLUUL SHOP\n" + NORMAL_SIZE;
  p += "Waaxda Ganacsiga SomLuul\n" + BOLD_OFF;
  p += "Mogadishu, Somalia\n";
  p += `Tel: +252 615666561\n`;
  p += lineSeparator;
  
  // Receipt details (Left Aligned)
  p += LEFT;
  p += `Invoice: #${receipt.invoiceNumber || "0001"}\n`;
  p += `Taariikhda: ${new Date().toLocaleString("so-SO")}\n`;
  p += `Macaamiilka: ${receipt.customerName || "General Customer"}\n`;
  p += lineSeparator;
  
  // Items table header
  p += "Item         Qty    Price   Total\n";
  p += lineSeparator;
  
  // Items list
  const items = receipt.items || [{ name: "Test Service", qty: 1, price: 10 }];
  let totalAmount = 0;
  for (const item of items) {
    const itemTotal = item.qty * item.price;
    totalAmount += itemTotal;
    
    // Simple padding formatting to align columns
    const namePart = (item.name.substring(0, 11) + "           ").substring(0, 12);
    const qtyPart = (item.qty.toString() + "   ").substring(0, 5);
    const pricePart = ("$" + item.price.toString() + "     ").substring(0, 8);
    const totalPart = "$" + itemTotal.toString();
    
    p += `${namePart}${qtyPart}${pricePart}${totalPart}\n`;
  }
  
  p += lineSeparator;
  
  // Totals
  p += RIGHT + BOLD_ON;
  p += `TOTAL: $${totalAmount.toFixed(2)}\n`;
  p += BOLD_OFF;
  p += CENTER + "\n";
  p += "Mahadsanid! Soo dhowow markale.\n\n\n\n";
  
  // Cut Paper Command
  p += CUT_PAPER;
  
  return p;
}
