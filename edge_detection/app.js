import { sobel } from "./sobel/index.js";
import { sobel as sobelWorker } from "./sobel_worker/index.js";

let algoSelect;
let algoRuntime;
let imageSelect;
let source;
let sourceCtx;
let target;
let targetCtx;
let image;
let imageUrl;
let reduction = 1;
let algo = sobel;

function clearTarget() {
    targetCtx.clearRect(0, 0, target.width, target.height);
}

// Handle user drop down selection
function changeImage() {
    image.src = "/images/" + imageSelect.value;
}

function changeAlgo() {
    clearTarget();
    switch (algoSelect.value) {
        case "sobel":
            algo = sobel;
            break;
        case "sobel-worker":
            algo = sobelWorker;
            break;
    }
    requestIdleCallback(initImage);
}

// Triggered on image load
async function initImage() {
    let {
        width: bodyWidth,
        height: bodyHeight
    } = document.body.getBoundingClientRect();
    let targetWidth = image.width;
    let targetHeight = image.height;
    reduction = 1;
    if (image.width > 0.5 * bodyWidth) {
        // Scale down the image to fit in the user's browser
        targetWidth = Math.floor(0.5 * bodyWidth);
        reduction = targetWidth / image.width;
        targetHeight = reduction * image.height;
    }
    source.width = targetWidth;
    source.height = targetHeight;
    sourceCtx.clearRect(0, 0, source.width, source.height);
    sourceCtx.drawImage(image, 0, 0, targetWidth, targetHeight);
    target.width = targetWidth;
    target.height = targetHeight;

    let d = new Date();
    await algo(sourceCtx, targetCtx);
    algoRuntime.innerText = `Runtime: ${new Date() - d}ms`;
}

// Initialize application
function init() {
    imageSelect = document.getElementById("image-select");
    imageSelect.onchange = changeImage;
    algoSelect = document.getElementById("algo-select");
    algoSelect.onchange = changeAlgo;
    algoRuntime = document.getElementById("algo-runtime");
    source = document.getElementById("source");
    sourceCtx = source.getContext("2d");
    target = document.getElementById("target");
    targetCtx = target.getContext("2d");
    image = document.getElementById("source-img");
    image.onload = initImage;
    changeImage();
}

window.onload = init;
