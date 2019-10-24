let source;
let sourceCtx;
let target;
let targetCtx;
let image;
let imageUrl;
let reduction = 1;

// Handle user drop down selection
function changeImage() {
    image.src = "images/" + select.value;
}

function filterY(imageDataData, width, height, filter) {
    let d = imageDataData;
    let r = new Array(d.length);
    let k = filter;
    for (let y = 1; y < height - 1; y += 1) {
        let iw4 = width * 4;
        let ym1 = (y - 1) * iw4;
        let y1 = y * iw4;
        let yp1 = (y + 1) * iw4;
        for (let x = 1; x < width - 1; x += 1) {
            let x4 = x * 4;
            let xm1 = ym1 + x4;
            let x1 = y1 + x4;
            let xp1 = yp1 + x4;
            for (let c = 0; c < 3; c += 1) {
                r[x1 + c] =
                    d[xm1 + c] * k[0] + d[x1 + c] * k[1] + d[xp1 + c] * k[2];
            }
        }
    }
    return r;
}

function filterX(imageDataData, width, height, filter) {
    let d = imageDataData;
    let r = new Array(d.length);
    let k = filter;
    for (let y = 1; y < height - 1; y += 1) {
        let y1 = y * (width * 4);
        for (let x = 1; x < width - 1; x += 1) {
            let xm1 = y1 + (x - 1) * 4;
            let x1 = y1 + x * 4;
            let xp1 = y1 + (x + 1) * 4;
            for (let c = 0; c < 3; c += 1) {
                r[x1 + c] =
                    d[xm1 + c] * k[0] + d[x1 + c] * k[1] + d[xp1 + c] * k[2];
            }
        }
    }
    return r;
}

function sobel() {
    let imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
    let width = imageData.width;
    let height = imageData.height;

    // X direction
    let filteredXY = filterY(imageData.data, width, height, [1, 2, 1]);
    let filteredXX = filterX(filteredXY, width, height, [1, 0, -1]);

    // Y direction
    let filteredYX = filterX(imageData.data, width, height, [1, 2, 1]);
    let filteredYY = filterY(filteredYX, width, height, [1, 0, -1]);

    let newImage = targetCtx.createImageData(target.width, target.height);

    for (let i = 0; i < newImage.data.length; i += 4) {
        let xmax = Math.max(...filteredXX.slice(i, i + 3).map(Math.abs));
        let ymax = Math.max(...filteredYY.slice(i, i + 3).map(Math.abs));
        let _max = xmax + ymax;
        newImage.data[i] = _max; //Math.abs(filteredX[i]);
        newImage.data[i + 1] = _max; //Math.abs(filteredX[i+1]);
        newImage.data[i + 2] = _max; //Math.abs(filteredX[i+2]);
        newImage.data[i + 3] = 255;
    }
    targetCtx.putImageData(newImage, 0, 0);
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

    sobel();
}

// Initialize application
function init() {
    select = document.getElementById("image-select");
    select.onchange = changeImage;
    source = document.getElementById("source");
    sourceCtx = source.getContext("2d");
    target = document.getElementById("target");
    targetCtx = target.getContext("2d");
    image = document.getElementById("source-img");
    image.onload = initImage;
    changeImage();
}

window.onload = init;
