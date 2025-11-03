const client = require('@sap-cloud-sdk/http-client');
const connectivity = require('@sap-cloud-sdk/connectivity');
const { data } = require('@sap/cds/lib/dbs/cds-deploy');
const { file } = require('@sap/cds/lib/i18n');

// Helper to create a soap service through the BTP destination service
async function getRestService(service, file, endpoint) {
    // Get the service reference
    //var definition = cds.env.requires[service];
    // Get the destination data from BTP
    const dest = await connectivity.getDestination({destinationName: 'AribaPostXcml' });;
    // Get service endpoint
    const url = (dest.url.substr(dest.url.length-1,1) === '/') ? dest.url.substr(0,dest.url.length-1) : dest.url;
    //endpoint.url = url + definition.credentials.path;
    
    const body = file;
    // Create an httpClient which connects over the BTP destination
    var httpClient = {
        request: function (url, body, callback, exheaders, exoptions) {
            client.executeHttpRequest(dest, {
                method: 'POST',
                //method: exoptions?.method || 'POST',
                url: url,
                data: body,
                headers: exheaders
            }, {...exoptions, fetchCsrfToken: false}).then((result) => {
                callback(null, result, result.data);
            }).catch((e) => {
                callback(e);
            });
        }
    }

}

module.exports = {
    getRestService
}