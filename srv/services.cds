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
    
    action getInvoices(NamirialCustomer : String,
                       NamirialPassword : String) returns Invoices;
    action getCustomers(
        DateFrom : DateTime,
        DateTo   : DateTime,
        Realm    : String,
        ApiKey   : String) returns AribaCustomers;
    action sendInvoices(Identity : String) returns InvoicesStatus;
    action retryInvoices(Identity : String) returns InvoicesStatus;
}

/**
 * Service used by administrators to manage InvoiceService.
 */
service AdminService {
    entity Invoices as projection on my.Invoices;
    entity InvoicesStatus as projection on my.InvoicesStatus;
    entity AribaCustomers as projection on my.AribaCustomers;
    
    action getInvoices(NamirialCustomer : String,
                       NamirialPassword : String) returns Invoices;
    action getCustomers( 
        DateFrom : DateTime,
        DateTo   : DateTime,
        Realm    : String,
        ApiKey   : String ) returns AribaCustomers;
    action sendInvoices(Identity : String) returns InvoicesStatus;
    action retryInvoices(Identity : String) returns InvoicesStatus;
    }

    