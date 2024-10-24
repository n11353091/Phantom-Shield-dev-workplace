# Phantom Shield Browser Extension

Phantom Shield is a browser extension designed to enhance internet browsing security by helping users avoid accessing unsafe websites. The extension can scan web pages in real-time and issue warnings when risks are detected, helping users steer clear of potential threats.

## Features

- **Real-time Protection Status**: Displays the current protection status and provides real-time updates.
  - **Green Shield**: Protection is active and real-time scanning is enabled.
  - **Red Shield**: Protection is disabled, and users need to enable it manually.
  
- **Risky Website Warning**: When a website is flagged as risky, the extension will display a warning page and block access.
  - Users can choose to return to the previous page or proceed if they are confident in the site's safety.

- **Update Filter**: Allows users to download the latest Bloom Filter from a remote server (S3 bucket) by clicking a button. The updated filter is stored in the browser's `IndexedDB` to maintain the latest protection database.

## Architecture Overview

1. The user installs the extension or plugin (typically a ZIP file that cannot be modified after installation).
2. The extension stores the pre-installed Bloom Filter in the browser's storage API and subsequently in `IndexedDB`.
3. All checks and resolutions between the extension and the Bloom Filter are performed via `IndexedDB`, ensuring efficient storage and retrieval of relevant information.
4. The check results are sent to the frontend, which uses the `declarativeNetRequest API` to decide whether to block unsafe URLs.
5. When the user clicks the "Update Filter" button, the extension downloads the latest Bloom Filter from the remote server, stores it in the storage API, and syncs it with `IndexedDB`.

![extension_section_architecture](https://github.com/user-attachments/assets/f91ef6ba-fd94-4b50-b199-c4ea60f1457e)

## Installation Steps

1. Save the extension folder to your device.
2. Open your Chrome browser.
3. Navigate to `chrome://extensions/`.
4. In the top-right corner, enable "Developer mode."
5. Click "Load unpacked."
6. Find and select the extension folder.
   
[How To Install Phantom Shield Step-By-Step.pdf](https://github.com/user-attachments/files/17375847/How.To.Install.Phantom.Shield.Step-By-Step.pdf)

## User Guide

[guideline.pdf](https://github.com/user-attachments/files/17375849/guideline.pdf)

### 1. Enable Protection
After installation, enable the protection feature using the toggle switch at the top of the extension window.
- Green indicates "On", red indicates "Off".

### 2. Monitor Protection Status
Keep an eye on the protection indicator. If the number increases by more than once, it means that the browser has made multiple requests to the same dangerous page.

### 3. Respond to Warnings
If you receive a warning that a site is risky, you can either return to the previous page or proceed cautiously if you are confident the site is safe. It is recommended to exercise caution.

### 4. Update Filter
Click the "Update Filter" button to ensure you have the latest Bloom Filter for optimal protection.

## Support

If you need further support or wish to report an issue, please contact our team via email.







