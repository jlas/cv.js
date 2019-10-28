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

let mp4 = Math.PI / 4;

function nonMaxSuppression(gradientX, gradientY, theta, width, height) {
    let result = new Float64Array(width * height);
    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            let index = y * width + x;
            let yval = gradientY[index];
            let xval = gradientX[index];
            let xysum = yval + xval;
            let t = Math.round(theta[index] / mp4);
            let flag = false;
            if (t == 1 || t == -3) {
                let tl =
                    gradientY[index - width - 1] + gradientX[index - width - 1];
                let br =
                    gradientY[index + width + 1] + gradientX[index + width + 1];
                flag = xysum > tl && xysum > br;
            } else if (t == 2 || t == -2) {
                flag =
                    yval > gradientY[index - width] &&
                    yval > gradientY[index + width];
            } else if (t == 3 || t == -1) {
                let tr =
                    gradientY[index - width + 1] + gradientX[index - width + 1];
                let bl =
                    gradientY[index + width - 1] + gradientX[index + width - 1];
                flag = xysum > tr && xysum > bl;
            } else {
                flag =
                    xval > gradientX[index - 1] && xval > gradientX[index + 1];
            }
            if (flag) {
                result[index] = xysum;
            }
        }
    }
    return result;
}

function hysteresis(edgeArray, width, height) {
    let upper = 200;
    let lower = 100;
    let result = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y += 1) {
        let yoffset = y * width;
        for (let x = 1; x < width - 1; x += 1) {
            let idx = yoffset + x;
            let val = edgeArray[idx];
            if (val > upper) {
                result[idx] = 255;
            } else if (
                edgeArray[idx] > lower &&
                (edgeArray[idx - width - 1] > upper ||
                    edgeArray[idx - width] > upper ||
                    edgeArray[idx - width + 1] > upper ||
                    edgeArray[idx - 1] > upper ||
                    edgeArray[idx + 1] > upper ||
                    edgeArray[idx + width - 1] > upper ||
                    edgeArray[idx + width] > upper ||
                    edgeArray[idx + width + 1] > upper)
            ) {
                result[idx] = 255;
            }
        }
    }
    return result;
}

async function canny(sourceCtx, targetCtx) {
    let [gradientX, gradientY, theta] = await sobelWorker(sourceCtx, targetCtx);
    let result = nonMaxSuppression(
        gradientX,
        gradientY,
        theta,
        target.width,
        target.height
    );
    result = hysteresis(result, target.width, target.height);
    let newImage = targetCtx.createImageData(target.width, target.height);
    for (let i = 0, j = 0; i < newImage.data.length; i += 4, j += 1) {
        newImage.data[i] = result[j];
        newImage.data[i + 1] = result[j];
        newImage.data[i + 2] = result[j];
        newImage.data[i + 3] = 255;
    }
    targetCtx.putImageData(newImage, 0, 0);
}

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
        case "canny":
            algo = canny;
            break;
    }
    requestIdleCallback(runAlgo);
}

async function runAlgo() {
    let d = new Date();
    await algo(sourceCtx, targetCtx);
    algoRuntime.innerText = `Runtime: ${new Date() - d}ms`;
}

// Triggered on image load
function initImage() {
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

    requestIdleCallback(runAlgo);
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
