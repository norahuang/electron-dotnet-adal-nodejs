/* global serverLoc */
const AuthenticationContext = require('adal-angular');

const resourceId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // server app id, it is registered in Azure as an app service
const config = {
  clientId: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyy',        // client app id of this electron app, it is registered in Azure active directory as a native application
  redirectUri: `${serverLoc}loggedIn`, // This is a redirect URI to the server and configured in client app, Azure active directory
  postLogoutRedirectUri: 'urn:ietf:wg:oauth:2.0:oob', // This is the default redirect URI configured in dominoprofiler client app, Azure active directory
  tenant: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',  // Your tenant id (usally is the tenent id of your organization for example Microsoft)
};
const authContext = new AuthenticationContext(config);

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
        if (popup.location.indexOf('dominobuildprofiler.azurewebsites.net/test') >= 0) {
          const hash = `#${popup.location.toString().split('#')[1]}`; // In electron, window.open retruns a BrowserWindowProxy which only provide limited api and doesn't include location.hash. So need to parse it manually.
          if (hash && hash !== '#undefined') {
            authContext.handleWindowCallback(hash);
            updateAuthUi(authContext.getCachedUser());
            acquireAccessTokenAfterLogin(); // acquire access token after logged in
          } else {
            authContext._handlePopupError();
            popup.close();
            logIn();
          }
          window.clearInterval(intervalId);
        }
      } catch (error) {
        window.clearInterval(intervalId);
        authContext._handlePopupError();
        popup.close();
      }
    }, 10);
  };
  authContext.login();
}

function acquireAccessTokenAfterLogin() {
  setUpCallback();
  acquireToken();
}

function getResource(resourceUrl, successCallBack, failCallBack) {
  setUpCallback();
  getResourceWithToken(resourceUrl, successCallBack, failCallBack);
}


function getResourceWithToken(resourceUrl, successCallBack, failCallBack) {
  authContext.acquireToken(resourceId, (errorDesc, token, error) => {
    if (error && error.indexOf('login') >= 0) {
      logIn();
      return;
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
    } else {
      alert('Cannot load data from server!');
      removeLoading();
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
        if (window.frames[iframeId].contentDocument.URL.indexOf('dominobuildprofiler.azurewebsites.net/test') >= 0) {
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

