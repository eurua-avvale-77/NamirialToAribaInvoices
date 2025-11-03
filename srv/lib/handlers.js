const { create } = require('xmlbuilder2');
const { DateTime } = require('@sap/cds/lib/core/classes');
const { getSoapService } = require('./soap-service');
const { getRestService } = require('./rest-service');
const { trim } = require('soap/lib/wsdl');
const { parseStringPromise } = require('xml2js');
const cds = require('@sap/cds');
const axios = require('axios');
const { 
  v1: uuidv1,
  v4: uuidv4,
} = require('uuid');
const { getCxmlTransformation } = require('./NamirialToAriba-mapping');
const client = require('@sap-cloud-sdk/http-client');
const path = require("path");
const fs = require('fs');
const { XMLParser } = require('fast-xml-parser')


let getFattureServicePromise = null;
let getFattureServiceEndpoint = { url: null };

let getAribaServicePromise = null;
let getAribaServiceEndpoint = { url: null };

async function getInvoices(req) {
    try {
        // Get the SOAP client for the GetFatture service
        const getFattureService = await getSoapService('GetFatture', './srv/external/NamirialFattureServices.wsdl', getFattureServiceEndpoint);;
        getFattureService.setEndpoint(getFattureServiceEndpoint.url);
        const { Invoices } = this.entities;
        const { InvoicesStatus } = this.entities;
        // Set the parameters for the GetElectronic Invoices method of the sevice 
        const param =  {
          auth : {
                CustomerCode: "0000001Test0024762",
                Password: "RTYxOTY5MUY0RUY4NjFFODM1MENDOUNCM0ZGOTU3OTM="
                },
          paramFilter :   {
            StateDataProcessing : 'ToDownload'
          } 
        };

        // Invoke QueryGetElectronicInvoices method asynchronously and wait for the response, 
        // NB 'GetElectronicInvoicesAsync' viene creato dal nostro Handler Soap, non esiste nel wsdl originale
        const resp = await getFattureService.GetElectronicInvoicesAsync(param);

        // Salvo Risposta Servizio In Tab Locale come 'Invoices'
        const LtInvoices = [];
       
        //if (resp && resp[0] && resp[0].GetElectronicInvoicesResult.DatiFattura) {
          if (resp[0].GetElectronicInvoicesResult) {                                  //V1.4 Corretto Fitro
          //resp[0].GetElectronicInvoicesResult.DatiFattura.forEach(DatiFattura => {
         for (DatiFattura of resp[0].GetElectronicInvoicesResult.DatiFattura){
        //leggo da ogni singola fattura il servizio GetFattura per recuperare XML in base64

        // Set the parameters for the GetFattura method of the sevice 
                   const paramFattura =  {
                codiceCliente: "0000001Test0024762",
                passwordServizi: "RTYxOTY5MUY0RUY4NjFFODM1MENDOUNCM0ZGOTU3OTM=",
                codiceUfficio: DatiFattura.CodiceUfficio,
                idSdi: DatiFattura.IdSdi
        };
        
        // Invoke QueryGetFattura synchro and wait for the response, 
        // NB 'GetElectronicInvoicesAsync' viene creato dal nostro Handler Soap, non esiste nel wsdl originale
        const respFattura = await getFattureService.GetFatturaDisinbustataAsync(paramFattura);
        
        const xmlFile = respFattura[0].GetFatturaDisinbustataResult.FileFattura

                LtInvoices.push({
                    ID            : DatiFattura.IdSdi,
                    title         : DatiFattura.NomeFile,
                    content       : xmlFile,          
                    contentType   : 'Base64',
                    createdAt     : new Date()
                });
          };
        //V1.4 spostato chiusura IF in fondo



        
        // Salvo in DB Fatture Estratte, ID NomeFile e data
        await UPSERT.into(Invoices).entries(LtInvoices);

        // Map to an array of numbers
        const sdiIds = LtInvoices.map(inv => inv.ID);

        //Estraggo le fatture Salvate da Namirial
        const LtIds = [];
        const Ids = await SELECT.from(Invoices).columns('ID', 'title', 'createdAt').where('ID in', sdiIds); //V1.4 ripristinato Where Condition
        //Preparo la Tabella locale come 'InvoiceStatus' per inserire in tabella
        Ids.forEach(Ids => {
              LtIds.push({
                    ID            : Ids.ID,
                    title         : Ids.title,
                    createdAt     : Ids.createdAt,
                    status        : 'Readed',  
                    sendedAt      : '',
                    message       : ''
                });
        })
   
         await UPSERT.into(InvoicesStatus).entries(LtIds);

        // Map to an array of numbers
        const sdiIds2 = LtIds.map(inv => inv.ID);
        
        // Set the parameters for the SetStatesDataProcessingPassiveElectronicInvoice method of the sevice 
        const param2 =  {
          auth : {
                CustomerCode: "0000001Test0024762",
                Password: "RTYxOTY5MUY0RUY4NjFFODM1MENDOUNCM0ZGOTU3OTM="
                },
          idSdiList :{
                            "arr:long": sdiIds2
                      },
          newStateDataProcessing : 'Downloaded'
        };

        // Invoke SetStatesDataProcessingPassiveElectronicInvoice method asynchronously and wait for the response, 
        // NB 'SetStatesDataProcessingPassiveElectronicInvoiceAsync' viene creato dal nostro Handler Soap, non esiste nel wsdl originale
        const resp2 = await getFattureService.SetStatesDataProcessingPassiveElectronicInvoiceAsync(param2);
      } //V1.4 Nuova Chiusura If In fondo

        return LtInvoices;
    } catch (err) {
        req.error(err.code, err.message);
    }
}

