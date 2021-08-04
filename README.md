# Transcoding API GCP - Demo

This demo is built with Nodejs SDK and Google Cloud Transcoding API. It will act as a REST endpoint for the calls from the frontend clients.

### How to run this demo ?

1. Clone this repository
2. Create a service account credentials on GCP console 
3. Download the credentials from GCP 
4. Add the credentials as creds.json to the root of this project
5. `npm start` will start the server on `localhost:3000` using `nodemon`
6. The repo serves both static animation and fade animation leveraging GCP transcoding API
