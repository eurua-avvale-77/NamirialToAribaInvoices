const { apiRequest } = require("./apiClient.js")
const express = require('express');
const { transformGet, transformPost } = require('../lib/xsltMapping.js');
const { create } = require('xmlbuilder2');
const { DateTime } = require('@sap/cds/lib/core/classes');
const { getSoapService } = require('./soap-service');
const { sendToAriba } = require('./rest-service');
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
const { XMLParser } = require('fast-xml-parser');
//const { transformPost } = require('./xsltMapping');


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

async function getCustomers(req) {
    try {
        // Get the SOAP client for the GetFatture service
        const { AribaCustomers } = this.entities;
        const DateInterval = {"updatedDateFrom" : req.data.DateFrom,
                              "updatedDateTo" : req.data.DateTo}
        const Customerparams = { realm :'ania-1-t',
                                 filters : JSON.stringify(DateInterval)
        };
        const destination = 'AribaRequisitionCustomViewDora';
        //const uniqueAttachmentId = '123456789'
        const CustomerEndpoint = "procurement-reporting-details/v2/prod/views/SupplierCustomView"
        const body = [];
        const method = 'GET';
        const apikey = 'u1V2UNOXqCQJQYWdlXlMut0uavLOE2A8';
        //const responseData = await AttachmentDownOperationalProcurementSynchronousApi.fileDownloadWithUniqueId(uniqueAttachmentId, { realm: myRealm }).execute({ destinationName: myDestinationName });
        const Customers = await apiRequest(destination, method, CustomerEndpoint , body, Customerparams, apikey );
    
        const LtCustomers = [];
        
        if (Customers) {                               
            Customers.forEach(Customer => {
              if (Customer.SupplierIDValue){
                LtCustomers.push({
                 AribaId    : Customer.UniqueName,
                 Name       : Customer.Name,
                 FiscalCode : Customer.cus_cf,//FiscalCode quando avremo il campo custom,
                 VAT        : Customer.cus_piva,//PIVA quando avremo il campo custom,
                 SupplierIDDomain : Customer.SupplierIDDomain,
                });
                }
            });
          };

        await UPSERT.into(AribaCustomers).entries(LtCustomers);

        return LtCustomers;
    } catch (err) {
        req.error(err.code, err.message);
    }
}

async function sendInvoices(req) {
  try{
    const { AribaCustomers } = this.entities;
    const { Invoices } = this.entities;
    const { InvoicesStatus } = this.entities;
    const LtInvoices = [];
    const LtIds = [];
    const LtIdsOks = [];
    const xml2js = require('xml2js');
    const fs = require('fs');


    const LtInvoicesStatus = await SELECT.from(InvoicesStatus).where('status =', 'Readed');
    const Customers = await SELECT.from(AribaCustomers)
    //LtInvoicesStatus.forEach(InvoiceStatus => 
      for (const InvoiceStatus of LtInvoicesStatus)
       {
        //Estraggo Una Fattura Per volta
        const Invoice = await SELECT.from(Invoices).where('ID =', InvoiceStatus.ID)
        //Chiamata alla funzione di converisone e invio ad Ariba
        const { esito } = await sendToAriba(Invoice, Customers);

                 if (esito[0].status === 'AribaStored'){ LtIdsOks.push({
                    ID : Invoice[0].ID
                    });
                    } 

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

      await UPSERT.into(InvoicesStatus).entries(LtIds);

      //Aggiunta cancellazione righe tabella invoices dopo che l'esito è andato a buon fine

      await DELETE.from(Invoices).where({ ID: { in: sdiIds } });

  return LtIds; //V1.4 Cambiata Tabella Output
    } catch (err) {
        req.error(err.code, err.message);
    }
}

async function retryInvoices(req) {
  try{
    const { AribaCustomers } = this.entities;
    const { Invoices } = this.entities;
    const { InvoicesStatus } = this.entities;
    const LtIds = [];
    const LtIdsOks = [];

    const LtInvoicesStatus = await SELECT.from(InvoicesStatus).where('status =', 'AribaError');
    const Customers = await SELECT.from(AribaCustomers)

    //LtInvoicesStatus.forEach(InvoiceStatus => 
      for (const InvoiceStatus of LtInvoicesStatus)
       {
        //Estraggo Una Fattura Per volta
        const Invoice = await SELECT.from(Invoices).where('ID =', InvoiceStatus.ID)

         const { esito } = await sendToAriba(Invoice, Customers);

                 if (esito[0].status === 'AribaStored'){ LtIdsOks.push({
                    ID : Invoice[0].ID
                    });
                    } 

                 LtIds.push({
            ID            : Invoice[0].ID,
            status        : esito[0].status,
            sendedAt      : esito[0].sendedAt,
            message       : esito[0].message
                }); 

      };
        
       
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
    getCustomers,
    sendInvoices,
    retryInvoices
}
