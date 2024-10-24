"use strict";

console.log("Service worker started.");
importScripts(chrome.runtime.getURL("dist/bundle.js"));

const excludedDomains = new Set(); // Use Set to store domains that are excluded from BloomFilter checks
let bloomFilter = null; // Variable to hold the BloomFilter instance
const domainRuleMap = new Map(); // Map to track domain and its corresponding rule ID
let nextRuleId = 1; // Counter for generating unique rule IDs
const BloomFilter = MyLibrary.BloomFilter; // Reference to the BloomFilter class from your library
let isSwitchOn = true;

// Function to clear all existing rules when the service worker starts
function clearAllRules() {
  return new Promise((resolve, reject) => {
    // First, get all existing rules
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
      const ruleIds = rules.map((rule) => rule.id); // Extract all rule IDs

      if (ruleIds.length === 0) {
        console.log("No rules to clear.");
        resolve(); // No rules to remove, resolve immediately
        return;
      }

      // Now, remove all existing rules using their IDs
      chrome.declarativeNetRequest.updateDynamicRules(
        { removeRuleIds: ruleIds },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              `Error clearing rules: ${chrome.runtime.lastError.message}`
            );
            reject(chrome.runtime.lastError);
          } else {
            console.log("All rules cleared.");
            resolve();
          }
        }
      );
    });
  });
}

// Function to initialize service worker and periodically clear rules
function initializeServiceWorker() {
  clearAllRules()
    .then(() => {
      console.log("Service worker initialization after clearing rules.");
      // Other initialization code (e.g., opening database, loading BloomFilter, etc.)

      // Set an interval to clear rules every 60 minutes
      setInterval(() => {
        clearAllRules()
          .then(() => {
            console.log("Cleared rules as part of periodic cleanup.");
          })
          .catch((error) => {
            console.error("Periodic rule clearing failed:", error);
          });
      }, 10 * 6 * 60 * 1000); // 60 minutes in milliseconds
    })
    .catch((error) => {
      console.error("Service worker initialization failed:", error);
    });
}
// Start the initialization process
initializeServiceWorker();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleSwitch") {
    isSwitchOn = message.switchState;
    console.log(`Switch is now ${isSwitchOn ? "ON" : "OFF"}`);
    sendResponse({ success: true });
  }
});

// Function to open IndexedDB and return a database instance
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!indexedDB) {
      console.error("IndexedDB is not supported in this browser.");
      reject("IndexedDB not supported");
      return;
    }
    const request = indexedDB.open("BloomFilterDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("filters")) {
        db.createObjectStore("filters", { keyPath: "id" }); // Create object store for filters if it doesn't exist
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result); // Resolve with the opened database
    };

    request.onerror = (event) => {
      console.error("Failed to open IndexedDB:", event.target.errorCode);
      reject(event.target.errorCode); // Reject on error
    };
  });
}

// Function to store Bloom Filter data into IndexedDB
function storeBloomFilter(db, filterData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["filters"], "readwrite");
    const store = transaction.objectStore("filters");
    const request = store.put({ id: "current", data: filterData });

    request.onsuccess = () => {
      console.log("Bloom Filter stored successfully.");
      resolve(); // Resolve on success
    };

    request.onerror = (event) => {
      console.error("Failed to store Bloom Filter:", event.target.errorCode);
      reject(event.target.errorCode); // Reject on error
    };
  });
}

// Function to load Bloom Filter data from IndexedDB
function loadBloomFilterFromDB(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["filters"], "readonly");
    const store = transaction.objectStore("filters");
    const request = store.get("current");

    request.onsuccess = (event) => {
      if (event.target.result) {
        console.log("Bloom Filter JSON loaded from IndexedDB.");
        resolve(event.target.result.data); // Resolve with the loaded data
      } else {
        console.log("No Bloom Filter JSON found in IndexedDB.");
        resolve(null); // Resolve with null if no data found
      }
    };

    request.onerror = (event) => {
      console.error(
        "Failed to load Bloom Filter JSON from IndexedDB:",
        event.target.errorCode
      );
      reject(event.target.errorCode); // Reject on error
    };
  });
}

// Function to load and store Bloom Filter from a file in the root directory
function loadAndStoreBloomFilter(db) {
  return fetchBloomFilter("usable_bf_test.json")
    .then((json) => {
      console.log("Storing Bloom Filter fetched from root directory...");
      return storeBloomFilter(db, json); // Store the fetched filter
    })
    .then(() => {
      console.log("Loading Bloom Filter from IndexedDB after storage...");
      return loadBloomFilterFromDB(db); // Load the filter back from IndexedDB
    });
}

