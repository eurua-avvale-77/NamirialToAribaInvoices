using { sap.ania.invoices as my } from '../db/schema';

/**
 * Service used by support personell, i.e. the InvoiceService' 'processors'.
 */
service ProcessorService { 
    /*@Capabilities : { 
            Insertable : true,
            Updatable : false,
            Deletable : false
     }*/
    entity Invoices as projection on my.Invoices;
    entity InvoicesStatus as projection on my.InvoicesStatus;
    entity AribaCustomers as projection on my.AribaCustomers;
    
    action getInvoices() returns Invoices;
    action getCustomers(
        DateFrom : DateTime,
        DateTo   : DateTime) returns AribaCustomers;
    action sendInvoices() returns InvoicesStatus;
    action retryInvoices() returns InvoicesStatus;
}

/**
 * Service used by administrators to manage InvoiceService.
 */
service AdminService {
    entity Invoices as projection on my.Invoices;
    entity InvoicesStatus as projection on my.InvoicesStatus;
    entity AribaCustomers as projection on my.AribaCustomers;
    
    action getInvoices() returns Invoices;
    action getCustomers( 
        DateFrom : DateTime,
        DateTo   : DateTime) returns AribaCustomers;
    action sendInvoices() returns InvoicesStatus;
    action retryInvoices() returns InvoicesStatus;
    }

    