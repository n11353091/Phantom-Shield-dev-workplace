// warning.js

function getOriginalUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("originalUrl");
}

document.addEventListener("DOMContentLoaded", function () {
  const continueButton = document.getElementById("continueButton");
  const backButton = document.getElementById("backButton");
  const actionSelect = document.getElementById("actionSelect");
  const originalUrl = getOriginalUrl();
  const confirmYesButton = document.getElementById("confirmYesButton");
  const noButton = document.getElementById("confirmNoButton");

  if (!continueButton) {
    console.error("Continue button not found in the DOM.");
  }

  if (!backButton) {
    console.error("Back button not found in the DOM.");
  }

  if (confirmYesButton) {
    confirmYesButton.addEventListener("click", () => {
      if (originalUrl) {
        chrome.runtime.sendMessage(
          { action: "removeRedirectRule", url: originalUrl },
          (response) => {
            if (response.success) {
              window.location.href = originalUrl;
            } else {
              console.error("Failed to remove redirect rule:", response.error);
            }
          }
        );
      } else {
        console.error("Original URL not found.");
      }
    });
  }

  if (noButton) {
    noButton.addEventListener("click", () => {
      console.log("No button clicked, going back to previous page");
      window.history.back();
    });
  }

  if (backButton) {
    backButton.addEventListener("click", () => {
      window.history.back();
    });
  }

  if (actionSelect) {
    actionSelect.addEventListener("change", function () {
      const action = this.value;

      if (action === "1") {
        console.log("Back to previous page selected");
        if (backButton) {
          backButton.click();
        }
      } else if (action === "2") {
        console.log("Access to the site anyway selected");
        // Show confirmation modal
        const confirmModal = new bootstrap.Modal(
          document.getElementById("confirmModal")
        );
        confirmModal.show();
      }
    });
  }
});