// Function to fetch Bloom Filter JSON from a file
function fetchBloomFilter(filename) {
  const url = chrome.runtime.getURL(filename);
  return fetch(url)
    .then((response) => {
      console.log(`Received response for BloomFilter: ${response.status}`);
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json(); // Return the JSON response
    })
    .catch((error) => {
      console.error("Error while fetching Bloom Filter JSON:", error);
    });
}

// Function to update Bloom Filter in IndexedDB with new data
function updateBloomFilter(db, newFilterData) {
  return storeBloomFilter(db, newFilterData)
    .then(() => {
      console.log("Bloom Filter updated in IndexedDB.");
      bloomFilter = MyLibrary.BloomFilter.fromJSON(newFilterData); // Update the in-memory BloomFilter
    })
    .catch((error) => {
      console.error("Failed to update Bloom Filter in IndexedDB:", error);
    });
}

function addRedirectRule(domain, originalUrl, retryCount = 0) {
  let ruleId = domainRuleMap.get(domain);

  if (ruleId) {
    console.log(
      `Rule already exists for domain: ${domain} with rule id: ${ruleId}. No need to add.`
    );
    return; // If the rule already exists, exit the function
  } else {
    ruleId = nextRuleId++;
    domainRuleMap.set(domain, ruleId);
    console.log(`RuleId ${ruleId} has been set for domain: ${domain}`);
    addNewRule(domain, originalUrl, ruleId);
  }
}

// Helper function to add a new redirect rule
function addNewRule(domain, originalUrl, ruleId) {
  console.log(
    `Adding redirect rule for domain: ${domain} with rule id: ${ruleId}`
  );
  const encodedUrl = encodeURIComponent(originalUrl);
  const rule = {
    id: ruleId,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: chrome.runtime.getURL(`warning.html?originalUrl=${encodedUrl}`),
      },
    },
    condition: {
      urlFilter: `*://*.${domain}/*`,
      resourceTypes: ["main_frame"],
    },
  };

  chrome.declarativeNetRequest.updateDynamicRules(
    {
      addRules: [rule], // Add the new redirect rule
      removeRuleIds: [],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(`Error adding rule: ${chrome.runtime.lastError.message}`);
      } else {
        console.log(
          `Redirect rule added for domain: ${domain} with rule id: ${ruleId}`
        );
      }
    }
  );
}

// Function to check and redirect based on the Bloom Filter
function checkAndRedirect(details) {
  if (!isSwitchOn) {
    console.log(
      "Switch is off, skipping Bloom Filter checks and rule modifications."
    );
    clearAllRules();
    return;
  }
  try {
    const url = new URL(details.url);

    if (url.protocol === "chrome:" || url.protocol === "about:") {
      console.log(`Skipping special page: ${url.protocol}`);
      return;
    }
    const domain = new URL(details.url).hostname.replace(/^www\./, ""); // Extract the domain from the URL
    const encodedUrl = encodeURIComponent(details.url);
    console.log(`onBeforeNavigate triggered for URL: ${details.url}`);
    console.log(`Extracted domain: ${domain}`);
    function incrementBlockedCount() {
      chrome.storage.local.get(["blockedCount"], function (result) {
        let count = result.blockedCount || 0;
        count += 1; // Increment blocked count
        chrome.storage.local.set({ blockedCount: count }, function () {
          console.log(`Blocked count updated: ${count}`);
        });
      });
    }
    if (domainRuleMap.has(domain)) {
      console.log(
        `Rule already exists for domain: ${domain}. No need to check BloomFilter.`
      );
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL(`warning.html?originalUrl=${encodedUrl}`),
      });
      incrementBlockedCount();
      return; // If the rule already exists, exit the function
    }

    if (excludedDomains.has(domain)) {
      console.log(`${domain} is excluded from the BloomFilter checks.`);
      return;
    }

    if (bloomFilter) {
      console.log("Checking domain against BloomFilter...");
      if (bloomFilter.has(domain)) {
        console.log(`${domain} is in the filter. Redirecting...`);
        addRedirectRule(domain, details.url); // Add redirect rule if not already present
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL(`warning.html?originalUrl=${encodedUrl}`),
        });
        incrementBlockedCount();
      } else {
        console.log(`${domain} is not in the filter.`);
      }
    } else {
      console.error("BloomFilter is not loaded yet.");
    }
  } catch (e) {
    console.error(
      `Error processing the URL: ${details.url}, Error: ${e.message}`
    );
  }
}

