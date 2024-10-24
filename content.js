// custom_script.js
function initializeCounterAnimation() {
  $(".counter-value").each(function () {
    $(this)
      .prop("Counter", 0)
      .animate(
        {
          Counter: $(this).text(),
        },
        {
          duration: 3500,
          easing: "swing",
          step: function (now) {
            $(this).text(Math.ceil(now));
          },
        }
      );
  });
}

$(document).ready(function () {
  chrome.storage.local.get(["blockedCount"], function (result) {
    const count = result.blockedCount || 0;
    $(".counter-value").text(count);
    initializeCounterAnimation(count);
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const settingButton = document.querySelector("#settingButton");
  if (settingButton) {
    settingButton.addEventListener("click", function () {
      window.location.href = "settings.html";
    });
  }

  const backButton = document.querySelector("#backButton");
  if (backButton) {
    backButton.addEventListener("click", function () {
      window.location.href = "index.html";
    });
  }
  const switchElement = document.getElementById("flexSwitchCheckChecked");
  const counterElement = document.querySelector(".counter");
  if (switchElement && counterElement) {
    chrome.storage.local.get(["switchState"], function (result) {
      const isSwitchOn =
        result.switchState !== undefined ? result.switchState : true;
      switchElement.checked = isSwitchOn;

      if (isSwitchOn) {
        counterElement.classList.add("green");
        counterElement.classList.remove("red");
      } else {
        counterElement.classList.add("red");
        counterElement.classList.remove("green");
      }
    });
  }

  if (switchElement && counterElement) {
    switchElement.addEventListener("change", function () {
      if (this.checked) {
        counterElement.classList.add("green");
        counterElement.classList.remove("red");
      } else {
        counterElement.classList.add("red");
        counterElement.classList.remove("green");
      }

      chrome.runtime.sendMessage(
        {
          action: "toggleSwitch",
          switchState: this.checked,
        },
        function (response) {
          console.log("Switch state updated in service worker:", response);
        }
      );

      chrome.storage.local.set({ switchState: this.checked });
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const updateFilterCard = document.getElementById("updateFilterCard");

  if (updateFilterCard) {
    updateFilterCard.addEventListener("click", function () {
      console.log("Update Filter card clicked");
      chrome.runtime.sendMessage(
        { action: "updateBloomFilter" },
        function (response) {
          console.log("Update Bloom Filter response:", response);
        }
      );
    });
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const guidelineButton = document.getElementById("guidelineButton");

  if (guidelineButton) {
    guidelineButton.addEventListener("click", function () {
      const link = document.createElement("a");
      link.href = "guideline.pdf";
      link.download = "guideline.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const PrivacyPolicyButton = document.getElementById("PrivacyPolicy");

  if (PrivacyPolicyButton) {
    PrivacyPolicyButton.addEventListener("click", function () {
      const link = document.createElement("a");
      link.href = "Privacy-policy.pdf";
      link.download = "Privacy-policy.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const termsOfUseButton = document.getElementById("TermofUse");

  if (termsOfUseButton) {
    termsOfUseButton.addEventListener("click", function () {
      chrome.tabs.create({ url: chrome.runtime.getURL("Terms_Of_Use.html") });
    });
  }
});
