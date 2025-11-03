/**
 * Script: convert_namirial_to_cxml.js
 * Autore: ChatGPT (OpenAI)
 * Descrizione:
 *   Converte una Fattura Elettronica Namirial XML in cXML InvoiceDetailRequest
 *   utilizzando un file di mapping Excel (colonna A = campo cXML, colonna C = campo Namirial).
 * 
 * Requisiti:
 *   npm install xmlbuilder2 fast-xml-parser xlsx
 */
/*
import fs from "fs";
import { XMLBuilder } from "xmlbuilder2";
import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";

// === CONFIGURAZIONE ===
const mappingFile = "./MappingCampi Namirial.xlsx";
const inputXmlFile = "./Fattura Namirial xml fatt elettronica esempio2.xml";
const outputXmlFile = "./Output_cXML_from_Namirial.xml";

// === 1. Lettura mapping Excel ===
console.log("📘 Lettura mapping da Excel...");
const workbook = XLSX.readFile(mappingFile);
const sheetName = workbook.SheetNames[0];
const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

const mappings = [];
for (let i = 1; i < sheet.length; i++) {
  const cxmlPath = sheet[i][0];
  const namirialPath = sheet[i][2];
  if (cxmlPath && namirialPath && !cxmlPath.startsWith("<?xml")) {
    mappings.push({ cxmlPath: cxmlPath.trim(), namirialPath: namirialPath.trim() });
  }
}
console.log(`✅ ${mappings.length} mapping caricati.`);

// === 2. Lettura XML Namirial ===
console.log("📄 Lettura XML Namirial...");
const parser = new XMLParser({ ignoreAttributes: false });
const xmlData = fs.readFileSync(inputXmlFile, "utf-8");
const namirialObj = parser.parse(xmlData);

// === 3. Helper: funzione per accedere ai valori da percorsi tipo "FatturaElettronica/FatturaElettronicaBody/DatiGenerali/DatiGeneraliDocumento/Numero"
function getValueByPath(obj, path) {
  const parts = path.replace(/^\/+|\/+$/g, "").split("/");
  let current = obj;
  for (const p of parts) {
    if (current && current[p] !== undefined) current = current[p];
    else return "";
  }
  return typeof current === "object" ? "" : current;
}

// === 4. Costruzione cXML ===
console.log("🏗️ Generazione struttura cXML...");

const builder = new XMLBuilder({ version: "1.0", encoding: "UTF-8", prettyPrint: true });

const cxml = {
  cXML: {
    "@payloadID": `PAYLOAD-${Date.now()}`,
    "@timestamp": new Date().toISOString(),
    "@version": "1.2.035",
    Header: {
      From: { Credential: { "@domain": "buyersystemid", Identity: "ACM_57473133" } },
      To: {
        Credential: [
          { "@domain": "systemID", Identity: "CHILD1" },
          { "@domain": "NetworkID", Identity: "AN11182646989-T" },
        ],
      },
      Sender: {
        Credential: {
          "@domain": "NetworkID",
          Identity: "CHILD1-AN11182646989-T",
          SharedSecret: "ARIBA123",
        },
        UserAgent: "Buyer",
      },
    },
    Request: {
      "@deploymentMode": "test",
      InvoiceDetailRequest: [],
    },
  },
};

// === 5. Ciclo su ogni fattura ===
const bodies = namirialObj.FatturaElettronica?.FatturaElettronicaBody || [];
const bodyArray = Array.isArray(bodies) ? bodies : [bodies];

for (const body of bodyArray) {
  const header = body.DatiGenerali?.DatiGeneraliDocumento || {};
  const riepilogo = body.DatiBeniServizi?.DatiRiepilogo || {};
  const pagamento = body.DatiPagamento?.DettaglioPagamento || {};

  const invoice = {
    InvoiceDetailRequestHeader: {
      "@invoiceDate": header.Data || "",
      "@invoiceID": header.Numero || "",
      "@invoiceOrigin": "supplier",
      "@operation": "new",
      "@purpose": "standard",
      InvoiceDetailHeaderIndicator: {},
      InvoiceDetailLineIndicator: {
        "@isAccountingInLine": "yes",
        "@isShippingInLine": "yes",
        "@isSpecialHandlingInLine": "yes",
      },
      Extrinsic: [
        { "@name": "invoiceSourceDocument", "#": "PurchaseOrder" },
        { "@name": "invoiceSubmissionMethod", "#": "cXML" },
      ],
    },
    InvoiceDetailOrder: {
      InvoiceDetailOrderInfo: {
        OrderReference: {
          "@orderID": body.DatiGenerali?.DatiOrdineAcquisto?.IdDocumento || "",
          DocumentReference: {
            "@payloadID": body.DatiGenerali?.DatiOrdineAcquisto?.CodiceCUP || "",
          },
        },
      },
      InvoiceDetailItem: [],
    },
    InvoiceDetailSummary: {
      SubtotalAmount: { Money: { "@currency": "EUR", "#": riepilogo.ImponibileImporto || "0.00" } },
      Tax: {
        Money: { "@currency": "EUR", "#": riepilogo.Imposta || "0.00" },
        Description: { "@xml:lang": "en-US", "#": "" },
      },
      SpecialHandlingAmount: { Money: { "@currency": "EUR", "#": "0.00" } },
      ShippingAmount: { Money: { "@currency": "EUR", "#": "0.00" } },
      GrossAmount: { Money: { "@currency": "EUR", "#": riepilogo.ImponibileImporto || "0.00" } },
      NetAmount: { Money: { "@currency": "EUR", "#": riepilogo.ImponibileImporto || "0.00" } },
      DueAmount: {
        Money: { "@currency": "EUR", "#": pagamento.ImportoPagamento || "0.00" },
      },
    },
  };

  // Linee di dettaglio
  const lines = body.DatiBeniServizi?.DettaglioLinee || [];
  const lineArray = Array.isArray(lines) ? lines : [lines];

  for (const line of lineArray) {
    invoice.InvoiceDetailOrder.InvoiceDetailItem.push({
      "@invoiceLineNumber": line.NumeroLinea || "1",
      "@quantity": line.Quantita || "1",
      UnitOfMeasure: "EA",
      UnitPrice: { Money: { "@currency": "EUR", "#": line.PrezzoUnitario || "0.00" } },
      PriceBasisQuantity: {
        "@conversionFactor": "1",
        "@quantity": "1",
        UnitOfMeasure: "EA",
        Description: { "@xml:lang": "en-US", "#": "" },
      },
      InvoiceDetailItemReference: {
        "@lineNumber": line.NumeroLinea || "1",
        ItemID: { SupplierPartID: "Non Catalog Item" },
        Description: { "@xml:lang": "en", "#": line.Descrizione || "" },
      },
      SubtotalAmount: { Money: { "@currency": "EUR", "#": line.PrezzoTotale || "0.00" } },
      InvoiceDetailLineSpecialHandling: {
        Description: { "@xml:lang": "en-US", "#": "" },
        Money: { "@currency": "EUR", "#": "0.00" },
      },
      GrossAmount: { Money: { "@currency": "EUR", "#": line.PrezzoTotale || "0.00" } },
      NetAmount: { Money: { "@currency": "EUR", "#": line.PrezzoTotale || "0.00" } },
    });
  }

  cxml.cXML.Request.InvoiceDetailRequest.push(invoice);
}

// === 6. Serializzazione XML ===
const xmlOutput = builder.build(cxml);

// Inserisce manualmente la DTD
const finalOutput =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.035/InvoiceDetail.dtd">\n' +
  xmlOutput;

fs.writeFileSync(outputXmlFile, finalOutput, "utf-8");
console.log(`✅ cXML generato con successo: ${outputXmlFile}`);
*/