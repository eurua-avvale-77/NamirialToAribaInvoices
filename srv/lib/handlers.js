const { DateTime } = require('@sap/cds/lib/core/classes');
const { getSoapService } = require('./soap-service');
const { trim } = require('soap/lib/wsdl');
const { parseStringPromise } = require('xml2js');
const cds = require('@sap/cds');
const axios = require('axios');

let getFattureServicePromise = null;
let getFattureServiceEndpoint = { url: null };

//(async function () {
    // Connect to external S/4HC SOAP service
    //getFattureServicePromise = getSoapService('GetFatture', './srv/external/NamirialFattureServices.wsdl', getFattureServiceEndpoint);
//})();


async function getInvoices(req) {
    try {
        // Get the SOAP client for the GetFatture service
        const getFattureService = await getSoapService('GetFatture', './srv/external/NamirialFattureServices.wsdl', getFattureServiceEndpoint);;
        getFattureService.setEndpoint(getFattureServiceEndpoint.url);
        const { Invoices } = this.entities;
        const { InvoicesStatus } = this.entities;
        // Set the parameters for the GetFatture method of the sevice 
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
          if (resp[0].GetElectronicInvoicesResult.DatiFattura) {
            resp[0].GetElectronicInvoicesResult.DatiFattura.forEach(DatiFattura => {
                LtInvoices.push({
                    ID            : DatiFattura.IdSdi,
                    title         : DatiFattura.NomeFile,
                    content       : JSON.stringify(DatiFattura),          
                    contentType   : 'application/xml',
                    createdAt     : new Date()
                });
            });
        }
        
        // Salvo in DB Fatture Estratte, ID NomeFile e data
        await UPSERT.into(Invoices).entries(LtInvoices);

        // Map to an array of numbers
        const sdiIds = LtInvoices.map(inv => inv.ID);

        //Estraggo le fatture Salvate da Namirial
        const LtIds = [];
        const Ids = await SELECT.from(Invoices).columns('ID', 'title', 'createdAt')//.where('ID =', {in: sdiIds});
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

    const LtInvoicesStatus = await SELECT.from(InvoicesStatus).where('status =', 'Readed');

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


        const numero = Invoice[0].ID;
        const esito  = []

                        if (Invoice[0].ID % 2 === 0) {
                          esito.push({
                        status    : 'AribaStored',
                        sendedAt  : new Date(),
                        message : '',
                         });
                        } else {
                          esito.push({
                        status    : 'AribaError',
                        sendedAt  : '',
                        message : 'NumeroDispari',
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
    
      await UPSERT.into(InvoicesStatus).entries(LtIds);

  return LtInvoices;
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
                        };


          LtIds.push({
            ID            : Invoice[0].ID,
            status        : esito[0].status,
            sendedAt      : esito[0].sendedAt,
            message     : esito[0].message
                }); 
        
       }
    //)
    
      await UPSERT.into(InvoicesStatus).entries(LtIds);

  return LtInvoices;
    } catch (err) {
        req.error(err.code, err.message);
    }
}


module.exports = {
    getInvoices,
    sendInvoices,
    retryInvoices
}