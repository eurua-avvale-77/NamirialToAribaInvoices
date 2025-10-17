const { DateTime, action } = require('@sap/cds/lib/core/classes');
const { getSoapService } = require('./lib/soap-service');
const { trim } = require('soap/lib/wsdl');
const {
    getInvoices
} = require('./lib/handlers');
const {
    sendInvoices
} = require('./lib/handlers');
const {
    retryInvoices
} = require('./lib/handlers');

module.exports = cds.service.impl(async function (srv) {
    /*** SERVICE ENTITIES ***/
    const {
        Invoices
    } = this.entities;

    /*** HANDLERS REGISTRATION ***/
    // ON events
    //this.on('READ', Invoices, readInvoices);
    //this.on('READ', Invoices, sendInvoices);
    this.on('getInvoices', getInvoices);
    this.on('sendInvoices', sendInvoices);
    this.on('retryInvoices', retryInvoices);

});
 


