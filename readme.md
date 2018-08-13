# App configuration

The app moves entities from MySql as vertices and transactions as edges to CosmosDb Graph.

To run the app, you need:

* A MySQL instance
* An Azure CosmosDb instance with Gremlin API
* An Azure Storage account.

The settings in the local.settings.json file must be filled to run locally. To run on Azure those settings must be added as App Settings to the Function instace.

# Run the app on your local workstation

Install Azure Function Core tools: https://github.com/Azure/azure-functions-core-tools#installing

Install Node.js version 10.8 or higher.

Install Visual Studio Code.

Install Azure Function extension to VScode. vscode:extension/ms-azuretools.vscode-azurefunctions

Install npm packages.
```
npm install mysql2
npm install azure-storage
npm install documentdb
npm gremlin@2.7.0
```

Press F5. Local runtime should begin execution the function.

# Deploying the app to Azure

Use the VSCode Azure Function extension to deploy the app. The function is time triggered. ;The period is set in the function.json file. "*/5 * * * * *" means every 5 seconds.