// Open the database, load Bloom Filter, and set up the navigation listener
openDatabase()
  .then((db) => {
    return loadBloomFilterFromDB(db).then((storedFilter) => {
      if (storedFilter) {
        bloomFilter = MyLibrary.BloomFilter.fromJSON(storedFilter);
        console.log("BloomFilter loaded from IndexedDB.");
      } else {
        console.log(
          "No stored BloomFilter found. Loading from root directory..."
        );
        return loadAndStoreBloomFilter(db).then((loadedFilter) => {
          bloomFilter = MyLibrary.BloomFilter.fromJSON(loadedFilter);
        });
      }
    });
  })
  .then(() => {
    console.log("BloomFilter ready. Adding navigation listener...");
    chrome.webNavigation.onBeforeNavigate.addListener(checkAndRedirect);
  })
  .catch((error) => {
    console.error("Failed to initialize Bloom Filter:", error);
  });

// Listen for messages to remove redirect rules
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "removeRedirectRule") {
    const domain = new URL(message.url).hostname.replace(/^www\./, "");
    console.log(`URL received: ${message.url}`);
    const ruleId = domainRuleMap.get(domain);
    console.log(`Extracted domain: ${domain}`);
    if (!ruleId) {
      console.error(`No rule id found for domain: ${domain}`);
      sendResponse({ success: false, error: "Rule ID not found." });
      return;
    }
    console.log(
      `Removing redirect rule for domain: ${domain} with rule id: ${ruleId}`
    );
    if (!excludedDomains) {
      excludedDomains = new Set();
    }
    excludedDomains.add(domain);
    chrome.declarativeNetRequest.updateDynamicRules(
      {
        removeRuleIds: [ruleId], // Remove the rule associated with the domain
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            `Error removing rule for domain ${domain}: ${chrome.runtime.lastError.message}`
          );
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          console.log("Redirect rule removed successfully.");
          domainRuleMap.delete(domain); // Remove the domain from the map
          sendResponse({ success: true });
        }
      }
    );
    return true; // Indicate that the response will be sent asynchronously
  }
});

const params = {
  Bucket: "testing-capstone",
  Key: "usable_bf_test.json", // File name with path
};
const { downloadFileFromS3 } = MyLibrary;

async function updateBloomFilterFromS3(params) {
  try {
    console.log("Starting updateBloomFilterFromS3 with params:", params);
    console.log(
      `Attempting to download file from S3. Bucket: ${params.Bucket}, Key: ${params.Key}`
    );
    await downloadFileFromS3(
      MyLibrary.s3Client,
      params.Bucket,
      params.Key,
      "bloomFilterData"
    );
    console.log(
      "File downloaded successfully from S3 and stored in chrome.storage.local"
    );

    chrome.storage.local.get("bloomFilterData", async (result) => {
      if (!result.bloomFilterData) {
        console.error("bloomFilterData is undefined or null.");
        return;
      }

      console.log(
        "Successfully retrieved Bloom Filter data from local storage."
      );
      console.log("Raw bloomFilterData:", result.bloomFilterData);

      try {
        const jsonString = result.bloomFilterData;
        console.log("JSON String after retrieval:", jsonString);

        const json = JSON.parse(jsonString);
        console.log("JSON parsing successful:", json);

        console.log("Opening IndexedDB to store the Bloom Filter data...");
        const db = await openDatabase();
        console.log("IndexedDB opened successfully.");

        console.log(
          "Attempting to store the Bloom Filter data into IndexedDB..."
        );
        await updateBloomFilter(db, json);
        console.log("Bloom Filter data stored successfully in IndexedDB.");
      } catch (conversionOrStorageError) {
        console.error(
          "Error during data conversion or storage:",
          conversionOrStorageError
        );
      }
    });
  } catch (error) {
    console.error("Failed to update Bloom Filter from S3. Error:", error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateBloomFilter") {
    updateBloomFilterFromS3(params)
      .then(() => {
        console.log("Bloom Filter updated successfully.");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Failed to update Bloom Filter:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicate that the response will be sent asynchronously
  }
});