async function sendInvoices(req) {
  try{

    const { Invoices } = this.entities;
    const { InvoicesStatus } = this.entities;
    const LtInvoices = [];
    const esito  = [];
    const LtIds = [];
    const LtIdsOks = [];
    const xml2js = require('xml2js');
    const fs = require('fs');


    const LtInvoicesStatus = await SELECT.from(InvoicesStatus).where('status =', 'Readed');

    //LtInvoicesStatus.forEach(InvoiceStatus => 
      for (const InvoiceStatus of LtInvoicesStatus)
       {
        //Estraggo Una Fattura Per volta
        const Invoice = await SELECT.from(Invoices).where('ID =', InvoiceStatus.ID)

        //Dal campo dati fattura dovrei mappare i dati per il servizio Ariba
        //Conversione Dal Base64 Scaricato da Namirial
        const base64 = Buffer.from(Invoice[0].content, "base64").toString("utf8");

        //let xml = base64.replace(/[\r\n\t]+/g, '')
        //xml = xml.replace(/> <+/g, '><')

        let convert = await parseStringPromise(base64);
        convert = (JSON.parse(JSON.stringify(convert)))
        
        console.log(convert.FatturaElettronicaSemplificata);

        const fattura = [];
        
        
        //Logica Mapping verso Ariba      

/*const doc = create({ version: '1.0', encoding: 'UTF-8' })
  .dtd({ sysID: "http://xml.cxml.org/schemas/cXML/1.2.035/InvoiceDetail.dtd" })
  .ele('cXML', {
    payloadID: uuidv1(),
    timestamp: new Date(),
    version: '1.2.035'
  })
  .ele('Header')
    .ele('From')
      .ele('Credential', { domain: 'buyersystemid' })
        .ele('Identity').txt('ACM_57473133').up() //Va gestita Conversione P.IVA Namirial
      .up()
    .up()
    .ele('To')
      .ele('Credential', { domain: 'systemID' })
        .ele('Identity').txt('CHILD1').up()
      .up()
      .ele('Credential', { domain: 'NetworkID' })
        .ele('Identity').txt('AN11182646989-T').up() //Togliere -t per prod
      .up()
    .up()
    .ele('Sender')
      .ele('Credential', { domain: 'NetworkID' })
        .ele('Identity').txt('CHILD1-AN11182646989-T').up() //Togliere -t per prod
        .ele('SharedSecret').txt('ARIBA123').up()
      .up()
      .ele('UserAgent').txt('Buyer').up()
    .up()
  .up()
  .ele('Request', { deploymentMode: 'test' })
    .ele('InvoiceDetailRequest')
      .ele('InvoiceDetailRequestHeader', { 
        invoiceDate: '2017-10-09T16:48:05+05:30',//convert[0].FatturaElettronicaBody[0].DatiGenerali[0].Data[0].value(),
        invoiceID: 'INV32', //convert[0].FatturaElettronicaBody[0].DatiGenerali[0].Data[0].value(),
        invoiceOrigin: 'supplier',
        operation: 'new',
        purpose: 'standard'
      })
        .ele('InvoiceDetailHeaderIndicator').up()
        .ele('InvoiceDetailLineIndicator', {
          isAccountingInLine: 'yes',
          isShippingInLine: 'yes',
          isSpecialHandlingInLine: 'yes'
        }).up()
        .ele('Extrinsic', { name: 'invoiceSourceDocument' }).txt('PurchaseOrder').up()
        .ele('Extrinsic', { name: 'invoiceSubmissionMethod' }).txt('cXML').up()
      .up()
      .ele('InvoiceDetailOrder')
        .ele('InvoiceDetailOrderInfo')
          .ele('OrderReference', { orderID: 'PO108' })
            .ele('DocumentReference', { payloadID: '1507547809043_711429418@10.59.35.140' }).up()
          .up()
        .up()
        .ele('InvoiceDetailItem', { invoiceLineNumber: '1', quantity: '1' })
          .ele('UnitOfMeasure').txt('EA').up()
          .ele('UnitPrice').ele('Money', { currency: 'EUR' }).txt('27.00').up().up()
          .ele('PriceBasisQuantity', { conversionFactor: '1', quantity: '1' })
            .ele('UnitOfMeasure').txt('EA').up()
            .ele('Description', { 'xml:lang': 'en-US' }).up()
          .up()
          .ele('InvoiceDetailItemReference', { lineNumber: '1' })
            .ele('ItemID')
              .ele('SupplierPartID').txt('Non Catalog Item').up()
            .up()
            .ele('Description', { 'xml:lang': 'en' }).txt('Riga unica Fattura').up()
          .up()
          .ele('SubtotalAmount').ele('Money', { currency: 'EUR' }).txt('27.00').up().up()
          .ele('InvoiceDetailLineSpecialHandling')
            .ele('Description', { 'xml:lang': 'en-US' }).up()
            .ele('Money', { currency: 'EUR' }).txt('0.00').up()
          .up()
          .ele('GrossAmount').ele('Money', { currency: 'EUR' }).txt('27.00').up().up()
          .ele('NetAmount').ele('Money', { currency: 'EUR' }).txt('27.00').up().up()
        .up()
      .up()
      .ele('InvoiceDetailSummary')
        .ele('SubtotalAmount').ele('Money', { currency: 'EUR' }).txt('27.00').up().up()
        .ele('Tax')
          .ele('Money', { currency: 'EUR' }).txt('5.95').up()
          .ele('Description', { 'xml:lang': 'en-US' }).up()
        .up()
        .ele('SpecialHandlingAmount').ele('Money', { currency: 'EUR' }).txt('0.00').up().up()
        .ele('ShippingAmount').ele('Money', { currency: 'EUR' }).txt('0.00').up().up()
        .ele('GrossAmount').ele('Money', { currency: 'EUR' }).txt('27.00').up().up()
        .ele('NetAmount').ele('Money', { currency: 'EUR' }).txt('27.00').up().up()
        .ele('DueAmount').ele('Money', { currency: 'EUR' }).txt('32.95').up().up()
      .up()
    .up()
  .up(); */
        
              // 📂 Percorso del file XML nel progetto CAP
      const xmlPath = path.join(cds.root, "srv", "data", "AribaRequestExample.xml");

      // 📖 Lettura file XML
      const xmlFile = fs.readFileSync(xmlPath, "utf-8");

      // 💾 Assegnazione a costante
      const doc = xmlFile; // il contenuto XML originale (stringa)
        //Simulo chiamata ad Ariba con Funzione Pari o dispari e aggiorno tabella esiti

         //const getAribaService = await getRestService('GetFatture', doc, getAribaServiceEndpoint);;
         //getAribaService.setEndpoint(getAribaServiceEndpoint.url)

      const aribaService = await client.executeHttpRequest(
                {
                    destinationName: 'AribaPostXcml'
                }, {
                    method: 'POST', 
                    headers: {
        'Content-Type': 'application/xml'
      },
                    data: doc
                } 
            );


      // 🔹 Parsing risposta XML → JSON
      const xmlResponse = aribaService.data;
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
      const parsed = parser.parse(xmlResponse);

      // 🔹 Estraggo lo stato cXML
      const status = parsed?.cXML?.Response?.Status || {};
      const code = status.code || "N/A";
      const text = status.text || "No text";
      const message = typeof status === "object" ? Object.values(status).join(" ") : status;
      
        const esito  = []

                        if (code === '200') {
                          esito.push({
                        status    : 'AribaStored',
                        sendedAt  : new Date(),
                        message : text,
                         });

                          LtIdsOks.push({
                            ID            : Invoice[0].ID
                          }); 

                        } else {
                          esito.push({
                        status    : 'AribaError',
                        sendedAt  : '',
                        message : text,
                         });
                        };


          LtIds.push({
            ID            : Invoice[0].ID,
            status        : esito[0].status,
            sendedAt      : esito[0].sendedAt,
            message       : esito[0].message
                }); 
        

       }
    //)
    
      // Map to an array of numbers
      const sdiIds = LtIdsOks.map(inv => inv.ID);

      //await UPSERT.into(InvoicesStatus).entries(LtIds);

      //Aggiunta cancellazione righe tabella invoices dopo che l'esito è andato a buon fine

      //await DELETE.from(Invoices).where({ ID: { in: sdiIds } });

  return LtIds; //V1.4 Cambiata Tabella Output
    } catch (err) {
        req.error(err.code, err.message);
    }
}

