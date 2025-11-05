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

async function sendToAriba(Invoice) {

        //Dal campo dati fattura dovrei mappare i dati per il servizio Ariba
        //Conversione Dal Base64 Scaricato da Namirial
        const base64 = Buffer.from(Invoice[0].content, "base64").toString("utf8");

        //let xml = base64.replace(/[\r\n\t]+/g, '')
        //xml = xml.replace(/> <+/g, '><')

        //let convert = await parseStringPromise(base64);
        //convert = (JSON.parse(JSON.stringify(convert)))

        
      /*// 📂 Percorso del file XML nel progetto CAP
      const xmlPath = path.join(cds.root, "srv", "data", "FatturaNamirialxmlfattelettronicaesempio2.xml");

      // 📖 Lettura file XML
      const xmlFile = fs.readFileSync(xmlPath, "utf-8");*/
      const esito  = []
      const res = [];
      let Ids = [];
      let IdsOks = [];
      //Chiamo Conversione xslt
      const cxmlFiles = await transformPost(base64, res);
      
      for ( const [filename, xmlContent] of Object.entries(res) ) {
      // 💾 Assegnazione a costante
      const doc = xmlContent; // il contenuto XML originale (stringa)
        //Simulo chiamata ad Ariba con Funzione Pari o dispari e aggiorno tabella esiti
      // 📂 Percorso del file XML nel progetto CAP
      /*const xmlPath = path.join(cds.root, "srv", "data", Invoice[0].title );
      
      // 📖 Lettura file XML
      const xmlFile = fs.writeFileSync(xmlPath, doc);*/
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

      };

module.exports = {
    sendToAriba
}