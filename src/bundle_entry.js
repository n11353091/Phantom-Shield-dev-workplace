const _ = require("lodash");
const { BloomFilter } = require("bloom-filters");
const Long = require("long");
const XXHash = require("xxhashjs");
const Cuint = require("cuint");

const utils = require("../lib/utils.js");
const preprocessor = require("../lib/preprocessor.js");
const processor = require("../lib/processor.js");
const postprocessor = require("../lib/postprocessor.js");
const sha256 = require("../lib/sha256.js");
const {
  S3Client,
  ListBucketsCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: "AKIAU6GDZLTAGQYRP647",
    secretAccessKey: "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",
  },
});

async function downloadFileFromS3(s3Client, bucketName, key, storageKey) {
  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const response = await s3Client.send(command);
    console.log("File metadata:");
    console.log("Content Length:", response.ContentLength);
    console.log("Content Type:", response.ContentType);
    console.log("Last Modified:", response.LastModified);
    console.log("ETag:", response.ETag);
    console.log("Metadata:", response.Metadata);

    const textDecoder = new TextDecoder("utf-8");
    const reader = response.Body.getReader();
    let result = "";
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        result += textDecoder.decode(value, { stream: !done });
      }
    }

    console.log("Downloaded content from S3:", result);

    chrome.storage.local.set({ [storageKey]: result }, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to save file:", chrome.runtime.lastError);
      } else {
        console.log("File saved successfully!");
      }
    });
  } catch (error) {
    console.error("Error downloading file:", error);
  }
}

module.exports = {
  downloadFileFromS3,
  s3Client,
  ListBucketsCommand,
  BloomFilter,
  Long,
  XXHash,
  Cuint,
  _,
  utils,
  preprocessor,
  processor,
  postprocessor,
  sha256,
};
