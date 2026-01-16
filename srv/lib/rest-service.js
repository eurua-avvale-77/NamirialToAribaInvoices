const express = require('express');
const { transformGet, transformPost } = require('../lib/xsltMapping.js');
const { create } = require('xmlbuilder2');
const { DateTime } = require('@sap/cds/lib/core/classes');
const { 
  v1: uuidv1,
  v4: uuidv4,
} = require('uuid');
const client = require('@sap-cloud-sdk/http-client');
const { XMLParser } = require('fast-xml-parser');
const cds = require('@sap/cds');


async function sendToAriba(Invoice, Customers, Identity) {
   try {
        //Dal campo dati fattura dovrei mappare i dati per il servizio Ariba
        //Conversione Dal Base64 Scaricato da Namirial
      const base64 = Buffer.from(Invoice[0].content, "base64").toString("utf8");
      const esito  = []
      const res = [];
      let Ids = [];
      let IdsOks = [];
      let SupplierPiva = [];
      let SupplierIdPaese = []; 
      let CustomerPiva = [];
      let CustomerIdPaese = [];
      let AribaId = [];
      let DomainId = [];

      const parser = new XMLParser({ parseTagValue: false,
                                     parseAttributeValue: false,
                                     ignoreAttributes: false, 
                                     attributeNamePrefix: "" });

      const base64parse = parser.parse(base64)
      if (base64parse["p:FatturaElettronicaSemplificata"]){
       SupplierPiva = base64parse["p:FatturaElettronicaSemplificata"].FatturaElettronicaHeader.CedentePrestatore.IdFiscaleIVA.IdCodice
       SupplierIdPaese = base64parse["p:FatturaElettronicaSemplificata"].FatturaElettronicaHeader.CedentePrestatore.IdFiscaleIVA.IdPaese
       if (base64parse["p:FatturaElettronicaSemplificata"].FatturaElettronicaHeader.CessionarioCommittente.IdentificativiFiscali.IdFiscaleIVA){
       CustomerPiva = base64parse["p:FatturaElettronicaSemplificata"].FatturaElettronicaHeader.CessionarioCommittente.IdentificativiFiscali.IdFiscaleIVA.IdCodice
       CustomerIdPaese = base64parse["p:FatturaElettronicaSemplificata"].FatturaElettronicaHeader.CessionarioCommittente.IdentificativiFiscali.IdFiscaleIVA.IdPaese
       }}
       else {
       SupplierPiva = base64parse["p:FatturaElettronica"].FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice
       SupplierIdPaese = base64parse["p:FatturaElettronica"].FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdPaese
       if (base64parse["p:FatturaElettronica"].FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA){
       CustomerPiva = base64parse["p:FatturaElettronica"].FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA.IdCodice
       CustomerIdPaese = base64parse["p:FatturaElettronica"].FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA.IdPaese}
       }   // solo per test
      //Leggo Tabella Customers

      const Customer = Customers.find(item => item.VAT === SupplierPiva)

      //Valorizzo AribaId e DomainID Da Tabella
      if (Customer){
       AribaId = Customer.AribaId;
       DomainId = Customer.SupplierIDDomain;
      } 
      //const SupplierVAT = SupplierIdPaese + SupplierPiva;
      const SupplierVAT = SupplierPiva;
      //const CustomerVAT = CustomerIdPaese + CustomerPiva;
      const CustomerVAT = CustomerPiva;

      //Chiamo Conversione xslt
      const cxmlFiles = await transformPost(base64, res, AribaId, DomainId, SupplierVAT, CustomerVAT, Identity); 
      
      
      //Lettura Tabella Customers
      
      for ( const [filename, xmlContent] of Object.entries(res) ) {
      const doc = xmlContent; 

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
      //const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
      const parsed = parser.parse(xmlResponse);

      // 🔹 Estraggo lo stato cXML
      const status = parsed?.cXML?.Response?.Status || {};
      const code = status.code || "N/A";
      const text = status.text || "No text";
      const message = typeof status === "object" ? Object.values(status).join(" ") : status;
      

                        if (code === '200') {
                          esito.push({
                        status    : 'AribaStored',
                        sendedAt  : new Date(),
                        message : text + '' + message,
                         });

                         /* LtIdsOks.push({
                            ID            : Invoice[0].ID
                          }); */

                        } else {
                          esito.push({
                        status    : 'AribaError',
                        sendedAt  : '',
                        message : text + '' + message,
                         });
                        };


       };

                /* if (esito[0].status === 'AribaStored'){ IdsOks.push({
                    ID : Invoice[0].ID
                    });
                    } 

                 Ids.push({
            ID            : Invoice[0].ID,
            status        : esito[0].status,
            sendedAt      : esito[0].sendedAt,
            message       : esito[0].message
                }); */
        
        // Return the output parameters
       return { esito };
       } catch (err) {
        req.error(err.code, err.message);
    }

      };

module.exports = {
    sendToAriba
}