let source;
let sourceCtx;
let target;
let targetCtx;
let image;
let imageUrl;
let reduction = 1;

// Handle user drop down selection
function changeImage() {
    image.src = "/images/" + select.value;
}

function to2dArray(imageData) {
    let chans = new Array(3);
    for (let c = 0; c < 3; c += 1) {
        chans[c] = new Array(imageData.height);
    }
    for (let y = 0; y < imageData.height; y += 1) {
        for (let c = 0; c < 3; c += 1) {
            chans[c][y] = new Array(imageData.width);
        }
        let yoffset = y * (imageData.width * 4);
        for (let x = 0; x < imageData.width; x += 1) {
            let xoffset = yoffset + x * 4;
            chans[0][y][x] = imageData.data[xoffset];
            chans[1][y][x] = imageData.data[xoffset + 1];
            chans[2][y][x] = imageData.data[xoffset + 2];
        }
    }
    return chans;
}

function filterYAlt(imageData2dArray, width, height, filter) {
    let d = imageData2dArray;
    let r = new Array(height);
    let k = filter;
    r[0] = new Array(width).fill(0);
    r[height - 1] = new Array(width).fill(0);
    for (let y = 1; y < height - 1; y += 1) {
        r[y] = new Array(width);
        for (let x = 0; x < width; x += 1) {
            r[y][x] = d[y - 1][x] * k[0] + d[y][x] * k[1] + d[y + 1][x] * k[2];
        }
    }
    return r;
}

function filterXAlt(imageData2dArray, width, height, filter) {
    let d = imageData2dArray;
    let r = new Array(height);
    let k = filter;
    for (let y = 0; y < height; y += 1) {
        r[y] = new Array(width);
        for (let x = 1; x < width - 1; x += 1) {
            r[y][x] = d[y][x - 1] * k[0] + d[y][x] * k[1] + d[y][x + 1] * k[2];
        }
    }
    return r;
}

function sobelAlt() {
    let imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
    let width = imageData.width;
    let height = imageData.height;

    let chans = to2dArray(imageData);

    // X direction
    for (let c of chans) {
        let filteredXY = filterYAlt(c, width, height, [1, 2, 1]);
        let filteredXX = filterXAlt(filteredXY, width, height, [1, 0, -1]);

        // Y direction
        let filteredYX = filterXAlt(c, width, height, [1, 2, 1]);
        let filteredYY = filterYAlt(filteredYX, width, height, [1, 0, -1]);

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                c[y][x] =
                    Math.abs(filteredXX[y][x]) + Math.abs(filteredYY[y][x]);
            }
        }
    }

    let r = new Array(height);
    for (let y = 0; y < height; y += 1) {
        r[y] = new Array(width);
        for (let x = 0; x < width; x += 1) {
            r[y][x] = Math.max(chans[0][y][x], chans[1][y][x], chans[2][y][x]);
        }
    }

    let newImage = targetCtx.createImageData(target.width, target.height);
    let i = 0;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            newImage.data[i] = r[y][x];
            newImage.data[i + 1] = r[y][x];
            newImage.data[i + 2] = r[y][x];
            newImage.data[i + 3] = 255;
            i += 4;
        }
    }

    targetCtx.putImageData(newImage, 0, 0);
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

    let d = new Date();
    sobelAlt();
    console.log("sobel time: ", new Date() - d);
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
