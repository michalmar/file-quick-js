# Setup 

Source: https://docs.microsoft.com/en-us/azure/storage/blobs/storage-upload-process-images?tabs=javascript

### Login
`az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47`
`az account set --subscription 6ee947fa-0d77-4915-bf68-4a83a8bec2a4`

### Setup Storage account
```
blobStorageAccount="stfilequickjs"
resourceGroupName="filequickjs"
location="northeurope"
blobStorageContainerImages="images"
blobStorageContainerThumb="thumbnails"
webapp="filequickjs"

az group create --name $resourceGroupName --location $location

az storage account create --name $blobStorageAccount --location $location \
  --resource-group $resourceGroupName --sku Standard_LRS --kind StorageV2 --access-tier hot


blobStorageAccountKey=$(az storage account keys list -g $resourceGroupName \
  -n $blobStorageAccount --query "[0].value" --output tsv)

echo $blobStorageAccountKey

az storage container create --name $blobStorageContainerImages \
  --account-name $blobStorageAccount \
  --account-key $blobStorageAccountKey

az storage container create --name $blobStorageContainerThumb \
  --account-name $blobStorageAccount \
  --account-key $blobStorageAccountKey --public-access container
```

### Setup WebApp
```
az appservice plan create --name filequickjsAppServicePlan --resource-group $resourceGroupName --sku Free 

az webapp create --name $webapp --resource-group $resourceGroupName --plan filequickjsAppServicePlan
```

### Deploy WebApp

**JS**
az webapp deployment source config --name $webapp --resource-group $resourceGroupName \
  --branch master \
  --repo-url https://github.com/michalmar/file-quick-js


az webapp config appsettings set --name $webapp --resource-group $resourceGroupName \
  --settings AZURE_STORAGE_ACCOUNT_NAME=$blobStorageAccount \
    AZURE_STORAGE_ACCOUNT_ACCESS_KEY=$blobStorageAccountKey
    

  <!-- ## relieve -->