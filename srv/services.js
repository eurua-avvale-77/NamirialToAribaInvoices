const { DateTime, action } = require('@sap/cds/lib/core/classes');
const { getSoapService } = require('./lib/soap-service');
const { trim } = require('soap/lib/wsdl');
const {
    getInvoices
} = require('./lib/handlers');
const {
    getCustomers
} = require('./lib/handlers', './lib/rest-service');
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
    this.on('getInvoices', getInvoices);
    this.on('getCustomers', getCustomers);
    this.on('sendInvoices', sendInvoices);
    this.on('retryInvoices', retryInvoices);

});
 


