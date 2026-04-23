/**
 * Receipt generator service — format, parse, and PDF generation.
 * Validates: Requirements 17.1, 18.1, 18.2, 18.3, 17.4
 */
const PDFDocument = require('pdfkit');

/**
 * Format a sale transaction into a structured receipt text.
 * @param {object} sale - Sale transaction data
 * @param {object} storeConfig - { storeName, storeAddress }
 * @returns {string} Formatted receipt text
 */
function formatReceipt(sale, storeConfig) {
  const lines = [];
  const divider = '='.repeat(40);
  const dash = '-'.repeat(40);

  lines.push(divider);
  lines.push(center(storeConfig.storeName || 'POS Store'));
  lines.push(center(storeConfig.storeAddress || ''));
  lines.push(divider);
  lines.push(`Sale ID: ${sale.saleId}`);
  lines.push(`Date: ${formatDate(sale.saleDate)}`);
  lines.push(`Cashier: ${sale.cashierName || 'N/A'}`);
  if (sale.customerName) {
    lines.push(`Customer: ${sale.customerName}`);
  }
  lines.push(dash);

  // Items header
  lines.push(padRight('Item', 20) + padRight('Qty', 5) + padRight('Price', 8) + padLeft('Total', 7));
  lines.push(dash);

  for (const item of sale.items) {
    const lineTotal = item.lineTotal != null ? item.lineTotal : item.unitPrice * item.quantity;
    let line = padRight(item.name.substring(0, 20), 20);
    line += padRight(String(item.quantity), 5);
    line += padRight(item.unitPrice.toFixed(2), 8);
    line += padLeft(lineTotal.toFixed(2), 7);
    lines.push(line);

    if (item.discountPercent && item.discountPercent > 0) {
      lines.push(`  Discount: ${item.discountPercent}%`);
    }
  }

  lines.push(dash);
  lines.push(padRight('Subtotal:', 30) + padLeft(sale.subtotal.toFixed(2), 10));

  if (sale.discountAmount > 0) {
    lines.push(padRight('Discount:', 30) + padLeft(`-${sale.discountAmount.toFixed(2)}`, 10));
  }
  lines.push(padRight(`Tax (${sale.taxRate}%):`, 30) + padLeft(sale.taxAmount.toFixed(2), 10));
  lines.push(dash);
  lines.push(padRight('GRAND TOTAL:', 30) + padLeft(sale.grandTotal.toFixed(2), 10));
  lines.push(dash);

  // Payment info
  lines.push('Payment:');
  if (sale.payments && sale.payments.length > 0) {
    for (const p of sale.payments) {
      let payLine = `  ${p.method}: ${p.amountPaid.toFixed(2)}`;
      if (p.method === 'Cash' && p.changeGiven > 0) {
        payLine += ` (Change: ${p.changeGiven.toFixed(2)})`;
      }
      if (p.transactionReference) {
        payLine += ` Ref: ${p.transactionReference}`;
      }
      if (p.cardLastFour) {
        payLine += ` Card: ****${p.cardLastFour}`;
      }
      lines.push(payLine);
    }
  }

  lines.push(divider);
  lines.push(center('Thank you for your purchase!'));
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Parse receipt text back into sale transaction data.
 * @param {string} receiptText
 * @returns {object} Parsed sale data
 */
function parseReceipt(receiptText) {
  const lines = receiptText.split('\n');
  const result = { items: [], payments: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('Sale ID:')) {
      result.saleId = parseInt(line.replace('Sale ID:', '').trim());
    } else if (line.startsWith('Date:')) {
      result.saleDate = line.replace('Date:', '').trim();
    } else if (line.startsWith('Cashier:')) {
      result.cashierName = line.replace('Cashier:', '').trim();
    } else if (line.startsWith('Customer:')) {
      result.customerName = line.replace('Customer:', '').trim();
    } else if (line.startsWith('Subtotal:')) {
      result.subtotal = parseFloat(line.replace('Subtotal:', '').trim());
    } else if (line.startsWith('Discount:') && !line.includes('%')) {
      result.discountAmount = parseFloat(line.replace('Discount:', '').replace('-', '').trim());
    } else if (line.startsWith('Tax')) {
      const taxMatch = line.match(/Tax \((\d+\.?\d*)%\):\s*([\d.]+)/);
      if (taxMatch) {
        result.taxRate = parseFloat(taxMatch[1]);
        result.taxAmount = parseFloat(taxMatch[2]);
      }
    } else if (line.startsWith('GRAND TOTAL:')) {
      result.grandTotal = parseFloat(line.replace('GRAND TOTAL:', '').trim());
    } else if (line.match(/^\S.+\d+\s+\d+\.\d{2}\s+\d+\.\d{2}$/)) {
      // Item line: Name  Qty  Price  Total
      const parts = line.match(/^(.{1,20}?)\s+(\d+)\s+(\d+\.\d{2})\s+(\d+\.\d{2})$/);
      if (parts) {
        const item = {
          name: parts[1].trim(),
          quantity: parseInt(parts[2]),
          unitPrice: parseFloat(parts[3]),
          lineTotal: parseFloat(parts[4]),
          discountPercent: 0
        };
        // Check next line for discount
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('Discount:')) {
          const dMatch = lines[i + 1].trim().match(/Discount:\s*(\d+\.?\d*)%/);
          if (dMatch) item.discountPercent = parseFloat(dMatch[1]);
        }
        result.items.push(item);
      }
    } else if (line.startsWith('Cash:') || line.startsWith('Card:') || line.startsWith('MTN_MoMo:')) {
      const method = line.split(':')[0].trim();
      const amountMatch = line.match(/:\s*([\d.]+)/);
      const changeMatch = line.match(/Change:\s*([\d.]+)/);
      const refMatch = line.match(/Ref:\s*(\S+)/);
      const cardMatch = line.match(/Card:\s*\*{4}(\d{4})/);

      result.payments.push({
        method,
        amountPaid: amountMatch ? parseFloat(amountMatch[1]) : 0,
        changeGiven: changeMatch ? parseFloat(changeMatch[1]) : 0,
        transactionReference: refMatch ? refMatch[1] : null,
        cardLastFour: cardMatch ? cardMatch[1] : null
      });
    }
  }

  return result;
}

/**
 * Generate a PDF buffer from receipt text.
 * @param {string} receiptText
 * @returns {Promise<Buffer>}
 */
function generatePDF(receiptText) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [280, 600], margin: 20 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Courier').fontSize(9);

    const lines = receiptText.split('\n');
    for (const line of lines) {
      doc.text(line);
    }

    doc.end();
  });
}

// --- Helpers ---

function center(text, width = 40) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function padRight(text, width) {
  return text.length >= width ? text.substring(0, width) : text + ' '.repeat(width - text.length);
}

function padLeft(text, width) {
  return text.length >= width ? text : ' '.repeat(width - text.length) + text;
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

module.exports = {
  formatReceipt,
  parseReceipt,
  generatePDF
};
