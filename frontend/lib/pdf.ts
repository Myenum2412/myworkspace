import { jsPDF } from "jspdf";
import { Invoice } from "@/app/billing/invoices/columns";

async function getBase64ImageFromURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if(ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("No canvas context"));
      }
    };
    img.onerror = error => reject(error);
    img.src = url;
  });
}

function convertNumberToWords(amount: number): string {
  // Very basic converter for demo purposes
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (amount === 0) return "Zero";
  if (amount < 20) return words[amount];
  if (amount < 100) return tens[Math.floor(amount / 10)] + (amount % 10 !== 0 ? "-" + words[amount % 10] : "");
  return amount.toString(); // Fallback
}

export async function generateInvoicePDF(baseInvoice: Invoice) {
  let invoice = baseInvoice as any;
  let org: any = {};
  let client: any = {};
  
  try {
    const invRes = await fetch(`/api/billing/invoices/${baseInvoice.id}`);
    if (invRes.ok) {
      const invData = await invRes.json();
      invoice = invData.data || invData || baseInvoice;
    }
    const profileRes = await fetch("/api/user/profile");
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      org = profileData?.data?.org || {};
    }
    if (invoice.clientId) {
      const clientsRes = await fetch("/api/clients");
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        const clients = clientsData.data || [];
        client = clients.find((c: any) => c.id === invoice.clientId) || {};
      }
    }
  } catch (error) {
    console.error("Error fetching details for PDF:", error);
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width; // 210
  const pageHeight = doc.internal.pageSize.height; // 297
  
  // Custom font loading is possible, but we'll stick to built-in 'helvetica' for precision.
  const mX = 10; // Left margin
  const mR = 200; // Right margin
  const width = mR - mX; // 190

  // 1. Draw Header Strip (Cyan + Dark Blue)
  doc.setFillColor(0, 160, 180);
  doc.rect(0, 0, pageWidth, 12, "F");

  doc.setFillColor(0, 50, 80);
  doc.rect(0, 0, pageWidth, 6, "F");

  // 2. Logo & Company Details
  let startY = 20;
  const logoUrl = org.logoUrl || org.profileImage || "/logobg.png"; 
  try {
    const absoluteUrl = logoUrl.startsWith("http") ? logoUrl : window.location.origin + logoUrl;
    const base64Img = await getBase64ImageFromURL(absoluteUrl);
    doc.addImage(base64Img, "PNG", mX + 2, startY, 32, 32);
  } catch (e) {
    console.error("Error loading logo", e);
  }

  const compX = mX + 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text((org.name || "MYENUM").toUpperCase(), compX, startY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  let addrY = startY + 10;
  
  if (org.address) {
    const addrLines = doc.splitTextToSize(org.address, 70);
    doc.text(addrLines, compX, addrY);
    addrY += (addrLines.length * 4);
  }
  doc.text(`Email: ${org.email || "myenumam@gmail.com"}`, compX, addrY); addrY += 4;
  if (org.phone) { doc.text(`Phone: ${org.phone}`, compX, addrY); addrY += 4; }
  doc.text(`GSTIN: ${org.gstin || "33LEFPK7682L1ZR"}`, compX, addrY); addrY += 4;
  doc.text(`UDYAM: ${org.udyam || "UDYAM-TN-20-0172636"}`, compX, addrY); addrY += 4;

  // TAX INVOICE
  doc.setFont("helvetica", "normal");
  doc.setFontSize(26);
  doc.text("TAX INVOICE", mR, startY + 25, { align: "right" });

  // Draw continuous grid borders
  let gridY = 62;
  doc.setDrawColor(160, 160, 160); // Grey borders
  doc.setLineWidth(0.3);

  // Row 1: Invoice details & Place of supply
  const row1Height = 22;
  doc.rect(mX, gridY, width, row1Height);
  doc.line(mX + 90, gridY, mX + 90, gridY + row1Height); // Middle divider

  doc.setFontSize(9);
  const leftLabelX = mX + 2;
  const leftValX = mX + 35;
  const r1Y = gridY + 4;
  
  doc.text("#", leftLabelX, r1Y);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${invoice.invoiceNumber || invoice.number || invoice.id.slice(0,8)}`, leftValX, r1Y);
  doc.setFont("helvetica", "normal");

  doc.text("Invoice Date", leftLabelX, r1Y + 4);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, leftValX, r1Y + 4);
  doc.setFont("helvetica", "normal");

  doc.text("Terms", leftLabelX, r1Y + 8);
  doc.setFont("helvetica", "bold");
  doc.text(`: Due on Receipt`, leftValX, r1Y + 8);
  doc.setFont("helvetica", "normal");

  doc.text("Due Date", leftLabelX, r1Y + 12);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${new Date(invoice.dueDate || invoice.createdAt).toLocaleDateString()}`, leftValX, r1Y + 12);
  doc.setFont("helvetica", "normal");

  doc.text("P.O.#", leftLabelX, r1Y + 16);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${invoice.poNumber || '1'}`, leftValX, r1Y + 16);
  doc.setFont("helvetica", "normal");

  // Place of supply
  doc.text("Place Of Supply", mX + 92, r1Y);
  doc.setFont("helvetica", "bold");
  doc.text(`: ${client.state || "Tamil Nadu (33)"}`, mX + 130, r1Y);
  doc.setFont("helvetica", "normal");

  gridY += row1Height;

  // Row 2: Bill To Header
  const row2Height = 5;
  doc.setFillColor(240, 240, 240);
  doc.rect(mX, gridY, width, row2Height, "FD");
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", mX + 2, gridY + 3.5);

  gridY += row2Height;

  // Row 3: Bill To Content
  const row3Height = 25;
  doc.rect(mX, gridY, width, row3Height);
  doc.text((client.name || invoice.customerName || "Customer Name").toUpperCase(), mX + 2, gridY + 5);
  doc.setFont("helvetica", "normal");
  const billAddr = doc.splitTextToSize(client.address || "Client Address", 90);
  doc.text(billAddr, mX + 2, gridY + 9);
  doc.text(`GSTIN: ${client.gstin || "N/A"}`, mX + 2, gridY + 22);

  gridY += row3Height;

  // Table Headers
  const thHeight = 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(mX, gridY, width, thHeight, "FD");

  // Column definitions
  const cols = [
    { name: '#', x: mX, w: 7 },
    { name: 'Item & Description', x: mX + 7, w: 60 },
    { name: 'HSN/SAC', x: mX + 67, w: 18 },
    { name: 'Qty', x: mX + 85, w: 12 },
    { name: 'Rate', x: mX + 97, w: 20 },
    { name: 'CGST', x: mX + 117, w: 25 },
    { name: 'SGST', x: mX + 142, w: 25 },
    { name: 'Amount', x: mX + 167, w: 23 },
  ];

  // Draw Vertical Lines & Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  cols.forEach((c, i) => {
    if (i > 0) doc.line(c.x, gridY, c.x, gridY + thHeight);
    
    if (c.name === 'CGST' || c.name === 'SGST') {
      doc.text(c.name, c.x + c.w/2, gridY + 4, { align: "center" });
      doc.line(c.x, gridY + 5, c.x + c.w, gridY + 5); // horizontal split
      doc.line(c.x + c.w/2, gridY + 5, c.x + c.w/2, gridY + thHeight); // vertical split
      doc.text("%", c.x + c.w/4, gridY + 9, { align: "center" });
      doc.text("Amt", c.x + 3*c.w/4, gridY + 9, { align: "center" });
    } else if (c.name === 'HSN/SAC') {
      doc.text("HSN", c.x + 2, gridY + 4);
      doc.text("/SAC", c.x + 2, gridY + 8);
    } else {
      let align: any = "left";
      let textX = c.x + 2;
      let textY = gridY + 6;
      if (['Qty', 'Rate', 'Amount'].includes(c.name)) {
        align = "right";
        textX = c.x + c.w - 2;
      }
      doc.text(c.name, textX, textY, { align });
    }
  });

  gridY += thHeight;

  // Table Body
  doc.setFont("helvetica", "normal");
  const items = invoice.items || [
    { details: invoice.services || "Services rendered", quantity: 1, rate: invoice.amountPaid ? invoice.amountPaid / 100 : 0 }
  ];

  const taxRate = parseFloat(invoice.tdsTcsRate) || 18; 
  const halfTax = taxRate / 2;

  let tbodyY = gridY;
  items.forEach((item: any, i: number) => {
    const qty = item.quantity || 1;
    const rate = item.rate || 0;
    const amount = qty * rate;
    const cgstAmt = (amount * halfTax) / 100;
    const sgstAmt = (amount * halfTax) / 100;
    
    const rowH = 8;
    const yText = tbodyY + 5;
    
    doc.text((i + 1).toString(), cols[0].x + 2, yText);
    const itemName = doc.splitTextToSize(item.details || item.description || "Item", cols[1].w - 4);
    doc.text(itemName, cols[1].x + 2, yText);
    doc.text(item.hsn || "998314", cols[2].x + 2, yText);
    doc.text(qty.toFixed(2), cols[3].x + cols[3].w - 2, yText, { align: "right" });
    doc.text(rate.toFixed(2), cols[4].x + cols[4].w - 2, yText, { align: "right" });
    
    // CGST
    doc.text(`${halfTax}%`, cols[5].x + cols[5].w/4, yText, { align: "center" });
    doc.text(cgstAmt.toFixed(2), cols[5].x + cols[5].w - 2, yText, { align: "right" });
    // SGST
    doc.text(`${halfTax}%`, cols[6].x + cols[6].w/4, yText, { align: "center" });
    doc.text(sgstAmt.toFixed(2), cols[6].x + cols[6].w - 2, yText, { align: "right" });
    
    doc.text(amount.toFixed(2), cols[7].x + cols[7].w - 2, yText, { align: "right" });

    tbodyY += (itemName.length * 4) + 4;
  });

  // Ensure minimum height for items area
  if (tbodyY - gridY < 20) tbodyY = gridY + 20;

  // Draw vertical lines for table body
  doc.line(mX, gridY, mX, tbodyY);
  doc.line(mX + width, gridY, mX + width, tbodyY);
  cols.forEach((c, i) => {
    if (i > 0) doc.line(c.x, gridY, c.x, tbodyY);
    if (c.name === 'CGST' || c.name === 'SGST') {
      doc.line(c.x + c.w/2, gridY, c.x + c.w/2, tbodyY);
    }
  });

  gridY = tbodyY;
  doc.line(mX, gridY, mX + width, gridY); // Close table body

  // Totals Area
  const totalsH = 70;
  doc.rect(mX, gridY, width, totalsH);
  
  // Left area (Notes) vs Right area (Totals)
  const rightX = cols[5].x; // Aligned with CGST column
  doc.line(rightX, gridY, rightX, gridY + totalsH);

  // Left Area Content
  let leftY = gridY + 5;
  doc.setFont("helvetica", "italic");
  doc.text("Total In Words", mX + 2, leftY); leftY += 4;
  doc.setFont("helvetica", "bold");
  const subTotal = invoice.subTotal || items.reduce((acc: number, i: any) => acc + ((i.quantity||1)*(i.rate||0)), 0);
  const cgstTotal = (subTotal * halfTax) / 100;
  const sgstTotal = (subTotal * halfTax) / 100;
  const total = subTotal + cgstTotal + sgstTotal;
  
  doc.text(`Indian Rupee ${convertNumberToWords(total)} Only`, mX + 2, leftY); leftY += 8;

  doc.setFont("helvetica", "italic");
  doc.text("Notes", mX + 2, leftY); leftY += 4;
  doc.setFont("helvetica", "normal");
  doc.text("Thanks for your business.", mX + 2, leftY); leftY += 6;

  doc.setFont("helvetica", "bold");
  doc.text(`Name: ${org.name || "MYENUM"}`, mX + 2, leftY); leftY += 6;
  doc.text(`Account No.: ${org.accountNumber || "925020035722362"}`, mX + 2, leftY); leftY += 4;
  doc.text(`IFSC Code: ${org.ifscCode || "UTIB0004598"}`, mX + 2, leftY); leftY += 8;

  doc.setFont("helvetica", "italic");
  doc.text("Terms & Conditions", mX + 2, leftY); leftY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const terms = "1.) Payment to be settled only on bank modes using either instruments like Cheque, NEFT, RTGS & IMPS\n2.) Also TDS for the Service charges (On Taxable Value) are to be deducted under section 194C of Income Tax Act, 1961 and the payment challan to be enclosed within due dates, after filing Form-16A is to be provided\n3.) Delayed payment which is paid after due date may attract a Late Fee of .500/-+GST 18%\n4.) E & OE\nSubject to Salem Jurisdiction";
  const splitTerms = doc.splitTextToSize(terms, rightX - mX - 4);
  doc.text(splitTerms, mX + 2, leftY);

  // Right Area Content
  let rightY = gridY + 6;
  doc.setFontSize(8);
  const valX = mX + width - 2;

  doc.text("Sub Total", rightX + 2, rightY);
  doc.text(subTotal.toFixed(2), valX, rightY, { align: "right" }); rightY += 6;

  doc.text("Total Taxable Amount", rightX + 2, rightY);
  doc.text(subTotal.toFixed(2), valX, rightY, { align: "right" }); rightY += 6;

  doc.text(`CGST9 (${halfTax}%)`, rightX + 2, rightY);
  doc.text(cgstTotal.toFixed(2), valX, rightY, { align: "right" }); rightY += 6;

  doc.text(`SGST9 (${halfTax}%)`, rightX + 2, rightY);
  doc.text(sgstTotal.toFixed(2), valX, rightY, { align: "right" }); rightY += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Total", rightX + 2, rightY);
  doc.text(total.toFixed(2), valX, rightY, { align: "right" }); rightY += 6;

  doc.text("Balance Due", rightX + 2, rightY);
  doc.text(total.toFixed(2), valX, rightY, { align: "right" });

  // Authorized Signature Box
  doc.setFont("helvetica", "normal");
  doc.text("Amarnath", mX + width - 20, gridY + totalsH - 12, { align: "center" });
  doc.line(rightX + 5, gridY + totalsH - 6, mX + width - 5, gridY + totalsH - 6);
  doc.text("Authorized Signature", mX + width - 20, gridY + totalsH - 2, { align: "center" });

  gridY += totalsH;

  // HSN Summary Table
  gridY += 10;
  doc.text("HSN/SAC Summary:", mX, gridY - 2);
  
  const hsnThH = 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(mX, gridY, width, hsnThH, "FD");

  const hCols = [
    { name: 'HSN/SAC', x: mX, w: 30 },
    { name: 'Taxable Amount', x: mX + 30, w: 40 },
    { name: 'CGST', x: mX + 70, w: 40 },
    { name: 'SGST', x: mX + 110, w: 40 },
    { name: 'Total Tax Amount', x: mX + 150, w: 40 },
  ];

  hCols.forEach((c, i) => {
    if (i > 0) doc.line(c.x, gridY, c.x, gridY + hsnThH);
    if (c.name === 'CGST' || c.name === 'SGST') {
      doc.text(c.name, c.x + c.w/2, gridY + 4, { align: "center" });
      doc.line(c.x, gridY + 5, c.x + c.w, gridY + 5);
      doc.line(c.x + c.w/2, gridY + 5, c.x + c.w/2, gridY + hsnThH);
      doc.text("Rate", c.x + c.w/4, gridY + 9, { align: "center" });
      doc.text("Amount", c.x + 3*c.w/4, gridY + 9, { align: "center" });
    } else {
      doc.text(c.name, c.x + c.w/2, gridY + 6, { align: "center" });
    }
  });

  doc.rect(mX, gridY, width, hsnThH);
  gridY += hsnThH;

  // HSN Row
  const hsnRowH = 8;
  doc.rect(mX, gridY, width, hsnRowH);
  doc.line(hCols[1].x, gridY, hCols[1].x, gridY + hsnRowH);
  doc.line(hCols[2].x, gridY, hCols[2].x, gridY + hsnRowH);
  doc.line(hCols[3].x, gridY, hCols[3].x, gridY + hsnRowH);
  doc.line(hCols[4].x, gridY, hCols[4].x, gridY + hsnRowH);
  
  doc.line(hCols[2].x + hCols[2].w/2, gridY, hCols[2].x + hCols[2].w/2, gridY + hsnRowH);
  doc.line(hCols[3].x + hCols[3].w/2, gridY, hCols[3].x + hCols[3].w/2, gridY + hsnRowH);

  const hy = gridY + 5.5;
  doc.text("998314", hCols[0].x + 2, hy);
  doc.text(subTotal.toFixed(2), hCols[1].x + hCols[1].w - 2, hy, { align: "right" });
  doc.text(`${halfTax}%`, hCols[2].x + hCols[2].w/4, hy, { align: "center" });
  doc.text(cgstTotal.toFixed(2), hCols[2].x + hCols[2].w - 2, hy, { align: "right" });
  doc.text(`${halfTax}%`, hCols[3].x + hCols[3].w/4, hy, { align: "center" });
  doc.text(sgstTotal.toFixed(2), hCols[3].x + hCols[3].w - 2, hy, { align: "right" });
  doc.text((cgstTotal + sgstTotal).toFixed(2), hCols[4].x + hCols[4].w - 2, hy, { align: "right" });

  gridY += hsnRowH;

  // HSN Total Row
  doc.rect(mX, gridY, width, hsnRowH);
  doc.line(hCols[1].x, gridY, hCols[1].x, gridY + hsnRowH);
  doc.line(hCols[2].x, gridY, hCols[2].x, gridY + hsnRowH);
  doc.line(hCols[3].x, gridY, hCols[3].x, gridY + hsnRowH);
  doc.line(hCols[4].x, gridY, hCols[4].x, gridY + hsnRowH);

  const hty = gridY + 5.5;
  doc.setFont("helvetica", "bold");
  doc.text("Total", hCols[0].x + 2, hty);
  doc.text(subTotal.toFixed(2), hCols[1].x + hCols[1].w - 2, hty, { align: "right" });
  doc.text(cgstTotal.toFixed(2), hCols[2].x + hCols[2].w - 2, hty, { align: "right" });
  doc.text(sgstTotal.toFixed(2), hCols[3].x + hCols[3].w - 2, hty, { align: "right" });
  doc.text((cgstTotal + sgstTotal).toFixed(2), hCols[4].x + hCols[4].w - 2, hty, { align: "right" });

  // 7. Draw Footer Strip
  doc.setFillColor(0, 50, 80);
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F");

  doc.setFillColor(0, 160, 180);
  doc.rect(0, pageHeight - 4, pageWidth, 4, "F");

  doc.save(`Invoice_${invoice.invoiceNumber || invoice.number || invoice.id.slice(0,8)}.pdf`);
}
