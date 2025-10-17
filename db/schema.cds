using { cuid, managed } from '@sap/cds/common';
namespace sap.capire.invoices;

entity Invoices {
  key ID        : String;
  title         : String(200);
  content       : LargeString;          // holds XML text (CLOB)
  contentType   : String(32);
  createdAt     : Timestamp;
}
entity InvoicesStatus : cuid {
    key ID : String;
    title         : String(200);
    createdAt     : Timestamp;
    status        : String;          
    sendedAt      : Timestamp;
    message       : String;
  };
