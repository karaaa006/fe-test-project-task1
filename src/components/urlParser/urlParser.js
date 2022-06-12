// Start task 2

const parseUrl = (url) => ({ ...result } = new URL(url));

// End task 2

// Tests
let obj = parseUrl("https://ffwagency.com/do/any.php?a=1#foo");
console.log(obj.hash);
console.log(obj.hostname);
console.log(obj.pathname);

// For UI
const inputRef = document.querySelector(".url-parser__input");
const buttonRef = document.querySelector(".url-parser__button");
const resultRef = document.querySelector(".url-parser__result");

const handleRenderResult = (url) => {
  try {
    const parsedUrl = parseUrl(url);

    if (parsedUrl) {
      resultRef.textContent = `Hostname: ${
        parsedUrl.hostname || "-"
      }, pathname: ${parsedUrl.pathname || "-"}, hash: ${
        parsedUrl.hash || "-"
      }`;
    }
  } catch (error) {
    resultRef.textContent = "Parsing error";
  }
};

buttonRef?.addEventListener("click", () => handleRenderResult(inputRef.value));
