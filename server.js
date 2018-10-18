const request = require('request');
const cfenv = require('cfenv');
const express = require('express');
const app = express();
const _ = require('underscore');

const oServices = cfenv.getAppEnv().getServices();
const xsuaa_service = cfenv.getAppEnv().getService('xsuaa_service') || {
    "credentials": {
        "url": "https://cf-eu20.authentication.eu10.hana.ondemand.com"
    }
};
const destination_service = cfenv.getAppEnv().getService('destination_service') || {
    "credentials": {
        "uri": "https://destination-configuration.cfapps.eu10.hana.ondemand.com",
        "clientid": "",
        "clientsecret": "" 
    }
};


const sUaaCredentials = destination_service.credentials.clientid + ':' + destination_service.credentials.clientsecret;

const port = process.env.PORT || 3000;
app.listen(port, function () {
	console.info("Listening on port: " + port);
	console.log(process.versions);
});

app.get('/', function (req, res) {
	res.type("text/html").status(200).send('<html><head></head><body><h1>Dest Proxy App !</h1><br />Used Services :<br /><pre>'+JSON.stringify(oServices, undefined, 2)+'</pre></body></html>');
});

/*app.get('/dest/:destinationname/*', function (req, res) {
    //console.log(req.params[0]);
    let sParams = "?";
    for(let sProp in req.query){
        sParams += sProp + "=" + req.query[sProp] + "&";
    }
    console.log(req.originalUrl.replace("/dest/"+req.params.destinationname, ""));


	//res.type("text/html").status(200).send('<html><head></head><body><pre>'+JSON.stringify(req, undefined, 2)+'</pre></body></html>');
}); */

app.get('/dest/:destinationname/*', function (req, res) {

    let sDestinationName = req.params.destinationname;
    let bXsuaaService = false;
    let bDestinationService = false;
    let sDestURL = "";

    const post_options = {
        url: xsuaa_service.credentials.url + '/oauth/token',
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(sUaaCredentials).toString('base64'),
            'Content-type': 'application/x-www-form-urlencoded'
        },
        form: {
            'client_id': destination_service.credentials.clientid,
            'grant_type': 'client_credentials'
        }
    };

    //Request the UAA endpoint
    request(post_options, (err, response, data) => {
        if (response.statusCode === 200) {

            bXsuaaService = true;

            const token = JSON.parse(data).access_token;
            const get_options = {
                url: destination_service.credentials.uri + '/destination-configuration/v1/destinations/' + sDestinationName,
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }

            //Request the destination endpoint
            request(get_options, (err, resp, data) => {

                bDestinationService = true;

                const oDestination = JSON.parse(data);
                //const token = oDestination.authTokens[0];
                let sEndpoint = req.originalUrl.replace("/dest/"+req.params.destinationname, "");

                const options = {
                    method: 'GET',
                    url: oDestination.destinationConfiguration.URL + sEndpoint
                    /*headers: {
                        'Authorization': `${token.type} ${token.value}`
                    }*/
                };

                sDestURL = oDestination.destinationConfiguration.URL;

                request(options).on('data', (s) => {

                    let oData;
                    try{
                        oData = JSON.stringify(JSON.parse(s), undefined, 2);
                    }catch(e){
                        oData = _.escape(s.toString());
                    }

                    //oData = oData);
                    //cconsole.log(oData);

                    let sResponseBody = `<html><head></head><body>
                        <h1>Destination ${sDestinationName} / <a href="/">Back</a></h1>
                        <ul>
                            <li>XSUAA Service Active : ${bXsuaaService}</li>
                            <li>Destination Service Active : ${bDestinationService}</li>
                            <li>Destination URL : ${sDestURL}</li>
                        </ul>
                        <h1>Response :</h1>
                        <pre>
${oData}
                        </pre>
                        </body></html>`;
    //
                    res.type("text/html").status(200).send(sResponseBody);

                }).on('error', (e) => {
                    console.log('Got error: ' + e.message);
                });

                

            });
        }
    });
       
            	
    

});