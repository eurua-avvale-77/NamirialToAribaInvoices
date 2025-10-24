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
    
    action getInvoices() returns Invoices;
    action sendInvoices() returns Invoices;
    action retryInvoices() returns Invoices;
}

/**
 * Service used by administrators to manage InvoiceService.
 */
service AdminService {
    entity Invoices as projection on my.Invoices;
    entity InvoicesStatus as projection on my.InvoicesStatus; 

    action getInvoices() returns Invoices; //commented for verison
    action sendInvoices() returns Invoices; //comment for version
    action retryInvoices() returns Invoices;
    }

    