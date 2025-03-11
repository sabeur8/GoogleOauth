const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const session = require('express-session'); 

const app = express();

// Configure session middleware
app.use(
  session({
    secret: 'cats', 
    resave: false,
    saveUninitialized: true,
  })
);

const config = {
  clientId: '1089536395603-55cta15esk2939e9dnl6onhv3utgjkam.apps.googleusercontent.com', 
  clientSecret: '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', 
  redirectUri: 'http://localhost:5000/google/callback',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scope: 'email profile',
};

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.sendStatus(401); // Unauthorized if no user in session
  }
}

app.get('/', (req, res) => {
  res.send('<a href="/auth/google">Authenticate with Google</a>');
});

app.get('/auth/google', (req, res) => {
  const authParams = {
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code', 
    scope: config.scope,
  };
  const url = `${config.authUrl}?${qs.stringify(authParams)}`;

  res.redirect(url);
});

app.get('/google/callback', async (req, res) => { // Fixed: (req, res)
  const code = req.query.code;

  if (!code) {
    return res.redirect('/auth/google/failure'); // Consistent redirect
  }

  try {
    // Step 1: Exchange authorization code for access token
    const tokenResponse = await axios.post(
      config.tokenUrl,
      qs.stringify({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Step 2: Fetch user info with the access token
    const userResponse = await axios.get(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const user = userResponse.data;

    // Store user data in session
    req.session.user = {
      displayName: user.name,
      email: user.email,
      accessToken: access_token,
    };

    res.redirect('/protected');
  } catch (error) {
    console.error('Error in callback:', error.response?.data || error.message);
    res.redirect('/auth/google/failure');
  }
});

app.get('/protected', isLoggedIn, (req, res) => { // Added isLoggedIn middleware
    res.send(`
        <h1>Hello ${req.session.user.displayName}</h1>
        <a href="/logout">LOG OUT</a>
      `);
});

app.get('/auth/google/failure', (req, res) => {
  res.send('Failed to authenticate..');
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.send('Error logging out');
      }
      res.redirect('/'); // Redirect to home page or login page
    });
  });
  

app.listen(5000, () => {
  console.log('Server is listening on 5000');
});