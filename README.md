---
services: active-directory
platforms: electron nodejs .Net
author: norahuang
---

# Integrating Azure AD into the solution that allow an Electron Native application access to a .NET web API 

## About this sample

### Overview
This sample shows how to build a solution for a Native application to accesss the web api deployed under Azure active directory authentication.

The authentication scenario of this sample can be found in [Native application to web API Authentication Scenarios for Azure AD] (https://docs.microsoft.com/en-us/azure/active-directory/develop/authentication-scenarios#native-application-to-web-api).

The native applicaton in this sample is an electron application. We use pure node.js adal library for azure active directory authentication.

The web API in the sample is a .Net server which can be deployed as a web service on Azure portal and should be configured to use Azure Acitve Directory as its authentication method.

We've released all of the source code for this example in GitHub under an MIT license, so feel free to clone (or even better, fork!) and provide feedback on the forums.

### Scenarios (post-deployment)

Press the **Login** button to get signe in. 
Once you signed in, press the **Get Test Data** button to get the test data from the web api
You can sign out by clicking the **Logout** button in the drop down menu from hoving over to your user name after signed in.


### Prerequisite
To use this sample you will need a Azure Active Directory Tenant. 
If you're not sure what a tenant is or how you would get one, read [What is an Azure AD tenant](http://technet.microsoft.com/library/jj573650.aspx)? or [Sign up for Azure as an organization](http://azure.microsoft.com/documentation/articles/sign-up-organization/). 
Or you can use an exist tenant.

## Web API setup

### Step 1
Publish the Server in this sample as an APP Services in Azure portal. A simple way to do that is through Visual Studio. Read [Publish an ASP.NET Core app to Azure with Visual Studio](https://docs.microsoft.com/en-us/aspnet/core/tutorials/publish-to-azure-webapp-using-vs?view=aspnetcore-2.1) for detials.

### Step 2 
Configure the Azure active directory authentication for this web API. There are two methods, [using express settings](https://docs.microsoft.com/en-us/azure/app-service/app-service-mobile-how-to-configure-active-directory-authentication#a-nameexpress-aconfigure-azure-active-directory-using-express-settings) or [manually configure with advanced settings](https://docs.microsoft.com/en-us/azure/app-service/app-service-mobile-how-to-configure-active-directory-authentication#a-nameadvanced-aalternative-method-manually-configure-azure-active-directory-with-advanced-settings).

### Step 3
Take a note of the APP's URL and Client ID(**App Serive** -> select your web api -> **Authentication/Authorization** -> **Azure Active Directory** -> **Advanced** tag of **Management mode** -> you will find the Client ID). Replace the "resourceId" with the Client ID you get here in the authentication.js file of the Client project. Replace the serverLoc with the app URL.

## Native App setup

### Step 1: 
Register your electron app as a native application on Azure Active Directory. Read [Configure a native client application](https://docs.microsoft.com/en-us/azure/app-service/app-service-mobile-how-to-configure-active-directory-authentication#optional-configure-a-native-client-application) for detail.

### Step 2: 
Config your own redirect URIS(**Azure Active Directory** -> **App registrations** -> select the native app your register in step 1 -> **Setting** -> **Redirect URIS**), in this sample:
* The contataction of the web api URL and **loggedIn** (the controller provided in the .Net server project) is used as the secussful login redirect URI.
* urn:ietf:wg:oauth:2.0:oob is used for logout redirect URI. [Reference](https://docs.microsoft.com/en-us/azure/active-directory/develop/v1-protocols-oauth-code#request-an-authorization-code) 

### Step 3: 
Take a not of the **Application ID** in the Setting of this native app. Replace the "clientId" with the *Application ID* in the authentication.js file of the Client project.

### Step 4: 
Enabling OAuth 2.0 implicit grant for this native app. 
* Set **oauth2AllowImplicitFlow** as true in the manifest.(**Azure Active Directory** -> **App registrations** -> select the native app your register in step 1 -> **Manifest**)


## Run the Electron App
From your shell or command line:
* go the the directory of the Client project
* yarn install
* npm start

Authentication code on the electron client side
------
### authentication code

```
/* global serverLoc */
const AuthenticationContext = require('adal-angular');

const serverLoc = 'https://serverforadaljs.azurewebsites.net/'; // This is the url you provided when you register your server as an ap server on Azure
const testDataUrl = `${serverLoc}testData`;
const resourceId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // server app id, it is registered in Azure as an app service
const config = {
  clientId: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyy',        // client app id of this electron app, it is registered in Azure active directory as a native application
  redirectUri: `${serverLoc}loggedIn`, // This is a redirect URI to the server and configured in client app, Azure active directory
  postLogoutRedirectUri: 'urn:ietf:wg:oauth:2.0:oob', // This is the default redirect URI configured in client app, Azure active directory
  tenant: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',  // Your tenant id (usally is the tenent id of your organization for example Microsoft)
};
const authContext = new AuthenticationContext(config);


$(document).ready(() => {
  updateAuthUi(authContext.getCachedUser());

  $('#getTestData').click(() => {
    getResource(testDataUrl);
  });
});

function updateAuthUi(user) {
  $('#authentication').empty();
  if (user === null) {
    $('#authentication').append('<button class="bottonText uk-button uk-button-default uk-button-small">Login</button>')
    .on('click', () => {
      logIn();
    });
  } else {
    $('#authentication').append($('<button class="bottonText uk-button uk-button-default uk-button-small" type="button"></button>').text(user.profile.name));
    const authenticationInfo = $('<div uk-dropdown/>', {
      id: 'authenticationInfo',
    });
    $('#authentication').append(authenticationInfo);
    const authenticationInfoUl = $('<ul />', {
      class: 'uk-nav uk-dropdown-nav',
      id: 'authenticationInfoUl',
    });
    authenticationInfoUl.appendTo(authenticationInfo);
    authenticationInfoUl.append($('<li></li>').text(user.userName));
    authenticationInfoUl.append($('<li class="uk-nav-divider"></li>'));
    authenticationInfoUl.append($('<li><a href="#" id="logOut">LogOut</a></li>'));

    $('#logOut').click(() => {
      authContext.logOut();
    });
  }
}

function logIn() {
  // The popup option from Azure active directory js lib doesn't work with electron, so need to handle the login and popup in displayCall.
  authContext.config.displayCall = function (url) {
    authContext.config.displayCall = null;
    const popup = window.open(url, 'auth-popup', 'width=800,height=500');
    const intervalId = window.setInterval(function () {
      try {
        if (popup.location.indexOf('serverforadaljs.azurewebsites.net/loggedIn') >= 0) {
          window.clearInterval(intervalId);
          const hash = `#${popup.location.toString().split('#')[1]}`; // In electron, window.open retruns a BrowserWindowProxy which only provide limited api and doesn't include location.hash. So need to parse it manually.
          authContext.handleWindowCallback(hash);
          updateAuthUi(authContext.getCachedUser());
          getAccessToken(); // acquire access token after logged in
        }
      } catch (error) {
        window.clearInterval(intervalId);
      }
    }, 10);
  };
  authContext.login();
}

