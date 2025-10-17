using { cuid, managed } from '@sap/cds/common';
namespace sap.capire.invoices;

/**
* Invoices Read.
*/
/*entity Invoices : managed {
AttachmentsCount : Integer;
CanaleSdi : String;
CodiceFiscaleMittente : String;
CodiceUfficio : String;
CodiceUfficioUnivoco : String;
DataPdA   : Timestamp;
DataPdV   : Timestamp;
DataPredisposizioneSupporto  : Timestamp;
DataRdV  : Timestamp;
DataSdi  : Timestamp;
ElectronicInvoiceState : String;
Formato : String;
key IdDocumento : String;
IdPdV : String;
IdRdV : String;
IdSdi: String;
IsImported: String;
ListaCorpiFattura : Composition of many CorpoFattura on ListaCorpiFattura.IdDocumento = $self;
ListaEsitiFattura : Composition of many EsitoFattura on ListaEsitiFattura.IdDocumento = $self;
  };*/

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

/*entity CorpoFattura : managed {
    key IdDocumento : Association to Invoices;
    DataFattura  : Timestamp; 
    DataProtocollo  : Timestamp;
    DataRegistrazione  : Timestamp;
    ImportoPagamento : Decimal;
    MetaData : String;
    NumeroFattura : String;
    NumeroProtocollo : String;
    NumeroRegistrazione : String;
    Sezionale : String;
    StatoEsiti : String;
    TipoDocumento : String;
}

entity EsitoFattura : managed {
    Accettazione : String;
    Consegna : String;
    ContenutoEsito : String;
    DataEsito  : Timestamp;
    DataPdA  : Timestamp;
    DataPdv  : Timestamp;
    DataRdV  : Timestamp;
    key IdDocumento : Association to Invoices;
    IdEsito : String;
    IdPdv : String;
    IdRdV : String;
    NomeFile : String;
    NumeroFatturaRiferimento : String;
    StatoArchiviazione : String;
    TipoEsito : String;
}*/