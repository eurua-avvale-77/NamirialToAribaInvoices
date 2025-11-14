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


async function sendToAriba(Invoice, Customers) {
   try {
        //Dal campo dati fattura dovrei mappare i dati per il servizio Ariba
        //Conversione Dal Base64 Scaricato da Namirial
      const base64 = Buffer.from(Invoice[0].content, "base64").toString("utf8");
      const esito  = []
      const res = [];
      let Ids = [];
      let IdsOks = [];

      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
      const base64parse = parser.parse(base64)
      const Piva = base64parse["p:FatturaElettronicaSemplificata"].FatturaElettronicaHeader.CedentePrestatore.IdFiscaleIVA.IdCodice
      
      //Leggo Tabella Customers

      //Valorizzo AribaId e DomainID Da Tabella
      const AribaId = 'ProvaAribaId';
      const DomainId = 'ProvaDomain'

      //Chiamo Conversione xslt
      const cxmlFiles = await transformPost(base64, res, AribaId, DomainId);
      
      
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