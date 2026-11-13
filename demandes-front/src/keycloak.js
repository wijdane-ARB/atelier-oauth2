
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8180',
  realm: 'enset-realm',
  clientId: 'react-client'
});

export default keycloak;
