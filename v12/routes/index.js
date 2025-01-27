if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require('@azure/storage-blob');

const express = require('express');
const router = express.Router();
const containerName1 = 'thumbnails';
const multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const getStream = require('into-stream');
const containerName2 = 'images';
const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };
const ONE_MINUTE = 60 * 1000;

const azure = require('azure-storage');

const sharedKeyCredential = new StorageSharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);
const pipeline = newPipeline(sharedKeyCredential);

const blobServiceClient = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
  pipeline
);

const getBlobName = originalName => {
  // Use a random number to generate a unique file name, 
  // removing "0." from the start of the string.
  const identifier = Math.random().toString().replace(/0\./, '');
  return `${identifier}-${originalName}`;
};

const generateSasToken = (containerName, blobName) => {
  var storageConnString = `DefaultEndpointsProtocol=https;AccountName=${process.env.AZURE_STORAGE_ACCOUNT_NAME};AccountKey=${process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY};EndpointSuffix=core.windows.net`;

  var blobService = azure.createBlobService(storageConnString);

  // Create a SAS token that expires in an hour
  // Set start time to five minutes ago to avoid clock skew.
  var startDate = new Date();
  startDate.setMinutes(startDate.getMinutes() - 5);
  var expiryDate = new Date(startDate);
  expiryDate.setHours(startDate.getHours() + 72);

  permissions = azure.BlobUtilities.SharedAccessPermissions.READ;

  var sharedAccessPolicy = {
      AccessPolicy: {
          Permissions: permissions,
          Start: startDate,
          Expiry: expiryDate
      }
  };
  
  var sasToken = blobService.generateSharedAccessSignature(containerName, blobName, sharedAccessPolicy);

  return blobService.getUrl(containerName, blobName, sasToken, true);
}

// Function on page render
router.get('/', async (req, res, next) => {

  let viewData;

  try {
    // const containerClient = blobServiceClient.getContainerClient(containerName2);
    // const listBlobsResponse = await containerClient.listBlobFlatSegment();

    // for await (const blob of listBlobsResponse.segment.blobItems) {
    //   console.log(`Blob: ${blob.name}`);
    // }

    viewData = {
      title: 'Home',
      viewName: 'index',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: containerName2
    };

    // if (listBlobsResponse.segment.blobItems.length) {
    //   viewData.thumbnails = listBlobsResponse.segment.blobItems;
    // }
  } catch (err) {
    viewData = {
      title: 'Error',
      viewName: 'error',
      message: 'There was an error contacting the blob storage container.',
      error: err
    };
    res.status(500);
  } finally {
    res.render(viewData.viewName, viewData);
  }

  // res.render(viewData.viewName, viewData);
});

// Function on form submit
router.post('/', uploadStrategy, async (req, res) => {
  const blobName = getBlobName(req.file.originalname);
  const stream = getStream(req.file.buffer);
  const containerClient = blobServiceClient.getContainerClient(containerName2);;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.uploadStream(stream,
      uploadOptions.bufferSize, uploadOptions.maxBuffers);
    
    sasURL = generateSasToken(containerName2, blobName)
    // res.render('success', { message: 'File uploaded to Azure Blob storage.' });
    res.render('success', { message: sasURL });
    
  } catch (err) {
    res.render('error', { message: err.message });
  }
});

module.exports = router;