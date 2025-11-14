using { cuid } from '@sap/cds/common'; //Rimosso 'Managed'
namespace sap.ania.invoices;

entity Invoices {
  key ID        : String;
  title         : String(200);
  content       : LargeString;          
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

  entity AribaCustomers {
    key AribaId : String;
    Name : String;
    FiscalCode : String;
    VAT : String;
    SupplierIDDomain : String;
  }