function getAccessToken() {
  setUpCallback();
  acquireToken();
}

function getResource(resourceUrl) {
  setUpCallback();
  getResourceWithToken(resourceUrl);
}

function getResourceWithToken(resourceUrl, successCallBack, failCallBack) {
  authContext.acquireToken(resourceId, (errorDesc, token, error) => {
    if (error && error.indexOf('login') >= 0) {
      logIn();
    }
    if (token && resourceUrl) {
      $.ajax({
        type: 'GET',
        url: resourceUrl,
        headers: {
          'Authorization': `bearer ${token}`,
        },
      })
      .done(successCallBack)
      .fail(failCallBack);
    }
  });
}

function acquireToken() {
  authContext.acquireToken(resourceId, (errorDesc, token, error) => {
    if (error && error.indexOf('login') >= 0) {
      logIn();
    }
  });
}

// When using adal pure js version, the token will not be updated in acquireToken function call. Need to call handleWindowCallback to update the token with the hash in the url.
function setUpCallback() {
  const iframeId = `adalRenewFrame${resourceId}`;
  const intervalId = window.setInterval(function () {
    try {
      if (window.frames && window.frames[iframeId]) {
        if (window.frames[iframeId].contentDocument.URL.indexOf('serverforadaljs.azurewebsites.net/loggedIn') >= 0) {
          window.clearInterval(intervalId);
          const hash = `#${window.frames[iframeId].contentDocument.URL.split('#')[1]}`;
          authContext.handleWindowCallback(hash);
        }
      }
    } catch (whatever) {
      window.clearInterval(intervalId);
    }
  }, 10);
}

```

### Reload index.html code in main.js after logout

```
  // The logout process has to be done in the origin window due to the design of adal.js.
  // So after the logout, we need to reload index.html of this app to make the app work normally again
  mainWindow.webContents.on('did-navigate', (e, url) => {
    if (url.indexOf('signoutcleanup') >= 0) {
      mainWindow.loadURL(`file://${__dirname}/index.html`);
    }
  });
```
