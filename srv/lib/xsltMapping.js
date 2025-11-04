import { join } from 'path';
import SaxonJS from 'saxon-js';
import  fs from 'fs' ;


/* GET request */
export const transformGet = (req, res) => {
	const transformViewFilePath = join(req.context.folder.root, req.context.folder.views, 'transform.html')
	res.sendFile(transformViewFilePath);
};

/* POST request */
export const transformPost = (req, res) => {
	
	//const { "stylesheet": stylesheetFileName } = req.query;
	
	const stylesheetFilePath = ('/home/user/projects/NamirialToAribaInvoices/srv/external/NamirialToAribaxsltmapping.json');
	const source = req;
	const params = [];
  /*
    const xcml = SaxonJS.transform({
			stylesheetFileName: stylesheetFilePath,
			sourceText: source,
			stylesheetParams: params,
			destination: "serialized",
			outputProperties:{ 
				method: "xml", 
				indent: false 
			}
		}, 
		"sync"
	)

res = xcml.principalResult	
return res*/

SaxonJS.transform({
    stylesheetFileName: stylesheetFilePath,
			sourceText: source,
   "deliverResultDocument": function(uri) {
      return {
         "destination": "serialized",
         "save": function(resultUri, result, encoding) {
            res[resultUri] = result;
         }
      };
   }
}, "sync");


}


/*async function transformXML(req) {
  try {
    // Path to your compiled Saxon-JS stylesheet (.sef.json file)
    const stylesheetFilePath = '/home/user/projects/NamirialToAribaInvoices/srv/external/NamirialToAribaxsltmapping.json';
    
		 // 📂 Percorso del file XML nel progetto CAP
		  const xmlPath = '/home/user/projects/NamirialToAribaInvoices/srv/data/FatturaNamirialxmlfattelettronicaesempio2.xml';
	
		  // 📖 Lettura file XML
		  const xmlFile = fs.readFileSync(xmlPath, "utf-8");
    // Read your XML source
    const sourceXML = req;

    // Run transformation
    const result = await SaxonJS.transform(
      {
        stylesheetFileName: stylesheetFilePath,
        sourceText: sourceXML,
        destination: 'serialized', // produces XML text output
        outputProperties: { method: 'xml', indent: false },
      },
      'async'
    );

    // Access the transformation result
    console.log('Transformation result:\n', result.principalResult);

    // Optionally, write it to a file
    // import { writeFileSync } from 'fs';
    // writeFileSync('/path/to/output.xml', result.principalResult);

    return result.principalResult;
  } catch (err) {
    console.error('❌ Transformation failed:', err.message);
    throw err;
  }
}

transformXML();*/
