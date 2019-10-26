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

export function sobel(sourceCtx, targetCtx) {
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
        let ymax = Math.max(
            Math.abs(filteredYY[i]),
            Math.abs(filteredYY[i + 1]),
            Math.abs(filteredYY[i + 2])
        );
        let xmax = Math.max(
            Math.abs(filteredXX[i]),
            Math.abs(filteredXX[i + 1]),
            Math.abs(filteredXX[i + 2])
        );
        let _max = xmax + ymax;
        newImage.data[i] = _max;
        newImage.data[i + 1] = _max;
        newImage.data[i + 2] = _max;
        newImage.data[i + 3] = 255;
    }
    targetCtx.putImageData(newImage, 0, 0);
}
