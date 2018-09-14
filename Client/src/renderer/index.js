const $ = require('jquery');

/* global authContext updateAuthUi getResource */
const serverLoc = 'https://serverforadaljs.azurewebsites.net/'; // This is the url you provided when you register your server as an ap server on Azure
const testDataUrl = `${serverLoc}testData`;

$(document).ready(() => {
  updateAuthUi(authContext.getCachedUser());

  $('#getTestData').click(() => {
    getResource(testDataUrl);
  });
});
