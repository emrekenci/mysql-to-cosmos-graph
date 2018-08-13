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

# Sample data

The data structure used during the PoC:

```
CREATE TABLE Merchants (
    id varchar(255) not null,
    description varchar(255),
    PRIMARY KEY (id)
);

CREATE TABLE People (
    id varchar(255) not null,
    firstName varchar(255),
    lastName varchar(255),
    PRIMARY KEY (id)
);

CREATE TABLE Transactions (
    id int not null auto_increment,
    payerId varchar(255) not null,
    payeeId varchar(255) not null,
    amount decimal(5,2),
    remark varchar(255),
    PRIMARY KEY (id)
);
```