async function retryInvoices(req) {
  try{
        const { Invoices } = this.entities;
    const { InvoicesStatus } = this.entities;
    const LtInvoices = [];
    const esito  = [];
    const LtIds = [];
    const LtIdsOks = [];

    const LtInvoicesStatus = await SELECT.from(InvoicesStatus).where('status =', 'AribaError');

    //LtInvoicesStatus.forEach(InvoiceStatus => 
      for (const InvoiceStatus of LtInvoicesStatus)
       {
        //Estraggo Una Fattura Per volta
        const Invoice = await SELECT.from(Invoices).where('ID =', InvoiceStatus.ID)

        //Dal campo dati fattura dovrei mappare i dati per il servizio Ariba
        /* 
        Logica Mapping verso Ariba       
        */
        
        //Simulo chiamata ad Ariba con Funzione Pari o dispari e aggiorno tabella esiti


        //const numero = Invoice[0].ID;
        const esito  = []

                        if (Invoice[0].ID % 2 === 0) {
                          continue
                        } else {
                          esito.push({
                        status    : 'AribaStored',
                        sendedAt  : new Date(),
                        message : '',
                         });

                           LtIdsOks.push({
                            ID  : Invoice[0].ID
                          }); 

                        };


          LtIds.push({
            ID            : Invoice[0].ID,
            status        : esito[0].status,
            sendedAt      : esito[0].sendedAt,
            message     : esito[0].message
                }); 
        
       }
    //)
    
      // Map to an array of numbers
      const sdiIds = LtIdsOks.map(inv => inv.ID);

      await UPSERT.into(InvoicesStatus).entries(LtIds);

      //Aggiunta cancellazione righe tabella invoices dopo che l'esito è andato a buon fine

      await DELETE.from(Invoices).where({ ID: { in: sdiIds } });

  return LtIds; //V1.4 Cambiata tabella Output
    } catch (err) {
        req.error(err.code, err.message);
    }
}


module.exports = {
    getInvoices,
    sendInvoices,
    retryInvoices
}